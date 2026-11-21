export type ContactStatus = "active" | "invalid" | "do_not_contact";

export type Channel = "sms" | "whatsapp" | "instagram" | "email";

export type Tag = {
  id: string;
  name: string;
  color: string;
};

export type Contact = {
  id: string;
  full_name: string;
  nickname: string | null;
  phone: string | null;
  phone2: string | null;
  /** What the second number is, e.g. "Work". */
  phone2_label?: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  email: string | null;
  notes: string;
  status: ContactStatus;
  visible: boolean;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
};

export type EventRow = {
  id: string;
  name: string;
  description: string;
  notes: string;
  archived: boolean;
  created_at: string;
  contact_count?: number;
  sent_count?: number;
  responded_count?: number;
};

export type Sequence = {
  id: string;
  event_id: string;
  step_number: number;
  channel: Channel;
  body: string;
};

export type EventContact = {
  id: string;
  event_id: string;
  contact_id: string;
  current_step: number;
  responded: boolean;
  last_channel_sent: Channel | null;
  last_sent_at: string | null;
  added_at: string;
  contact?: Contact;
  /** step_number -> when/how it was marked sent */
  sent_steps?: Record<number, { channel: Channel; sent_at: string }>;
};

export type ActivityLogEntry = {
  id: string;
  contact_id: string;
  event_id: string | null;
  message: string;
  created_at: string;
};

export type OccasionKind = "birthday" | "anniversary" | "other";

export type Occasion = {
  id: string;
  contact_id: string | null;
  kind: OccasionKind;
  /** The name as written in the calendar event, e.g. "Mom & Dad". */
  label: string;
  month: number;
  day: number;
  /** Birth/wedding year, only when actually known. */
  year: number | null;
  source: "manual" | "calendar";
  feed_id: string | null;
  external_uid: string | null;
  dismissed: boolean;
  last_wished_year: number | null;
  contact?: Contact | null;
};

export type CalendarFeed = {
  id: string;
  name: string;
  url: string;
  last_synced_at: string | null;
  last_error: string | null;
  last_result: { found: number; linked: number; unlinked: number; removed: number } | null;
  created_at: string;
};

export const OCCASION_LABEL: Record<OccasionKind, string> = {
  birthday: "Birthday",
  anniversary: "Anniversary",
  other: "Special date",
};

export const PHONE_LABEL_SUGGESTIONS = ["Mobile", "Work", "Home", "WhatsApp", "Old number"];

export const STATUS_LABEL: Record<ContactStatus, string> = {
  active: "Active",
  invalid: "Invalid",
  do_not_contact: "Do not contact",
};

export const CHANNEL_LABEL: Record<Channel, string> = {
  sms: "Text",
  whatsapp: "WhatsApp",
  instagram: "Instagram DM",
  email: "Email",
};
