// The two servers the app is built for. They share everything (airports, charts, map,
// taxi routes) except the language and the live data: radar.gta.world and saaa.gta.world
// belong to GTA World (English), so the France edition never calls them.
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
  },
  fr: {
    id: "fr",
    href: "/fr",
    name: "GTA World France",
    lang: "fr",
    logo: "/logos/gta-world-france.png",
    radar: false,
    saaa: false,
  },
};

// Saved flights, chart calibrations… are kept apart per edition: a pilot can fly on both servers.
export const storageKey = (edition, name) => `gtawfi:${edition.id}:${name}`;
