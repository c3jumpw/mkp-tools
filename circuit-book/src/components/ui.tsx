"use client";

import { forwardRef } from "react";

/* ------------------------------------------------------------------ */
/* Button                                                             */
/* ------------------------------------------------------------------ */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "md" | "lg";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className = "", ...props },
  ref,
) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold " +
    "transition-[transform,background-color,border-color] duration-100 " +
    "active:scale-[0.985] disabled:opacity-40 disabled:pointer-events-none select-none";

  const sizes = {
    // 48px floor: this gets tapped with a sweaty thumb.
    md: "min-h-12 px-4 text-[0.95rem]",
    lg: "min-h-14 px-5 text-base w-full",
  };

  const variants = {
    primary: "bg-lime text-base active:bg-lime-shade",
    ghost: "text-chalk active:bg-raise",
    outline: "border border-line text-chalk active:bg-raise",
    danger: "border border-line text-[#ff8a7a] active:bg-raise",
  };

  return (
    <button
      ref={ref}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    />
  );
});

/* ------------------------------------------------------------------ */
/* Form fields                                                        */
/* ------------------------------------------------------------------ */

const fieldStyles =
  "w-full rounded-xl bg-surface border border-line px-3.5 py-3 text-chalk " +
  "placeholder:text-faint focus:border-lime focus:outline-none min-h-12";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return <input ref={ref} className={`${fieldStyles} ${className}`} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = "", ...props }, ref) {
  return <textarea ref={ref} className={`${fieldStyles} resize-y ${className}`} {...props} />;
});

/* ------------------------------------------------------------------ */
/* Chip — a filter or a category tag                                  */
/* ------------------------------------------------------------------ */

export function Chip({
  active = false,
  as = "button",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; as?: "button" | "span" }) {
  const styles = `inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
    active ? "border-lime bg-lime text-base" : "border-line text-muted"
  } ${className}`;

  if (as === "span") {
    return <span className={styles}>{props.children}</span>;
  }
  return <button type="button" className={`min-h-9 ${styles}`} {...props} />;
}

/** A read-only category marker. Outline, never filled — lime means state. */
export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line px-2 py-0.5 text-xs font-medium text-muted">
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Empty states                                                       */
/* ------------------------------------------------------------------ */

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-14 text-center">
      <h2 className="ex text-lg font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-[28ch] text-sm leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sheet — a bottom sheet for editors and pickers                     */
/* ------------------------------------------------------------------ */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/65"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-line bg-base"
      >
        <header className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
          <h2 className="ex text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-muted active:bg-raise"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {footer && (
          <div className="border-t border-line-soft px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Spinner                                                            */
/* ------------------------------------------------------------------ */

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LoadingPanel({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 px-5 py-16 text-muted">
      <Spinner />
      <span className="text-sm">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Error notice                                                       */
/* ------------------------------------------------------------------ */

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-[#4a3a2a] bg-[#241d14] px-3.5 py-3 text-sm text-warn"
    >
      {children}
    </p>
  );
}
