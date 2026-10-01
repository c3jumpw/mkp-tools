"use client";

import { useEffect, useState } from "react";
import { signedUrls } from "@/lib/images";

/**
 * A photo from the private bucket. Paths are signed on demand and the results
 * are cached, so a list of twenty workouts signs once rather than twenty times.
 */
export default function Thumb({
  path,
  alt,
  className = "",
  rounded = "rounded-lg",
}: {
  path: string | null;
  alt: string;
  className?: string;
  rounded?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl(null);
      return;
    }
    signedUrls([path])
      .then((map) => {
        if (active) setUrl(map[path] ?? null);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [path]);

  if (!path || failed || !url) {
    return (
      <div
        className={`grid place-items-center bg-surface ${rounded} ${className}`}
        aria-hidden={!path}
        role={path ? "img" : undefined}
        aria-label={path ? alt : undefined}
      >
        <PlaceholderMark />
      </div>
    );
  }

  return (
    // The bucket is private and signed per request, so Next's image optimizer
    // has nothing to cache; a plain img keeps the signed URL intact.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`object-cover ${rounded} ${className}`}
    />
  );
}

function PlaceholderMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="3.6" height="10" rx="1" fill="#333b37" />
      <rect x="8.6" y="7" width="3.6" height="10" rx="1" fill="#333b37" />
      <rect x="14.2" y="7" width="3.6" height="10" rx="1" fill="#2a312e" />
      <rect x="19.8" y="7" width="1.2" height="10" rx="0.6" fill="#2a312e" />
    </svg>
  );
}
