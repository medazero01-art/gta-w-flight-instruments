// The two servers the app is built for. They fly the same island but each has its own
// airport diagrams and radio procedures (lib/atc/airfields.js, lib/atc/phraseology).
// radar.gta.world and saaa.gta.world belong to GTA World (English), so the France edition
// never calls them. `center`: a controller station can be online (San Andreas Center);
// GTA World France has no live ATC, pilots announce to the airport or to TRAFFIC.
//
// Logos: drop the files at the `logo` paths below (public/logos/), any size, square works best.
// Until then the cards show a placeholder.

export const EDITIONS = {
  en: {
    id: "en",
    href: "/en",
    name: "GTA World",
    lang: "en",
    logo: "/logos/gta-world.png",
    radar: true,
    saaa: true,
    center: true,
  },
  fr: {
    id: "fr",
    href: "/fr",
    name: "GTA World France",
    lang: "fr",
    logo: "/logos/gta-world-france.png",
    radar: false,
    saaa: false,
    center: false,
  },
};

// Saved flights, chart calibrations… are kept apart per edition: a pilot can fly on both servers.
export const storageKey = (edition, name) => `gtawfi:${edition.id}:${name}`;
