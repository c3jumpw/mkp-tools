import { CURRENT_RELEASE, RELEASES } from "@/lib/changelog";
import type { Art } from "@/lib/tour/slides";

/** Drawings for tour steps about things that happen outside PingPath's own screens. */
export default function TourArt({ kind }: { kind: Art }) {
  return (
    <div className="mx-auto w-full max-w-[340px] md:max-w-none rounded-2xl border border-line bg-surface/40 p-4 space-y-3 text-sm">
      {kind === "sending" && <Sending />}
      {kind === "accounts" && <Accounts />}
      {kind === "install" && <Install />}
      {kind === "outside" && <Outside />}
      {kind === "whatsnew" && <WhatsNew />}
    </div>
  );
}

function Down() {
  return (
    <p className="text-center text-muted leading-none" aria-hidden>
      ↓
    </p>
  );
}

function Card({ title, children, gold }: { title: string; children: React.ReactNode; gold?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${gold ? "border-accent/40 bg-accent/[0.07]" : "border-line bg-surface"}`}>
      <p className="font-display text-base">{title}</p>
      <div className="text-xs text-muted mt-0.5">{children}</div>
    </div>
  );
}

function Sending() {
  const rows = [
    ["Text", "Messages opens to them with the message written.", "Phone"],
    ["WhatsApp", "Their WhatsApp chat opens with the message written.", "Phone"],
    ["Email", "A new email opens with the message as the body.", "Email"],
    ["Instagram DM", "Their chat opens and the message is copied, ready to paste.", "Instagram handle"],
  ];
  return (
    <>
      <Card title="PingPath">Writes the message with their name and finds their number or handle.</Card>
      <Down />
      <Card title="Your app" gold>
        Messages, WhatsApp, Mail or Instagram opens. You press send.
      </Card>
      <Down />
      <Card title="Them">It comes from your own number or account, like any message you send.</Card>
      <ul className="divide-y divide-line rounded-xl border border-line mt-1">
        {rows.map(([name, what, needs]) => (
          <li key={name} className="px-3 py-2">
            <p className="font-medium">{name}</p>
            <p className="text-xs text-muted">{what}</p>
            <p className="text-[11px] text-muted mt-0.5">Needs: {needs}</p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">A greyed-out button means that detail is missing. Add it on their contact page.</p>
    </>
  );
}

function Lock() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 text-teal shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function Board({ who, items }: { who: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="flex items-center gap-2 font-medium">
        <Lock /> {who}
      </p>
      <ul className="mt-1.5 space-y-0.5 text-xs text-muted list-disc pl-5">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function Accounts() {
  return (
    <>
      <Board who="Your login" items={["Your contacts and tags", "Your blasts and send history", "Your birthdays and calendar link"]} />
      <p className="text-center text-xs text-muted">never mix</p>
      <Board who="Someone else's login" items={["Their own contacts", "Their own blasts", "Starts empty"]} />
      <p className="rounded-xl border border-teal/40 bg-teal/10 px-3 py-2.5 text-xs">
        Nobody, admins included, can see another board. To work from the same contacts, people sign in with the same
        login.
      </p>
    </>
  );
}

function Steps({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div>
      <p className="font-medium mb-1.5">{title}</p>
      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-2.5 items-start">
            <span className="w-5 h-5 shrink-0 rounded-full border border-accent/60 text-accent text-[11px] flex items-center justify-center tabular-nums">
              {i + 1}
            </span>
            <span className="text-xs text-muted pt-0.5">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Install() {
  return (
    <>
      <Steps title="iPhone" steps={["Open your PingPath link in Safari.", "Tap the Share button.", "Tap Add to Home Screen, then Add."]} />
      <div className="border-t border-line" />
      <Steps title="Android" steps={["Open your PingPath link in Chrome.", "Tap the ⋮ menu.", "Tap Add to Home screen."]} />
      <p className="text-xs text-muted">After an update, close the app fully (swipe it away) and open it again to get the newest version.</p>
    </>
  );
}

function Outside() {
  const rows: [string, string][] = [
    ["Change the invite code", "Vercel › project pingpath › Settings › Environment Variables › SIGNUP_CODE, then redeploy."],
    ["See accounts or reset a password", "Supabase › your project › Authentication › Users. The app has no “forgot password” screen yet."],
    ["Site says paused or payment required", "Vercel › team settings › Billing. The app and data are safe; hosting is on hold."],
    ["A calendar link was shared by mistake", "Google Calendar › that calendar's settings › reset the secret address, then reconnect it in Calendar sync."],
  ];
  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      {rows.map(([job, where]) => (
        <li key={job} className="px-3 py-2.5">
          <p className="font-medium">{job}</p>
          <p className="text-xs text-muted mt-0.5">{where}</p>
        </li>
      ))}
    </ul>
  );
}

function WhatsNew() {
  return (
    <>
      <div className="rounded-xl border border-accent/40 bg-accent/[0.07] p-3">
        <p className="text-[11px] uppercase tracking-wider text-accent">
          {CURRENT_RELEASE.version} · {CURRENT_RELEASE.date}
        </p>
        <p className="font-display text-base">{CURRENT_RELEASE.title}</p>
        <ul className="mt-1 space-y-0.5 text-xs text-muted list-disc pl-5">
          {CURRENT_RELEASE.items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </div>
      <p className="text-xs uppercase tracking-wider text-muted pt-1">Earlier</p>
      <ul className="space-y-2.5">
        {RELEASES.slice(1).map((r) => (
          <li key={r.version}>
            <p className="text-xs">
              <span className="font-medium">{r.title}</span>{" "}
              <span className="text-muted">
                · {r.version} · {r.date}
              </span>
            </p>
            <ul className="text-xs text-muted list-disc pl-5">
              {r.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </>
  );
}
