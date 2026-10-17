"use client";

import { useRef, useState } from "react";
import { cardinal, describePlace, distance, formatNm, toNm } from "@/lib/atc/radar";
import { restrictedBoxes, strictMsaBoxes } from "@/lib/atc/airspace";
import { isHeli } from "@/lib/atc/flight";
import { legPath, nextWaypoint, stopLabel, stopPosition } from "@/lib/atc/plan";
import { useEdition } from "./EditionContext";
import { planePath, useFramePainter } from "./paint";
import WorldMap, { AirportsLayer, PlanLayer } from "./WorldMap";
import { ChipGroup, Panel, actionClass } from "./ui";

const RESTRICTED = restrictedBoxes();
const STRICT_MSA = strictMsaBoxes();
const STALE_S = 60;
const KT_TO_MS = 0.5144;

const pathLength = (path) => path.slice(1).reduce((sum, p, i) => sum + distance(path[i], p), 0);
const formatEte = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

// The whole plan on the island map, with our aircraft and the traffic from radar.gta.world.
// The view stays where the pilot puts it unless "Follow" is on.
export default function NavPanel({ flight, update, radar, own, traffic, tracker }) {
  const { edition, t, airports } = useEdition();
  const { plan } = flight;
  const heli = isHeli(flight);
  const [follow, setFollow] = useState(false);
  const ownRef = useRef(null);
  const guideRef = useRef(null);
  const trafficRefs = useRef(new Map());
  const { snapshot, status } = radar;

  const stop = plan.stops[plan.leg];
  const from = plan.stops[plan.leg - 1];
  const path = legPath(plan, plan.leg, airports);
  const nav = own ? nextWaypoint(path, own) : null;
  const remaining = plan.stops.slice(plan.leg - 1).map((s) => stopPosition(s, airports));
  const fit = own ? [...remaining, own] : remaining;
  const target = nav?.target;

  useFramePainter((now) => {
    const p = own ? tracker.predict(own.callsign, now) || own : null;
    if (p) {
      ownRef.current?.setAttribute("transform", `translate(${p.x} ${-p.y}) rotate(${own.heading})`);
      if (guideRef.current && target) {
        guideRef.current.setAttribute("x1", p.x);
        guideRef.current.setAttribute("y1", -p.y);
      }
    }
    for (const a of traffic) {
      const q = tracker.predict(a.callsign, now);
      if (q) trafficRefs.current.get(a.callsign)?.setAttribute("transform", `translate(${q.x} ${-q.y})`);
    }
  });

  const statusText = !flight.radarOn
    ? "RADAR OFF"
    : status.role === "follower"
      ? "LIVE · OTHER TAB POLLING"
      : status.error
        ? `ERR ${status.error} · RETRY ${Math.round((status.delayMs || 0) / 1000)}S`
        : `LIVE · ${Math.round((status.delayMs || 5000) / 1000)}S`;

  const box = (b, i, cls, k, dashed) => (
    <rect key={i} x={b.x1} y={-b.y2} width={b.x2 - b.x1} height={b.y2 - b.y1} className={cls} strokeWidth={k * 1.5} strokeDasharray={dashed ? `${k * 6} ${k * 4}` : undefined} pointerEvents="none" />
  );

  const ete = nav && own?.speedKt > 20 ? formatEte(nav.distanceM / (own.speedKt * KT_TO_MS)) : null;

  return (
    <Panel
      title={t("Navigation map")}
      bodyClassName="p-2.5 space-y-2"
      action={
        <div className="flex flex-wrap items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setFollow(!follow)}
            disabled={!own}
            title={own ? "" : t("Needs your aircraft on the radar")}
            className={`px-2.5 py-0.5 text-[10px] ${actionClass("secondary", follow)}`}
          >
            {follow ? `◉ ${t("Following")}` : `○ ${t("Follow")}`}
          </button>
          {edition.radar && (
            <button type="button" onClick={() => update({ radarOn: !flight.radarOn })} className={`px-2.5 py-0.5 text-[10px] ${actionClass("secondary", flight.radarOn)}`}>
              {flight.radarOn ? "● RADAR" : "○ RADAR"}
            </button>
          )}
        </div>
      }
    >
      {edition.radar && (
        <div className={`font-avmono text-[10px] ${status.error ? "text-av-amber" : flight.radarOn ? "text-av-green" : "text-av-mute"}`}>
          {statusText} · radar.gta.world
          {flight.radarOn && !own && snapshot && (
            <span className="text-av-amber"> · {flight.registration || flight.callsign || "your aircraft"} not on radar (check registration / engine on)</span>
          )}
        </div>
      )}

      {/* Guidance to the next point of the drawn route, or the leg itself without radar. */}
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 rounded border border-av-magenta/50 bg-av-magenta/5 px-2.5 py-1.5 font-avmono">
        {nav ? (
          <>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold text-av-magenta">
                ▸ {nav.isStop ? stopLabel(stop, airports) : `WP ${nav.index}`}
                <span className="ml-2 font-normal text-av-text">{nav.isStop ? airports[stop.icao]?.shortName : describePlace(nav.target)}</span>
              </div>
              <div className="text-[10px] text-av-dim">
                {stopLabel(stop, airports)} {formatNm(nav.remainingM)}
                {nav.offTrackM > 400 && <span className="ml-2 text-av-amber">{t("{nm} off route", { nm: formatNm(nav.offTrackM) })}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[15px] font-bold tabular-nums text-av-magenta">
                {String(Math.round(nav.bearing) % 360).padStart(3, "0")}° <span className="text-av-text">{toNm(nav.distanceM).toFixed(1)}</span>
                <span className="text-[10px] text-av-dim"> NM</span>
              </div>
              {ete && <div className="text-[10px] text-av-dim">ETE {ete}</div>}
            </div>
          </>
        ) : (
          <>
            <div className="min-w-0 text-[12px]">
              <span className="font-bold text-av-magenta">
                {t("Leg {n}/{total}", { n: plan.leg, total: plan.stops.length - 1 })} · {stopLabel(from, airports)} ▸ {stopLabel(stop, airports)}
              </span>
              <div className="text-[10px] text-av-dim">
                {stop.route.length > 0 ? t("{n} waypoints", { n: stop.route.length }) : t("direct")} ·{" "}
                {t("inbound from the {dir}", { dir: t(flight.from) })}
              </div>
            </div>
            <div className="text-right text-[14px] font-bold tabular-nums text-av-text">
              {toNm(pathLength(path)).toFixed(1)}
              <span className="text-[10px] text-av-dim"> NM</span>
            </div>
          </>
        )}
      </div>

      <WorldMap
        fit={fit}
        fitKey={`${plan.leg}/${plan.stops.length}`}
        mapStyle={flight.mapStyle}
        follow={follow && own ? () => tracker.predict(own.callsign, performance.now()) || own : undefined}
        onUserPan={() => setFollow(false)}
        style={{ height: "min(62vh, 640px)", minHeight: 320 }}
        label={t("Moving map")}
      >
        {({ k }) => (
          <>
            {RESTRICTED.map((b, i) => box(b, `r${i}`, "fill-av-red/20 stroke-av-red", k))}
            {/* Minimum safe altitude areas come from the SAAA Aviation Code: GTA World only. */}
            {edition.saaa && STRICT_MSA.map((b, i) => box(b, `m${i}`, "fill-av-amber/5 stroke-av-amber/70", k, true))}
            <AirportsLayer airports={airports} k={k} />
            <PlanLayer plan={plan} airports={airports} k={k} heli={heli} fromLeg={plan.leg} activeLeg={plan.leg} />
            {own && target && (
              <line
                ref={guideRef}
                x1={own.x}
                y1={-own.y}
                x2={target.x}
                y2={-target.y}
                className="stroke-av-magenta"
                strokeWidth={k * 2}
                strokeDasharray={`${k * 4} ${k * 4}`}
                pointerEvents="none"
              />
            )}
            {traffic.map((a) => {
              const rad = (a.heading * Math.PI) / 180;
              return (
                <g
                  key={a.callsign}
                  ref={(el) => (el ? trafficRefs.current.set(a.callsign, el) : trafficRefs.current.delete(a.callsign))}
                  transform={`translate(${a.x} ${-a.y})`}
                  opacity={a.ageS > STALE_S ? 0.4 : 1}
                  pointerEvents="none"
                >
                  <line x1={0} y1={0} x2={Math.sin(rad) * k * 28} y2={-Math.cos(rad) * k * 28} className="stroke-av-green" strokeWidth={k * 1.5} />
                  <path d={`M0 ${-k * 6} L${k * 6} 0 L0 ${k * 6} L${-k * 6} 0 Z`} className="fill-av-green" stroke="#000" strokeWidth={k} />
                  <text x={k * 9} y={-k * 3} fontSize={k * 11} className="fill-av-green font-avmono font-bold" paintOrder="stroke" stroke="#000" strokeWidth={k * 3}>
                    {a.callsign}
                  </text>
                  <text x={k * 9} y={k * 9} fontSize={k * 10} className="fill-av-green font-avmono" paintOrder="stroke" stroke="#000" strokeWidth={k * 3}>
                    {String(Math.round(a.altFt / 100)).padStart(3, "0")}
                  </text>
                </g>
              );
            })}
            {own && (
              <g ref={ownRef} transform={`translate(${own.x} ${-own.y}) rotate(${own.heading})`} pointerEvents="none">
                <line x1={0} y1={0} x2={0} y2={-k * 90} className="stroke-white/70" strokeWidth={k * 1.5} strokeDasharray={`${k * 6} ${k * 5}`} />
                <path d={planePath(k * 12)} className="fill-white stroke-black" strokeWidth={k * 1.5} />
              </g>
            )}
          </>
        )}
      </WorldMap>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1" role="group" aria-label={t("Map")}>
          {[
            { value: "dim", label: t("Map dim") },
            { value: "bright", label: t("Bright") },
            { value: "off", label: t("Off") },
          ].map((o) => (
            <button key={o.value} type="button" onClick={() => update({ mapStyle: o.value })} className={`px-2 py-1 text-[10px] ${actionClass("secondary", flight.mapStyle === o.value)}`}>
              {o.label}
            </button>
          ))}
        </div>
        <span className="font-avmono text-[10px] text-av-dim">{t("wheel / pinch = zoom · drag = pan")}</span>
      </div>

      {edition.radar && flight.radarOn && (
        <>
          <ChipGroup
            size="sm"
            label="Auto-fill calls from radar"
            options={[
              { value: true, label: "On" },
              { value: false, label: "Off (manual)" },
            ]}
            value={flight.radarSync}
            onChange={(radarSync) => update({ radarSync })}
          />
          <div>
            <div className="mb-1 font-avmono text-[10px] font-bold uppercase tracking-[0.14em] text-av-mute">Traffic ({traffic.length})</div>
            {traffic.length === 0 && <div className="font-avmono text-[11px] text-av-mute">No other aircraft on the radar.</div>}
            <ul className="space-y-1">
              {traffic.map((a) => (
                <li
                  key={a.callsign}
                  className={`grid grid-cols-[1fr_auto] gap-x-2 rounded border border-av-line/60 bg-black/30 px-2 py-1 font-avmono text-[11px] ${a.ageS > STALE_S ? "opacity-50" : ""}`}
                >
                  <span className="truncate font-bold text-av-green">
                    {a.callsign} <span className="font-normal text-av-mute">{a.model}</span>
                  </span>
                  <span className="text-right text-av-text">{a.altFt.toLocaleString("en-US")}ft</span>
                  <span className="truncate text-av-dim">
                    {formatNm(a.distanceM)} {cardinal(a.fromCenter).toUpperCase()} · {a.place}
                  </span>
                  <span className="text-right text-av-dim">
                    {a.speedKt != null ? `${Math.round(a.speedKt)}kt` : ""}
                    {a.ageS > STALE_S ? ` · ${Math.round(a.ageS / 60)}m old` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </Panel>
  );
}
