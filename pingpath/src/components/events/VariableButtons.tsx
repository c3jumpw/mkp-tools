"use client";

import { TEMPLATE_VARIABLES } from "@/lib/links";

export default function VariableButtons({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  function insert(token: string) {
    const el = textareaRef.current;
    if (!el) {
      onChange(value + token);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    // restore focus and cursor position after the inserted token
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {TEMPLATE_VARIABLES.map((v) => (
        <button
          key={v.token}
          type="button"
          onClick={() => insert(v.token)}
          className="text-[11px] px-2 py-1 rounded-md border border-line text-muted hover:text-accent hover:border-accent/50 font-mono"
          title={`Insert ${v.label}`}
        >
          {v.token}
        </button>
      ))}
    </div>
  );
}
