"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import HomeClient from "@/components/home/HomeClient";
import ContactsClient from "@/components/contacts/ContactsClient";
import ContactDetailClient from "@/components/contacts/ContactDetailClient";
import DuplicatesClient from "@/components/contacts/DuplicatesClient";
import TagsClient from "@/components/contacts/TagsClient";
import TagDetailClient from "@/components/contacts/TagDetailClient";
import EventsClient from "@/components/events/EventsClient";
import EventDetailClient from "@/components/events/EventDetailClient";
import BlastDeckButton from "@/components/events/BlastDeckButton";
import DeckClient from "@/components/events/DeckClient";
import CalendarSettingsClient from "@/components/home/CalendarSettingsClient";
import WhatsNew from "@/components/updates/WhatsNew";
import AdminChangeLog from "@/components/updates/AdminChangeLog";
import SettingsMenu from "@/components/SettingsMenu";
import ImportPage from "@/app/(app)/contacts/import/page";
import SignupPage from "@/app/signup/page";
import { RELEASES, unseenUpdates } from "@/lib/changelog";
import { buildFixtures, SAMPLE_CSV } from "@/lib/tour/fixtures";
import { findAll, findTarget, type Target } from "@/lib/tour/find";
import type { ScreenId } from "@/lib/tour/screens";
import { MONTH_NAMES, addDays } from "@/lib/occasions";

/**
 * One live sample screen, shown inside the tour's phone frame. It renders the
 * real app component with sample data, opens any sheet the step needs, then
 * locks itself: nothing on it can be tapped, and it can't reach the database.
 */
export default function TourScreen({ id }: { id: ScreenId }) {
  const [where, setWhere] = useState<"pending" | "framed" | "direct">("pending");
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    if (window.self === window.top) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- depends on the browser window
      setWhere("direct");
      return;
    }
    lockDown();
    setNow(new Date());
    setWhere("framed");
  }, []);

  if (where === "direct") {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <p className="font-display text-xl">This is a sample screen</p>
        <p className="text-sm text-muted mt-2">It&apos;s shown inside the Getting started tour, with sample people.</p>
        <Link href="/tour" className="inline-block mt-4 text-sm text-accent">
          Open the tour →
        </Link>
      </div>
    );
  }
  if (where !== "framed" || !now) return null;
  return <Screen id={id} now={now} />;
}

let locked = false;

/** Runs only inside the tour's frame: keeps the screen away from real data and the network. */
function lockDown() {
  if (locked) return;
  locked = true;
  document.documentElement.classList.add("tour-screen");

  // Sample screens keep their remembered filters and ticks to themselves.
  const mem = new Map<string, string>();
  const proto = Storage.prototype;
  const getItem = proto.getItem;
  const setItem = proto.setItem;
  const removeItem = proto.removeItem;
  proto.getItem = function (key: string) {
    return key.startsWith("pingpath:") ? (mem.get(key) ?? null) : getItem.call(this, key);
  };
  proto.setItem = function (key: string, value: string) {
    if (key.startsWith("pingpath:")) mem.set(key, String(value));
    else setItem.call(this, key, value);
  };
  proto.removeItem = function (key: string) {
    if (key.startsWith("pingpath:")) mem.delete(key);
    else removeItem.call(this, key);
  };

  // No saving (server actions) and no page loads (navigation and prefetch).
  const realFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (headers.has("next-action")) return Promise.reject(new Error("Tour screens are read-only."));
    if (headers.has("rsc") || headers.has("next-router-prefetch")) return new Promise<Response>(() => {});
    return realFetch(input, init);
  };
  window.open = () => null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor(t: Target, ms = 4000): Promise<HTMLElement | null> {
  const start = performance.now();
  for (;;) {
    const el = findTarget(document, t);
    if (el) return el;
    if (performance.now() - start > ms) return null;
    await sleep(40);
  }
}

async function click(t: Target) {
  const el = await waitFor(t);
  el?.click();
  await sleep(60);
}

function typeInto(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Gets a screen into the state a step talks about (a sheet open, boxes ticked…). */
const PREP: Partial<Record<ScreenId, (today: Date) => Promise<void>>> = {
  "home/wish": () => click({ sel: "button", text: "Send wishes" }),
  "home/quickadd": () => click({ sel: "button", text: "Quick add" }),
  "home/month": async (today) => {
    await click({ sel: '[role="tab"]', text: "Month" });
    const target = addDays(today, 3).getMonth() === today.getMonth() ? addDays(today, 3) : today;
    const base = `${MONTH_NAMES[target.getMonth()]} ${target.getDate()}`;
    await waitFor({ sel: "button[aria-pressed]" });
    const day = Array.from(document.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")).find(
      (b) => b.getAttribute("aria-label") === base || b.getAttribute("aria-label")?.startsWith(`${base},`)
    );
    day?.click();
    await sleep(60);
  },
  "contacts/bulk": async () => {
    await waitFor({ sel: 'a[href^="/contacts/"]' });
    const boxes = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).filter(
      (b) => !b.closest("label")
    );
    boxes[0]?.click();
    boxes[1]?.click();
    await sleep(60);
  },
  "contacts/add": () => click({ sel: "button", text: "+ Add contact" }),
  "contacts/import": async () => {
    const box = (await waitFor({ sel: "textarea" })) as HTMLTextAreaElement | null;
    if (box) typeInto(box, SAMPLE_CSV);
    await waitFor({ sel: "table" });
  },
  "tags/edit": () => click({ sel: "button", text: "Jordan Ellis" }),
  "blasts/edit-step": () => click({ sel: "button", text: "Edit", exact: true }),
  "blasts/roster": async () => {
    const table = await waitFor({ sel: "div.overflow-x-auto" });
    const contactCol = findTarget(document, { sel: "thead th", nth: 0 });
    const stepsCol = findAll(document, { sel: "thead th", text: "Steps" })[0];
    if (table && contactCol && stepsCol) {
      table.scrollLeft = stepsCol.offsetLeft - contactCol.offsetWidth - 4;
    }
    await sleep(60);
  },
  "blasts/add": async () => {
    await click({ sel: "button", text: "+ Add contacts" });
    await click({ sel: "button", text: "By tag", exact: true });
  },
  "deck/running": () => click({ sel: "button", text: "Start deck" }),
};

function Screen({ id, now }: { id: ScreenId; now: Date }) {
  const f = useMemo(() => buildFixtures(now), [now]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await sleep(80);
      if (cancelled) return;
      await PREP[id]?.(f.today);
      await sleep(120);
      if (cancelled) return;
      (document.activeElement as HTMLElement | null)?.blur?.();
      document.body.setAttribute("inert", "");
      document.documentElement.dataset.tourReady = "1";
      window.parent.postMessage({ type: "pingpath:tour-ready", id }, window.location.origin);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, f]);

  const styles = (
    <style>{`html.tour-screen{scrollbar-width:none}html.tour-screen::-webkit-scrollbar{display:none}html.tour-screen *{transition:none!important;caret-color:transparent}`}</style>
  );

  const content = (() => {
    switch (id) {
      case "home/main":
      case "home/wish":
      case "home/month":
      case "home/quickadd":
        return <HomeClient occasions={f.occasions} contacts={f.picker} feeds={f.feeds} />;
      case "home/whatsnew":
        // What a regular user sees after this update.
        return (
          <>
            <HomeClient occasions={f.occasions} contacts={f.picker} feeds={f.feeds} />
            <WhatsNew
              updates={unseenUpdates({ role: "member", seenVersion: RELEASES[1]?.version ?? null, joinedOn: "2000-01-01" })}
              isAdmin={false}
              sample
            />
          </>
        );
      case "contacts/list":
      case "contacts/bulk":
      case "contacts/add":
        return <ContactsClient initialContacts={f.contacts} allTags={f.tags} allBlasts={f.blastOptions} />;
      case "contacts/detail":
        return (
          <ContactDetailClient
            contact={f.jordan}
            allTags={f.tags}
            memberships={f.jordanMemberships}
            activity={f.jordanActivity}
            occasions={f.jordanOccasions}
          />
        );
      case "contacts/import":
        return <ImportPage />;
      case "contacts/duplicates":
        return <DuplicatesClient contacts={f.duplicateContacts} />;
      case "tags/list":
        return <TagsClient initialTags={f.tagCounts} />;
      case "tags/detail":
      case "tags/edit":
        return <TagDetailClient tag={f.church} members={f.churchMembers} allContacts={f.picker} birthdays={f.birthdays} />;
      case "blasts/list":
        return <EventsClient initialEvents={f.events} />;
      case "blasts/detail":
      case "blasts/edit-step":
      case "blasts/roster":
      case "blasts/add":
        return (
          <>
            <EventDetailClient event={f.q4} sequences={f.sequences} roster={f.roster} allContacts={f.contacts} allTags={f.tags} />
            <BlastDeckButton eventId={f.q4.id} />
          </>
        );
      case "deck/setup":
      case "deck/running":
        return <DeckClient event={f.q4} sequences={f.sequences} roster={f.roster} />;
      case "settings/menu":
        return <SettingsMenu isAdmin={false} />;
      case "settings/calendar":
        return <CalendarSettingsClient feeds={f.feedViews} />;
      case "settings/changelog":
        return <AdminChangeLog releases={RELEASES} />;
      case "signup/form":
        return <SignupPage />;
    }
  })();

  return (
    <>
      {styles}
      {content}
    </>
  );
}
