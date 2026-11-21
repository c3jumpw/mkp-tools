"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/contacts", label: "Contacts", icon: ContactsIcon },
  { href: "/blasts", label: "Blasts", icon: EventsIcon },
  { href: "/tags", label: "Tags", icon: TagsIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:flex-col w-56 shrink-0 border-r border-line bg-surface/40 h-screen sticky top-0 px-4 py-6">
      <Link href="/home" className="flex items-center gap-2 mb-8 px-2">
        <svg width="26" height="26" viewBox="0 0 128 128">
          <rect width="128" height="128" rx="24" fill="#1b2c25" />
          <circle cx="40" cy="64" r="11" fill="#cb9a45" />
          <circle cx="64" cy="64" r="11" fill="#cb9a45" />
          <circle cx="88" cy="64" r="11" fill="none" stroke="#4f9c8c" strokeWidth="4" />
        </svg>
        <span className="font-display text-lg">PingPath</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:text-ink hover:bg-surface-2"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/tour"
        className="mt-auto flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-muted hover:text-ink hover:bg-surface-2"
      >
        <TourIcon className="w-4 h-4 shrink-0" />
        Tour
      </Link>
      <Link
        href="/guide"
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
          pathname.startsWith("/guide")
            ? "bg-accent/15 text-accent"
            : "text-muted hover:text-ink hover:bg-surface-2"
        }`}
      >
        <HelpIcon className="w-4 h-4 shrink-0" />
        Guide
      </Link>
    </aside>
  );
}

export function MobileHeader() {
  return (
    <header className="md:hidden flex items-center justify-between px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] border-b border-line bg-surface/40 sticky top-0 z-20 backdrop-blur">
      <Link href="/home" className="flex items-center gap-2">
        <svg width="22" height="22" viewBox="0 0 128 128">
          <rect width="128" height="128" rx="24" fill="#1b2c25" />
          <circle cx="40" cy="64" r="11" fill="#cb9a45" />
          <circle cx="64" cy="64" r="11" fill="#cb9a45" />
          <circle cx="88" cy="64" r="11" fill="none" stroke="#4f9c8c" strokeWidth="4" />
        </svg>
        <span className="font-display text-base">PingPath</span>
      </Link>
      <div className="flex items-center gap-4">
        <Link href="/guide" aria-label="Guide" className="text-muted hover:text-ink">
          <HelpIcon className="w-5 h-5" />
        </Link>
        <Link href="/settings" aria-label="Settings" className="text-muted hover:text-ink">
          <SettingsIcon className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-line flex z-30 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-14 pt-2.5 pb-1.5 text-xs ${
              active ? "text-accent" : "text-muted"
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function HelpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.5a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6" />
      <circle cx="12" cy="16.8" r="0.6" fill="currentColor" />
    </svg>
  );
}
function TourIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="4" y="3.5" width="11" height="15" rx="2" />
      <path d="M8 21h9a2 2 0 0 0 2-2V7.5" />
      <path d="M8.5 8.5 12 11l-3.5 2.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1v-8.5Z" />
    </svg>
  );
}
function ContactsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.8 3.1-6.5 7-6.5s7 2.7 7 6.5" />
    </svg>
  );
}
function EventsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="18" cy="12" r="2.2" />
    </svg>
  );
}
function TagsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M11 4h6a2 2 0 0 1 2 2v6l-8.5 8.5a1.5 1.5 0 0 1-2.1 0l-5.9-5.9a1.5 1.5 0 0 1 0-2.1L11 4Z" />
      <circle cx="15" cy="8" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function SettingsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.4 1a7.7 7.7 0 0 0-1.7-1L15 3.5h-6l-.3 2.6a7.7 7.7 0 0 0-1.7 1l-2.4-1-2 3.4L4.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.7 7.7 0 0 0 1.7 1l.3 2.6h6l.3-2.6a7.7 7.7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5Z" />
    </svg>
  );
}
