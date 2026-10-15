"use client";

import { useState } from "react";
import { AIRPORTS } from "@/lib/atc/airports";
import { callingForPhase, isHeli } from "@/lib/atc/flight";
import { useEdition } from "./EditionContext";
import { ChipGroup, Panel, TextInput, Toggle, softkeyClass } from "./ui";

const airportOptions = Object.values(AIRPORTS).map((a) => ({ value: a.icao, label: a.icao, title: a.name }));

export default function FlightSetup({ flight, update, onNewFlight }) {
  const { edition, t } = useEdition();
  const [open, setOpen] = useState(!flight.callsign);
  const heli = isHeli(flight);

  // The airport we're calling follows the new dep/arr for the current phase.
  const setAirport = (patch) => update({ ...patch, calling: callingForPhase(flight.phase, { ...flight, ...patch }) });

  return (
    <Panel
      title={t("Flight plan")}
      action={
        <div className="flex gap-1">
          {!open && (
            <button type="button" onClick={onNewFlight} className={`px-2 py-0.5 text-[10px] uppercase ${softkeyClass(false)}`}>
              {t("New flight")}
            </button>
          )}
          <button type="button" onClick={() => setOpen(!open)} className={`px-2 py-0.5 text-[10px] uppercase ${softkeyClass(open)}`}>
            {open ? t("Done") : t("Edit")}
          </button>
        </div>
      }
    >
      {!open ? (
        <div className="font-avmono">
          <div className="text-lg font-bold text-av-cyan leading-tight">{flight.callsign || t("NO CALLSIGN")}</div>
          <div className="text-[12px] text-av-text">
            {heli && <span className="mr-1">🚁</span>}
            {heli && flight.depPoint === "site" ? flight.depSite || t("site") : flight.dep} <span className="text-av-magenta">━━▶</span>{" "}
            {heli && flight.arrPoint === "site" ? flight.arrSite || t("site") : flight.arr}
            <span className="ml-2 text-av-dim">{flight.rules}</span>
            {flight.medevac && <span className="ml-2 text-av-amber">MEDEVAC</span>}
            {heli && flight.heliRole === "sd" && <span className="ml-2 text-av-amber">SD</span>}
            {flight.formation && <span className="ml-2 text-av-amber">{t("FLT OF {n}", { n: flight.formationCount })}</span>}
          </div>
          {edition.radar && flight.registration && <div className="text-[10px] text-av-mute">RADAR REG {flight.registration}</div>}
        </div>
      ) : (
        <div className="space-y-3">
          <ChipGroup
            label={t("Aircraft type")}
            tone="magenta"
            options={[
              { value: "airplane", label: `✈ ${t("Airplane")}` },
              { value: "helicopter", label: `🚁 ${t("Helicopter")}` },
            ]}
            value={flight.aircraft}
            onChange={(aircraft) => update({ aircraft, calling: callingForPhase(flight.phase, { ...flight, aircraft }) })}
          />
          {heli && (
            <ChipGroup
              label={t("Mission")}
              tone="magenta"
              options={[
                { value: "civil", label: t("Civil") },
                { value: "medevac", label: "MEDEVAC" },
                { value: "sd", label: "SD" },
              ]}
              value={flight.heliRole}
              onChange={(heliRole) => update({ heliRole, medevac: heliRole === "medevac" })}
            />
          )}
          <TextInput
            label={t("Callsign")}
            value={flight.callsign}
            onChange={(v) => update({ callsign: v.replace(/\s+/g, " ").trimStart() })}
            placeholder={t("N123AB or IMEX Air 434")}
            autoFocus={!flight.callsign}
          />
          {edition.radar && (
            <TextInput
              label="Radar registration (only if different)"
              value={flight.registration}
              onChange={(v) => update({ registration: v.toUpperCase().replace(/\s+/g, "") })}
              placeholder="N434IA for IMEX Air 434"
            />
          )}
          <ChipGroup
            label={t("Flight rules")}
            options={[
              { value: "VFR", label: "VFR" },
              { value: "IFR", label: "IFR" },
            ]}
            value={flight.rules}
            onChange={(rules) => update({ rules })}
          />
          <div className="grid grid-cols-2 gap-3">
            <ChipGroup label={t("Departure")} options={airportOptions} value={flight.dep} onChange={(dep) => setAirport({ dep })} size="sm" />
            <ChipGroup label={t("Arrival")} options={airportOptions} value={flight.arr} onChange={(arr) => setAirport({ arr })} size="sm" />
          </div>

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
    </Panel>
  );
}
