"use client";

import { useState } from "react";
import { ALTITUDES, DIRECTIONS, LANDMARKS } from "@/lib/atc/airports";
import { closedRunwayEnds, recommendedRunway, weatherFor } from "@/lib/atc/briefing";
import { ATC_PREFIX, CHAT_LIMIT, PHASES, contextAirport } from "@/lib/atc/phases";
import { callingForPhase, heliPoint, isHeli } from "@/lib/atc/flight";
import { withStop } from "@/lib/atc/plan";
import { useEdition } from "./EditionContext";
import { ChipGroup, FieldLabel, Panel, TextInput, softkeyClass } from "./ui";

// Which settings each phase needs, in display order. A phraseology may bring its own
// lists (ph.controlKeys): GTA World France has no controller and no traffic pattern.
const CONTROLS = {
  CTAF: {
    clearance: [],
    ground: ["calling", "spot", "face", "runway", "taxiroute", "via"],
    departure: ["calling", "runway", "dir", "target", "pattern"],
    enroute: ["calling", "landmark", "alt", "target", "dir"],
    arrival: ["calling", "from", "landmark", "alt", "target", "runway", "pattern"],
    pattern: ["calling", "runway", "pattern", "final", "landing", "dir", "target"],
    taxiin: ["calling", "runway", "spot", "taxiroute", "via"],
  },
  CENTER: {
    clearance: ["spot", "target", "route"],
    ground: ["spot", "runway", "taxiroute"],
    departure: ["runway", "hold"],
    enroute: ["landmark", "alt", "target"],
    arrival: ["from", "landmark", "alt"],
    pattern: ["runway", "final", "landing"],
    taxiin: ["runway", "spot", "taxiroute", "via"],
  },
};

// Helicopters: settings depend on where we lift off / land ("spot", "runway" or "site").
// On runways they fly the airplane procedures, so those reuse the airplane lists.
const withFirst = (key, list) => [key, ...list];
const HELI_CONTROLS = {
  CTAF: {
    clearance: () => [],
    ground: { runway: ["depPoint", "calling", "spot", "runway", "taxiroute", "via"], spot: ["depPoint", "calling", "spot"], site: ["depPoint", "depSite"] },
    departure: {
      runway: ["depPoint", "calling", "runway", "dir", "target", "pattern", "autoSite"],
      spot: ["depPoint", "calling", "spot", "dir", "target", "autoSite"],
      site: ["depPoint", "depSite", "dir", "target", "autoSite"],
    },
    arrival: {
      runway: withFirst("arrPoint", CONTROLS.CTAF.arrival),
      spot: ["arrPoint", "calling", "from", "landmark", "alt", "spot"],
      site: ["arrPoint", "arrSite", "from", "landmark", "alt"],
    },
    pattern: { runway: withFirst("arrPoint", CONTROLS.CTAF.pattern), spot: ["arrPoint", "calling", "spot"], site: ["arrPoint", "arrSite"] },
    taxiin: { runway: withFirst("arrPoint", CONTROLS.CTAF.taxiin), spot: ["arrPoint", "calling", "spot"], site: ["arrPoint", "arrSite"] },
  },
  CENTER: {
    clearance: { runway: ["depPoint", "spot", "target", "route"], spot: ["depPoint", "spot", "target", "route"], site: ["depPoint", "depSite", "target"] },
    ground: { runway: ["depPoint", "spot", "runway", "taxiroute"], spot: ["depPoint"], site: ["depPoint"] },
    departure: { runway: ["depPoint", "runway", "hold", "autoSite"], spot: ["depPoint", "spot", "dir", "autoSite"], site: ["depPoint", "depSite", "dir", "autoSite"] },
    arrival: {
      runway: withFirst("arrPoint", CONTROLS.CENTER.arrival),
      spot: ["arrPoint", "from", "landmark", "alt", "spot"],
      site: ["arrPoint", "arrSite", "from", "landmark", "alt"],
    },
    pattern: { runway: withFirst("arrPoint", CONTROLS.CENTER.pattern), spot: ["arrPoint", "spot"], site: ["arrPoint", "arrSite"] },
    taxiin: { runway: withFirst("arrPoint", CONTROLS.CENTER.taxiin), spot: ["arrPoint", "spot"], site: ["arrPoint", "arrSite"] },
  },
};

function controlKeys(flight) {
  if (!isHeli(flight)) return CONTROLS[flight.mode][flight.phase];
  if (flight.phase === "enroute") return CONTROLS[flight.mode].enroute;
  const table = HELI_CONTROLS[flight.mode][flight.phase];
  return typeof table === "function" ? table() : table[heliPoint(flight)] || [];
}

// SAAA Rotorcraft Syllabus reminders for the current phase (English keys, translated by t()).
function rotorTip(flight) {
  const point = heliPoint(flight);
  switch (flight.phase) {
    case "ground":
      return point === "runway" ? "Hover taxi: 10ft above the ground, 30kt max." : null;
    case "departure":
      return "Normal takeoff: gain speed (translational lift around 60kt), then climb. Obstacles around: maximum performance takeoff from a hover.";
    case "enroute":
      return "Climb at 80kt or more · descend at 65kt · turns in cruise at 120kt or more.";
    case "arrival":
    case "pattern":
      if (point === "site") return "Off-airfield: orbit a few hundred feet above the site to check obstacles, people and loose objects before landing.";
      if (point === "runway") return "Runway: come down to 10ft at 30kt or less, then exit at the next taxiway.";
      return "Helipad or spot: aim for the center, let the helicopter settle the last few feet.";
    case "taxiin":
      return point === "runway" ? "Hover taxi: 10ft above the ground, 30kt max." : null;
    default:
      return null;
  }
}

const inputClass =
  "rounded border border-av-line bg-black/50 px-2 py-1.5 font-avmono text-xs text-av-cyan placeholder-av-mute focus:outline-none focus:border-av-cyan";

function AltitudeControl({ label, value, onChange }) {
  const { edition, t } = useEdition();
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap items-center gap-1">
        <ChipGroup
          options={ALTITUDES.map((a) => ({ value: a, label: a.toLocaleString(edition.lang === "fr" ? "fr-FR" : "en-US") }))}
          value={Number(value)}
          onChange={onChange}
          size="sm"
        />
        <input
          type="number"
          step={100}
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          aria-label={`${label} (${t("custom")})`}
          className={`w-20 ${inputClass}`}
        />
      </div>
    </div>
  );
}

function LandmarkControl({ value, onChange }) {
  const { t } = useEdition();
  return (
    <div>
      <FieldLabel>{t("Over / passing")}</FieldLabel>
      <div className="flex gap-1 mb-1">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={t("Type a place or pick one")} className={`flex-1 text-sm ${inputClass}`} />
        {value && (
          <button type="button" onClick={() => onChange("")} className={`px-2.5 text-[10px] uppercase ${softkeyClass(false)}`}>
            {t("Clear")}
          </button>
        )}
      </div>
      <div className="max-h-24 overflow-y-auto pr-1">
        <ChipGroup size="sm" options={LANDMARKS.map((l) => ({ value: l, label: l }))} value={value} onChange={onChange} />
      </div>
    </div>
  );
}

function ViaControl({ airport, value, onChange }) {
  const { t, ph } = useEdition();
  const [custom, setCustom] = useState("");
  const add = (token) => token && onChange([...value, token]);

  return (
    <div>
      <FieldLabel>
        {t("Taxi via")} {value.length > 0 && <span className="normal-case text-av-magenta">{ph.formatVia(value)}</span>}
      </FieldLabel>
      <div className="flex flex-wrap items-center gap-1">
        {airport.taxiways.map((tw) => (
          <button key={tw} type="button" onClick={() => add(tw)} className={`px-2.5 py-1 text-[11px] ${softkeyClass(false)}`}>
            {tw}
          </button>
        ))}
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              add(custom.trim());
              setCustom("");
            }
          }}
          placeholder="C1 ⏎"
          aria-label={t("Add taxiway")}
          className={`w-16 ${inputClass}`}
        />
        {value.length > 0 && (
          <>
            <button type="button" onClick={() => onChange(value.slice(0, -1))} className={`px-2 py-1 text-[10px] uppercase ${softkeyClass(false)}`}>
              {t("Undo")}
            </button>
            <button type="button" onClick={() => onChange([])} className={`px-2 py-1 text-[10px] uppercase ${softkeyClass(false)}`}>
              {t("Clear")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SpotControl({ airport, value, onChange, heli }) {
  const { t } = useEdition();
  return (
    <div>
      <ChipGroup
        label={heli ? t("Parking / helipad at {airport}", { airport: airport.shortName }) : t("Position at {airport}", { airport: airport.shortName })}
        size="sm"
        options={airport.spots.map((s) => ({ value: s, label: s }))}
        value={value}
        onChange={onChange}
      />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={t("Or type it (Gate 8…)")} aria-label={t("Custom position")} className={`mt-1 w-full ${inputClass}`} />
    </div>
  );
}

function RouteControl({ flight, update, route }) {
  const { t, ph } = useEdition();
  return (
    <div className="rounded border border-av-magenta/40 bg-av-magenta/5 p-2">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel>{t("Taxi route from the diagram")}</FieldLabel>
        <ChipGroup
          size="sm"
          tone="magenta"
          options={[
            { value: true, label: t("Auto") },
            { value: false, label: t("Manual") },
          ]}
          value={flight.autoRoute}
          onChange={(autoRoute) => update({ autoRoute })}
        />
      </div>
      {route ? (
        <div className="font-avmono text-[12px] text-av-magenta">
          {route.via.length ? `via ${ph.formatVia(route.via)}` : t("No taxiway needed")}
          {route.hold && <span className="text-av-dim"> · {t("hold short of {hold}", { hold: route.hold })}</span>}
          {!flight.autoRoute && (
            <button
              type="button"
              onClick={() => update({ via: route.via, hold: route.hold || "" })}
              className={`ml-2 px-2 py-0.5 text-[10px] uppercase ${softkeyClass(false, "magenta")}`}
            >
              {t("Use")}
            </button>
          )}
        </div>
      ) : (
        <div className="font-avmono text-[11px] text-av-mute">{t("No route: pick a listed parking spot (or this airport has no taxiway diagram).")}</div>
      )}
    </div>
  );
}

function Controls({ flight, update, saaaData, route }) {
  const { t, ph, airports } = useEdition();
  const icao = contextAirport(flight);
  const airport = airports[icao];
  const closed = closedRunwayEnds(saaaData?.notams, airport);
  const best = recommendedRunway(airport, weatherFor(airport, saaaData?.weather), closed);
  const directions = DIRECTIONS.map((d) => ({ ...d, label: t(d.label) }));
  const heli = isHeli(flight);
  // Moving a lift-off/landing point to or from a site changes who we call on CTAF.
  const setPoint = (key, value) => {
    const next = { ...flight, [key]: value };
    update({ [key]: value, calling: callingForPhase(flight.phase, next) });
  };
  const points = [
    { value: "spot", label: t("Parking / helipad") },
    { value: "runway", label: t("Runway") },
    { value: "site", label: t("Off-airfield site") },
  ];

  const renderers = {
    calling: () => (
      <ChipGroup
        label={t("Calling")}
        size="sm"
        options={[
          ...Object.values(airports).map((a) => ({ value: a.icao, label: ph.callingLabel(a) })),
          { value: "SA", label: ph.callingLabel(null) },
        ]}
        value={flight.calling}
        onChange={(calling) => update({ calling })}
      />
    ),
    runway: () => (
      <ChipGroup
        label={t("Runway at {airport}", { airport: airport.shortName })}
        options={airport.runwayEnds.map((end) => ({
          value: end.id,
          label: end.id,
          disabled: closed.includes(end.id),
          badge: end.id === best ? "★" : closed.includes(end.id) ? "CLSD" : null,
        }))}
        value={flight.runways[icao]}
        onChange={(rwy) => update({ runways: { ...flight.runways, [icao]: rwy } })}
      />
    ),
    spot: () => <SpotControl heli={heli} airport={airport} value={flight.spots[icao] || ""} onChange={(spot) => update({ spots: { ...flight.spots, [icao]: spot } })} />,
    depPoint: () => <ChipGroup label={t("Lift off from")} tone="magenta" size="sm" options={points} value={flight.depPoint} onChange={(v) => setPoint("depPoint", v)} />,
    arrPoint: () => <ChipGroup label={t("Land on")} tone="magenta" size="sm" options={points} value={flight.arrPoint} onChange={(v) => setPoint("arrPoint", v)} />,
    depSite: () => <TextInput label={t("Departure site")} value={flight.depSite} onChange={(depSite) => update({ depSite })} placeholder={t("Pillbox Hill Medical Center, the scene…")} />,
    arrSite: () => <TextInput label={t("Landing site")} value={flight.arrSite} onChange={(arrSite) => update({ arrSite })} placeholder={t("Pillbox Hill Medical Center, the scene…")} />,
    autoSite: () => (
      <TextInput label={t("Autorotation site (briefing)")} value={flight.autoSite} onChange={(autoSite) => update({ autoSite })} placeholder={t("Runway 25 ahead, Joshua Road…")} />
    ),
    taxiroute: () => <RouteControl flight={flight} update={update} route={route} />,
    via: () => <ViaControl airport={airport} value={flight.via} onChange={(via) => update({ via })} />,
    hold: () => <TextInput label={t("Holding short of")} value={flight.hold} onChange={(hold) => update({ hold })} placeholder={t("C1 (optional)")} />,
    face: () => <ChipGroup label={t("Pushback, facing")} options={directions} value={flight.face} onChange={(face) => update({ face })} />,
    dir: () => <ChipGroup label={t("Heading to the")} options={directions} value={flight.dir} onChange={(dir) => update({ dir })} />,
    from: () => <ChipGroup label={t("Inbound from the")} options={directions} value={flight.from} onChange={(from) => update({ from })} />,
    landmark: () => <LandmarkControl value={flight.landmark} onChange={(landmark) => update({ landmark })} />,
    alt: () => <AltitudeControl label={t("Current altitude")} value={flight.alt} onChange={(alt) => update({ alt })} />,
    target: () => <AltitudeControl label={t("Target altitude")} value={flight.target} onChange={(target) => update({ target })} />,
    pattern: () => (
      <ChipGroup
        label={t("Traffic pattern")}
        options={[
          { value: "left", label: t("Left") },
          { value: "right", label: t("Right") },
        ]}
        value={flight.pattern}
        onChange={(pattern) => update({ pattern })}
      />
    ),
    final: () => <ChipGroup label={t("Final call")} options={ph.FINAL_TYPES} value={flight.finalVerb} onChange={(finalVerb) => update({ finalVerb })} />,
    // The plan follows: the stop we're flying to changes too.
    landing: () => (
      <ChipGroup
        label={t("Landing")}
        options={ph.LANDING_TYPES}
        value={flight.landing}
        onChange={(landing) => update({ landing, plan: withStop(flight.plan, flight.plan.leg, { type: landing, point: "runway" }) })}
      />
    ),
    // GTA World France: what we do at the stand, flight plan destination and mission, new destination.
    purpose: () => (
      <ChipGroup
        label={t("At the stand")}
        size="sm"
        options={[
          { value: "parking", label: t("Park and leave") },
          { value: "loading", label: t("Loading") },
          { value: "standby", label: t("Stand-by") },
        ]}
        value={flight.purpose}
        onChange={(purpose) => update({ purpose })}
      />
    ),
    plan: () => (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <TextInput
          label={t("Flight plan destination")}
          value={flight.planDest}
          onChange={(planDest) => update({ planDest })}
          placeholder={t("{code} if blank (Pacific Ocean…)", { code: airports[flight.arr].code })}
        />
        <TextInput label={t("Mission (optional)")} value={flight.mission} onChange={(mission) => update({ mission })} placeholder={t("weather survey…")} />
      </div>
    ),
    arr: () => (
      <ChipGroup
        label={t("Destination")}
        size="sm"
        options={Object.values(airports).map((a) => ({ value: a.icao, label: a.code, title: a.name }))}
        value={flight.arr}
        onChange={(arr) =>
          update({ arr, calling: callingForPhase(flight.phase, { ...flight, arr }), plan: withStop(flight.plan, flight.plan.leg, { icao: arr, site: null }) })
        }
      />
    ),
    route: () =>
      flight.rules === "IFR" ? (
        <TextInput label={t("Route (flight plan)")} value={flight.route} onChange={(r) => update({ route: r.toUpperCase() })} placeholder="DOCKS1 DOCKS FIZEL ELBUR…" />
      ) : null,
  };

  const keys = ph.controlKeys ? ph.controlKeys(flight) : controlKeys(flight);
  if (keys.length === 0) {
    return (
      <div className="font-avmono text-[11px] text-av-mute">
        {ph.controlKeys ? t("Nothing to set in this phase.") : t("No clearance on CTAF. Switch COM to {station} if a controller is online.", { station: ph.STATION })}
      </div>
    );
  }
  return <div className="space-y-3">{keys.map((key) => <div key={key}>{renderers[key]()}</div>)}</div>;
}

function CallCard({ call, index, copied, onCopy }) {
  const { t } = useEdition();
  // "atc" calls get the /atc prefix; "pm" goes to the controller, "say" is spoken to the crew.
  const full = call.text ? (call.channel === "atc" ? ATC_PREFIX : "") + call.text : "";
  const length = full.length;
  const tooLong = length > CHAT_LIMIT;

  if (!call.text) {
    return (
      <div className="rounded border border-dashed border-av-line px-3 py-2 font-avmono text-[11px] text-av-mute">
        <span className="text-av-dim">{call.label}</span> · {call.hint}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className={`group w-full rounded border text-left transition-colors duration-100 ${
        copied ? "border-av-green bg-av-green/10" : "border-av-line bg-black/40 hover:border-av-cyan hover:bg-av-cyan/5"
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-av-line/70 px-3 py-1">
        <div className="flex items-center gap-2 font-avmono text-[10px] uppercase tracking-wider">
          {index < 9 && <kbd className="rounded border border-av-line bg-av-panel2 px-1.5 text-av-cyan">{index + 1}</kbd>}
          <span className="font-bold text-av-dim">{call.label}</span>
          {call.channel === "pm" && <span className="rounded bg-av-amber/20 px-1 text-av-amber">{t("PM")}</span>}
          {call.channel === "say" && <span className="rounded bg-av-green/15 px-1 text-av-green">{t("CREW")}</span>}
        </div>
        <div className="flex items-center gap-2 font-avmono text-[10px]">
          <span className={tooLong ? "font-bold text-av-red" : "text-av-mute"}>
            {length}/{CHAT_LIMIT}
          </span>
          <span
            className={`rounded border px-2 py-0.5 font-bold ${
              copied ? "border-av-green text-av-green" : "border-av-line text-av-dim group-hover:border-av-cyan group-hover:text-av-cyan"
            }`}
          >
            {copied ? t("COPIED ✓") : t("COPY")}
          </span>
        </div>
      </div>
      <div className="px-3 py-2 font-avmono text-[13px] leading-relaxed text-av-cyan break-words">{full}</div>
      {tooLong && <div className="px-3 pb-2 text-[11px] text-av-red">{t("Over the 300 character chat limit: shorten the position or split the call.")}</div>}
    </button>
  );
}

// Radar-only (GTA World): airspace alerts and phase suggestions.
function RadarHints({ alerts, suggestions, setPhase, onNextStop }) {
  if (alerts.length === 0 && suggestions.length === 0) return null;
  return (
    <div className="space-y-1">
      {alerts.map((a) => (
        <div
          key={a.text}
          role="alert"
          className={`rounded border-l-4 px-3 py-1.5 font-avmono text-[12px] font-bold ${
            a.level === "danger" ? "border-av-red bg-av-red/15 text-av-red animate-pulse" : "border-av-amber bg-av-amber/10 text-av-amber"
          }`}
        >
          {a.level === "danger" ? "WARNING · " : "CAUTION · "}
          {a.text}
        </div>
      ))}
      {suggestions.map((s) => (
        <button
          key={s.phase || "next-stop"}
          type="button"
          onClick={() => (s.advance ? onNextStop() : setPhase(s.phase))}
          className="w-full rounded border border-av-green/50 bg-av-green/10 px-3 py-1.5 text-left font-avmono text-[12px] text-av-green hover:bg-av-green/20"
        >
          📡 {s.text} <span className="font-bold underline">GO</span>
        </button>
      ))}
    </div>
  );
}

export default function CallsPanel({ flight, update, setPhase, calls, copiedKey, onCopyCall, saaaData, route, alerts = [], suggestions = [], radarSynced, readback, onNextStop }) {
  const { edition, t, ph } = useEdition();
  // No clearance to ask for without a controller station.
  const phases = edition.center ? PHASES : PHASES.filter((p) => p.id !== "clearance");
  const activeIndex = phases.findIndex((p) => p.id === flight.phase);
  const heli = isHeli(flight);
  const rotor = heli ? rotorTip(flight) : null;
  const tip = ph.tip ? ph.tip(flight) : rotor && { icon: "🚁", text: t(rotor), source: t("SAAA Rotorcraft Syllabus") };
  return (
    <div className="space-y-3">
      <RadarHints alerts={alerts} suggestions={suggestions} setPhase={setPhase} onNextStop={onNextStop} />

      <Panel title={t("Flight phase")} bodyClassName="p-2">
        <nav className="flex flex-wrap items-center gap-1" aria-label={t("Flight phase")}>
          {phases.map((p, i) => {
            const active = i === activeIndex;
            const done = i < activeIndex;
            return (
              <div key={p.id} className="flex items-center gap-1">
                {i > 0 && <span className={`font-avmono text-[10px] ${done || active ? "text-av-magenta" : "text-av-mute"}`}>▸</span>}
                <button
                  type="button"
                  onClick={() => setPhase(p.id)}
                  className={`px-3 py-1.5 text-[11px] uppercase tracking-wider ${
                    active ? softkeyClass(true, "magenta") : done ? `${softkeyClass(false)} !text-av-green/70` : softkeyClass(false)
                  }`}
                >
                  {done && "✓ "}
                  {t(heli && p.heliLabel ? p.heliLabel : p.label)}
                </button>
              </div>
            );
          })}
        </nav>
      </Panel>

      <Panel
        title={`COM · ${ph.comLabel(flight)}`}
        action={<span className="font-avmono text-[9px] text-av-mute">{t("CLICK OR PRESS 1-9 TO COPY")}</span>}
      >
        <div className="space-y-2">
          {calls.length === 0 && <div className="font-avmono text-[11px] text-av-mute">{t("Nothing to call in this phase.")}</div>}
          {calls.map((call, i) => (
            <CallCard key={call.id} call={call} index={i} copied={copiedKey === `call-${call.id}`} onCopy={() => onCopyCall(call)} />
          ))}
        </div>
        <div className="mt-2 font-avmono text-[9px] text-av-mute">
          ALT {ph.formatAltitude(flight.alt)} · {t("TGT")} {ph.formatAltitude(flight.target)}
        </div>
        {tip && (
          <div className="mt-2 rounded border border-av-amber/30 bg-av-amber/5 px-2 py-1 text-[11px] text-av-amber">
            {tip.icon} {tip.text} <span className="font-avmono text-[9px] text-av-mute">· {tip.source}</span>
          </div>
        )}
      </Panel>

      {readback}

      <Panel title={t("Phase settings")}>
        {radarSynced && (
          <div className="mb-2 font-avmono text-[10px] text-av-green">
            📡 Altitude, position, heading and inbound direction follow the radar (turn auto-fill off in the MFD to edit them).
          </div>
        )}
        <Controls flight={flight} update={update} saaaData={saaaData} route={route} />
      </Panel>
    </div>
  );
}
