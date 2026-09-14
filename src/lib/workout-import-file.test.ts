import assert from "node:assert/strict";
import test from "node:test";
import { PassThrough } from "node:stream";
import { deflateRawSync } from "node:zlib";
import ExcelJS from "exceljs";
import { ApiError } from "./api";
import { MAX_IMPORT_BYTES, readBoundedImportForm, validateXlsxFile } from "./workout-import-file";

const MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MAX_REQUEST_BYTES = MAX_IMPORT_BYTES + 128 * 1024;

function file(bytes: Uint8Array, name = "training.xlsx", type = MIME) {
  return new File([new Uint8Array(bytes)], name, { type });
}

function isBadRequest(error: unknown): boolean {
  assert.ok(error instanceof ApiError);
  assert.equal(error.status, 400);
  return true;
}

let fixture: Promise<Buffer> | undefined;
function workbook(): Promise<Buffer> {
  fixture ??= (async () => {
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet("Week 1");
    sheet.addRow(["Athlete", "Monday", "Tuesday"]);
    sheet.addRow(["Jordan Lee", "Easy 30 min", "6 x 400m"]);
    return Buffer.from(await book.xlsx.writeBuffer());
  })();
  return fixture;
}

function centralEntries(bytes: Buffer): number[] {
  const end = bytes.length - 22;
  const count = bytes.readUInt16LE(end + 10);
  let offset = bytes.readUInt32LE(end + 16);
  const entries = [];
  for (let i = 0; i < count; i++) {
    entries.push(offset);
    offset += 46 + bytes.readUInt16LE(offset + 28) + bytes.readUInt16LE(offset + 30) + bytes.readUInt16LE(offset + 32);
  }
  return entries;
}

// A small archive builder makes malicious metadata independent of ExcelJS.
function archive(extra: { compressed: Buffer; declaredSize: number; method?: number }): Buffer {
  const entries = [
    { name: "[Content_Types].xml", compressed: Buffer.from("<xml/>"), declaredSize: 6, method: 0 },
    { name: "_rels/.rels", compressed: Buffer.from("<xml/>"), declaredSize: 6, method: 0 },
    { name: "xl/workbook.xml", compressed: Buffer.from("<xml/>"), declaredSize: 6, method: 0 },
    { name: "xl/_rels/workbook.xml.rels", compressed: Buffer.from("<xml/>"), declaredSize: 6, method: 0 },
    { name: "xl/worksheets/sheet1.xml", method: 8, ...extra },
  ];
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let localOffset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(entry.method, 8);
    header.writeUInt32LE(entry.compressed.length, 18);
    header.writeUInt32LE(entry.declaredSize, 22);
    header.writeUInt16LE(name.length, 26);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(20, 4);
    record.writeUInt16LE(20, 6);
    record.writeUInt16LE(entry.method, 10);
    record.writeUInt32LE(entry.compressed.length, 20);
    record.writeUInt32LE(entry.declaredSize, 24);
    record.writeUInt16LE(name.length, 28);
    record.writeUInt32LE(localOffset, 42);
    local.push(header, name, entry.compressed);
    central.push(record, name);
    localOffset += header.length + name.length + entry.compressed.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...local, directory, end]);
}

test("accepts a real ExcelJS workbook and common XLSX MIME types", async () => {
  const bytes = await workbook();
  for (const mime of [MIME, "application/octet-stream", "application/vnd.ms-excel", ""]) {
    assert.deepEqual(await validateXlsxFile(file(bytes, "Training.XLSX", mime)), bytes);
  }
});

test("accepts a streamed ExcelJS workbook with ZIP data descriptors", async () => {
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
  const book = new ExcelJS.stream.xlsx.WorkbookWriter({ stream, useSharedStrings: true });
  const sheet = book.addWorksheet("Training");
  sheet.addRow(["Monday", "Easy 30 min"]).commit();
  await book.commit();
  const bytes = Buffer.concat(chunks);
  assert.ok(centralEntries(bytes).some((offset) => (bytes.readUInt16LE(offset + 8) & 8) !== 0));
  assert.deepEqual(await validateXlsxFile(file(bytes)), bytes);
});

test("reads a bounded multipart upload and preserves form fields", async () => {
  const form = new FormData();
  form.set("file", file(await workbook()));
  form.set("mode", "add");
  const parsed = await readBoundedImportForm(new Request("http://localhost/import", { method: "POST", body: form }));
  assert.equal(parsed.get("mode"), "add");
  const uploaded = parsed.get("file");
  assert.ok(uploaded instanceof File);
  assert.deepEqual(await validateXlsxFile(uploaded), await workbook());
});

test("allows a 2 MB file plus ordinary multipart overhead", async () => {
  const form = new FormData();
  form.set("file", file(new Uint8Array(MAX_IMPORT_BYTES)));
  const parsed = await readBoundedImportForm(new Request("http://localhost/import", { method: "POST", body: form }));
  assert.equal((parsed.get("file") as File).size, MAX_IMPORT_BYTES);
});

test("limits streamed bytes with absent or forged Content-Length and cancels the stream", async () => {
  for (const contentLength of [null, "1"]) {
    let emitted = 0;
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(64 * 1024));
        emitted += 64 * 1024;
      },
      cancel() { cancelled = true; },
    });
    const headers: Record<string, string> = { "content-type": "multipart/form-data; boundary=demo" };
    if (contentLength) headers["content-length"] = contentLength;
    const options: RequestInit & { duplex: "half" } = { method: "POST", headers, body: stream, duplex: "half" };
    await assert.rejects(readBoundedImportForm(new Request("http://localhost/import", options)), isBadRequest);
    assert.equal(cancelled, true);
    assert.ok(emitted <= MAX_REQUEST_BYTES + 128 * 1024);
  }
});

test("rejects malformed multipart and unsupported request formats", async () => {
  await assert.rejects(readBoundedImportForm(new Request("http://localhost/import", {
    method: "POST", headers: { "content-type": "multipart/form-data; boundary=missing" }, body: "broken",
  })), isBadRequest);
  await assert.rejects(readBoundedImportForm(new Request("http://localhost/import", {
    method: "POST", headers: { "content-type": "application/json" }, body: "{}",
  })), isBadRequest);
});

test("rejects oversized files, wrong file formats, forged ZIP bytes, and truncated archives", async () => {
  await assert.rejects(validateXlsxFile(file(new Uint8Array(MAX_IMPORT_BYTES + 1))), isBadRequest);
  await assert.rejects(validateXlsxFile(file(await workbook(), "training.xls")), isBadRequest);
  await assert.rejects(validateXlsxFile(file(await workbook(), "training.xlsx", "application/pdf")), isBadRequest);
  await assert.rejects(validateXlsxFile(file(Buffer.from("PK\x03\x04not a spreadsheet"))), isBadRequest);
  await assert.rejects(validateXlsxFile(file((await workbook()).subarray(0, -8))), isBadRequest);
});

test("rejects excessive declared expansion and entry counts before inflation", async () => {
  const expanded = Buffer.from(await workbook());
  expanded.writeUInt32LE(20 * 1024 * 1024 + 1, centralEntries(expanded)[0] + 24);
  await assert.rejects(validateXlsxFile(file(expanded)), isBadRequest);
  const entries = Buffer.from(await workbook());
  entries.writeUInt16LE(257, entries.length - 22 + 8);
  entries.writeUInt16LE(257, entries.length - 22 + 10);
  await assert.rejects(validateXlsxFile(file(entries)), isBadRequest);
});

test("rejects encrypted, split, and ZIP64 archives", async () => {
  const encrypted = Buffer.from(await workbook());
  encrypted.writeUInt16LE(1, centralEntries(encrypted)[0] + 8);
  await assert.rejects(validateXlsxFile(file(encrypted)), isBadRequest);
  const split = Buffer.from(await workbook());
  split.writeUInt16LE(1, split.length - 22 + 4);
  await assert.rejects(validateXlsxFile(file(split)), isBadRequest);
  const zip64 = Buffer.from(await workbook());
  zip64.writeUInt32LE(0xffffffff, centralEntries(zip64)[0] + 20);
  await assert.rejects(validateXlsxFile(file(zip64)), isBadRequest);
});

test("rejects inconsistent local headers and invalid directory bounds", async () => {
  const mismatch = Buffer.from(await workbook());
  mismatch.writeUInt32LE(123, 18);
  await assert.rejects(validateXlsxFile(file(mismatch)), isBadRequest);
  const badBounds = Buffer.from(await workbook());
  badBounds.writeUInt32LE(badBounds.length + 100, badBounds.length - 22 + 16);
  await assert.rejects(validateXlsxFile(file(badBounds)), isBadRequest);
});

test("rejects archives missing the actual workbook entry", async () => {
  const bytes = Buffer.from(await workbook());
  const central = centralEntries(bytes).find((offset) => bytes.subarray(offset + 46, offset + 46 + bytes.readUInt16LE(offset + 28)).toString() === "xl/workbook.xml");
  assert.notEqual(central, undefined);
  const local = bytes.readUInt32LE(central! + 42);
  bytes[central! + 46 + 3] = "x".charCodeAt(0);
  bytes[local + 30 + 3] = "x".charCodeAt(0);
  await assert.rejects(validateXlsxFile(file(bytes)), isBadRequest);
});

test("rejects forged small size headers on a real compression bomb", async () => {
  const bomb = deflateRawSync(Buffer.alloc(21 * 1024 * 1024, 65));
  const bytes = archive({ compressed: bomb, declaredSize: 128 });
  assert.ok(bytes.length < MAX_IMPORT_BYTES);
  await assert.rejects(validateXlsxFile(file(bytes)), isBadRequest);
});

test("rejects invalid compressed data and overstated expanded lengths", async () => {
  await assert.rejects(validateXlsxFile(file(archive({ compressed: Buffer.from([255, 255]), declaredSize: 6 }))), isBadRequest);
  await assert.rejects(validateXlsxFile(file(archive({ compressed: deflateRawSync(Buffer.from("<xml/>")), declaredSize: 8 }))), isBadRequest);
});
