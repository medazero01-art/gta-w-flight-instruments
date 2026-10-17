"use client";

import { useState } from "react";
import { isHeli, isLastLeg } from "@/lib/atc/flight";
import { STOP_TYPE_LABELS, isRepeated, isSite, stopLabel, stopType } from "@/lib/atc/plan";
import { useEdition } from "./EditionContext";
import { ChipGroup, Panel, TextInput, Toggle, actionClass } from "./ui";


// The plan being flown: the stops done, the one we're flying to, the ones after. The plan
// itself is changed in the plan dialog (Edit); the radio preferences stay here.
export default function PlanPanel({ flight, update, onNewFlight, onEdit, onNextStop }) {
  const { edition, t, ph, airports } = useEdition();
  const [options, setOptions] = useState(false);
  const heli = isHeli(flight);
  const { plan } = flight;
  const current = plan.stops[plan.leg];
  const repeated = isRepeated(current, heli);
  const last = isLastLeg(flight);
  const next = plan.stops[plan.leg + 1];

  return (
    <Panel title={t("Flight plan")}>
      <div className="space-y-2.5 font-avmono">
        <div className="grid grid-cols-[1.3fr_1fr] gap-1.5">
          <button type="button" onClick={onNewFlight} className={`whitespace-nowrap px-2 py-2 text-[11px] ${actionClass("primary")}`}>
            ＋ {t("New flight")}
          </button>
          <button type="button" onClick={onEdit} className={`whitespace-nowrap px-2 py-2 text-[11px] ${actionClass()}`}>
            ✎ {t("Edit")}
          </button>
        </div>
        <div>
          <div className="text-lg font-bold leading-tight text-av-cyan">{flight.callsign || t("NO CALLSIGN")}</div>
          <div className="text-[11px] text-av-dim">
            {heli ? `🚁 ${t("Helicopter")}` : `✈ ${t("Airplane")}`} · {flight.rules}
            {flight.medevac && <span className="ml-2 text-av-amber">MEDEVAC</span>}
            {heli && flight.heliRole === "sd" && <span className="ml-2 text-av-amber">SD</span>}
            {flight.formation && <span className="ml-2 text-av-amber">{t("FLT OF {n}", { n: flight.formationCount })}</span>}
          </div>
          {edition.radar && flight.registration && <div className="text-[10px] text-av-mute">RADAR REG {flight.registration}</div>}
        </div>

        <ol className="space-y-0.5">
          {plan.stops.map((s, i) => {
            // Done before the current leg; the leg's departure is where we are or come from.
            const done = i < plan.leg - 1;
            const origin = i === plan.leg - 1;
            const active = i === plan.leg;
            const type = i > 0 ? stopType(s, heli) : null;
            return (
              <li
                key={s.id}
                className={`flex items-center gap-2 rounded px-1.5 py-1 text-[12px] ${active ? "border border-av-magenta/60 bg-av-magenta/10" : "border border-transparent"} ${done ? "opacity-55" : ""}`}
              >
                <span className={`w-4 text-center ${done ? "text-av-green" : active ? "text-av-magenta" : origin ? "text-av-cyan" : "text-av-mute"}`}>{done ? "✓" : active ? "▸" : origin ? "●" : i}</span>
                <span className={`font-bold ${active ? "text-av-magenta" : "text-av-text"}`}>{stopLabel(s, airports)}</span>
                <span className="min-w-0 truncate text-[10px] text-av-dim">
                  {i === 0 ? t("Departure") : t(STOP_TYPE_LABELS[type])}
                  {type && type !== "full" && s.count > 1 ? ` ×${s.count}` : ""}
                  {s.runway ? ` · ${s.runway}` : ""}
                  {isSite(s) ? ` · ${airports[s.icao].code}` : ""}
                  {i > 0 && s.route.length > 0 ? ` · ${s.route.length} WP` : ""}
                </span>
              </li>
            );
          })}
        </ol>

        {repeated && !last && (
          <div className="flex items-center justify-between gap-2 rounded border border-av-amber/40 bg-av-amber/5 px-2 py-1 text-[11px] text-av-amber">
            <span>
              {t(STOP_TYPE_LABELS[stopType(current, heli)])} {t("done")}: <span className="font-bold">{Math.min(plan.reps, current.count)}/{current.count}</span>
            </span>
            <span className="flex gap-1">
              <button type="button" onClick={() => update({ plan: { ...plan, reps: Math.max(0, plan.reps - 1) } })} className={`h-6 w-6 ${actionClass()}`}>
                −
              </button>
              <button type="button" onClick={() => update({ plan: { ...plan, reps: plan.reps + 1 } })} className={`h-6 w-6 ${actionClass()}`}>
                ＋
              </button>
            </span>
          </div>
        )}

        {!last ? (
          <button type="button" onClick={onNextStop} className={`w-full px-3 py-1.5 text-[11px] ${actionClass()}`}>
            {t("{stop} done · next stop {next} ▸", { stop: stopLabel(current, airports), next: stopLabel(next, airports) })}
          </button>
        ) : (
          <div className="text-[10px] text-av-mute">{t("Last stop of the plan: {stop}.", { stop: stopLabel(current, airports) })}</div>
        )}

        <button type="button" onClick={() => setOptions(!options)} className={`w-full px-3 py-1 text-[10px] ${actionClass("secondary", options)}`}>
          {options ? "▾" : "▸"} {t("Options")}
        </button>
        {options && (
          <div className="space-y-3 font-avsans">
            <div className="flex flex-wrap gap-1">
              {!heli && <Toggle label="MEDEVAC" checked={flight.medevac} onChange={(medevac) => update({ medevac })} />}
              <Toggle label={t("Formation")} checked={flight.formation} onChange={(formation) => update({ formation })} />
            </div>
            {flight.formation && (
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <TextInput
                  label={t("Aircraft")}
                  type="number"
                  min={2}
                  value={flight.formationCount}
                  onChange={(v) => update({ formationCount: Math.max(2, Number(v) || 2) })}
                />
                <TextInput label={t("Type")} value={flight.formationType} onChange={(formationType) => update({ formationType })} placeholder={t("Dodos, helicopters…")} />
              </div>
            )}
            {ph.RUNWAY_STYLES && (
              <ChipGroup
                label={t("Runway format")}
                size="sm"
                options={[
                  { value: "spoken", label: t("Runway 2-1") },
                  { value: "compact", label: t("Runway 21") },
                ]}
                value={flight.runwayStyle}
                onChange={(runwayStyle) => update({ runwayStyle })}
              />
            )}
            <ChipGroup
              label={t("After copying a call")}
              size="sm"
              options={[
                { value: true, label: t("Next phase") },
                { value: false, label: t("Stay") },
              ]}
              value={flight.autoAdvance}
              onChange={(autoAdvance) => update({ autoAdvance })}
            />
          </div>
        )}
      </div>
    </Panel>
  );
}
