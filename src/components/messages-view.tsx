"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Megaphone,
  ChevronLeft,
  Loader2,
  Users,
  Camera,
  ImagePlus,
  X,
} from "lucide-react";
import { Avatar } from "./ui/avatar";
import { Modal } from "./ui/modal";
import { Portal } from "./ui/portal";
import { cn } from "@/lib/utils";
import { useDates } from "./time-zone";
import type { MessageDTO, GroupMessageDTO } from "@/lib/dto";

type Ann = { id: string; body: string; createdISO: string };
type Member = { id: string; name: string; role: string; lastReadISO: string | null };

const ANN = "__ANNOUNCEMENTS__";
const GROUP = "__GROUP__";
const PHOTOS = "__PHOTOS__";
const bubbleColumnClass = "min-w-0 max-w-[88%] sm:max-w-xl";
const bubbleBaseClass = "min-w-0 rounded-xl px-3.5 py-2.5 text-sm shadow-sm ring-1";
const messageBodyClass =
  "whitespace-pre-wrap break-words leading-relaxed [overflow-wrap:anywhere]";


// Shrink an image in the browser before upload so we store a compact data URL
// instead of a multi-megabyte original.
async function fileToDataUrl(file: File, maxDim = 1280, quality = 0.72): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("decode"));
      i.src = raw;
    });
    let { width, height } = img;
    const longest = Math.max(width, height);
    if (longest > maxDim) {
      const s = maxDim / longest;
      width = Math.round(width * s);
      height = Math.round(height * s);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return raw;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return raw;
  }
}

export function MessagesView({
  meId,
  meName,
  isCoach,
  coachName,
  athletes,
  initialDms,
  initialAnns,
  initialGroup,
  initialPhotos,
  members: initialMembers,
}: {
  meId: string;
  meName: string;
  isCoach: boolean;
  coachName: string;
  athletes: { id: string; name: string }[];
  initialDms: MessageDTO[];
  initialAnns: Ann[];
  initialGroup: GroupMessageDTO[];
  initialPhotos: GroupMessageDTO[];
  members: Member[];
}) {
  const { fmtRelative, fmtTime, format, isToday } = useDates();
  // Time-of-day for today's messages, date + time for older ones.
  const stamp = (iso: string) =>
    isToday(iso) ? fmtTime(iso) : format(iso, "MMM d, h:mm a");

  const router = useRouter();
  const [dms, setDms] = useState<MessageDTO[]>(initialDms);
  const [anns, setAnns] = useState<Ann[]>(initialAnns);
  const [group, setGroup] = useState<GroupMessageDTO[]>(initialGroup);
  const [photos, setPhotos] = useState<GroupMessageDTO[]>(initialPhotos);
  const [selected, setSelected] = useState<string>(GROUP);
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [membersOpen, setMembersOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const other = (m: MessageDTO) => (m.senderId === meId ? m.recipientId : m.senderId);

  const threads = useMemo(() => {
    const partners = isCoach
      ? athletes.map((a) => ({ id: a.id, name: a.name }))
      : [{ id: athletes[0]?.id ?? "coach", name: coachName }];
    return partners
      .map((p) => {
        const msgs = dms.filter((m) => other(m) === p.id);
        const last = msgs[msgs.length - 1];
        const unread = msgs.filter((m) => m.recipientId === meId && !m.read).length;
        return { ...p, last, unread };
      })
      .sort((a, b) => {
        if (!a.last && !b.last) return a.name.localeCompare(b.name);
        if (!a.last) return 1;
        if (!b.last) return -1;
        return b.last.createdISO.localeCompare(a.last.createdISO);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dms, athletes, isCoach, coachName, meId]);

  const selectedMessages = useMemo(() => {
    if (selected === ANN || selected === GROUP || selected === PHOTOS) return [];
    return dms
      .filter((m) => other(m) === selected)
      .sort((a, b) => a.createdISO.localeCompare(b.createdISO));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dms, selected, meId]);

  const selectedName =
    selected === ANN
      ? "Team Announcements"
      : selected === GROUP
        ? "Team Chat"
        : selected === PHOTOS
          ? "Team Photos"
          : threads.find((t) => t.id === selected)?.name ?? "";

  useEffect(() => {
    if (selected === PHOTOS) return; // photos is a grid, no need to jump to bottom
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [selected, dms, anns, group, photos]);

  // While viewing the team chat, record that I've seen the latest message.
  useEffect(() => {
    if (selected !== GROUP || group.length === 0) return;
    const last = group[group.length - 1];
    const me = members.find((m) => m.id === meId);
    if (me?.lastReadISO && me.lastReadISO >= last.createdISO) return;
    setMembers((prev) =>
      prev.map((m) =>
        m.id === meId ? { ...m, lastReadISO: new Date().toISOString() } : m
      )
    );
    fetch("/api/messages/seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "GROUP" }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, group.length]);

  async function openConversation(key: string) {
    setSelected(key);
    setMobileView("thread");
    setError(null);
    setPendingImage(null);
    setDraft("");
    if (key === ANN) {
      if (!isCoach) {
        await fetch("/api/announcements/read", { method: "POST" }).catch(() => {});
        router.refresh();
      }
      return;
    }
    if (key === GROUP || key === PHOTOS) return;
    const hasUnread = dms.some(
      (m) => other(m) === key && m.recipientId === meId && !m.read
    );
    if (hasUnread) {
      setDms((prev) =>
        prev.map((m) =>
          other(m) === key && m.recipientId === meId ? { ...m, read: true } : m
        )
      );
      await fetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withUserId: key }),
      }).catch(() => {});
      router.refresh();
    }
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError(null);
    try {
      setPendingImage(await fileToDataUrl(file));
    } catch {
      setError("Couldn't read that image. Try another.");
    }
  }

  const isChannel = selected === GROUP || selected === PHOTOS;
  const allowImage = selected !== ANN;
  const composerDisabled = selected === ANN && !isCoach;

  async function send() {
    if (sending) return;
    const body = draft.trim();
    if (selected === PHOTOS && !pendingImage) {
      setError("Add a photo to post in the photos channel.");
      return;
    }
    if (selected === ANN ? !body : !body && !pendingImage) return;

    setSending(true);
    setError(null);
    try {
      if (selected === ANN) {
        const res = await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        });
        const data = await res.json();
        if (res.ok) {
          setAnns((prev) => [...prev, { id: data.id, body, createdISO: data.createdISO }]);
          setDraft("");
        } else setError(data.error ?? "Couldn't post that.");
      } else if (isChannel) {
        const channel = selected === GROUP ? "GROUP" : "PHOTOS";
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel, body, imageUrl: pendingImage }),
        });
        const data = await res.json();
        if (res.ok) {
          const msg: GroupMessageDTO = {
            id: data.id,
            body,
            imageUrl: pendingImage,
            senderId: meId,
            senderName: meName,
            createdISO: data.createdAt,
          };
          if (channel === "GROUP") setGroup((p) => [...p, msg]);
          else setPhotos((p) => [...p, msg]);
          setDraft("");
          setPendingImage(null);
        } else setError(data.error ?? "Couldn't send that.");
      } else {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientId: selected, body, imageUrl: pendingImage }),
        });
        const data = await res.json();
        if (res.ok) {
          setDms((prev) => [
            ...prev,
            {
              id: data.id,
              type: "DIRECT",
              body,
              imageUrl: pendingImage,
              senderId: meId,
              recipientId: selected,
              createdISO: data.createdAt,
              read: true,
            },
          ]);
          setDraft("");
          setPendingImage(null);
        } else setError(data.error ?? "Couldn't send that.");
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const Thumb = ({ url, className }: { url: string; className?: string }) => (
    <button
      type="button"
      onClick={() => setLightbox(url)}
      className={cn("block max-w-full overflow-hidden rounded-lg", className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="max-h-72 w-auto max-w-full object-cover" />
    </button>
  );

  const lastGroup = group[group.length - 1];

  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-[520px] overflow-hidden rounded-xl border border-paper-200 bg-white shadow-card sm:h-[calc(100vh-8.5rem)]">
      {/* Conversation list */}
      <div
        className={cn(
          "w-full shrink-0 border-r border-paper-200 bg-white sm:w-80 sm:max-w-[38%]",
          mobileView === "thread" ? "hidden sm:block" : "block"
        )}
      >
        <div className="border-b border-paper-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Conversations</h2>
        </div>
        <div className="h-[calc(100%-49px)] overflow-y-auto scroll-thin">
          <ChannelRow
            active={selected === ANN}
            onClick={() => openConversation(ANN)}
            icon={<Megaphone size={18} />}
            title="Team Announcements"
            preview={anns.length ? anns[anns.length - 1].body : "No announcements yet"}
          />
          <ChannelRow
            active={selected === GROUP}
            onClick={() => openConversation(GROUP)}
            icon={<Users size={18} />}
            title="Team Chat"
            preview={
              lastGroup
                ? `${lastGroup.senderId === meId ? "You: " : `${lastGroup.senderName.split(" ")[0]}: `}${lastGroup.body || "Photo"}`
                : "Everyone on the team"
            }
          />
          <ChannelRow
            active={selected === PHOTOS}
            onClick={() => openConversation(PHOTOS)}
            icon={<Camera size={18} />}
            title="Team Photos"
            preview={
              photos.length
                ? `${photos.length} photo${photos.length === 1 ? "" : "s"} shared`
                : "Share team photos"
            }
          />

          <div className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Direct messages
          </div>
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => openConversation(t.id)}
              className={cn(
                "relative flex w-full items-center gap-3 border-b border-paper-200 px-4 py-3 text-left transition",
                selected === t.id ? "bg-brand-50/80" : "hover:bg-paper-50"
              )}
            >
              {selected === t.id && (
                <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-brand-500" />
              )}
              <Avatar name={t.name} seed={t.id} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-ink">{t.name}</span>
                  {t.last && (
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {fmtRelative(t.last.createdISO)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-slate-500">
                    {t.last
                      ? `${t.last.senderId === meId ? "You: " : ""}${t.last.body || "Photo"}`
                      : "Start a conversation"}
                  </span>
                  {t.unread > 0 && (
                    <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[11px] font-semibold text-white">
                      {t.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          mobileView === "list" ? "hidden sm:flex" : "flex"
        )}
      >
        {/* header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-paper-200 bg-white px-4 py-3">
          <button
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 sm:hidden"
            onClick={() => setMobileView("list")}
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>
          {selected === ANN ? (
            <HeaderIcon>
              <Megaphone size={16} />
            </HeaderIcon>
          ) : selected === GROUP ? (
            <HeaderIcon>
              <Users size={16} />
            </HeaderIcon>
          ) : selected === PHOTOS ? (
            <HeaderIcon>
              <Camera size={16} />
            </HeaderIcon>
          ) : (
            <Avatar name={selectedName} seed={selected} size={36} />
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink">{selectedName}</div>
            <div className="text-xs text-slate-400">
              {selected === ANN
                ? isCoach
                  ? "Visible to all athletes"
                  : `From ${coachName}`
                : selected === GROUP
                  ? "Everyone on the team"
                  : selected === PHOTOS
                    ? "Shared team photos"
                    : isCoach
                      ? "Private message"
                      : "Your coach"}
            </div>
          </div>
          {isChannel && (
            <button
              onClick={() => setMembersOpen(true)}
              className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-paper-200 bg-white px-2 py-1 transition hover:bg-paper-50"
              title="Team members"
            >
              <div className="flex -space-x-2">
                {members.slice(0, 4).map((m) => (
                  <span key={m.id} className="rounded-full ring-2 ring-white">
                    <Avatar name={m.name} seed={m.id} size={22} />
                  </span>
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-600">
                {members.length}
              </span>
            </button>
          )}
        </div>

        {/* messages */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto scroll-thin bg-paper-50 px-3 py-4 sm:p-5"
        >
          {selected === ANN ? (
            anns.length === 0 ? (
              <EmptyHint text="No announcements yet." />
            ) : (
              anns.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-paper-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white">
                      <Megaphone size={12} />
                    </span>
                    <span className="text-xs font-semibold text-ink">{coachName}</span>
                    <span className="text-xs text-slate-400">- {stamp(a.createdISO)}</span>
                  </div>
                  <MessageBody className="text-sm text-slate-700">{a.body}</MessageBody>
                </div>
              ))
            )
          ) : selected === PHOTOS ? (
            photos.length === 0 ? (
              <EmptyHint text="No photos yet. Share the first one below." />
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos
                  .slice()
                  .reverse()
                  .map((p) => (
                    <figure
                      key={p.id}
                      className="group overflow-hidden rounded-xl border border-paper-200 bg-white shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => p.imageUrl && setLightbox(p.imageUrl)}
                        className="block aspect-square w-full overflow-hidden"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.imageUrl ?? ""}
                          alt={p.body || "Team photo"}
                          className="h-full w-full object-cover"
                        />
                      </button>
                      <figcaption className="p-2">
                        {p.body && (
                          <p className="line-clamp-2 break-words text-xs text-slate-700 [overflow-wrap:anywhere]">
                            {p.body}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-1.5">
                          <Avatar name={p.senderName} seed={p.senderId} size={18} />
                          <span className="truncate text-[11px] text-slate-500">
                            {p.senderName.split(" ")[0]}
                          </span>
                          <span className="ml-auto shrink-0 text-[10px] text-slate-400">
                            {fmtRelative(p.createdISO)}
                          </span>
                        </div>
                      </figcaption>
                    </figure>
                  ))}
              </div>
            )
          ) : selected === GROUP ? (
            group.length === 0 ? (
              <EmptyHint text="No messages yet. Start the team chat below." />
            ) : (
              <>
                {group.map((m) => {
                const mine = m.senderId === meId;
                return (
                  <div
                    key={m.id}
                    className={cn("flex min-w-0 gap-2", mine ? "justify-end" : "justify-start")}
                  >
                    {!mine && (
                      <div className="mt-4 shrink-0">
                        <Avatar name={m.senderName} seed={m.senderId} size={28} />
                      </div>
                    )}
                    <div className={cn(bubbleColumnClass, mine && "flex flex-col items-end")}>
                      {!mine && (
                        <div className="mb-0.5 ml-1 text-[11px] font-semibold text-slate-500">
                          {m.senderName}
                        </div>
                      )}
                      <div
                        className={cn(
                          bubbleBaseClass,
                          mine
                            ? "rounded-br-md bg-ink text-white ring-ink/5"
                            : "rounded-bl-md bg-white text-slate-700 ring-paper-200"
                        )}
                      >
                        {m.imageUrl && <Thumb url={m.imageUrl} className="mb-1.5" />}
                        <MessageBody>{m.body}</MessageBody>
                        <div
                          className={cn(
                            "mt-1 text-[10px]",
                            mine ? "text-slate-300" : "text-slate-400"
                          )}
                        >
                          {stamp(m.createdISO)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
                })}
                {(() => {
                  const last = group[group.length - 1];
                  const seenBy = members.filter(
                    (mem) =>
                      mem.id !== last.senderId &&
                      mem.lastReadISO != null &&
                      mem.lastReadISO >= last.createdISO
                  );
                  return (
                    <div className="flex items-center justify-end gap-1 pr-1">
                      {seenBy.length === 0 ? (
                        <span className="text-[10px] text-slate-400">Sent</span>
                      ) : (
                        <>
                          <span className="text-[10px] text-slate-400">Seen by</span>
                          <div className="flex -space-x-1.5">
                            {seenBy.slice(0, 6).map((mem) => (
                              <span
                                key={mem.id}
                                title={mem.name}
                                className="rounded-full ring-2 ring-slate-50"
                              >
                                <Avatar name={mem.name} seed={mem.id} size={16} />
                              </span>
                            ))}
                          </div>
                          {seenBy.length > 6 && (
                            <span className="text-[10px] text-slate-400">
                              +{seenBy.length - 6}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}
              </>
            )
          ) : selectedMessages.length === 0 ? (
            <EmptyHint text="No messages yet. Send the first one below." />
          ) : (
            selectedMessages.map((m) => {
              const mine = m.senderId === meId;
              return (
                <div
                  key={m.id}
                  className={cn("flex min-w-0", mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      bubbleColumnClass,
                      bubbleBaseClass,
                      mine
                        ? "rounded-br-md bg-ink text-white ring-ink/5"
                        : "rounded-bl-md bg-white text-slate-700 ring-paper-200"
                    )}
                  >
                    {m.imageUrl && <Thumb url={m.imageUrl} className="mb-1.5" />}
                    <MessageBody>{m.body}</MessageBody>
                    <div
                      className={cn(
                        "mt-1 text-[10px]",
                        mine ? "text-slate-300" : "text-slate-400"
                      )}
                    >
                      {stamp(m.createdISO)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* composer */}
        {composerDisabled ? (
          <div className="shrink-0 border-t border-paper-200 bg-white px-4 py-3 text-center text-xs text-slate-400">
            Only your coach can post announcements.
          </div>
        ) : (
          <div className="shrink-0 border-t border-paper-200 bg-white p-3">
            {pendingImage && (
              <div className="mb-2 flex items-center gap-2">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pendingImage}
                    alt="Attachment preview"
                    className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200"
                  />
                  <button
                    onClick={() => setPendingImage(null)}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-ink p-0.5 text-white shadow-sm"
                    aria-label="Remove image"
                  >
                    <X size={12} />
                  </button>
                </div>
                <span className="text-xs text-slate-400">Photo ready to send</span>
              </div>
            )}
            {error && <p className="mb-2 text-xs text-rose-600">{error}</p>}
            <div className="flex min-w-0 items-end gap-2">
              {allowImage && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onPickImage}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="btn-outline h-[42px] w-[42px] shrink-0 px-0 py-0"
                    title="Attach a photo"
                    aria-label="Attach a photo"
                  >
                    <ImagePlus size={18} />
                  </button>
                </>
              )}
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKey}
                rows={1}
                placeholder={
                  selected === ANN
                    ? "Write an announcement to the whole team..."
                    : selected === GROUP
                      ? "Message the team..."
                      : selected === PHOTOS
                        ? "Add a caption (optional)..."
                        : "Type a message..."
                }
                className="input max-h-32 min-h-[42px] min-w-0 flex-1 resize-none py-2.5 leading-relaxed"
              />
              <button
                onClick={send}
                disabled={
                  sending ||
                  (selected === ANN
                    ? !draft.trim()
                    : selected === PHOTOS
                      ? !pendingImage
                      : !draft.trim() && !pendingImage)
                }
                className={cn(
                  "btn h-[42px] w-[42px] shrink-0 px-0 py-0",
                  selected === ANN || isChannel ? "btn-gold" : "btn-primary"
                )}
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* lightbox — portalled to <body> so it covers the viewport on mobile */}
      {lightbox && (
        <Portal>
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/80 p-4"
            onClick={() => setLightbox(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox}
              alt=""
              className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-soft"
            />
            <button
              onClick={() => setLightbox(null)}
              className="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>
        </Portal>
      )}

      <Modal
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        title={`Team members (${members.length})`}
        size="sm"
      >
        <ul className="space-y-1">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
              <Avatar name={m.name} seed={m.id} size={32} />
              <span className="flex-1 truncate text-sm font-medium text-ink">
                {m.name}
                {m.id === meId && <span className="text-slate-400"> (you)</span>}
              </span>
              <span
                className={cn(
                  "badge",
                  m.role === "COACH"
                    ? "bg-brand-100 text-brand-800 ring-brand-600/30"
                    : "bg-slate-100 text-slate-600 ring-slate-500/20"
                )}
              >
                {m.role === "COACH" ? "Coach" : "Athlete"}
              </span>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}

function ChannelRow({
  active,
  onClick,
  title,
  preview,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  preview: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex w-full items-center gap-3 border-b border-paper-200 px-4 py-3 text-left transition",
        active ? "bg-brand-50/80" : "hover:bg-paper-50"
      )}
    >
      {active && (
        <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-brand-500" />
      )}
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-semibold uppercase transition",
          active ? "bg-ink text-brand-400" : "bg-paper-100 text-slate-500"
        )}
      >
        {title
          .split(" ")
          .map((word) => word[0])
          .join("")
          .slice(0, 2)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">{title}</div>
        <div className="truncate text-xs text-slate-500">{preview}</div>
      </div>
    </button>
  );
}

function HeaderIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink text-white">
      {children}
    </span>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}

function MessageBody({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  if (!children) return null;
  return <p className={cn(messageBodyClass, className)}>{children}</p>;
}
