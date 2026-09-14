"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Modal } from "./ui/modal";
import { Field, FormError } from "./ui/field";
import { normalizeUsername, usernameFromName } from "@/lib/username";

export type AthleteEditable = {
  id: string;
  name: string;
  username: string | null;
  gradYear: number | null;
  events: string | null;
  hometown: string | null;
  phone: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  bio: string | null;
};

export function AthleteFormModal({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: AthleteEditable;
}) {
  const router = useRouter();
  const editing = Boolean(initial);

  const [name, setName] = useState(initial?.name ?? "");
  // What the athlete signs in with. A new athlete gets one suggested from their
  // name, so the coach only types it when they want something different.
  const [username, setUsername] = useState(initial?.username ?? "");
  const [usernameEdited, setUsernameEdited] = useState(Boolean(initial?.username));
  const suggested = usernameEdited ? username : usernameFromName(name);
  const [gradYear, setGradYear] = useState(
    initial?.gradYear ? String(initial.gradYear) : ""
  );
  const [events, setEvents] = useState(initial?.events ?? "");
  const [hometown, setHometown] = useState(initial?.hometown ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [emergencyName, setEmergencyName] = useState(initial?.emergencyName ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(initial?.emergencyPhone ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      setError("A name is required.");
      return;
    }
    if (normalizeUsername(suggested).length < 3) {
      setError("A username of at least 3 characters is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name,
      username: normalizeUsername(suggested),
      gradYear,
      events,
      hometown,
      phone,
      emergencyName,
      emergencyPhone,
      bio,
    };
    try {
      const res = await fetch(
        editing ? `/api/athletes/${initial!.id}` : "/api/athletes",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the athlete.");
        setSaving(false);
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit athlete" : "Add athlete"}
      description={
        editing
          ? undefined
          : "They'll sign in with the temporary password \"password123\", then set their own on first login."
      }
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            {editing ? "Save changes" : "Add athlete"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <FormError message={error} />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maya Thompson" />
          </Field>
          <Field label="Username" required hint="What they type to sign in.">
            <input
              className="input"
              value={suggested}
              onChange={(e) => {
                setUsernameEdited(true);
                setUsername(normalizeUsername(e.target.value));
              }}
              placeholder="maya"
              autoCapitalize="none"
              spellCheck={false}
            />
          </Field>
          <Field label="Graduation year">
            <input className="input" inputMode="numeric" value={gradYear} onChange={(e) => setGradYear(e.target.value)} placeholder="2027" />
          </Field>
          <Field label="Events">
            <input className="input" value={events} onChange={(e) => setEvents(e.target.value)} placeholder="5000m, 10000m" />
          </Field>
          <Field label="Hometown">
            <input className="input" value={hometown} onChange={(e) => setHometown(e.target.value)} placeholder="Asheville, NC" />
          </Field>
          <Field label="Phone">
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(404) 555-0123" />
          </Field>
          <Field label="Emergency contact">
            <input className="input" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} placeholder="Parent / guardian" />
          </Field>
          <Field label="Emergency phone">
            <input className="input" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="(404) 555-0124" />
          </Field>
        </div>
        <Field label="Notes / bio">
          <textarea className="input min-h-[60px] resize-y" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Anything worth noting about this athlete..." />
        </Field>
      </div>
    </Modal>
  );
}
