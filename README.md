# GTA W Flight Instruments

Radio calls, airport charts and taxi routes for pilot roleplay, in two editions:

| | GTA World (`/en`) | GTA World France (`/fr`) |
|---|---|---|
| Interface and `/atc` calls | English (SAAA phraseology) | French |
| Airports, charts, map, taxi routes, readback, emergencies | ✓ | ✓ |
| SAAA weather, NOTAMs, runway advice | ✓ | — |
| Live radar, traffic, `/atc` frequency | ✓ | — |

`radar.gta.world` and `saaa.gta.world` belong to GTA World (English): the France edition never calls them.

Both editions fly **airplanes or helicopters** (chosen at preflight). Helicopters (civil, MEDEVAC or SD mission) lift off and land on a parking spot/helipad, a runway (hover taxi) or an off-airfield site, get the takeoff briefing and autorotation emergencies, and show the SAAA Rotorcraft Syllabus limits for each phase.

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
- `src/lib/atc/`: airports, taxi graph, chart geometry, radar and SAAA helpers.
- `src/components/deck/`: the cockpit (`FlightDeck.js` is the page).
- `src/components/landing/`: the landing page with the edition choice.

Community tool. Not affiliated with GTA World, GTA World France or the SAAA.
