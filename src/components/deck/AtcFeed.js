"use client";

import { useEffect, useRef } from "react";
import { ageLabel } from "@/lib/atc/briefing";
import { Panel, softkeyClass } from "./ui";

const timeOf = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export default function AtcFeed({ feed, flight, update, onUseForReadback }) {
  const listRef = useRef(null);
  const lastId = feed?.items.at(-1)?.id;

  // Keep the newest transmission in view, like a chat.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  if (!flight.radarOn) {
    return (
      <Panel title="COM log">
        <div className="font-avmono text-[11px] text-av-mute">Turn the radar on (MFD) to monitor the /atc frequency live.</div>
      </Panel>
    );
  }

  return (
    <Panel
      title="COM log · /atc"
      action={
        feed?.centerActive && flight.mode !== "CENTER" ? (
          <button type="button" onClick={() => update({ mode: "CENTER" })} className={`px-2 py-0.5 text-[10px] uppercase ${softkeyClass(true, "green")}`}>
            Switch to Center
          </button>
        ) : !feed?.centerActive && flight.mode === "CENTER" ? (
          <button type="button" onClick={() => update({ mode: "CTAF" })} className={`px-2 py-0.5 text-[10px] uppercase ${softkeyClass(false)}`}>
            Switch to CTAF
          </button>
        ) : null
      }
    >
      <div className={`mb-1.5 font-avmono text-[10px] ${feed?.centerActive ? "text-av-green" : "text-av-mute"}`}>
        {feed?.centerActive
          ? `● SAN ANDREAS CENTER ACTIVE · LAST ${ageLabel(new Date(feed.lastControllerAt).toISOString()).toUpperCase()}`
          : "○ NO CONTROLLER HEARD IN 30 MIN"}
      </div>

      <ul ref={listRef} className="max-h-72 space-y-1 overflow-y-auto pr-1">
        {!feed && <li className="font-avmono text-[11px] text-av-mute">Waiting for the frequency…</li>}
        {feed?.items.map((m) => (
          <li
            key={m.id}
            className={`rounded border-l-2 px-2 py-1 ${
              m.forMe ? "border-av-magenta bg-av-magenta/10" : m.controller ? "border-av-green bg-av-green/5" : "border-av-line bg-black/30"
            }`}
          >
            <div className="flex items-center gap-2 font-avmono text-[9px] uppercase text-av-mute">
              <span>{timeOf(m.timestamp)}</span>
              <span className="truncate font-bold text-av-dim">{m.speaker || "?"}</span>
              {m.controller && <span className="text-av-green">ATC</span>}
              {m.forMe && <span className="text-av-magenta">YOU</span>}
              {m.controller && m.forMe && (
                <button type="button" onClick={() => onUseForReadback(m)} className={`ml-auto px-1.5 ${softkeyClass(true, "magenta")}`}>
                  Read back
                </button>
              )}
            </div>
            <div className={`text-[12px] break-words ${m.controller ? "text-av-green" : "text-av-text"}`}>{m.text}</div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
