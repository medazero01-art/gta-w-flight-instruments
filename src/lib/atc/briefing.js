// Pure helpers turning SAAA weather/NOTAM data into briefing hints.

const CALM_WIND_KT = 2;
const CEILING_COVERS = ["broken", "overcast"];
const VFR_MIN_VISIBILITY_M = 5000;

export function weatherFor(airport, weatherList) {
  return weatherList?.find((w) => w.area === airport.weatherArea) || null;
}

export function windComponents(windDirection, windSpeed, runwayHeading) {
  const angle = ((windDirection - runwayHeading) * Math.PI) / 180;
  return {
    headwind: windSpeed * Math.cos(angle),
    crosswind: Math.abs(windSpeed * Math.sin(angle)),
  };
}

// Runway ends sorted best first (most headwind), closed ends last.
export function rankRunways(airport, weather, closedEnds = []) {
  const ends = airport.runwayEnds.map((end) => {
    const closed = closedEnds.includes(end.id);
    if (!weather) return { ...end, closed, headwind: null, crosswind: null };
    return { ...end, closed, ...windComponents(weather.windDirection, weather.windSpeed, end.heading) };
  });
  if (!weather) return ends;
  return ends.sort((a, b) => (a.closed - b.closed) || (b.headwind - a.headwind));
}

export function recommendedRunway(airport, weather, closedEnds = []) {
  if (!weather || weather.windSpeed <= CALM_WIND_KT) return null;
  const best = rankRunways(airport, weather, closedEnds)[0];
  return best && !best.closed ? best.id : null;
}

export function vfrWarnings(weather, plannedAltitude) {
  if (!weather) return [];
  const warnings = [];
  if (CEILING_COVERS.includes(weather.cloudCover) && plannedAltitude >= weather.cloudAltitude) {
    warnings.push(
      `Ceiling ${weather.cloudAltitude.toLocaleString("en-US")}ft (${weather.cloudCover}): planned ${plannedAltitude.toLocaleString("en-US")}ft is in the clouds for VFR.`
    );
  }
  if (weather.visibility < VFR_MIN_VISIBILITY_M) {
    warnings.push(`Visibility ${(weather.visibility / 1000).toFixed(1)}km, below VFR minimums.`);
  }
  if (weather.fog && weather.fog !== "none") warnings.push(`Fog/mist reported: ${weather.fog}.`);
  if (weather.precipitation && weather.precipitation !== "none") {
    warnings.push(`Precipitation: ${weather.precipitation}.`);
  }
  return warnings;
}

// NOTAMs relevant to a flight: every airspace/general one plus those tied to dep/arr.
export function relevantNotams(notams, icaos) {
  const rank = { urgent: 0, high: 1, medium: 2, low: 3 };
  return (notams || [])
    .filter((n) => !n.airportIcao || icaos.includes(n.airportIcao))
    .sort((a, b) => (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9));
}

// Best effort: an airport NOTAM mentioning "closed" and a runway closes that runway.
export function closedRunwayEnds(notams, airport) {
  const closed = new Set();
  for (const notam of notams || []) {
    if (notam.airportIcao !== airport.icao) continue;
    const text = `${notam.title} ${notam.message}`;
    if (!/clos/i.test(text)) continue;
    for (const end of airport.runwayEnds) {
      const number = end.id.replace(/^0/, "");
      if (new RegExp(`\\b(RWY|RUNWAY)S?\\s*0?${number}\\b`, "i").test(text) || new RegExp(`\\b0?${number}\\s*[/-]`, "i").test(text) || new RegExp(`[/-]\\s*0?${number}\\b`, "i").test(text)) {
        closed.add(end.id);
      }
    }
  }
  return [...closed];
}

export function ageLabel(isoDate, now = Date.now()) {
  if (!isoDate) return "unknown";
  const minutes = Math.round((now - new Date(isoDate).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)} days ago`;
}
