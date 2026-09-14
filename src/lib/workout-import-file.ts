import { createInflateRaw } from "node:zlib";
import { ApiError } from "./api";

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_IMPORT_BYTES + 128 * 1024;
const MAX_EXPANDED_BYTES = 20 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 256;
const XLSX_MIME_TYPES = new Set([
  "",
  "application/octet-stream",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function invalidWorkbook(): ApiError {
  return new ApiError(400, "This file is not a supported .xlsx workbook. Re-save it as an Excel Workbook (.xlsx) and try again.");
}

/** Read the actual stream before multipart parsing; Content-Length is not a limit. */
export async function readBoundedImportForm(request: Request): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data(?:\s*;|$)/i.test(contentType) || !request.body) {
    throw new ApiError(400, "Upload an Excel Workbook (.xlsx) using the file picker.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new ApiError(400, "The upload is too large. Choose an .xlsx file no larger than 2 MB.");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "The upload could not be read. Please choose the file again.");
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return await new Response(body, { headers: { "content-type": contentType } }).formData();
  } catch {
    throw new ApiError(400, "The upload is incomplete or invalid. Please choose the file again.");
  }
}

type ZipEntry = {
  name: string;
  method: number;
  dataStart: number;
  compressedSize: number;
  expandedSize: number;
  localStart: number;
  localEnd: number;
};

function validateExtraFields(buffer: Buffer, start: number, length: number) {
  const end = start + length;
  for (let offset = start; offset < end;) {
    if (offset + 4 > end) throw invalidWorkbook();
    const id = buffer.readUInt16LE(offset);
    const size = buffer.readUInt16LE(offset + 2);
    // ZIP64, strong encryption, and AES are outside this bounded XLSX profile.
    if (id === 0x0001 || id === 0x0017 || id === 0x9901) throw invalidWorkbook();
    offset += 4 + size;
    if (offset > end) throw invalidWorkbook();
  }
}

/** Constrained ZIP profile: no split archives, ZIP64, encryption, or hidden records. */
function inspectZip(buffer: Buffer): ZipEntry[] {
  if (buffer.length < 22 || buffer.readUInt32LE(0) !== 0x04034b50) throw invalidWorkbook();

  let endRecord = -1;
  const searchStart = Math.max(0, buffer.length - 22 - 0xffff);
  for (let offset = buffer.length - 22; offset >= searchStart; offset--) {
    if (buffer.readUInt32LE(offset) === 0x06054b50 && offset + 22 + buffer.readUInt16LE(offset + 20) === buffer.length) {
      endRecord = offset;
      break;
    }
  }
  if (endRecord < 0) throw invalidWorkbook();
  const entryCount = buffer.readUInt16LE(endRecord + 10);
  const directorySize = buffer.readUInt32LE(endRecord + 12);
  const directoryStart = buffer.readUInt32LE(endRecord + 16);
  if (
    buffer.readUInt16LE(endRecord + 4) !== 0 ||
    buffer.readUInt16LE(endRecord + 6) !== 0 ||
    buffer.readUInt16LE(endRecord + 8) !== entryCount ||
    entryCount === 0 || entryCount === 0xffff ||
    directorySize === 0xffffffff || directoryStart === 0xffffffff ||
    directoryStart + directorySize !== endRecord
  ) throw invalidWorkbook();
  if (entryCount > MAX_ZIP_ENTRIES) {
    throw new ApiError(400, "This workbook contains too many files. Upload a simpler workbook with only the training sheets.");
  }

  const entries: ZipEntry[] = [];
  const names = new Set<string>();
  let offset = directoryStart;
  let totalExpanded = 0;
  for (let index = 0; index < entryCount; index++) {
    if (offset + 46 > endRecord || buffer.readUInt32LE(offset) !== 0x02014b50) throw invalidWorkbook();
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const crc = buffer.readUInt32LE(offset + 16);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const expandedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localStart = buffer.readUInt32LE(offset + 42);
    const next = offset + 46 + nameLength + extraLength + commentLength;
    if (
      next > endRecord || nameLength === 0 || nameLength > 1024 ||
      (flags & ~0x080e) !== 0 || (method !== 0 && method !== 8) ||
      buffer.readUInt16LE(offset + 34) !== 0 ||
      compressedSize === 0xffffffff || expandedSize === 0xffffffff ||
      localStart === 0xffffffff || localStart + 30 > directoryStart
    ) throw invalidWorkbook();

    totalExpanded += expandedSize;
    if (totalExpanded > MAX_EXPANDED_BYTES) {
      throw new ApiError(400, "This workbook expands beyond the 20 MB limit. Remove unused sheets or images and try again.");
    }
    const nameBytes = buffer.subarray(offset + 46, offset + 46 + nameLength);
    const name = nameBytes.toString("utf8");
    if (
      /[\u0000-\u001f\\:]/.test(name) || name.startsWith("/") ||
      name.split("/").some((part) => part === "." || part === "..") || names.has(name)
    ) throw invalidWorkbook();
    names.add(name);
    validateExtraFields(buffer, offset + 46 + nameLength, extraLength);

    if (
      buffer.readUInt32LE(localStart) !== 0x04034b50 ||
      buffer.readUInt16LE(localStart + 6) !== flags ||
      buffer.readUInt16LE(localStart + 8) !== method ||
      buffer.readUInt16LE(localStart + 26) !== nameLength
    ) throw invalidWorkbook();
    const localExtraLength = buffer.readUInt16LE(localStart + 28);
    const dataStart = localStart + 30 + nameLength + localExtraLength;
    if (
      dataStart + compressedSize > directoryStart ||
      !buffer.subarray(localStart + 30, localStart + 30 + nameLength).equals(nameBytes)
    ) throw invalidWorkbook();
    validateExtraFields(buffer, localStart + 30 + nameLength, localExtraLength);
    const descriptor = (flags & 0x0008) !== 0;
    for (const [position, expected] of [[14, crc], [18, compressedSize], [22, expandedSize]]) {
      const actual = buffer.readUInt32LE(localStart + position);
      if (actual !== expected && !(descriptor && actual === 0)) throw invalidWorkbook();
    }
    let localEnd = dataStart + compressedSize;
    if (descriptor) {
      if (localEnd + 12 > directoryStart) throw invalidWorkbook();
      if (buffer.readUInt32LE(localEnd) === 0x08074b50) localEnd += 4;
      if (
        localEnd + 12 > directoryStart ||
        buffer.readUInt32LE(localEnd) !== crc ||
        buffer.readUInt32LE(localEnd + 4) !== compressedSize ||
        buffer.readUInt32LE(localEnd + 8) !== expandedSize
      ) throw invalidWorkbook();
      localEnd += 12;
    }
    if (method === 0 && compressedSize !== expandedSize) throw invalidWorkbook();
    entries.push({ name, method, dataStart, compressedSize, expandedSize, localStart, localEnd });
    offset = next;
  }
  if (offset !== endRecord) throw invalidWorkbook();

  let localCursor = 0;
  for (const entry of [...entries].sort((a, b) => a.localStart - b.localStart)) {
    if (entry.localStart !== localCursor) throw invalidWorkbook();
    localCursor = entry.localEnd;
  }
  if (localCursor !== directoryStart) throw invalidWorkbook();

  for (const required of ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels"]) {
    if (!entries.some((entry) => entry.name === required && entry.expandedSize > 0)) throw invalidWorkbook();
  }
  if (!entries.some((entry) => /^xl\/worksheets\/[^/]+\.xml$/.test(entry.name) && entry.expandedSize > 0)) {
    throw invalidWorkbook();
  }
  return entries;
}

/** Check real expansion too: attacker-controlled ZIP size headers can lie. */
async function validateExpansion(buffer: Buffer, entries: ZipEntry[]): Promise<void> {
  let totalExpanded = 0;
  for (const entry of entries) {
    if (entry.method === 0) {
      totalExpanded += entry.expandedSize;
      continue;
    }
    await new Promise<void>((resolve, reject) => {
      const inflater = createInflateRaw();
      let expanded = 0;
      inflater.on("data", (chunk: Buffer) => {
        expanded += chunk.length;
        totalExpanded += chunk.length;
        if (expanded > entry.expandedSize || totalExpanded > MAX_EXPANDED_BYTES) {
          inflater.destroy(new ApiError(400, "This workbook contains invalid or oversized compressed data. Re-save it as an .xlsx file and try again."));
        }
      });
      inflater.once("error", (error) => reject(error instanceof ApiError ? error : invalidWorkbook()));
      inflater.once("end", () => {
        if (expanded !== entry.expandedSize || inflater.bytesWritten !== entry.compressedSize) reject(invalidWorkbook());
        else resolve();
      });
      inflater.end(buffer.subarray(entry.dataStart, entry.dataStart + entry.compressedSize));
    });
  }
}

export async function validateXlsxFile(file: File): Promise<Buffer> {
  if (!file.name.toLowerCase().endsWith(".xlsx") || !XLSX_MIME_TYPES.has(file.type.toLowerCase())) {
    throw new ApiError(400, "Choose an Excel Workbook (.xlsx). Other file formats are not supported.");
  }
  if (file.size > MAX_IMPORT_BYTES) {
    throw new ApiError(400, "The file is too large. Choose an .xlsx file no larger than 2 MB.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_IMPORT_BYTES) throw new ApiError(400, "The file must be no larger than 2 MB.");
  const entries = inspectZip(buffer);
  await validateExpansion(buffer, entries);
  return buffer;
}
