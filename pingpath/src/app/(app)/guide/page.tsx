import type { Metadata } from "next";
import Link from "next/link";
import {
  Box,
  Btn,
  Chip,
  Desktop,
  Dot,
  Flow,
  H3,
  Legend,
  Mark,
  MiniInput,
  Panel,
  Phone,
  Row,
  SidebarSketch,
  Tip,
} from "@/components/guide/visuals";
import { slidesFor } from "@/lib/tour/slides";
import { CURRENT_RELEASE } from "@/lib/changelog";

export const metadata: Metadata = { title: "Guide · PingPath" };

const GOLD = "#cb9a45";
const TEAL = "#4f9c8c";
const MOSS = "#7fa65a";
const RUST = "#c1583c";
const GREY = "#93a69b";

const CONTENTS = [
  { id: "around", label: "Getting around" },
  { id: "home", label: "Home" },
  { id: "contacts", label: "Contacts" },
  { id: "tags", label: "Tags" },
  { id: "blasts", label: "Blasts" },
  { id: "deck", label: "Blast Deck" },
  { id: "sending", label: "How sending works" },
  { id: "settings", label: "Settings" },
  { id: "owner", label: "For the owner" },
  { id: "help", label: "Fixes & questions" },
];

const MAP = [
  { name: "Home", what: "Today's birthdays and special dates, the week ahead, and a month calendar.", href: "#home" },
  { name: "Contacts", what: "Everyone you reach out to: numbers, birthdays, tags, history.", href: "#contacts" },
  { name: "Blasts", what: "A list of people plus the messages you send them, step by step.", href: "#blasts" },
  { name: "Tags", what: "Groups of people. Tap one to edit everyone in it.", href: "#tags" },
  { name: "Settings", what: "Calendar sync, importing, duplicates, sign out, and this guide.", href: "#settings" },
];

export default function GuidePage() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-16">
      {/* Intro */}
      <header className="pt-2 pb-8">
        <p className="text-xs uppercase tracking-[0.14em] text-accent mb-2">Guide</p>
        <h1 className="font-display text-3xl md:text-4xl text-balance">How PingPath works</h1>
        <p className="text-muted mt-3 max-w-2xl">
          PingPath keeps track of who you reach out to, what you say at each step, and who has been sent to. It
          never sends anything by itself: every message opens in your own Messages, WhatsApp, email or Instagram,
          already written, and you press send.
        </p>

        <Link
          href="/tour"
          className="mt-6 flex items-center gap-4 rounded-2xl border border-accent/40 bg-accent/[0.07] p-4 hover:border-accent transition-colors"
        >
          <span className="w-11 h-11 shrink-0 rounded-full bg-accent text-bg flex items-center justify-center" aria-hidden>
            <svg viewBox="0 0 24 24" className="w-4 h-4 ml-0.5" fill="currentColor">
              <path d="M7 5.5v13l11-6.5z" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block font-medium">Prefer to be shown? Take the Getting started tour</span>
            <span className="block text-sm text-muted">
              {slidesFor("everyone").length} short steps on the real screens, filled with sample people. The owner has a
              track of their own.
            </span>
          </span>
        </Link>

        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <a href="#around" className="rounded-xl border border-line bg-surface/40 p-4 hover:border-accent/50 transition-colors">
            <p className="text-xs text-accent mb-1">Everyone</p>
            <p className="font-medium">Using PingPath day to day</p>
            <p className="text-sm text-muted mt-1">Menus, contacts, tags, blasts, the Blast Deck and birthday wishes.</p>
          </a>
          <a href="#owner" className="rounded-xl border border-line bg-surface/40 p-4 hover:border-accent/50 transition-colors">
            <p className="text-xs text-teal mb-1">Owner / admin</p>
            <p className="font-medium">Setting PingPath up</p>
            <p className="text-sm text-muted mt-1">Accounts and invites, calendar link, installing on phones, where things live.</p>
          </a>
        </div>

        <nav aria-label="Contents" className="flex flex-wrap gap-1.5 mt-6">
          {CONTENTS.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="text-xs rounded-full border border-line px-2.5 py-1 text-muted hover:text-ink hover:border-ink/40"
            >
              {c.label}
            </a>
          ))}
        </nav>
      </header>

      {/* The map */}
      <section aria-labelledby="map-title" className="pb-10">
        <h2 id="map-title" className="sr-only">
          The five areas
        </h2>
        <ol className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {MAP.map((m, i) => (
            <li key={m.name}>
              <a href={m.href} className="block h-full rounded-xl border border-line p-3 hover:bg-surface-2/60 transition-colors">
                <span className="text-[11px] text-muted tabular-nums">0{i + 1}</span>
                <span className="block font-display text-lg leading-tight">{m.name}</span>
                <span className="block text-xs text-muted mt-1">{m.what}</span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      {/* Getting around */}
      <Section id="around" who="Everyone" title="Getting around" tour="menus">
        <Panel
          visual={
            <Phone tab="home" marks={{ logo: 1, help: 2, gear: 3, nav: 4 }} caption="On a phone">
              <p className="text-[9px] uppercase tracking-wider text-muted">Friday, October 30</p>
              <p className="font-display text-[15px]">Coming up</p>
              <Box>
                <Row title="Jordan Ellis" sub="Birthday · Turns 32" right={<Btn kind="accent">Send wishes</Btn>} />
              </Box>
              <Box>
                <Row title="Priya Raman" sub="Graduation" />
                <Row title="Halloween" sub="Holiday" />
              </Box>
            </Phone>
          }
        >
          <Legend
            items={[
              { title: "PingPath logo", body: "Takes you back to Home from anywhere." },
              { title: "? Guide", body: "Opens this guide. It's also in Settings." },
              { title: "Settings", body: "Calendar sync, importing contacts, finding duplicates, signing out." },
              {
                title: "Bottom menu",
                body: "The five main areas. The gold one is where you are. It sits above the iPhone home bar so it's easy to tap.",
              },
            ]}
          />
          <Desktop caption="On a computer, the same menu runs down the left side.">
            <SidebarSketch active="contacts" />
            <div className="flex-1 p-3 space-y-2">
              <p className="font-display text-[13px]">Contacts</p>
              <MiniInput placeholder="Search name, phone, email, @handle…" />
              <Box>
                <Row lead={<Dot color={MOSS} />} title="Jordan Ellis" sub="(555) 201-4410" />
                <Row lead={<Dot color={MOSS} />} title="Priya Raman" sub="priya@example.com" />
              </Box>
            </div>
          </Desktop>
        </Panel>
      </Section>

      {/* Home */}
      <Section id="home" who="Everyone" title="Home: what's coming up" tour="home-today">
        <Panel
          visual={
            <Phone tab="home">
              <p className="text-[9px] uppercase tracking-wider text-muted">Friday, October 30</p>
              <span className="flex items-center justify-between">
                <span className="font-display text-[15px]">Coming up</span>
                <Mark n={1} inline>
                  <Btn kind="accent">+ Quick add</Btn>
                </Mark>
              </span>
              <Mark n={2}>
                <Box accent>
                  <span className="block font-display text-[12px] pt-1">Today</span>
                  <Row title="Jordan Ellis" sub="Birthday · Turns 32" right={<Btn kind="accent">Send wishes</Btn>} />
                  <Row title="Mom & Dad" sub="41st anniversary" right={<Btn kind="moss">Wished ✓</Btn>} />
                </Box>
              </Mark>
              <Mark n={3} inline>
                <span className="inline-flex rounded-md border border-line p-0.5 text-[9.5px]">
                  <span className="px-2 py-0.5 rounded bg-surface-2">
                    This week <span className="text-accent">3</span>
                  </span>
                  <span className="px-2 py-0.5 text-muted">Month</span>
                </span>
              </Mark>
              <p className="text-[9px] text-muted">Sat, Oct 31 · Tomorrow</p>
              <Box>
                <Row title="Priya Raman" sub="Graduation" />
                <Row title="Halloween" sub="Holiday" />
              </Box>
              <Mark n={4}>
                <Box>
                  <Row title="Marcus" sub="Birthday · Not linked to a contact" right={<Btn>Link</Btn>} />
                </Box>
              </Mark>
              <Mark n={5} inline>
                <span className="text-[9px] text-muted pr-2">
                  Google Calendar · synced 2 hr ago · <span className="text-accent">Sync now</span>
                </span>
              </Mark>
            </Phone>
          }
        >
          <Legend
            items={[
              {
                title: "Quick add",
                body: "Add a person in one form: phone, a labeled second number, email, Instagram, birthday and one special date.",
              },
              {
                title: "Today",
                body: (
                  <>
                    Birthdays, anniversaries and special dates happening today. Tap <b className="text-ink">Send wishes</b>;
                    once sent it shows <b className="text-moss">Wished ✓</b> for this year (tap it to undo).
                  </>
                ),
              },
              {
                title: "This week / Month",
                body: "This week lists the next 7 days. Month shows a calendar with dots; tap a date to see only that day.",
              },
              {
                title: "Not linked yet",
                body: "A date from your Google Calendar that isn't matched to a contact. Tap Link to choose one, or add them as a new contact.",
              },
              { title: "Calendar status", body: "When your calendar last synced. Sync now refreshes it straight away." },
            ]}
          />
          <div>
            <H3>Sending birthday wishes</H3>
            <div className="mt-2">
              <Flow
                steps={[
                  "Tap Send wishes",
                  "Check or edit the message",
                  "Pick Text, WhatsApp, Email or Instagram",
                  "Your app opens with it written",
                  "Send it there",
                ]}
              />
            </div>
            <p className="text-sm text-muted mt-2">
              If the person has a second number, you'll also see buttons like <b className="text-ink">Text · Work</b>.
            </p>
          </div>
          <MonthKey />
        </Panel>
      </Section>

      {/* Contacts */}
      <Section id="contacts" who="Everyone" title="Contacts" tour="contacts-list">
        <Panel
          visual={
            <Phone tab="contacts" caption="The contact list">
              <span className="flex items-center justify-between">
                <span className="font-display text-[15px]">Contacts</span>
                <Mark n={1} inline>
                  <Btn kind="accent">+ Add contact</Btn>
                </Mark>
              </span>
              <Mark n={2}>
                <MiniInput placeholder="Search name, phone, email, @handle…" />
              </Mark>
              <Mark n={3}>
                <span className="grid grid-cols-2 gap-1.5">
                  <MiniInput value="All tags ▾" />
                  <MiniInput value="All statuses ▾" />
                </span>
              </Mark>
              <Mark n={4}>
                <span className="flex flex-wrap items-center gap-1 rounded-md border border-line bg-surface-2 p-1.5 text-[9px]">
                  <span className="text-muted">2 selected</span>
                  <Btn>Add to tag…</Btn>
                  <Btn>Add to blast…</Btn>
                  <Btn>Hide</Btn>
                  <Btn kind="danger">Delete</Btn>
                </span>
              </Mark>
              <Box>
                <Row lead={<><Tick on /><Mark n={5} inline><Dot color={MOSS} /></Mark></>} title="Jordan Ellis" sub="(555) 201-4410" />
                <Row lead={<><Tick on /><Dot color={MOSS} /></>} title="Priya Raman" sub="priya@example.com" />
                <Row lead={<><Tick /><Dot color={GREY} /></>} title="Sam Ortiz" sub="@samortiz" />
                <Row lead={<><Tick /><Dot color={RUST} /></>} title="Kevin Brown" sub="(555) 776-0091" />
              </Box>
            </Phone>
          }
        >
          <Legend
            items={[
              { title: "Add contact", body: "Name, nickname, phone, a second phone with a label, Instagram, TikTok, email, notes and tags." },
              { title: "Search", body: "Finds people by name, either phone number, email or Instagram handle." },
              {
                title: "Filters",
                body: "Narrow the list to one tag or one status. Tick Show hidden to see people you've hidden.",
              },
              {
                title: "Bulk actions",
                body: "Tick the boxes, then add everyone to a tag or a blast, hide them, mark them active, or delete them.",
              },
              {
                title: "Status dot",
                body: (
                  <span className="inline-flex flex-wrap gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1.5"><Dot color={MOSS} /> Active</span>
                    <span className="inline-flex items-center gap-1.5"><Dot color={GREY} /> Invalid</span>
                    <span className="inline-flex items-center gap-1.5"><Dot color={RUST} /> Do not contact</span>
                  </span>
                ),
              },
            ]}
          />
          <Tip>
            Your filters and ticked boxes are remembered while you open someone and come back, so you don't lose your place.
          </Tip>
        </Panel>

        <div className="mt-12">
          <Panel
            visual={
              <Phone tab="contacts" caption="One contact's page">
                <p className="text-[9px] text-muted">← All contacts</p>
                <span className="flex items-center justify-between">
                  <span className="font-display text-[14px]">Jordan Ellis</span>
                  <Chip color={MOSS}>Active</Chip>
                </span>
                <Mark n={1}>
                  <span className="grid grid-cols-2 gap-1.5">
                    <MiniInput label="Phone" value="(555) 201-4410" />
                    <MiniInput label="Phone 2 · Work" value="(555) 330-1182" />
                  </span>
                  <span className="flex gap-1 mt-1">
                    <Chip>Mobile</Chip>
                    <Chip active>Work</Chip>
                    <Chip>Home</Chip>
                  </span>
                </Mark>
                <Mark n={2}>
                  <span className="block text-[9px] text-muted mb-0.5">Birthday</span>
                  <span className="grid grid-cols-[1.4fr_0.8fr_1fr] gap-1">
                    <MiniInput value="March ▾" />
                    <MiniInput value="14 ▾" />
                    <MiniInput value="1994" />
                  </span>
                </Mark>
                <Mark n={3}>
                  <span className="block text-[9px] text-muted mb-0.5">Special dates</span>
                  <Box>
                    <Row title="Feb 25, 2019" sub="Anniversary" right={<span className="text-accent">Edit</span>} />
                    <Row title="May 16" sub="Graduation" right={<span className="text-accent">Edit</span>} />
                    <span className="block py-1 text-accent">+ Add special date</span>
                  </Box>
                </Mark>
                <Mark n={4}>
                  <span className="flex flex-wrap gap-1">
                    <Chip color={TEAL}>Church group ×</Chip>
                    <Chip>+ Volunteers</Chip>
                  </span>
                </Mark>
                <Mark n={5}>
                  <span className="flex items-center gap-2 text-[9.5px]">
                    <MiniInput value="Active ▾" />
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Tick on /> Visible
                    </span>
                  </span>
                </Mark>
                <Mark n={6}>
                  <Box>
                    <Row title="Q4 Outreach" right={<ProgressDots sent={1} total={2} />} />
                    <span className="flex gap-1 py-1.5">
                      <StepPill n={1} sent />
                      <StepPill n={2} />
                    </span>
                  </Box>
                </Mark>
              </Phone>
            }
          >
            <Legend
              items={[
                {
                  title: "Phone numbers",
                  body: "Add a second number and label it (Work, Home, or your own word). Save changes appears as soon as you edit a field.",
                },
                { title: "Birthday", body: "Month and day. The year is optional; with it, Home shows the age they're turning." },
                {
                  title: "Special dates",
                  body: (
                    <>
                      Tap <b className="text-ink">+ Add special date</b>, choose <b className="text-ink">Anniversary</b> or{" "}
                      <b className="text-ink">Other event…</b> and name it (Graduation, Work anniversary). Add as many as you
                      like. Tap Edit to change or delete one.
                    </>
                  ),
                },
                { title: "Tags", body: "Tap a tag to add it, × to take it off." },
                {
                  title: "Status and visibility",
                  body: "Mark a number Invalid, or the person Do not contact. Untick Visible to hide them from the list without deleting.",
                },
                {
                  title: "Blasts and activity",
                  body: "Every blast this person is in, with the same step buttons as the blast's roster. The activity log underneath records each send.",
                },
              ]}
            />
            <Tip tone="teal">
              Dates that come from your Google Calendar show “From your Google Calendar”. Change those in Google Calendar, or tap
              Unlink and type the date in yourself.
            </Tip>
          </Panel>
        </div>
      </Section>

      {/* Tags */}
      <Section id="tags" who="Everyone" title="Tags: edit a whole group" tour="tags-list">
        <p className="text-muted mb-6 max-w-2xl">
          Tags group people (Church group, Volunteers, Warm leads). Open a tag to see everyone in it and fix their details one
          after another without leaving the page.
        </p>
        <div className="flex flex-wrap justify-center gap-6">
          <Phone tab="tags" caption="Tags list">
            <span className="font-display text-[15px] block">Tags</span>
            <MiniInput label="New tag" placeholder="e.g. warm-lead" />
            <Box>
              <Mark n={1}>
                <Row
                  lead={<Dot color={TEAL} />}
                  title="Church group"
                  right={<span className="text-muted">12 contacts ›</span>}
                />
              </Mark>
              <Row lead={<Dot color={GOLD} />} title="Volunteers" right={<span className="text-muted">8 contacts ›</span>} />
              <Row lead={<Dot color={MOSS} />} title="Warm leads" right={<span className="text-muted">21 contacts ›</span>} />
            </Box>
            <p className="text-[9px] text-muted">Rename and Delete sit at the end of each row.</p>
          </Phone>
          <Phone tab="tags" caption="A tag's page">
            <p className="text-[9px] text-muted">← Tags</p>
            <span className="flex items-center justify-between">
              <span className="font-display text-[14px] flex items-center gap-1.5">
                <Dot color={TEAL} /> Church group
              </span>
              <Mark n={2} inline>
                <Btn kind="accent">+ Add people</Btn>
              </Mark>
            </span>
            <p className="text-[9px] text-muted">12 contacts · tap anyone to edit</p>
            <Box>
              <Mark n={3}>
                <Row title="Jordan Ellis · Jo" sub="(555) 201-4410 · Work: (555) 330-1182" right={<span className="text-muted">Edit ›</span>} />
              </Mark>
              <Row title="Marcus Hill" sub="(555) 201-4410" right={<span className="text-muted">Edit ›</span>} />
              <Row title="Priya Raman" sub="priya@example.com" right={<span className="text-muted">Edit ›</span>} />
            </Box>
            <Mark n={4}>
              <span className="block text-[9px] text-muted pr-3">Open this tag in Contacts for bulk actions →</span>
            </Mark>
          </Phone>
          <Phone bare caption="The edit sheet">
            <span className="flex items-center justify-between">
              <span className="font-display text-[14px]">Edit contact</span>
              <span className="text-accent text-[9px]">Full profile →</span>
            </span>
            <MiniInput label="Full name" value="Jordan Ellis" />
            <span className="grid grid-cols-2 gap-1.5">
              <MiniInput label="Phone" value="(555) 201-4410" />
              <MiniInput label="Phone 2" value="(555) 330-1182" />
            </span>
            <MiniInput label="Phone 2 label" value="Work" />
            <span className="grid grid-cols-2 gap-1.5">
              <MiniInput label="Email" placeholder="" />
              <MiniInput label="Instagram" placeholder="@username" />
            </span>
            <span className="block text-[9px] text-muted">Birthday</span>
            <span className="grid grid-cols-3 gap-1">
              <MiniInput value="March" />
              <MiniInput value="14" />
              <MiniInput value="1994" />
            </span>
            <Mark n={5} inline>
              <span className="text-rust text-[9.5px] pr-4">Remove from “Church group”</span>
            </Mark>
            <span className="grid grid-cols-2 gap-1.5 pt-1">
              <Btn>Cancel</Btn>
              <Btn kind="accent">Save</Btn>
            </span>
          </Phone>
        </div>
        <div className="mt-8 max-w-2xl">
          <Legend
            items={[
              { title: "Open a tag", body: "Tap the row. Rename changes the name or colour; Delete removes the tag but keeps the people." },
              { title: "Add people", body: "Search your contacts, tick several, and add them to the tag at once." },
              { title: "Tap anyone to edit", body: "Each row shows their numbers (with the second number's label) and birthday." },
              {
                title: "Bulk actions",
                body: "Opens the Contacts list already filtered to this tag, so you can add the whole group to a blast, hide, or delete.",
              },
              {
                title: "Edit sheet",
                body: "Change name, numbers, label, email, Instagram, birthday and notes, then Save. Remove from the tag here too; the contact itself stays.",
              },
            ]}
          />
        </div>
      </Section>

      {/* Blasts */}
      <Section id="blasts" who="Everyone" title="Blasts: messages in steps" tour="blasts-list">
        <p className="text-muted mb-6 max-w-2xl">
          A blast is a group of people plus the messages you plan to send them in order: an intro, a follow-up a week later, a
          last nudge. PingPath tracks which step each person has had.
        </p>
        <Flow
          steps={["+ New blast", "Write the message steps", "Add contacts", "Send each step", "Tick Responded as replies come in", "Archive when done"]}
        />
        <div className="mt-8">
          <Panel
            visual={
              <Phone tab="blasts" caption="A blast's page">
                <p className="text-[9px] text-muted">← Blasts</p>
                <span className="font-display text-[14px] block">Q4 Outreach</span>
                <p className="text-[9px] text-muted">Notes and stats sit at the top of the page.</p>
                <Mark n={1}>
                  <span className="block font-display text-[11.5px] mb-1">Message sequence</span>
                  <span className="block rounded-lg border border-line bg-surface/40 p-1.5 space-y-1">
                    <span className="flex items-center gap-1.5">
                      <Chip active>Step 1</Chip>
                      <span className="text-muted text-[9px]">Text</span>
                    </span>
                    <span className="block">Hey {"{first_name}"}, it&apos;s been a while! Coffee this week?</span>
                  </span>
                  <span className="block rounded-lg border border-line bg-surface/40 p-1.5 mt-1">
                    <span className="flex items-center gap-1.5">
                      <Chip active>Step 2</Chip>
                      <span className="text-muted text-[9px]">WhatsApp</span>
                    </span>
                  </span>
                  <span className="block rounded-lg border border-dashed border-line text-center text-muted py-1 mt-1">+ Add step 3</span>
                </Mark>
                <Mark n={2}>
                  <span className="flex flex-wrap gap-1 font-mono text-[8.5px]">
                    <Btn>{"{first_name}"}</Btn>
                    <Btn>{"{nickname}"}</Btn>
                    <Btn>{"{name}"}</Btn>
                  </span>
                </Mark>
                <span className="flex items-center justify-between pt-1">
                  <span className="font-display text-[11.5px]">Roster · 12</span>
                  <Mark n={3} inline>
                    <Btn kind="accent">+ Add contacts</Btn>
                  </Mark>
                </span>
                <Mark n={4}>
                  <Box>
                    <Row lead={<Dot color={MOSS} />} title="Maya Rodriguez" right={<ProgressDots sent={1} total={2} />} />
                    <span className="flex flex-wrap items-center gap-1 pb-1.5">
                      <StepPill n={1} sent />
                      <StepPill n={2} />
                      <span className="flex items-center gap-1 text-[9px] text-muted ml-1">
                        <Tick /> Responded
                      </span>
                    </span>
                  </Box>
                </Mark>
                <span className="flex justify-end">
                  <Mark n={5} inline>
                    <span className="inline-flex rounded-full bg-accent text-bg px-2.5 py-1 text-[9.5px] font-medium">Blast Deck</span>
                  </Mark>
                </span>
              </Phone>
            }
          >
            <Legend
              items={[
                {
                  title: "Message sequence",
                  body: "Each step is one message on one channel (Text, WhatsApp, Email or Instagram DM). Edit or delete steps any time; add as many as you need.",
                },
                {
                  title: "Name fill-ins",
                  body: "Tap {first_name}, {nickname} or {name} while writing. Each person gets their own name in their message.",
                },
                { title: "Add contacts", body: "Pick people one by one, or switch to By tag and add everyone with a tag in one tap." },
                {
                  title: "Roster",
                  body: "Each person's progress dots, a button for every step, and Responded. Remove takes someone off this blast only.",
                },
                { title: "Blast Deck", body: "Work through one step for the whole roster, one card at a time. See below." },
              ]}
            />
            <div>
              <H3>Reading a step button</H3>
              <div className="mt-3 rounded-xl border border-line bg-surface/40 p-4">
                <div className="flex justify-center">
                  <span className="inline-flex items-stretch rounded-lg border border-moss/40 overflow-hidden text-sm">
                    <span className="px-3 py-2 bg-moss/10 text-moss font-medium">#1</span>
                    <span className="px-3 py-2 border-l border-moss/40 text-accent">Open</span>
                    <span className="px-3 py-2 border-l border-moss/40 bg-moss/10 text-moss flex items-center gap-1.5">
                      <Tick on /> Sent
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-muted text-center">
                  <span>Which step</span>
                  <span>Opens your app with this person&apos;s message</span>
                  <span>Tick once it&apos;s really gone; green means done</span>
                </div>
              </div>
              <p className="text-sm text-muted mt-2">
                Open never marks anything by itself, so you can open, change your mind, and nothing is recorded.
              </p>
            </div>
          </Panel>
        </div>
        <p className="text-sm text-muted mt-8">
          On the Blasts list, each blast shows how many people, how many sent and how many responded. <b className="text-ink">Archive</b>{" "}
          tucks finished ones away (tick Show archived to see them); <b className="text-ink">Delete</b> removes the blast and its history.
        </p>
      </Section>

      {/* Blast Deck */}
      <Section id="deck" who="Everyone" title="Blast Deck: one card at a time" tour="deck-setup">
        <div className="flex flex-wrap justify-center gap-6">
          <Phone bare caption="1. Choose the step">
            <p className="text-[9px] text-muted">← Q4 Outreach</p>
            <span className="font-display text-[15px] block">Blast Deck</span>
            <p className="text-[9px] text-muted">One card at a time. Send, come back, next card&apos;s ready.</p>
            <Mark n={1}>
              <span className="block text-[10px] font-medium mb-1">Which step?</span>
              <span className="flex gap-1">
                <span className="rounded-md border border-accent bg-accent/10 text-accent px-2 py-1">#1 Text</span>
                <span className="rounded-md border border-line text-muted px-2 py-1">#2 WhatsApp</span>
              </span>
            </Mark>
            <span className="block text-[10px] font-medium pt-1">Roster · 11 of 12</span>
            <Box>
              <Row lead={<Tick on />} title="Maya Rodriguez" sub="(555) 201-4410" />
              <Row lead={<Tick on />} title="Jordan Ellis" sub="(555) 330-1182" />
              <Row lead={<Tick />} title="Sam Ortiz" sub="@samortiz" />
            </Box>
            <span className="block rounded-lg bg-accent text-bg text-center font-medium py-1.5">Start deck · 11</span>
          </Phone>
          <Phone bare caption="2. Work the cards">
            <span className="flex items-center justify-between text-[9px] text-muted">
              <span>← Exit</span>
              <span>Step #1 · 4 of 11</span>
            </span>
            <span className="block h-1 rounded-full bg-surface-2 overflow-hidden">
              <span className="block h-full w-[30%] bg-accent" />
            </span>
            <span className="relative block pt-2">
              <span className="absolute inset-x-3 top-0 h-6 rounded-xl border border-line bg-surface/60" aria-hidden />
              <span className="absolute inset-x-1.5 top-1 h-6 rounded-xl border border-line bg-surface/80" aria-hidden />
              <span className="relative block rounded-xl border border-line bg-surface p-2.5 space-y-1.5">
                <span className="block font-display text-[13px]">Maya Rodriguez</span>
                <span className="block text-[9px] text-muted">(555) 201-4410</span>
                <span className="block rounded-md bg-surface-2 p-1.5">Hey Maya, it&apos;s been a while! Coffee this week?</span>
                <span className="block text-[9px] text-muted">Text</span>
                <Mark n={2}>
                  <span className="block rounded-lg bg-accent text-bg text-center font-medium py-1.5">Open Text</span>
                </Mark>
              </span>
            </span>
            <Mark n={3}>
              <span className="block text-center text-muted py-1">Skip for now</span>
            </Mark>
            <Mark n={4}>
              <span className="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-[9.5px]">
                <span>Marked sent for Jordan Ellis</span>
                <span className="text-accent">Undo</span>
              </span>
            </Mark>
          </Phone>
        </div>
        <div className="mt-8 grid md:grid-cols-2 gap-8">
          <Legend
            items={[
              {
                title: "Choose the step",
                body: "Each step shows who still needs it. Untick anyone to leave them out, then Start deck.",
              },
              {
                title: "Open",
                body: "Your app opens with the message written. Send it, switch back to PingPath, and the card is marked sent and the next one slides up.",
              },
              { title: "Skip for now", body: "Moves on without marking anything. They'll still need this step later." },
              { title: "Undo", body: "Appears for a few seconds after each send in case you marked the wrong one." },
            ]}
          />
          <div className="space-y-3">
            <Flow steps={["Open", "Send in your app", "Come back", "Marked sent", "Next card"]} loop="Repeats until the deck is cleared." />
            <Tip>
              If you come back and the card hasn&apos;t moved on, tap <b>Sent — next card</b>. The Blast Deck button appears on
              a blast once it has at least one step and one person.
            </Tip>
          </div>
        </div>
      </Section>

      {/* Sending */}
      <Section id="sending" who="Everyone" title="How sending works" tour="sending">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3 text-center">
          <div className="rounded-xl border border-line bg-surface/40 p-4">
            <p className="font-display text-lg">PingPath</p>
            <p className="text-xs text-muted mt-1">Writes the message with their name and finds the right number or handle.</p>
          </div>
          <Arrow />
          <div className="rounded-xl border border-accent/40 bg-accent/[0.07] p-4">
            <p className="font-display text-lg">Your app</p>
            <p className="text-xs text-muted mt-1">Messages, WhatsApp, Mail or Instagram opens. You press send.</p>
          </div>
          <Arrow />
          <div className="rounded-xl border border-line bg-surface/40 p-4">
            <p className="font-display text-lg">Them</p>
            <p className="text-xs text-muted mt-1">It comes from your own number or account, like any message you send.</p>
          </div>
        </div>
        <div className="mt-6">
          <Rows
            head={["Channel", "What happens", "Needs"]}
            rows={[
              ["Text", "Messages opens to them with the message filled in.", "Phone"],
              ["WhatsApp", "Their WhatsApp chat opens with the message filled in.", "Phone"],
              ["Email", "A new email to them opens with the message as the body.", "Email"],
              [
                "Instagram DM",
                "Their DM thread opens and the message is copied. Instagram doesn't allow pre-filling, so long-press and Paste.",
                "Instagram handle",
              ],
            ]}
          />
        </div>
        <p className="text-sm text-muted mt-3">
          If a button is greyed out, the person is missing what that channel needs. Add it on their contact page.
        </p>
      </Section>

      {/* Settings */}
      <Section id="settings" who="Everyone" title="Settings" tour="settings-menu">
        <Panel
          visual={
            <Phone tab="settings">
              <span className="font-display text-[15px] block">Settings</span>
              <Box>
                <Mark n={1}>
                  <Row title="Getting started tour" sub="Every screen, step by step" right={<span className="text-muted">→</span>} />
                </Mark>
                <Mark n={2}>
                  <Row title="What's new" sub={`Version ${CURRENT_RELEASE.version}`} right={<span className="text-muted">→</span>} />
                </Mark>
                <Mark n={3}>
                  <Row title="How to use PingPath" sub="This guide" right={<span className="text-muted">→</span>} />
                </Mark>
                <Mark n={4}>
                  <Row title="Calendar sync" sub="Birthdays & anniversaries from Google" right={<span className="text-muted">→</span>} />
                </Mark>
                <Mark n={5}>
                  <Row title="Import contacts" sub="From a CSV file or pasted text" right={<span className="text-muted">→</span>} />
                </Mark>
                <Mark n={6}>
                  <Row title="Find duplicates" sub="Same phone, email, or name" right={<span className="text-muted">→</span>} />
                </Mark>
              </Box>
              <Mark n={7}>
                <span className="block rounded-lg border border-line px-2 py-1.5 text-rust">Sign out</span>
              </Mark>
            </Phone>
          }
        >
          <Legend
            items={[
              { title: "Getting started tour", body: "The step-by-step tour on the real screens." },
              { title: "What's new", body: "Notes from every update." },
              { title: "How to use PingPath", body: "This guide." },
              { title: "Calendar sync", body: "Connects your Google birthdays calendar. Steps below." },
              { title: "Import contacts", body: "Bring in a list exported from Google Contacts, iCloud or your phone." },
              { title: "Find duplicates", body: "Groups people who share a phone, email or exact name so you can clean up." },
              { title: "Sign out", body: "Ends your session on this device." },
            ]}
          />
        </Panel>

        <div className="mt-10 space-y-10">
          <div>
            <H3>Connect your Google birthdays calendar</H3>
            <p className="text-sm text-muted mt-1 mb-3">Do the first part on a computer; Google&apos;s phone app doesn&apos;t show this setting.</p>
            <Flow
              steps={[
                "Google Calendar ⚙ Settings",
                "Your birthdays calendar (left side)",
                "Integrate calendar",
                "Copy “Secret address in iCal format”",
                "PingPath › Settings › Calendar sync",
                "Paste › Connect and sync",
              ]}
            />
            <ul className="text-sm text-muted mt-3 space-y-1.5 list-disc pl-5">
              <li>Names that exactly match a contact are linked automatically. The rest wait on Home under “From your calendar, not linked yet”.</li>
              <li>It re-syncs on its own when you open Home (every 6 hours at most), or tap Sync now.</li>
              <li>PingPath only reads the calendar. It never changes it.</li>
            </ul>
          </div>

          <div>
            <H3>Import contacts</H3>
            <div className="mt-3 rounded-xl border border-line bg-surface/40 p-4 overflow-x-auto">
              <div className="grid grid-cols-[auto_auto_auto] gap-x-3 gap-y-2 items-center text-sm min-w-[340px] w-max mx-auto">
                <span className="text-xs text-muted">Your file&apos;s column</span>
                <span />
                <span className="text-xs text-muted">PingPath field</span>
                {[
                  ["Name", "Full name"],
                  ["Mobile", "Phone"],
                  ["Work phone", "Phone 2"],
                  ["E-mail", "Email"],
                  ["Birthday", "— Not mapped —"],
                ].map(([a, b]) => (
                  <ImportPair key={a} from={a} to={b} />
                ))}
              </div>
            </div>
            <ul className="text-sm text-muted mt-3 space-y-1.5 list-disc pl-5">
              <li>Upload a CSV file or paste CSV text. The first row must be the column names.</li>
              <li>PingPath guesses the matches; change any that are wrong. Full name must be mapped.</li>
              <li>Anyone whose phone number is already in PingPath is skipped, so importing twice won&apos;t double people up.</li>
            </ul>
          </div>

          <div>
            <H3>Find duplicates</H3>
            <ul className="text-sm text-muted mt-2 space-y-1.5 list-disc pl-5">
              <li>Groups people who share a phone number, email or exact name, and says why.</li>
              <li>The oldest entry in each group is kept; the others are ticked for deletion. Change the ticks as you like.</li>
              <li>Nothing is deleted until you press Delete. “Not duplicates — dismiss” hides a group that&apos;s fine.</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* Owner */}
      <Section id="owner" who="Owner / admin" title="For the owner: setup and accounts" tour="owner-accounts">
        <H3>How accounts work</H3>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <AccountBox who="Your login" items={["Contacts and tags", "Blasts and send history", "Birthdays and special dates", "Calendar link"]} />
          <AccountBox who="Someone else's login" items={["Their own contacts", "Their own blasts", "Their own dates", "Starts empty"]} />
        </div>
        <Tip tone="teal">
          <p>
            Each login is its own private board, and boards never mix: nobody, admins included, can see another board. People
            who need to work from the same contacts have to sign in with the same login.
          </p>
        </Tip>

        <div className="mt-10 space-y-3">
          <H3>Admin: the change log and update notes</H3>
          <p className="text-sm text-muted max-w-2xl">
            Your login is the admin. Settings › Admin opens the change log: every update since launch, oldest or newest first,
            with who each change applies to, and a download as a spreadsheet (CSV) or data file (JSON).
          </p>
          <Rows
            head={["Change marked", "Who sees it"]}
            rows={[
              ["Everyone", "Everyone, in What's new, the first time they open PingPath after the update (once per account, on any device)."],
              ["Admin only", "Only admins, in their What's new and on the Admin page."],
            ]}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-8 mt-10">
          <div className="space-y-3">
            <H3>Invite someone to their own board</H3>
            <Flow steps={["Send them the link and the invite code", "They open Create your account", "Enter code, email, password (8+ characters)", "Confirm the email if asked", "Sign in"]} />
          </div>
          <div className="space-y-3">
            <H3>Install PingPath on a phone</H3>
            <div className="space-y-2">
              <Flow steps={["iPhone: open the link in Safari", "Share", "Add to Home Screen"]} />
              <Flow steps={["Android: open the link in Chrome", "⋮ menu", "Add to Home screen"]} />
            </div>
            <p className="text-sm text-muted">It then opens full-screen like an app and starts on Home.</p>
          </div>
        </div>

        <div className="mt-10">
          <H3>Owner jobs done outside the app</H3>
          <div className="mt-3">
            <Rows
              head={["To…", "Go to"]}
              rows={[
                [
                  "Change the invite code",
                  <>
                    Vercel › project <b className="text-ink">pingpath</b> › Settings › Environment Variables ›{" "}
                    <code className="text-ink">SIGNUP_CODE</code>, then redeploy.
                  </>,
                ],
                [
                  "See accounts or reset a password",
                  "Supabase › your project › Authentication › Users. There's no “forgot password” screen in the app yet.",
                ],
                ["Fix “paused” or “payment required”", "Vercel › team settings › Billing. The app and data are fine; hosting is on hold."],
                [
                  "Replace a leaked calendar link",
                  "Google Calendar › the calendar's settings › reset the secret address, then remove and re-add it in Calendar sync.",
                ],
              ]}
            />
          </div>
        </div>

        <div className="mt-10">
          <H3>Where everything lives</H3>
          <div className="grid sm:grid-cols-3 gap-3 mt-3">
            <Place name="The app" where="Vercel" what="Hosts the website at your PingPath link." />
            <Place name="Data and logins" where="Supabase" what="Contacts, blasts, dates and accounts. Each board can only be read by its own login." />
            <Place name="Birthdays calendar" where="Google Calendar" what="Read through its secret link. The link is kept on the server and never shown in full." />
          </div>
        </div>
      </Section>

      {/* Help */}
      <Section id="help" who="Everyone" title="Fixes and common questions">
        <div className="rounded-xl border border-line divide-y divide-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-4 py-3">
              <summary className="cursor-pointer list-none flex items-start justify-between gap-3 text-sm font-medium">
                {f.q}
                <span className="text-muted group-open:rotate-45 transition-transform shrink-0" aria-hidden>
                  +
                </span>
              </summary>
              <p className="text-sm text-muted mt-2">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="text-xs text-muted mt-8">
          Guide and tour updated {CURRENT_RELEASE.date} for version {CURRENT_RELEASE.version}.{" "}
          <Link href="/tour?track=whatsnew" className="text-accent hover:text-accent-hover">
            What&apos;s new
          </Link>{" "}
          ·{" "}
          <Link href="/home" className="text-accent hover:text-accent-hover">
            Back to Home →
          </Link>
        </p>
      </Section>
    </div>
  );
}

const FAQ = [
  {
    q: "Tapping Text opens a web page instead of Messages",
    a: "That happens on a computer, which has no texting app. Use PingPath on your phone to send texts and WhatsApps.",
  },
  {
    q: "The Instagram message didn't fill in",
    a: "Instagram doesn't let any app pre-fill a DM. PingPath copies the message for you: long-press the message box in Instagram and tap Paste.",
  },
  {
    q: "Someone's birthday isn't showing on Home",
    a: "Check their contact page has a birthday. If it comes from Google Calendar, look on Home under “From your calendar, not linked yet” and link it to them.",
  },
  {
    q: "Calendar sync shows an error",
    a: "The secret address was probably reset in Google. Copy a fresh one, then in Settings › Calendar sync remove the old calendar and connect the new link.",
  },
  {
    q: "I marked something as sent by mistake",
    a: "On a roster, untick Sent. In the Blast Deck, tap Undo. On Home, tap Wished ✓ to clear it.",
  },
  {
    q: "A contact has disappeared",
    a: "They're probably hidden. On Contacts, tick Show hidden, open them, and tick Visible in contact list.",
  },
  {
    q: "Can I change a birthday that came from Google Calendar?",
    a: "Change it in Google Calendar and it updates on the next sync. Or tap Unlink on their contact page and type the date in yourself.",
  },
  {
    q: "The bottom menu looks cut off on my iPhone",
    a: "If PingPath is on your home screen, close it fully (swipe it away) and open it again to load the latest version.",
  },
];

function Section({
  id,
  who,
  title,
  tour,
  children,
}: {
  id: string;
  who: string;
  title: string;
  /** The tour step that shows this part of the app. */
  tour?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-line py-10">
      <p className={`text-xs uppercase tracking-[0.14em] mb-1.5 ${who === "Everyone" ? "text-muted" : "text-teal"}`}>{who}</p>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-6">
        <h2 className="font-display text-2xl md:text-3xl text-balance">{title}</h2>
        {tour && (
          <Link href={`/tour?s=${tour}`} className="text-sm text-accent hover:text-accent-hover whitespace-nowrap">
            Show me in the tour →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Arrow() {
  return (
    <span className="text-muted text-xl leading-none" aria-hidden>
      <span className="sm:hidden">↓</span>
      <span className="hidden sm:inline">→</span>
    </span>
  );
}

/** A table that becomes stacked label/value rows on phones. */
function Rows({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  const cols = head.length === 3 ? "sm:grid-cols-[130px_minmax(0,1fr)_130px]" : "sm:grid-cols-[220px_minmax(0,1fr)]";
  return (
    <div className="rounded-xl border border-line overflow-hidden text-sm">
      <div className={`hidden sm:grid ${cols} gap-3 bg-surface-2 text-xs text-muted px-3 py-2`}>
        {head.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      <div className="divide-y divide-line">
        {rows.map((r, i) => (
          <div key={i} className={`grid ${cols} gap-x-3 gap-y-0.5 px-3 py-2.5`}>
            {r.map((cell, k) => (
              <span key={k} className={k === 0 ? "font-medium sm:font-normal" : "text-muted min-w-0"}>
                {head.length === 3 && k === 2 ? <span className="sm:hidden text-xs">Needs: </span> : null}
                {cell}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Tick({ on }: { on?: boolean }) {
  return (
    <span
      className={`inline-flex w-2.5 h-2.5 shrink-0 rounded-[3px] border items-center justify-center text-[7px] leading-none ${
        on ? "bg-accent border-accent text-bg" : "border-muted/60"
      }`}
      aria-hidden
    >
      {on ? "✓" : ""}
    </span>
  );
}

function ProgressDots({ sent, total }: { sent: number; total: number }) {
  return (
    <span className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full border border-accent ${i < sent ? "bg-accent" : ""}`} />
      ))}
    </span>
  );
}

function StepPill({ n, sent }: { n: number; sent?: boolean }) {
  const edge = sent ? "border-moss/40" : "border-line";
  return (
    <span className={`inline-flex items-stretch rounded-md border overflow-hidden text-[8.5px] ${edge}`}>
      <span className={`px-1.5 py-0.5 ${sent ? "bg-moss/10 text-moss" : "text-muted"}`}>#{n}</span>
      <span className={`px-1.5 py-0.5 border-l text-accent ${edge}`}>Open</span>
      <span className={`px-1.5 py-0.5 border-l flex items-center gap-1 ${edge} ${sent ? "bg-moss/10 text-moss" : "text-muted"}`}>
        <Tick on={sent} />
        Sent
      </span>
    </span>
  );
}

function MonthKey() {
  const days = [26, 27, 28, 29, 30, 31, 1];
  const dots: Record<number, string[]> = { 26: [MOSS], 30: [GOLD, TEAL], 31: [RUST, MOSS] };
  return (
    <div>
      <H3>Month view</H3>
      <div className="mt-2 rounded-xl border border-line bg-surface/40 p-3">
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
            <span key={d} className="text-[10px] text-muted">
              {d}
            </span>
          ))}
          {days.map((d) => (
            <span
              key={d}
              className={`rounded-md py-1.5 tabular-nums ${d === 30 ? "bg-accent/15 text-accent" : d === 1 ? "text-muted" : ""}`}
            >
              {d}
              <span className="flex justify-center gap-0.5 mt-1 h-1.5">
                {(dots[d] || []).map((c, i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                ))}
              </span>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted">
          <span className="flex items-center gap-1.5"><Dot color={GOLD} /> Birthday</span>
          <span className="flex items-center gap-1.5"><Dot color={TEAL} /> Anniversary</span>
          <span className="flex items-center gap-1.5"><Dot color={RUST} /> Special date</span>
          <span className="flex items-center gap-1.5"><Dot color={MOSS} /> Holiday</span>
        </div>
      </div>
    </div>
  );
}

function ImportPair({ from, to }: { from: string; to: string }) {
  return (
    <>
      <span className="rounded-md border border-line bg-surface-2 px-2.5 py-1">{from}</span>
      <span className="text-muted" aria-hidden>
        →
      </span>
      <span className={`rounded-md border px-2.5 py-1 ${to.startsWith("—") ? "border-line text-muted" : "border-accent/50 text-accent"}`}>
        {to}
      </span>
    </>
  );
}

function AccountBox({ who, items }: { who: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-line bg-surface/40 p-4">
      <p className="flex items-center gap-2 font-medium">
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-teal" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        {who}
      </p>
      <ul className="mt-2 space-y-1 text-sm text-muted">
        {items.map((i) => (
          <li key={i} className="flex items-center gap-2">
            <Dot color={GREY} /> {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Place({ name, where, what }: { name: string; where: string; what: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface/40 p-4">
      <p className="text-xs text-muted">{name}</p>
      <p className="font-display text-lg">{where}</p>
      <p className="text-sm text-muted mt-1">{what}</p>
    </div>
  );
}
