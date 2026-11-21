import type { Channel, Contact } from "@/lib/types";

/** Replace {first_name} / {nickname} / {name} placeholders in a message template. */
export function renderTemplate(body: string, contact: Contact): string {
  const first = contact.full_name.trim().split(/\s+/)[0] || contact.full_name;
  const nickname = contact.nickname?.trim() || first;
  return body
    .replaceAll("{first_name}", first)
    .replaceAll("{nickname}", nickname)
    .replaceAll("{name}", contact.full_name);
}

export const TEMPLATE_VARIABLES: { token: string; label: string }[] = [
  { token: "{first_name}", label: "First name" },
  { token: "{nickname}", label: "Nickname" },
  { token: "{name}", label: "Full name" },
];

function digitsOnly(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

/** iOS and Android use different separators before the sms: body param. */
export function isLikelyIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export type SendLinkResult =
  | { kind: "link"; href: string; copyText?: string; note?: string }
  | { kind: "unavailable"; reason: string };

/**
 * Build the link (and, where the platform can't prefill, the text to copy)
 * for sending one rendered message to one contact over one channel.
 * This never touches the database — opening the link and marking a step
 * "sent" are separate, deliberate actions.
 */
export function buildSendLink(
  channel: Channel,
  contact: Contact,
  message: string
): SendLinkResult {
  if (channel === "sms") {
    if (!contact.phone) {
      return { kind: "unavailable", reason: "No phone number on file" };
    }
    const separator = isLikelyIOS() ? "&" : "?";
    const href = `sms:${digitsOnly(contact.phone)}${separator}body=${encodeURIComponent(
      message
    )}`;
    return { kind: "link", href };
  }

  if (channel === "whatsapp") {
    if (!contact.phone) {
      return { kind: "unavailable", reason: "No phone number on file" };
    }
    const num = digitsOnly(contact.phone).replace(/^\+/, "");
    const href = `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
    return { kind: "link", href };
  }

  if (channel === "email") {
    if (!contact.email) {
      return { kind: "unavailable", reason: "No email on file" };
    }
    const href = `mailto:${encodeURIComponent(contact.email)}?body=${encodeURIComponent(
      message
    )}`;
    return { kind: "link", href };
  }

  // Instagram DMs can't be prefilled by any app - open the thread and let
  // the person paste the copied message.
  if (!contact.instagram_handle) {
    return { kind: "unavailable", reason: "No Instagram handle on file" };
  }
  const handle = contact.instagram_handle.replace(/^@/, "");
  return {
    kind: "link",
    href: `https://ig.me/m/${handle}`,
    copyText: message,
    note: "Instagram can't prefill DMs — message copied, paste it in the thread.",
  };
}

export function instagramProfileUrl(handle: string): string {
  return `https://instagram.com/${handle.replace(/^@/, "")}`;
}

export function tiktokProfileUrl(handle: string): string {
  return `https://www.tiktok.com/@${handle.replace(/^@/, "")}`;
}

/**
 * Try a native app URI scheme first; if the page is still visible after a
 * beat (meaning nothing took over, so the app likely isn't installed),
 * open the web fallback in a new tab instead of losing the current page.
 */
function tryOpenApp(appUrl: string, webUrl: string) {
  if (typeof window === "undefined") return;
  let handedOff = false;
  const markHandedOff = () => {
    handedOff = true;
  };
  document.addEventListener("visibilitychange", markHandedOff, { once: true });
  window.location.href = appUrl;
  setTimeout(() => {
    document.removeEventListener("visibilitychange", markHandedOff);
    if (!handedOff) {
      window.open(webUrl, "_blank");
    }
  }, 1200);
}

/** Opens the Instagram app to a profile when installed, else the web profile. */
export function openInstagramProfile(handle: string) {
  const clean = handle.replace(/^@/, "").trim();
  tryOpenApp(`instagram://user?username=${clean}`, instagramProfileUrl(clean));
}

/**
 * Attempts to open the TikTok app to a profile, else the web profile.
 * TikTok's app-open scheme is undocumented and less reliable than
 * Instagram's — this is a best-effort attempt, not a guarantee.
 */
export function openTiktokProfile(handle: string) {
  const clean = handle.replace(/^@/, "").trim();
  tryOpenApp(`snssdk1233://user/profile/${clean}`, tiktokProfileUrl(clean));
}
