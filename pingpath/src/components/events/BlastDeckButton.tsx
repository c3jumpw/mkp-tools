import Link from "next/link";

/** The floating "Blast Deck" button on a blast's page. */
export default function BlastDeckButton({ eventId }: { eventId: string }) {
  return (
    <Link
      href={`/deck/${eventId}`}
      title="Work this roster one card at a time"
      className="tap-target fixed right-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] md:bottom-6 z-30 flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-medium text-bg shadow-lg hover:bg-accent-hover transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2.5" y="4.5" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M6 2.5h6A1.5 1.5 0 0 1 13.5 4v8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      Blast Deck
    </Link>
  );
}
