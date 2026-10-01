"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import { IMAGE_BUCKET } from "@/lib/database.types";

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.82;
const SIGNED_TTL_SECONDS = 60 * 60 * 6;

/**
 * Shrink and re-encode a photo in the browser before it ever leaves the phone.
 * A modern camera roll shot is 3–6 MB; a station photo needs nothing like that,
 * and uploading the original over stadium wifi is the slowest part of adding a
 * workout. Falls back to the untouched file if canvas encoding is unavailable.
 */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await loadBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    if ("close" in bitmap) bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    // If re-encoding somehow made it bigger, keep the original.
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // imageOrientation honours the EXIF rotation a phone camera writes,
      // otherwise portrait shots land sideways.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* fall through to the <img> path */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Upload a photo into the signed-in user's own folder in the bucket. */
export async function uploadWorkoutImage(file: File, userId: string): Promise<string> {
  const supabase = supabaseBrowser();
  const blob = await compressImage(file);
  const ext = blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() || "jpg");
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: false });

  if (error) throw error;
  return path;
}

export async function deleteWorkoutImage(path: string): Promise<void> {
  const supabase = supabaseBrowser();
  await supabase.storage.from(IMAGE_BUCKET).remove([path]);
}

/* ------------------------------------------------------------------------- */
/* Signed URL cache                                                          */
/* ------------------------------------------------------------------------- */

type CacheEntry = { url: string; expiresAt: number };
const signedCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string | null>>();

const STORAGE_KEY = "cb.signed.v1";
let restored = false;

function restore() {
  if (restored || typeof window === "undefined") return;
  restored = true;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
    const now = Date.now();
    for (const [path, entry] of Object.entries(parsed)) {
      if (entry.expiresAt > now) signedCache.set(path, entry);
    }
  } catch {
    /* a corrupt cache is not worth reporting; it just re-signs */
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(signedCache)));
  } catch {
    /* private mode or a full quota — the in-memory map still works */
  }
}

/**
 * Resolve storage paths to signed URLs, batching the ones not already cached.
 * The bucket is private, so every <img> needs a token; re-signing on each
 * render would put a request in front of every thumbnail.
 */
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  restore();
  const supabase = supabaseBrowser();
  const now = Date.now();
  const out: Record<string, string> = {};
  const missing: string[] = [];

  for (const path of new Set(paths.filter(Boolean))) {
    const hit = signedCache.get(path);
    // Re-sign a minute early so a URL cannot expire mid-render.
    if (hit && hit.expiresAt > now + 60_000) out[path] = hit.url;
    else missing.push(path);
  }

  if (missing.length === 0) return out;

  const key = missing.sort().join("|");
  const existing = inflight.get(key);
  if (existing) {
    await existing;
    for (const path of missing) {
      const hit = signedCache.get(path);
      if (hit) out[path] = hit.url;
    }
    return out;
  }

  const job = (async () => {
    const { data, error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .createSignedUrls(missing, SIGNED_TTL_SECONDS);
    if (error || !data) return null;
    const expiresAt = Date.now() + SIGNED_TTL_SECONDS * 1000;
    for (const row of data) {
      if (row.signedUrl && row.path) {
        signedCache.set(row.path, { url: row.signedUrl, expiresAt });
      }
    }
    persist();
    return null;
  })();

  inflight.set(key, job);
  try {
    await job;
  } finally {
    inflight.delete(key);
  }

  for (const path of missing) {
    const hit = signedCache.get(path);
    if (hit) out[path] = hit.url;
  }
  return out;
}

export function forgetSignedUrl(path: string) {
  signedCache.delete(path);
  persist();
}
