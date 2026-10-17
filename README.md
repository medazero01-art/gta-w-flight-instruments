# GTA W Flight Instruments

Radio calls, airport charts and taxi routes for pilot roleplay, in two editions:

| | GTA World (`/en`) | GTA World France (`/fr`) |
|---|---|---|
| Interface and `/atc` calls | English (SAAA phraseology) | French |
| Airports, charts, map, taxi routes, readback, emergencies | ✓ | ✓ |
| SAAA weather, NOTAMs, runway advice | ✓ | — |
| Live radar, traffic, `/atc` frequency | ✓ | — |

`radar.gta.world` and `saaa.gta.world` belong to GTA World (English): the France edition never calls them.

Each session opens on the **flight plan**: the stops of the flight in order (full stop, or touch and go / stop and go / low approach repeated N times), the runway and parking for each when known, and the route drawn on the satellite map of the island. The calls follow the plan (the last touch and go announces where you fly next, the inbound direction comes from the drawn route or from the radar when it is on), and the navigation map shows the whole plan with your aircraft and the next waypoint.

Both editions fly **airplanes or helicopters** (chosen in the flight plan). Helicopters (civil, MEDEVAC or SD mission) lift off and land on a parking spot/helipad, a runway (hover taxi) or an off-airfield site, get the takeoff briefing and autorotation emergencies, and show the SAAA Rotorcraft Syllabus limits for each phase.

## Run

```bash
npm install
npm run dev   # http://localhost:3000
```

Deploy on Vercel as is. The radar and SAAA are only reached through `/api/radar` and `/api/saaa`, which cache and share the answers between every visitor.

## Where things are

- `src/lib/editions.js`: the two editions (name, language, radar/SAAA flags, logo path).
- `src/lib/i18n.js`: French UI strings (English is written in the components).
- `src/lib/atc/phraseology/en.js`, `fr.js`: the radio calls of each edition.
- `src/lib/atc/`: airports, taxi graph, chart geometry, radar and SAAA helpers; `plan.js` for the stops and route of the flight plan.
- `public/maps/sat/`: the satellite map as 512px WebP tiles, 4 zoom levels (calibration in `src/lib/atc/geo.js`).
- `src/components/deck/`: the cockpit (`FlightDeck.js` is the page).
- `src/components/landing/`: the landing page with the edition choice.

Community tool. Not affiliated with GTA World, GTA World France or the SAAA.
