"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  ActivityLogEntry,
  Contact,
  ContactStatus,
  EventContact,
  EventRow,
  Occasion,
  Sequence,
  Tag,
} from "@/lib/types";
import ContactOccasions from "@/components/contacts/ContactOccasions";
import PhoneLabelInput from "@/components/PhoneLabelInput";
import { STATUS_LABEL } from "@/lib/types";
import { openInstagramProfile, openTiktokProfile } from "@/lib/links";
import { StatusBadge, TagPill, SequenceDots } from "@/components/ui";
import StepAction from "@/components/events/StepAction";
import {
  updateContact,
  setContactStatus,
  setContactVisible,
  setContactTags,
  deleteContact,
} from "@/app/(app)/contacts/actions";
import { toggleResponded } from "@/app/(app)/blasts/actions";

type Membership = EventContact & { event: EventRow & { sequences: Sequence[] } };

export default function ContactDetailClient({
  contact,
  allTags,
  memberships,
  activity,
  occasions,
}: {
  contact: Contact;
  allTags: Tag[];
  memberships: Membership[];
  activity: ActivityLogEntry[];
  occasions: Occasion[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fields, setFields] = useState({
    full_name: contact.full_name,
    nickname: contact.nickname || "",
    phone: contact.phone || "",
    phone2: contact.phone2 || "",
    phone2_label: contact.phone2_label || "",
    instagram_handle: contact.instagram_handle || "",
    tiktok_handle: contact.tiktok_handle || "",
    email: contact.email || "",
    notes: contact.notes || "",
  });
  const [dirty, setDirty] = useState(false);

  function save() {
    startTransition(async () => {
      await updateContact(contact.id, fields);
      setDirty(false);
      router.refresh();
    });
  }

  function handleField(key: keyof typeof fields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }

  function handleTagToggle(tagId: string) {
    const current = new Set((contact.tags || []).map((t) => t.id));
    if (current.has(tagId)) current.delete(tagId);
    else current.add(tagId);
    startTransition(async () => {
      await setContactTags(contact.id, [...current]);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(`Delete ${contact.full_name}? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteContact(contact.id);
      router.push("/contacts");
    });
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24">
      <Link href="/contacts" className="text-sm text-muted hover:text-ink">
        ← All contacts
      </Link>

      <div className="flex items-start justify-between gap-3 mt-3 mb-6">
        <input
          value={fields.full_name}
          onChange={(e) => handleField("full_name", e.target.value)}
          className="font-display text-2xl md:text-3xl bg-transparent focus:outline-none focus:border-b focus:border-accent flex-1 min-w-0"
        />
        <StatusBadge status={contact.status} />
      </div>

      <section className="space-y-3 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput
            label="Nickname"
            value={fields.nickname}
            onChange={(v) => handleField("nickname", v)}
            placeholder="What you actually call them"
          />
          <LabeledInput
            label="Phone"
            value={fields.phone}
            onChange={(v) => handleField("phone", v)}
            type="tel"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput
            label={fields.phone2_label.trim() ? `Phone 2 · ${fields.phone2_label.trim()}` : "Phone 2"}
            value={fields.phone2}
            onChange={(v) => handleField("phone2", v)}
            type="tel"
          />
          <div>
            <label htmlFor="contact-phone2-label" className="block text-xs text-muted mb-1">
              Phone 2 label
            </label>
            <PhoneLabelInput
              id="contact-phone2-label"
              value={fields.phone2_label}
              onChange={(v) => handleField("phone2_label", v)}
              inputClassName="w-full rounded-lg bg-surface border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
        </div>
        <LabeledInput
          label="Email"
          value={fields.email}
          onChange={(v) => handleField("email", v)}
          type="email"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <LabeledInput
              label="Instagram handle"
              value={fields.instagram_handle}
              onChange={(v) => handleField("instagram_handle", v)}
              placeholder="@username"
            />
            {contact.instagram_handle && (
              <button
                type="button"
                onClick={() => openInstagramProfile(contact.instagram_handle!)}
                className="text-xs text-accent hover:text-accent-hover mt-1"
              >
                Open Instagram profile →
              </button>
            )}
          </div>
          <div>
            <LabeledInput
              label="TikTok handle"
              value={fields.tiktok_handle}
              onChange={(v) => handleField("tiktok_handle", v)}
              placeholder="@username"
            />
            {contact.tiktok_handle && (
              <button
                type="button"
                onClick={() => openTiktokProfile(contact.tiktok_handle!)}
                className="text-xs text-accent hover:text-accent-hover mt-1"
              >
                Open TikTok profile →
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Notes</label>
          <textarea
            value={fields.notes}
            onChange={(e) => handleField("notes", e.target.value)}
            rows={3}
            className="w-full rounded-lg bg-surface border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
        {dirty && (
          <button
            onClick={save}
            disabled={pending}
            className="text-sm px-4 py-2 rounded-lg bg-accent text-bg font-medium hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        )}
      </section>

      <ContactOccasions contactId={contact.id} occasions={occasions} />

      <section className="mb-6">
        <label className="block text-xs text-muted mb-1.5">Tags</label>
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((t) => {
            const active = contact.tags?.some((ct) => ct.id === t.id);
            return active ? (
              <TagPill key={t.id} tag={t} onRemove={() => handleTagToggle(t.id)} />
            ) : (
              <button
                key={t.id}
                onClick={() => handleTagToggle(t.id)}
                className="text-xs px-2 py-0.5 rounded-full border border-line text-muted hover:text-ink hover:border-ink/40"
              >
                + {t.name}
              </button>
            );
          })}
          {allTags.length === 0 && (
            <Link href="/tags" className="text-xs text-accent hover:text-accent-hover">
              Create a tag first →
            </Link>
          )}
        </div>
      </section>

      <section className="mb-6 flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-xs text-muted mb-1">Status</label>
          <select
            value={contact.status}
            onChange={(e) => {
              const status = e.target.value as ContactStatus;
              startTransition(async () => {
                await setContactStatus(contact.id, status);
                router.refresh();
              });
            }}
            className="rounded-lg bg-surface border border-line px-3 py-1.5 text-sm"
          >
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm mt-4">
          <input
            type="checkbox"
            checked={contact.visible}
            onChange={(e) => {
              startTransition(async () => {
                await setContactVisible(contact.id, e.target.checked);
                router.refresh();
              });
            }}
          />
          Visible in contact list
        </label>
        <button
          onClick={handleDelete}
          className="ml-auto mt-4 text-sm text-rust/80 hover:text-rust"
        >
          Delete contact
        </button>
      </section>

      <section className="mb-8">
        <h2 className="font-display text-lg mb-3">Sequences</h2>
        {memberships.length === 0 && (
          <p className="text-sm text-muted">Not part of any blast yet.</p>
        )}
        <div className="space-y-4">
          {memberships.map((m) => {
            const steps = [...(m.event.sequences || [])].sort(
              (a, b) => a.step_number - b.step_number
            );
            return (
              <div key={m.id} className="rounded-xl border border-line p-4 bg-surface/40">
                <div className="flex items-center justify-between mb-3">
                  <Link
                    href={`/blasts/${m.event.id}`}
                    className="font-medium text-sm hover:text-accent"
                  >
                    {m.event.name}
                  </Link>
                  <SequenceDots total={steps.length} sent={m.current_step} />
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {steps.map((step) => (
                    <StepAction
                      key={step.id}
                      step={step}
                      contact={contact}
                      eventContactId={m.id}
                      eventId={m.event.id}
                      blastName={m.event.name}
                      sent={Boolean(m.sent_steps?.[step.step_number])}
                      onChanged={() => router.refresh()}
                      compact
                    />
                  ))}
                </div>
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={m.responded}
                    onChange={(e) => {
                      startTransition(async () => {
                        await toggleResponded({
                          eventContactId: m.id,
                          eventId: m.event.id,
                          contactId: contact.id,
                          blastName: m.event.name,
                          responded: e.target.checked,
                        });
                        router.refresh();
                      });
                    }}
                  />
                  Responded
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg mb-3">Activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-muted">Nothing logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {activity.map((a) => (
              <li key={a.id} className="text-xs text-muted flex gap-2">
                <span className="text-muted/60 shrink-0">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
                <span>{a.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-surface border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
      />
    </div>
  );
}
