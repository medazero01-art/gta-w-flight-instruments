"use client";

import { useEffect, useRef, useState } from "react";
import { describeAircraft, groundSpeedKt, isOwnAircraft } from "@/lib/atc/radar";

// Polls our /api/radar (never radar.gta.world directly) as gently as possible:
// - only one tab polls (Web Locks); other tabs get the data over a BroadcastChannel,
// - paused while the tab is hidden, never two requests at once,
// - 2s while moving (the radar moves each aircraft every 5s: polling at 2s shows each
//   update within ~2s; the MFD animates in between), 4s parked, 5s when we're not on it,
// - after errors the delay doubles up to 60s.
const LOCK_NAME = "gtawfi-radar";
const MOVING_MS = 2000;
const PARKED_MS = 4000;
const NOT_FOUND_MS = 5000;
const MAX_BACKOFF_MS = 60000;

function nextDelay(own) {
  if (!own) return NOT_FOUND_MS;
  const parked = !own.airborne && (own.speedKt ?? 0) < 5;
  return parked ? PARKED_MS : MOVING_MS;
}

export function useRadar({ enabled, ids }) {
  const [snapshot, setSnapshot] = useState(null);
  const [status, setStatus] = useState({ role: "off", error: null, delayMs: null });
  const idsRef = useRef(ids);
  const prevRef = useRef({});
  idsRef.current = ids;

  // Adds ground speed (from the previous sample) and derived data to every aircraft.
  const ingest = useRef((json) => {
    const prev = prevRef.current;
    const aircraft = json.aircraft.map((a) => {
      const before = prev[a.callsign];
      const measured = groundSpeedKt(before, a);
      const speedKt = measured ?? (before?.updatedAt === a.updatedAt ? before.speedKt : null);
      return describeAircraft({ ...a, speedKt });
    });
    prevRef.current = Object.fromEntries(aircraft.map((a) => [a.callsign, a]));
    const own = aircraft.find((a) => isOwnAircraft(a, idsRef.current)) || null;
    setSnapshot({ aircraft, atc: json.atc, fetchedAt: json.fetchedAt, errors: json.errors });
    // Only used to pick the next delay; the UI matches its own aircraft with the latest ids.
    return own;
  });

  useEffect(() => {
    if (!enabled) {
      setStatus({ role: "off", error: null, delayMs: null });
      return undefined;
    }

    let cancelled = false;
    let timer = null;
    let inFlight = false;
    let failures = 0;
    let leader = false;
    const abort = new AbortController();
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(LOCK_NAME) : null;

    if (channel) {
      channel.onmessage = (e) => {
        if (!leader && e.data) ingest.current(e.data);
      };
    }

    const tick = async () => {
      timer = null;
      if (cancelled || inFlight) return;
      if (document.hidden) return; // resumed by the visibility listener
      inFlight = true;
      let delay;
      try {
        const res = await fetch("/api/radar", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        const own = ingest.current(json);
        channel?.postMessage(json);
        failures = 0;
        delay = nextDelay(own);
        setStatus({ role: "leader", error: json.errors?.aircraft || null, delayMs: delay });
      } catch (err) {
        failures += 1;
        delay = Math.min(5000 * 2 ** (failures - 1), MAX_BACKOFF_MS);
        setStatus({ role: "leader", error: err.message, delayMs: delay });
      } finally {
        inFlight = false;
      }
      if (!cancelled) timer = setTimeout(tick, delay);
    };

    const onVisibility = () => {
      if (leader && !document.hidden && !timer && !inFlight) tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const lead = () => {
      leader = true;
      tick();
      // Hold the lock until this effect is cleaned up.
      return new Promise((resolve) => abort.signal.addEventListener("abort", resolve));
    };

    if (navigator.locks) {
      setStatus({ role: "follower", error: null, delayMs: null });
      navigator.locks.request(LOCK_NAME, { signal: abort.signal }, lead).catch(() => {});
    } else {
      lead();
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
      abort.abort();
      channel?.close();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);

  return { snapshot: enabled ? snapshot : null, status };
}
