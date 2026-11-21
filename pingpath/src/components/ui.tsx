import type { ContactStatus, Tag } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";

const STATUS_COLOR: Record<ContactStatus, string> = {
  active: "var(--moss)",
  invalid: "var(--text-muted)",
  do_not_contact: "var(--rust)",
};

export function StatusDot({ status }: { status: ContactStatus }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ background: STATUS_COLOR[status] }}
      title={STATUS_LABEL[status]}
    />
  );
}

export function StatusBadge({ status }: { status: ContactStatus }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border"
      style={{
        color: STATUS_COLOR[status],
        borderColor: `color-mix(in srgb, ${STATUS_COLOR[status]} 40%, transparent)`,
        background: `color-mix(in srgb, ${STATUS_COLOR[status]} 12%, transparent)`,
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function TagPill({ tag, onRemove }: { tag: Tag; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
      style={{
        color: tag.color,
        borderColor: `color-mix(in srgb, ${tag.color} 45%, transparent)`,
        background: `color-mix(in srgb, ${tag.color} 14%, transparent)`,
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="opacity-70 hover:opacity-100 -mr-0.5"
          aria-label={`Remove ${tag.name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}

/** "Ticket punch" sequence progress — filled dots for steps sent, hollow for pending. */
export function SequenceDots({
  total,
  sent,
  size = 8,
}: {
  total: number;
  sent: number;
  size?: number;
}) {
  if (total === 0) return <span className="text-xs text-muted">No sequence</span>;
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="rounded-full border"
          style={{
            width: size,
            height: size,
            borderColor: "var(--accent)",
            background: i < sent ? "var(--accent)" : "transparent",
          }}
        />
      ))}
    </div>
  );
}
