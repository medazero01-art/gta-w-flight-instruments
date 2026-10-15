import { AIRPORTS } from "./airports";
import { TAXI } from "./taxi";
import { CHART_GEO } from "./geo";
import * as france from "./france";

// Airports, charts and taxi networks per edition. Both editions use the same internal
// airport keys (KLSI, KSSA, KLGP): only what is drawn, named and said changes.
// `version` changes when an edition's runways or stands change, so saved flights drop them.
export const AIRFIELDS = {
  en: { version: "en-1", airports: AIRPORTS, taxi: TAXI, charts: CHART_GEO },
  fr: { version: "fr-2", airports: france.AIRPORTS, taxi: france.TAXI, charts: france.CHART_GEO },
};
