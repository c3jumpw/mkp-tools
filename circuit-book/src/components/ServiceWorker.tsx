"use client";

import { useEffect } from "react";
import { startOutboxWatcher } from "@/lib/outbox";

/**
 * Registers the worker that makes the app open without a connection, and starts
 * the queue that pushes station completions once a connection returns.
 */
export default function ServiceWorker() {
  useEffect(() => {
    const stopWatcher = startOutboxWatcher();

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // An unavailable worker costs offline support, nothing more.
      });
    }

    return stopWatcher;
  }, []);

  return null;
}
