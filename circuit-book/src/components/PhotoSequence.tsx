"use client";

import { useEffect, useRef, useState } from "react";
import { signedUrls } from "@/lib/images";

/**
 * An ordered photo sequence — start, mid, end of a movement.
 *
 * Advancing is by tap, never by swipe. Session mode already swipes horizontally
 * between stations, so a swipe here would fight it and feel broken on a phone.
 * The optional play button cycles frames, which reads as motion and is the
 * whole point of having a sequence rather than one shot.
 */
export default function PhotoSequence({
  paths,
  alt,
  className = "aspect-[4/3] w-full",
  autoPlayable = true,
}: {
  paths: string[];
  alt: string;
  className?: string;
  autoPlayable?: boolean;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    if (paths.length === 0) return;
    signedUrls(paths)
      .then((map) => {
        if (active) setUrls(map);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [paths]);

  // Reset when the sequence itself changes, so frame 3 of the last exercise
  // does not carry over to a two-frame one.
  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [paths.join("|")]);

  useEffect(() => {
    if (!playing || paths.length < 2) return;
    timer.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % paths.length);
    }, 900);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [playing, paths.length]);

  if (paths.length === 0) return null;

  const current = paths[Math.min(index, paths.length - 1)];
  const url = urls[current];
  const multiple = paths.length > 1;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (!multiple) return;
          setPlaying(false);
          setIndex((i) => (i + 1) % paths.length);
        }}
        aria-label={
          multiple ? `${alt}, frame ${index + 1} of ${paths.length}. Tap for the next frame.` : alt
        }
        className={`block overflow-hidden rounded-xl bg-surface ${className} ${
          multiple ? "cursor-pointer" : "cursor-default"
        }`}
      >
        {url ? (
          // Signed URLs from a private bucket; the optimizer has nothing to cache.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" decoding="async" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <PlaceholderMark />
          </span>
        )}
      </button>

      {multiple && (
        <>
          {/* Frame dots, bottom centre, over the photo. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {paths.map((p, i) => (
              <span
                key={p}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-lime" : "w-1.5 bg-chalk/45"
                }`}
              />
            ))}
          </div>

          {autoPlayable && (
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Stop cycling frames" : "Cycle through frames"}
              className="absolute right-2 bottom-2 flex h-9 w-9 items-center justify-center rounded-full bg-base/75 text-chalk backdrop-blur-sm"
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M5 3.5l8 4.5-8 4.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="4" y="3.5" width="3" height="9" rx="1" />
      <rect x="9" y="3.5" width="3" height="9" rx="1" />
    </svg>
  );
}

function PlaceholderMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="3.6" height="10" rx="1" fill="#333b37" />
      <rect x="8.6" y="7" width="3.6" height="10" rx="1" fill="#333b37" />
      <rect x="14.2" y="7" width="3.6" height="10" rx="1" fill="#2a312e" />
      <rect x="19.8" y="7" width="1.2" height="10" rx="0.6" fill="#2a312e" />
    </svg>
  );
}
