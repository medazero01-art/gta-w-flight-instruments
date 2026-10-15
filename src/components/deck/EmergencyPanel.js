"use client";

import { useEffect, useState } from "react";
import { AIRPORTS, LANDMARKS } from "@/lib/atc/airports";
import { ATC_PREFIX, CHAT_LIMIT } from "@/lib/atc/phases";
import { isHeli } from "@/lib/atc/flight";
import { useEdition } from "./EditionContext";
import { ChipGroup, TextInput, softkeyClass } from "./ui";

export default function EmergencyPanel({ kind, flight, update, copiedKey, copy, onClose }) {
  const { t, ph } = useEdition();
  const isMayday = kind === "mayday";
  const heli = isHeli(flight);
  const situations = heli
    ? isMayday
      ? ph.HELI_MAYDAY_SITUATIONS
      : ph.HELI_PAN_SITUATIONS
    : isMayday
      ? ph.MAYDAY_SITUATIONS
      : ph.PAN_SITUATIONS;
  const [situation, setSituation] = useState(situations[0]);
  // A helicopter with an engine failure autorotates; a PAN lands as a precaution.
  const [action, setAction] = useState(
    heli ? (isMayday ? "autorotation" : "land-site") : isMayday ? "land-runway" : flight.mode === "CENTER" ? "vectors" : "join-downwind"
  );
  const [site, setSite] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const full = `${ATC_PREFIX}${ph.buildEmergency(flight, { kind, situation, action, site })}`;
  const accent = isMayday ? "border-av-red text-av-red" : "border-av-amber text-av-amber";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-label={isMayday ? "Mayday" : "Pan-Pan"}
        onClick={(e) => e.stopPropagation()}
        className={`my-8 w-full max-w-2xl rounded-md border-2 bg-av-panel shadow-2xl ${accent}`}
      >
        <div
          className={`flex items-center justify-between px-4 py-2 ${isMayday ? "bg-av-red/15" : "bg-av-amber/10"}`}
          style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent 0 14px, rgba(0,0,0,0.25) 14px 28px)" }}
        >
          <h2 className="font-avmono text-xl font-bold tracking-[0.3em]">{isMayday ? "MAYDAY" : "PAN-PAN"}</h2>
          <button type="button" onClick={onClose} className={`px-3 py-1 text-[10px] uppercase ${softkeyClass(false)}`}>
            {t("Close · Esc")}
          </button>
        </div>

        <div className="space-y-3 p-4">
          <button
            type="button"
            onClick={() => copy(full, "emergency")}
            className={`w-full rounded border-2 text-left transition-colors ${
              copiedKey === "emergency" ? "border-av-green bg-av-green/10" : "border-av-line bg-black/50 hover:border-av-cyan"
            }`}
          >
            <div className="flex justify-between border-b border-av-line/70 px-3 py-1 font-avmono text-[10px] uppercase">
              <span className="text-av-mute">
                {full.length}/{CHAT_LIMIT}
              </span>
              <span className={copiedKey === "emergency" ? "font-bold text-av-green" : "font-bold text-av-cyan"}>
                {copiedKey === "emergency" ? t("COPIED ✓") : t("CLICK TO COPY")}
              </span>
            </div>
            <div className="px-3 py-2.5 font-avmono text-sm text-av-cyan break-words">{full}</div>
          </button>

          <ChipGroup label={t("Situation")} options={situations.map((s) => ({ value: s, label: s }))} value={situation} onChange={setSituation} tone="magenta" />
          <ChipGroup label={t("Action")} options={ph.emergencyActions(flight)} value={action} onChange={setAction} tone="magenta" />
          {(action === "land-site" || action === "autorotation") && (
            <TextInput label={t("Landing site")} value={site} onChange={setSite} placeholder={t("Senora Freeway, the beach…")} autoFocus />
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextInput label={t("Passing")} value={flight.landmark} onChange={(landmark) => update({ landmark })} placeholder="Paleto Bay" list="atc-landmarks" />
            <TextInput
              label={`${t("Altitude")} (${ph.formatAltitude(flight.alt)})`}
              type="number"
              step={100}
              value={flight.alt}
              onChange={(alt) => update({ alt: Number(alt) || 0 })}
            />
          </div>
          <datalist id="atc-landmarks">
            {LANDMARKS.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>

          {flight.mode === "CTAF" && (
            <ChipGroup
              label={t("Calling")}
              size="sm"
              options={[
                ...Object.values(AIRPORTS).map((a) => ({ value: a.icao, label: ph.trafficLabel(a.traffic) })),
                { value: "SA", label: ph.trafficLabel("San Andreas") },
              ]}
              value={flight.calling}
              onChange={(calling) => update({ calling })}
            />
          )}

          {heli && action === "autorotation" && (
            <p className="rounded border border-av-amber/30 bg-av-amber/5 px-2 py-1 text-[11px] text-av-amber">
              🚁 {t("Autorotation: pick a field, strip or road, hold 80kt down to it, then flare to slow the descent and touch down.")}
            </p>
          )}
          <p className="font-avmono text-[10px] uppercase tracking-wider text-av-mute">
            {t("Aviate · Navigate · Communicate. A short call is fine if you have no time to type.")}
          </p>
        </div>
      </div>
    </div>
  );
}
