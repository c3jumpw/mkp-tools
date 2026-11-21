import type { Target } from "@/lib/tour/find";
import type { ScreenId } from "@/lib/tour/screens";

/**
 * Every step of the Getting started tour.
 *
 * When the app changes, update the steps here (and the change log in
 * src/data/changelog.json). The build checks that every page in src/app is
 * listed in some step's `covers`, that every `screen` exists, and that the
 * release notes match package.json. See TOUR.md.
 */
export type Track = "everyone" | "owner";

export type Callout = {
  label: string;
  note?: string;
  at: Target;
};

export type Art = "sending" | "accounts" | "install" | "outside" | "whatsnew";

export type Slide = {
  id: string;
  track: Track;
  chapter: string;
  title: string;
  body: string;
  /** A live sample screen to show. */
  screen?: ScreenId;
  /** Or a drawing, for things that happen outside the app. */
  art?: Art;
  callouts?: Callout[];
  /** Keep the screen scrolled to the top instead of moving to the callouts. */
  top?: boolean;
  tip?: string;
  /** App pages this step documents. The build fails if a page has no step. */
  covers?: string[];
};

/** Pages that deliberately have no step of their own. */
export const UNTOURED: Record<string, string> = {
  "/": "Redirects to /home.",
  "/tour": "The tour itself.",
};

export const SLIDES: Slide[] = [
  // ------------------------------------------------------------ everyone ---
  {
    id: "welcome",
    track: "everyone",
    chapter: "Start here",
    title: "Welcome to PingPath",
    body: "PingPath keeps your people, the dates that matter to them, and your outreach in one place. It never sends anything on its own: each message opens in your own Messages, WhatsApp, Mail or Instagram, already written, and you press send.",
    screen: "home/main",
    top: true,
    tip: "The screens in this tour are the real app filled with sample people, so nothing here is your data and nothing you see can be changed. Use Next, or the arrow keys on a computer.",
    covers: ["/home"],
  },
  {
    id: "menus",
    track: "everyone",
    chapter: "Start here",
    title: "Getting around",
    body: "The same menu is on every screen. On a computer it runs down the left side instead.",
    screen: "home/main",
    top: true,
    callouts: [
      { label: "PingPath logo", note: "Takes you back to Home from anywhere.", at: { sel: 'header a[href="/home"]' } },
      { label: "? Guide", note: "The illustrated guide, with links back into this tour.", at: { sel: 'header a[aria-label="Guide"]' } },
      { label: "Settings", note: "Calendar sync, importing, duplicates, this tour and signing out.", at: { sel: 'header a[aria-label="Settings"]' } },
      { label: "Bottom menu", note: "Home, Contacts, Blasts, Tags and Settings. The gold one is where you are.", at: { sel: "nav.fixed" } },
    ],
  },
  {
    id: "home-today",
    track: "everyone",
    chapter: "Home",
    title: "Today on Home",
    body: "Home opens on today's birthdays, anniversaries and special dates, then what's coming up next.",
    screen: "home/main",
    top: true,
    callouts: [
      { label: "Quick add", note: "Add a person, their birthday and a special date in one form.", at: { sel: "button", text: "Quick add" } },
      { label: "Today", note: "Everything happening today.", at: { sel: "h2", text: "Today", exact: true, up: "section" } },
      { label: "Send wishes", note: "Opens a ready-made message. More on the next step.", at: { sel: "button", text: "Send wishes" } },
      { label: "Wished ✓", note: "Shows once you've sent wishes this year. Tap it to undo.", at: { sel: "button", text: "Wished" } },
    ],
    covers: ["/home"],
  },
  {
    id: "home-wish",
    track: "everyone",
    chapter: "Home",
    title: "Sending wishes",
    body: "Pick how to send. Your app opens with the message filled in; you send it there, and PingPath marks this year's wishes as done.",
    screen: "home/wish",
    callouts: [
      { label: "The message", note: "Starts with their nickname or first name. Change anything you like.", at: { sel: "#wish-message" } },
      { label: "Pick a channel", note: "Only the ways you have details for appear.", at: { sel: "button", text: "Text", exact: true, up: "div.grid" } },
      { label: "Their second number", note: "A labeled second number gets its own buttons.", at: { sel: "button", text: "Text · Work" } },
    ],
    tip: "Instagram doesn't let any app fill in a message, so PingPath copies it for you. In the chat, press and hold, then tap Paste.",
  },
  {
    id: "home-calendar",
    track: "everyone",
    chapter: "Home",
    title: "The week and the month",
    body: "This week lists the next seven days. Month shows a calendar with a dot for each date; holidays are added for you.",
    screen: "home/month",
    callouts: [
      { label: "This week / Month", note: "Switch between the list and the calendar.", at: { sel: '[role="tablist"]' } },
      { label: "Tap a day", note: "Shows only that day. Tap it again for the whole month.", at: { sel: 'button[aria-pressed="true"]' } },
      { label: "Colour key", note: "Gold birthdays, teal anniversaries, red special dates, green holidays.", at: { sel: "span", text: "Holiday", exact: true, up: "div" } },
    ],
  },
  {
    id: "home-calendar-links",
    track: "everyone",
    chapter: "Home",
    title: "Dates from your Google Calendar",
    body: "Once your birthdays calendar is connected (Settings › Calendar sync), its dates show up here. Exact name matches link to the contact automatically; the rest wait for you.",
    screen: "home/main",
    callouts: [
      { label: "Not linked yet", note: "Dates whose name didn't exactly match a contact.", at: { sel: "h2", text: "From your calendar, not linked yet" } },
      { label: "One-tap link", note: "PingPath suggests likely matches.", at: { sel: "button", text: "Link to Maya Rodriguez" } },
      { label: "Add as contact", note: "Creates the person and links the date to them.", at: { sel: "button", text: "+ Add as contact" } },
      { label: "Sync status", note: "It re-syncs on its own every few hours. Sync now refreshes straight away.", at: { sel: "button", text: "Sync now", up: "section" } },
    ],
  },
  {
    id: "home-quickadd",
    track: "everyone",
    chapter: "Home",
    title: "Quick add",
    body: "The fastest way to add someone, including their birthday and one special date.",
    screen: "home/quickadd",
    callouts: [
      { label: "Name", note: "The only thing you have to fill in.", at: { sel: "#qa-name" } },
      { label: "Second number", note: "Label it with a tap (Work, Home…) or type your own.", at: { sel: "#qa-phone2-label", up: "div.grid" } },
      { label: "Birthday", note: "Month and day. The year is optional; with it, Home shows their age.", at: { sel: "#qa-birthday-month", up: "div.grid" } },
    ],
  },
  {
    id: "contacts-list",
    track: "everyone",
    chapter: "Contacts",
    title: "Your contacts",
    body: "Everyone you reach out to, with search and filters.",
    screen: "contacts/list",
    top: true,
    callouts: [
      { label: "Add contact", note: "Every detail, including Instagram, TikTok, notes and tags.", at: { sel: "button", text: "+ Add contact" } },
      { label: "Search", note: "By name, either phone number, email or Instagram handle.", at: { sel: 'input[placeholder^="Search"]' } },
      { label: "Filters", note: "One tag or one status at a time. Tick Show hidden to see hidden people.", at: { sel: "select", nth: 0 } },
      { label: "Status dot", note: "Green active, grey wrong number, red do not contact.", at: { sel: 'span[title="Active"]', nth: 0 } },
    ],
    covers: ["/contacts"],
  },
  {
    id: "contacts-bulk",
    track: "everyone",
    chapter: "Contacts",
    title: "Many people at once",
    body: "Tick people, then use the bar that appears. Your ticks and filters are remembered when you open someone and come back.",
    screen: "contacts/bulk",
    top: true,
    callouts: [
      { label: "Tick boxes", note: "Or use Select all.", at: { sel: 'input[type="checkbox"]:checked', nth: 0 } },
      { label: "Add to a tag or blast", note: "Puts everyone you ticked into a tag, or straight into a blast.", at: { sel: "select", text: "Add to tag" } },
      { label: "Hide, mark active or delete", note: "Delete asks first and can't be undone. Hide keeps them, out of the list.", at: { sel: "button", text: "Delete", exact: true } },
    ],
  },
  {
    id: "contacts-add",
    track: "everyone",
    chapter: "Contacts",
    title: "Adding someone",
    body: "Add contact takes every detail. Add birthdays and special dates on their page afterwards, or use Quick add on Home.",
    screen: "contacts/add",
    callouts: [
      { label: "Full name", note: "The only required field.", at: { sel: 'input[name="full_name"]' } },
      { label: "Second number", note: "With a label you choose.", at: { sel: 'input[name="phone2"]', up: "div.grid" } },
    ],
  },
  {
    id: "contact-details",
    track: "everyone",
    chapter: "A contact's page",
    title: "Their details",
    body: "Tap any field to change it. Save changes appears as soon as you edit something.",
    screen: "contacts/detail",
    top: true,
    callouts: [
      { label: "Status", note: "Active, Invalid or Do not contact.", at: { sel: "span", text: "Active", exact: true } },
      { label: "Second number, labeled", note: "The label shows here and on the Send wishes buttons.", at: { sel: "label", text: "Phone 2 · Work", up: "div" } },
      { label: "Label suggestions", note: "Mobile, Work, Home, WhatsApp, Old number, or your own word.", at: { sel: "#contact-phone2-label", up: "div" } },
      { label: "Open their profile", note: "Opens the Instagram app if it's installed.", at: { sel: "button", text: "Open Instagram profile" } },
    ],
    covers: ["/contacts/[id]"],
  },
  {
    id: "contact-dates",
    track: "everyone",
    chapter: "A contact's page",
    title: "Birthday and special dates",
    body: "A birthday, plus as many special dates as you like: an anniversary, or any event you name.",
    screen: "contacts/detail",
    callouts: [
      { label: "Birthday", note: "Add the year to see the age they're turning.", at: { sel: "#contact-birthday-month", up: "div.rounded-xl" } },
      { label: "Special dates", note: "Tap Edit to change or delete one.", at: { sel: "button", text: "Edit", exact: true, nth: 0, up: "div.rounded-xl" } },
      { label: "Add another", note: "Choose Anniversary or Other event…, then name it.", at: { sel: "button", text: "+ Add special date" } },
    ],
    tip: "Dates that come from your Google Calendar say so. Change those in Google Calendar, or tap Unlink and type the date here.",
  },
  {
    id: "contact-tags",
    track: "everyone",
    chapter: "A contact's page",
    title: "Tags, status and hiding",
    body: "Further down the page: their tags, and whether they can be contacted.",
    screen: "contacts/detail",
    callouts: [
      { label: "Tags", note: "Tap + to add a tag, × to take one off.", at: { sel: "label", text: "Tags", exact: true, up: "section" } },
      { label: "Status", note: "Do not contact hides the Send wishes button and skips them in the Blast Deck.", at: { sel: "label", text: "Status", exact: true, up: "div" } },
      { label: "Visible in contact list", note: "Untick to hide someone without deleting them.", at: { sel: "label", text: "Visible in contact list" } },
    ],
  },
  {
    id: "contact-history",
    track: "everyone",
    chapter: "A contact's page",
    title: "Their blasts and history",
    body: "At the bottom: every blast they're in, and a log of everything sent.",
    screen: "contacts/detail",
    callouts: [
      { label: "Blasts they're in", note: "Filled dots are the steps they've had.", at: { sel: "a", text: "Q4 Outreach", up: "div.rounded-xl" } },
      { label: "Step buttons", note: "Open writes the message in your app; tick Sent once it's gone.", at: { sel: "button", text: "Open", exact: true, nth: 0, up: "div" } },
      { label: "Activity", note: "Each send and each wish is recorded here.", at: { sel: "h2", text: "Activity", up: "section" } },
    ],
  },
  {
    id: "tags-list",
    track: "everyone",
    chapter: "Tags",
    title: "Tags group people",
    body: "Groups like Church group or Warm leads. Use them to filter contacts, or to add a whole group to a blast in one tap.",
    screen: "tags/list",
    top: true,
    callouts: [
      { label: "Make a tag", note: "Name it, pick a colour, tap Add.", at: { sel: 'input[placeholder="e.g. warm-lead"]', up: "div.rounded-xl" } },
      { label: "Open a tag", note: "Shows how many people have it.", at: { sel: "a", text: "Church group" } },
      { label: "Rename or delete", note: "Deleting a tag keeps the people.", at: { sel: "button", text: "Rename", nth: 0 } },
    ],
    covers: ["/tags"],
  },
  {
    id: "tag-page",
    track: "everyone",
    chapter: "Tags",
    title: "Inside a tag",
    body: "Everyone with the tag, with both numbers and birthdays. Work through the list and fix details as you go.",
    screen: "tags/detail",
    top: true,
    callouts: [
      { label: "Add people", note: "Search and tick several at once.", at: { sel: "button", text: "+ Add people" } },
      { label: "Search this tag", at: { sel: "#tag-search" } },
      { label: "Tap anyone to edit", note: "Opens a quick edit sheet. Next step.", at: { sel: "button", text: "Jordan Ellis" } },
    ],
    covers: ["/tags/[id]"],
  },
  {
    id: "tag-edit",
    track: "everyone",
    chapter: "Tags",
    title: "Edit without leaving the tag",
    body: "Change their name, numbers, label, email, Instagram, birthday or notes, then Save. You land back on the same list.",
    screen: "tags/edit",
    callouts: [
      { label: "Full profile", note: "Jumps to their whole page.", at: { sel: "a", text: "Full profile" } },
      { label: "Numbers and label", at: { sel: "#edit-phone2", up: "div.grid" } },
      { label: "Remove from this tag", note: "Takes them out of the tag only. The contact stays.", at: { sel: "button", text: "Remove from" } },
      { label: "Save", at: { sel: "button", text: "Save", exact: true } },
    ],
  },
  {
    id: "blasts-list",
    track: "everyone",
    chapter: "Blasts",
    title: "Blasts: messages in steps",
    body: "A blast is a group of people plus the messages you plan to send them in order: an intro, a follow-up, a last nudge. PingPath tracks who has had which step.",
    screen: "blasts/list",
    top: true,
    callouts: [
      { label: "New blast", note: "Name it, then add steps and people.", at: { sel: "button", text: "+ New blast" } },
      { label: "A blast", note: "How many people, how many sent, how many replied.", at: { sel: "a", text: "Q4 Outreach" } },
      { label: "Archive or delete", note: "Archive tucks finished blasts away. Delete removes their history too.", at: { sel: "button", text: "Archive", exact: true, nth: 0 } },
      { label: "Show archived", at: { sel: "label", text: "Show archived" } },
    ],
    covers: ["/blasts"],
  },
  {
    id: "blast-overview",
    track: "everyone",
    chapter: "Blasts",
    title: "Inside a blast",
    body: "Notes and progress at the top, then the messages, then the people.",
    screen: "blasts/detail",
    top: true,
    callouts: [
      { label: "Notes", note: "Anything worth remembering. Save notes appears when you type.", at: { sel: "textarea", nth: 0 } },
      { label: "Stats", note: "People, messages sent, replies, and each step's progress.", at: { sel: "h2", text: "Stats", up: "section" } },
    ],
    covers: ["/blasts/[id]"],
  },
  {
    id: "blast-steps",
    track: "everyone",
    chapter: "Blasts",
    title: "Writing the steps",
    body: "Each step is one message on one channel. Add as many follow-ups as you need.",
    screen: "blasts/edit-step",
    callouts: [
      { label: "Channel", note: "Text, WhatsApp, Instagram DM or Email.", at: { sel: "select", nth: 0 } },
      { label: "Name fill-ins", note: "Tap {first_name}, {nickname} or {name}; each person gets their own.", at: { sel: "button", text: "{first_name}", up: "div" } },
      { label: "Add the next step", at: { sel: "button", text: "+ Add step" } },
    ],
  },
  {
    id: "blast-roster",
    track: "everyone",
    chapter: "Blasts",
    title: "Who's had what",
    body: "The roster lists everyone in the blast, with a button for each step. Swipe the table sideways to see every step.",
    screen: "blasts/roster",
    callouts: [
      { label: "Add people", note: "Pick them one by one, or a whole tag at once.", at: { sel: "button", text: "+ Add contacts" } },
      { label: "Open, then Sent", note: "Open writes the message in your app and never marks anything. Tick Sent once it's really gone; green means done.", at: { sel: "tbody button", text: "Open", exact: true, nth: 0, up: "div" } },
      { label: "Blast Deck", note: "Sends one step to everyone, one card at a time.", at: { sel: 'a[href^="/deck/"]' } },
    ],
  },
  {
    id: "blast-add",
    track: "everyone",
    chapter: "Blasts",
    title: "Adding people to a blast",
    body: "Pick people from your contacts, or switch to By tag and add a whole group in one tap.",
    screen: "blasts/add",
    callouts: [
      { label: "Pick contacts / By tag", at: { sel: "button", text: "Pick contacts", up: "div" } },
      { label: "A whole tag", note: "Everyone with that tag joins the blast.", at: { sel: "button", text: "Add everyone tagged", nth: 0 } },
    ],
  },
  {
    id: "deck-setup",
    track: "everyone",
    chapter: "Blast Deck",
    title: "Blast Deck: choose the step",
    body: "Blast Deck sends one step to the whole roster, one person at a time, without hunting through the list.",
    screen: "deck/setup",
    top: true,
    callouts: [
      { label: "Which step", note: "Each shows how many people still need it.", at: { sel: "h2", text: "Which step?", up: "section" } },
      { label: "Who's included", note: "Untick anyone to leave them out this time.", at: { sel: "ul" } },
      { label: "Start", at: { sel: "button", text: "Start deck" } },
    ],
    covers: ["/deck/[id]"],
  },
  {
    id: "deck-card",
    track: "everyone",
    chapter: "Blast Deck",
    title: "Blast Deck: one card at a time",
    body: "Tap Open, send the message in your app, then come back. The card is marked sent and the next one slides up.",
    screen: "deck/running",
    top: true,
    callouts: [
      { label: "Progress", note: "Which step, which card, how many sent.", at: { sel: "header" } },
      { label: "Their message", note: "Already personalised.", at: { sel: "p", text: "Hi Maya", up: "div" } },
      { label: "Open", at: { sel: "button", text: "Open WhatsApp" } },
      { label: "Skip for now", note: "Moves on without marking anything.", at: { sel: "button", text: "Skip for now" } },
    ],
    tip: "If the card hasn't moved on when you come back, tap Sent — next card. For a few seconds after each send there's an Undo, in case you marked the wrong one.",
  },
  {
    id: "sending",
    track: "everyone",
    chapter: "Sending",
    title: "How sending works",
    body: "PingPath writes each message with the person's name and finds the right number or handle. Your own app sends it, from your own number or account.",
    art: "sending",
  },
  {
    id: "settings-menu",
    track: "everyone",
    chapter: "Settings",
    title: "Settings",
    body: "Everything that isn't a list of people lives here.",
    screen: "settings/menu",
    top: true,
    callouts: [
      { label: "This tour", at: { sel: "a", text: "Getting started tour" } },
      { label: "What's new", note: "Notes from every update.", at: { sel: "a", text: "What's new" } },
      { label: "Calendar sync", note: "Connect your Google birthdays calendar.", at: { sel: "a", text: "Calendar sync" } },
      { label: "Import and duplicates", note: "Bring in a list; clean up doubles.", at: { sel: "a", text: "Import contacts" } },
    ],
    covers: ["/settings"],
  },
  {
    id: "settings-calendar",
    track: "everyone",
    chapter: "Settings",
    title: "Connecting your birthdays calendar",
    body: "PingPath reads your Google birthdays calendar through its secret link. It only reads it; it never changes it.",
    screen: "settings/calendar",
    callouts: [
      { label: "Your connected calendar", note: "What it found, with Sync now and Remove.", at: { sel: "section", nth: 0 } },
      { label: "Where to find the link", note: "Do this on a computer; Google's phone app doesn't show it.", at: { sel: "ol" } },
      { label: "Paste it here", note: "Treat it like a password. PingPath keeps it on the server and only shows it masked.", at: { sel: "#feed-url" } },
    ],
    covers: ["/settings/calendar"],
  },
  {
    id: "settings-import",
    track: "everyone",
    chapter: "Settings",
    title: "Importing a list",
    body: "Export a CSV from Google Contacts, iCloud or your phone, then upload or paste it.",
    screen: "contacts/import",
    callouts: [
      { label: "Upload or paste", at: { sel: "label", text: "Choose CSV file" } },
      { label: "Match the columns", note: "PingPath guesses; fix any that are wrong. Full name must be matched.", at: { sel: "h2", text: "Map columns" } },
      { label: "Import", note: "Anyone whose phone number is already in PingPath is skipped.", at: { sel: "button", text: "Import 3 contacts" } },
    ],
    covers: ["/contacts/import"],
  },
  {
    id: "settings-duplicates",
    track: "everyone",
    chapter: "Settings",
    title: "Finding duplicates",
    body: "Groups people who share a phone number, email or exact name. Nothing is deleted until you confirm.",
    screen: "contacts/duplicates",
    top: true,
    callouts: [
      { label: "Why they match", at: { sel: "span", text: "same phone" } },
      { label: "Suggested keep", note: "The oldest entry is kept; the rest are ticked for deletion.", at: { sel: "span", text: "suggested keep", nth: 0 } },
      { label: "Not duplicates", note: "Hides a group that's fine.", at: { sel: "button", text: "Not duplicates", nth: 0 } },
      { label: "Delete", at: { sel: "button", text: "Delete", nth: 0 } },
    ],
    covers: ["/contacts/duplicates"],
  },
  {
    id: "whats-new",
    track: "everyone",
    chapter: "You're set",
    title: "What's new after each update",
    body: "The first time you open PingPath after an update, a note shows what changed. It shows once for your account, on whichever device you use, and only lists the changes that apply to you. If you missed a few updates, it catches you up on all of them.",
    screen: "home/whatsnew",
    top: true,
    callouts: [
      { label: "What changed", note: "New, improved or fixed, and where in the app.", at: { sel: "[data-whatsnew] li", nth: 0 } },
      { label: "Show me", note: "Jumps to the tour step for that change.", at: { sel: "[data-whatsnew] a", text: "Show me" } },
      { label: "Got it", note: "Closes it until the next update. Settings › What's new shows it again.", at: { sel: "button", text: "Got it" } },
    ],
  },
  {
    id: "done",
    track: "everyone",
    chapter: "You're set",
    title: "Find this again any time",
    body: "Settings › Getting started tour replays these steps, and ? at the top opens the guide. Settings › What's new shows the latest update again.",
    screen: "settings/menu",
    top: true,
    callouts: [
      { label: "Guide", note: "The illustrated reference, with links into this tour.", at: { sel: 'header a[aria-label="Guide"]' } },
      { label: "Getting started tour", at: { sel: "a", text: "Getting started tour" } },
    ],
    covers: ["/guide"],
  },

  // --------------------------------------------------------------- owner ---
  {
    id: "owner-accounts",
    track: "owner",
    chapter: "Accounts",
    title: "How accounts work",
    body: "Each login is its own private board: its own contacts, tags, blasts and dates. Boards never mix, and nobody, admins included, can see another board. People who need the same contacts sign in with the same login. Your login is also the admin, which adds the change log in Settings › Admin.",
    art: "accounts",
  },
  {
    id: "owner-invite",
    track: "owner",
    chapter: "Accounts",
    title: "Inviting someone",
    body: "Send them your PingPath link and the invite code. They open Create your account, enter the code, their email and a password, confirm their email if asked, and sign in.",
    screen: "signup/form",
    top: true,
    callouts: [
      { label: "Invite code", note: "You set it in Vercel (see Jobs outside the app).", at: { sel: "#code" } },
      { label: "Email and password", note: "At least 8 characters.", at: { sel: "#email" } },
      { label: "Create account", at: { sel: "button", text: "Create account" } },
    ],
    covers: ["/signup", "/login"],
  },
  {
    id: "owner-install",
    track: "owner",
    chapter: "Setup",
    title: "Installing on a phone",
    body: "PingPath works in the browser, but it's quicker from the home screen, where it opens full-screen like an app and starts on Home.",
    art: "install",
  },
  {
    id: "owner-calendar",
    track: "owner",
    chapter: "Setup",
    title: "Each board's birthdays calendar",
    body: "Each person connects their own Google calendar on their own board. If a secret link is ever shared by mistake, reset it in Google Calendar, then Remove the old one here and connect the new link.",
    screen: "settings/calendar",
    callouts: [
      { label: "Remove", note: "Dates imported from that calendar go too; typed-in birthdays stay.", at: { sel: "button", text: "Remove", exact: true } },
      { label: "Secret address", at: { sel: "#feed-url" } },
    ],
  },
  {
    id: "owner-outside",
    track: "owner",
    chapter: "Setup",
    title: "Jobs done outside the app",
    body: "A few owner jobs happen in the services PingPath runs on.",
    art: "outside",
  },
  {
    id: "owner-updates",
    track: "owner",
    chapter: "Updates",
    title: "The change log",
    body: "Settings › Admin keeps every update since launch, in date order. Each change says who it applies to: Everyone changes show in all users' What's new the first time they open PingPath afterwards; Admin only changes show just to admins. An update can't go live without an entry here, or with a screen missing from this tour.",
    screen: "settings/changelog",
    top: true,
    callouts: [
      { label: "At a glance", note: "Live version, number of updates and changes.", at: { sel: "[data-log-stats]" } },
      { label: "Who sees what", at: { sel: "[data-log-audience]" } },
      { label: "Order and filter", note: "Oldest or newest first; everyone or admin-only changes.", at: { sel: "[data-log-controls] [role=group]", nth: 0 } },
      { label: "Download", note: "A spreadsheet (CSV) or data file (JSON) to keep a copy.", at: { sel: "[data-log-download]" } },
    ],
    covers: ["/admin"],
  },
];

export function slidesFor(track: Track): Slide[] {
  return SLIDES.filter((s) => s.track === track);
}

export function findSlide(id: string): Slide | undefined {
  return SLIDES.find((s) => s.id === id);
}
