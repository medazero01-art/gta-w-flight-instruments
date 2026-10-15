"use client";

import { AIRPORTS } from "@/lib/atc/airports";
import {
  ageLabel,
  closedRunwayEnds,
  rankRunways,
  recommendedRunway,
  relevantNotams,
  vfrWarnings,
  weatherFor,
} from "@/lib/atc/briefing";
import { Panel, softkeyClass } from "./ui";

const PRIORITY_STYLES = {
  urgent: "text-av-red border-av-red/60",
  high: "text-av-amber border-av-amber/60",
  medium: "text-av-amber/80 border-av-amber/40",
  low: "text-av-green border-av-green/50",
};

const COVER = { clear: "SKC", few: "FEW", scattered: "SCT", broken: "BKN", overcast: "OVC" };
const signed = (n) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(0)}`;

// METAR-like line: "KLSI 23203KT 9999 FEW030 20/"
export function metar(icao, w) {
  const wind = w.windSpeed <= 2 ? "00000KT" : `${String(w.windDirection).padStart(3, "0")}${String(w.windSpeed).padStart(2, "0")}KT`;
  const vis = w.visibility >= 10000 ? "9999" : String(w.visibility).padStart(4, "0");
  const cover = COVER[w.cloudCover] || String(w.cloudCover || "").toUpperCase();
  const clouds = cover === "SKC" ? "SKC" : `${cover}${String(Math.round(w.cloudAltitude / 100)).padStart(3, "0")}`;
  return `${icao} ${wind} ${vis} ${clouds} ${Math.round(w.temperature)}/`;
}

function AirportBriefing({ icao, role, data, flight, onUseRunway }) {
  const airport = AIRPORTS[icao];
  const official = data?.airports.find((a) => a.icao === icao);
  const weather = weatherFor(airport, data?.weather);
  const closed = closedRunwayEnds(data?.notams, airport);
  const best = recommendedRunway(airport, weather, closed);
  const ends = rankRunways(airport, weather, closed);
  const warnings = flight.rules === "VFR" ? vfrWarnings(weather, Number(flight.target)) : [];

  return (
    <div className="rounded border border-av-line bg-black/30 p-2.5 space-y-2">
      <div className="flex items-baseline justify-between gap-2 font-avmono">
        <div>
          <span className="mr-2 text-[10px] text-av-magenta">{role}</span>
          <span className="text-sm font-bold text-av-text">{airport.shortName}</span>
          <span className="ml-2 text-[11px] text-av-cyan">{icao}</span>
        </div>
        {official && <span className="text-[10px] text-av-mute">ATC SVC {official.atcAvailable ? "YES" : "NO"}</span>}
      </div>

      {weather ? (
        <div className="font-avmono">
          <div className="text-[12px] font-bold text-av-green">{metar(icao, weather)}</div>
          <div className="text-[10px] text-av-mute">
            {weather.area} area · updated {ageLabel(weather.updatedAt)}
            {weather.precipitation && weather.precipitation !== "none" && ` · ${weather.precipitation}`}
          </div>
        </div>
      ) : (
        <div className="font-avmono text-[11px] text-av-mute">{data ? "No weather for this area." : "Loading weather…"}</div>
      )}

      <div className="flex flex-wrap gap-1">
        {ends.map((end) => {
          const selected = flight.runways[icao] === end.id;
          return (
            <button
              key={end.id}
              type="button"
              onClick={() => onUseRunway(icao, end.id)}
              disabled={end.closed}
              title={end.headwind == null ? "" : `Headwind ${end.headwind.toFixed(1)}kt, crosswind ${end.crosswind.toFixed(1)}kt`}
              className={`px-2 py-1 text-[11px] ${softkeyClass(selected)} ${end.closed ? "line-through" : ""}`}
            >
              {end.id}
              {end.headwind != null && !end.closed && <span className="ml-1 text-[9px] text-av-mute">{signed(end.headwind)}/{end.crosswind.toFixed(0)}</span>}
              {end.id === best && <span className="ml-1 text-av-amber">★</span>}
              {end.closed && <span className="ml-1 text-av-red">CLSD</span>}
            </button>
          );
        })}
      </div>
      <div className="font-avmono text-[9px] text-av-mute">
        {weather && !best ? "CALM · ANY RUNWAY · " : ""}HEAD/CROSS KT · ★ INTO THE WIND
      </div>

      {warnings.length > 0 && (
        <ul className="space-y-1">
          {warnings.map((w) => (
            <li key={w} className="rounded border border-av-amber/40 bg-av-amber/10 px-2 py-1 text-[11px] text-av-amber">
              ⚠ {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Briefing({ flight, saaa, onUseRunway }) {
  const { data, loading, error, refresh } = saaa;
  const icaos = [...new Set([flight.dep, flight.arr])];
  const notams = relevantNotams(data?.notams, icaos);
  const offline = data ? Object.entries(data.status).filter(([, s]) => !s.live).map(([k]) => k) : [];

  return (
    <Panel
      title="WX / NOTAM"
      action={
        <button type="button" onClick={refresh} disabled={loading} className={`px-2 py-0.5 text-[10px] uppercase ${softkeyClass(false)}`}>
          {loading ? "Loading" : "Refresh"}
        </button>
      }
    >
      <div className="space-y-2.5">
        {icaos.map((icao) => (
          <AirportBriefing
            key={icao}
            icao={icao}
            role={icao === flight.dep ? (icao === flight.arr ? "DEP/ARR" : "DEP") : "ARR"}
            data={data}
            flight={flight}
            onUseRunway={onUseRunway}
          />
        ))}

        <div>
          <div className="font-avmono text-[10px] font-bold uppercase tracking-[0.14em] text-av-mute mb-1">NOTAM {data && `(${notams.length})`}</div>
          {notams.length === 0 && <div className="font-avmono text-[11px] text-av-mute">{data ? "NIL" : "…"}</div>}
          <ul className="space-y-1">
            {notams.map((n) => (
              <li key={n.id} className="rounded border border-av-line bg-black/30 px-2 py-1.5">
                <div className="flex items-center gap-2 font-avmono text-[9px] uppercase">
                  <span className={`rounded border px-1 ${PRIORITY_STYLES[n.priority] || "text-av-dim border-av-line"}`}>{n.priority}</span>
                  <span className="text-av-mute">{n.type}</span>
                  {n.url && (
                    <a href={n.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-av-cyan hover:underline">
                      Zone ↗
                    </a>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-av-text">{n.message}</div>
              </li>
            ))}
          </ul>
        </div>

        {data && (
          <div className="font-avmono text-[9px] text-av-mute">
            SAAA · fetched {ageLabel(data.fetchedAt)}
            {offline.length > 0 && <span className="text-av-amber"> · offline copy: {offline.join(", ")}</span>}
          </div>
        )}
        {error && !data && <div className="font-avmono text-[11px] text-av-red">Briefing unavailable ({error}).</div>}
      </div>
    </Panel>
  );
}
