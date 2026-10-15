// Landing page text. The page language (EN/FR toggle) is separate from the edition the
// pilot picks: a French speaker can still open the GTA World (English) edition.

export const COPY = {
  en: {
    eyebrow: "GTA World · GTA World France · pilot roleplay",
    title: ["Your radio calls, ready to paste into ", "/atc", "."],
    lede:
      "GTA W Flight Instruments writes every call of a flight, from startup to parking. You fly and play your character; the app handles the wording, the runways, the taxi routes and, on GTA World, the weather and your radar position.",
    choose: "Choose your server",
    open: "Open the cockpit",
    editions: {
      en: {
        tags: ["English", "Live radar", "SAAA"],
        features: [
          "SAAA phraseology: CTAF and San Andreas Center",
          "Live position from radar.gta.world, traffic and the /atc frequency",
          "Official SAAA weather, NOTAMs and runway advice",
          "Airport charts, taxi routes, emergencies",
          "Airplane or helicopter: civil, MEDEVAC, SD",
        ],
        off: [],
      },
      fr: {
        tags: ["Français", "Charts", "Taxi routes"],
        features: [
          "Calls written in French: CTAF and San Andreas Contrôle",
          "Same airports, charts, map and taxi routes",
          "Readback, emergencies, preflight",
          "Airplane or helicopter: civil, MEDEVAC, SD",
        ],
        off: ["No live radar or SAAA data: those services belong to GTA World (English)"],
      },
    },
    demo: {
      eyebrow: "Try it",
      title: "One click, one call",
      text: "Pick a phase: the app builds the call for your flight, prefixed with /atc and kept under the 300-character chat limit. Switch the edition to see the same flight in French.",
      head: "COM · generated calls",
      note: "Example flight. Click a phase.",
      copy: "Copy",
      copied: "Copied ✓",
    },
    goal: {
      eyebrow: "The goal",
      title: "Correct radio calls without breaking immersion",
      text: "On GTA World, pilots talk in text while they fly. Typing a full, correct call on final is the best way to botch your landing. The app takes that load off you.",
      items: [
        ["The right phraseology", "Each call follows the expected order: who you're calling, who you are, where you are, what you're doing. Runways read “Runway 3-0 Left” or “Runway 30L”, your choice."],
        ["One click, copied", "Calls come already prefixed with /atc. One click or a key from 1 to 9 is enough, and the counter keeps you under the 300-character chat limit."],
        ["Built for both servers", "Same cockpit for GTA World and GTA World France. On GTA World it also plugs into the SAAA briefing and the live radar."],
      ],
    },
    feat: {
      eyebrow: "Features",
      title: "Everything in the cockpit",
      only: "GTA World only",
      pages: [
        { label: "Preflight", key: "PRE", title: "Your flight in a few clicks", items: ["Callsign, departure, arrival, VFR or IFR", "Starting hangar and runway picked straight on the airport chart", "The last flight comes back next session: check and go"], readout: ["c", "N738IA · KLSI ━▶ KSSA · VFR · RWY 30L"] },
        { label: "Taxi", key: "TAXI", title: "Your taxi route, worked out for you", items: ["Taxiway network traced from the official airport diagrams", "Pick your parking spot and runway, the app finds the shortest route", "It avoids crossing a runway when it can, and calls out every crossing"], readout: ["m", "IMEX Hangar → 30L: via B and B1"] },
        { label: "Weather / NOTAM", key: "WX", only: true, title: "The SAAA briefing at a glance", items: ["Official weather for departure and arrival, in METAR format", "Runways ranked by headwind and crosswind, the best one marked ★", "Runways closed by NOTAM struck out, VFR warnings when the ceiling is too low"], readout: ["g", "KSSA 14103KT 9999 OVC030 20/ · RWY 07 ★"] },
        { label: "Radar", key: "RDR", only: true, title: "Your position, filled in for you", items: ["The app finds you on radar.gta.world by your registration", "Altitude, place overflown, heading and inbound direction follow the radar", "It suggests the next phase and warns about restricted airspace"], readout: ["r", "WARNING · Inside Fort Zancudo (restricted airspace)"] },
        { label: "Multifunction display", key: "MFD · MAP / CHART", wide: true, title: "The island map in flight, the airport diagram on the ground", items: [["MAP", "GTA V map with range rings, airports and restricted zones; on GTA World, live traffic and your aircraft"], ["CHART", "official airport diagram in night mode, with zoom and pan. Click a runway or a parking spot to select it, the route is drawn in magenta"], ["", "The display switches by itself with the flight phase"]], readout: ["c", "N↑ · 2 NM · KLSI · KSSA · KLGP"] },
        { label: "Readback", key: "RB", title: "The readback, ready to send", items: ["Paste the controller's message, get the readback with your callsign", "Courtesy and weather parts are left out, questions are flagged", "On GTA World, messages for you arrive from the live /atc frequency by themselves"], readout: ["g", "Cleared for takeoff, Runway 2-5. N738IA."] },
        { label: "Emergencies", key: "MAYDAY / PAN", title: "Your emergency call in two choices", items: ["MAYDAY and PAN-PAN buttons always in view", "Pick the situation and the action", "The full call is ready to copy, with your position and altitude"], readout: ["a", "Mayday, Mayday, Mayday. Sandy Shores Traffic. N738IA. Total engine failure…"] },
        { label: "Helicopters", key: "HELI", wide: true, title: "Airplane or helicopter, chosen at preflight", items: ["Civil, MEDEVAC or SD mission", "Lift off and land on a helipad, a parking spot, a runway (hover taxi) or an off-airfield site", "Takeoff briefing for the crew, autorotation emergencies and the SAAA Rotorcraft Syllabus limits at each phase"], readout: ["m", "San Andreas Traffic. MEDEVAC N738IA. Orbiting over Pillbox Hill Medical Center to assess the landing zone."] },
      ],
    },
    compare: {
      eyebrow: "Two editions",
      title: "Same cockpit, two servers",
      text: "The France edition runs on its own: radar.gta.world and saaa.gta.world are GTA World (English) services, so nothing tied to them is shown there and they are never called.",
      cols: ["", "GTA World", "GTA World France"],
      rows: [
        ["Interface and calls", "English", "Français"],
        ["Airports, charts, map, taxi routes", "✓", "✓"],
        ["CTAF / controller calls, readback, emergencies", "✓", "✓"],
        ["SAAA weather, NOTAMs, runway advice", "✓", "—"],
        ["Live radar, traffic, /atc frequency", "✓", "—"],
      ],
    },
    how: {
      eyebrow: "How it works · GTA World",
      title: "Two public APIs, used like a gentleman",
      text: "The app only reads public data, read-only. Your browser never contacts the SAAA or the radar directly: it goes through the Flight Instruments server, which caches the answers and shares them between every pilot online. Whether 1 or 50 of you are flying, GTA World's sites get the same small number of requests.",
      flow: [
        ["Your browser", "Flight Instruments", "Calls, charts, taxi routes. Your flight is saved on your device and nowhere else."],
        ["Flight Instruments server", "Shared cache", "One request to each source per cache window, for everyone."],
        ["Public sources", "", ""],
      ],
      api: ["API", "What we read", "Refreshed at most"],
      rows: [
        ["saaa.gta.world/api/airports", "Airports, official charts, ATC service", "once a day"],
        ["saaa.gta.world/api/weather", "Weather by area (wind, visibility, clouds)", "once an hour"],
        ["saaa.gta.world/api/notams", "NOTAMs in force (zones, closed runways)", "every 15 min"],
        ["radar.gta.world/api/aircraft", "Aircraft positions (only with the radar on)", "every 2 s, for everyone"],
        ["radar.gta.world/api · /atc feed", "Messages on the /atc frequency", "every 3 s, for everyone"],
      ],
      manners: [
        ["Discreet", ["The radar is off by default and requests nothing until you turn it on.", "Paused while the tab is hidden. With several tabs open, only one polls.", "Never two requests at once."]],
        ["Patient", ["If the radar doesn't answer, the server waits 15 s and serves the last data it got.", "In the browser, the delay doubles after each error, up to 60 s.", "If the SAAA can't be reached, the app shows an offline copy and says so."]],
        ["Transparent", ["Every request identifies itself (gtaw-flight-instruments/1.0 with the site address).", "Public reads only: nothing is written, nothing is stored on the server.", "Players' in-game IDs are stripped from /atc messages."]],
      ],
    },
    shots: {
      eyebrow: "On screen",
      title: "Three columns, like a flight deck",
      text: "On the left, the flight plan (and on GTA World the weather and the frequency). In the middle, phases and calls. On the right, the multifunction display.",
      items: [
        ["/landing/cockpit.jpg", 1920, 1080, "Full cockpit view: flight plan and weather on the left, taxi calls in the middle, Los Santos International diagram with the route in magenta on the right", "Parked at Los Santos International.", " The taxi call and the route to runway 30L are generated from the diagram."],
        ["/landing/taxi-sandy.jpg", 1570, 1020, "Taxi in at Sandy Shores: generated call and route drawn on the airfield diagram", "Taxi in at Sandy Shores.", " “via A1 and A, crossing Runway 04/22”, drawn on the diagram."],
      ],
    },
    legs: {
      eyebrow: "A typical flight",
      title: "From the apron to the hangar",
      items: [
        ["Preflight", "Callsign, airports, starting hangar and runway, picked on the chart. On GTA World, weather and NOTAMs are right there."],
        ["Taxi", "The route is computed, drawn on the diagram and written into the call."],
        ["Take off and fly", "Copy your position reports in one click. On GTA World, the radar fills in altitude, heading and place."],
        ["Arrive", "Pattern entry, downwind, base, final: every call is ready, and the app moves to the next phase once you copy."],
        ["Get to parking", "Runway vacated, route back to the hangar, readback ready if a controller talks to you."],
      ],
    },
    footer: "Community tool for GTA World pilots. Not affiliated with GTA World, GTA World France or the SAAA.",
  },

  fr: {
    eyebrow: "GTA World · GTA World France · roleplay pilote",
    title: ["Vos messages radio, prêts à coller dans ", "/atc", "."],
    lede:
      "GTA W Flight Instruments prépare chaque message d'un vol, de la mise en route jusqu'au parking. Vous pilotez et vous jouez votre rôle ; l'app s'occupe des formulations, des pistes, du roulage et, sur GTA World, de la météo et de votre position radar.",
    choose: "Choisissez votre serveur",
    open: "Ouvrir le cockpit",
    editions: {
      en: {
        tags: ["English", "Radar en direct", "SAAA"],
        features: [
          "Phraséologie SAAA en anglais : CTAF et San Andreas Center",
          "Position en direct depuis radar.gta.world, trafic et fréquence /atc",
          "Météo, NOTAM et piste conseillée de la SAAA",
          "Cartes d'aéroport, roulage, urgences",
          "Avion ou hélicoptère : civil, MEDEVAC, SD",
        ],
        off: [],
      },
      fr: {
        tags: ["Français", "Cartes", "Roulage"],
        features: [
          "Messages rédigés en français : CTAF et San Andreas Contrôle",
          "Mêmes aéroports, cartes, carte de l'île et itinéraires de roulage",
          "Collationnement, urgences, prévol",
          "Avion ou hélicoptère : civil, MEDEVAC, SD",
        ],
        off: ["Pas de radar ni de données SAAA : ces services appartiennent à GTA World (anglais)"],
      },
    },
    demo: {
      eyebrow: "Essayez",
      title: "Un clic, un message",
      text: "Choisissez une phase : l'app écrit le message de votre vol, préfixé par /atc et sous la limite des 300 caractères du chat. Changez d'édition pour voir le même vol en français.",
      head: "COM · messages générés",
      note: "Exemple de vol. Cliquez sur une phase.",
      copy: "Copier",
      copied: "Copié ✓",
    },
    goal: {
      eyebrow: "Le but",
      title: "Une radio juste, sans casser l'immersion",
      text: "Sur GTA World, les pilotes communiquent par écrit pendant qu'ils volent. Taper un message complet et correct en finale, c'est le meilleur moyen de rater son atterrissage. L'app retire cette charge.",
      items: [
        ["La bonne phraséologie", "Chaque message suit l'ordre attendu : à qui l'on parle, qui parle, où l'on est, ce que l'on fait. Les pistes s'écrivent « piste 3-0 gauche » ou « piste 30L », au choix."],
        ["Un clic, c'est copié", "Les messages arrivent déjà préfixés par /atc. Un clic ou une touche de 1 à 9 suffit, et le compteur vous évite de dépasser les 300 caractères du chat."],
        ["Pensé pour les deux serveurs", "Le même cockpit pour GTA World et GTA World France. Sur GTA World, il se branche en plus sur le briefing SAAA et le radar en direct."],
      ],
    },
    feat: {
      eyebrow: "Fonctionnalités",
      title: "Tout ce qu'il y a dans le cockpit",
      only: "GTA World uniquement",
      pages: [
        { label: "Prévol", key: "PRE", title: "Votre vol en quelques clics", items: ["Indicatif, départ, arrivée, VFR ou IFR", "Hangar de départ et piste choisis directement sur la carte de l'aéroport", "Le dernier vol revient à la session suivante : on vérifie et on part"], readout: ["c", "N738IA · KLSI ━▶ KSSA · VFR · RWY 30L"] },
        { label: "Roulage", key: "TAXI", title: "Le chemin de roulage calculé pour vous", items: ["Réseau de taxiways tiré des cartes officielles d'aéroport", "Choisissez votre parking et votre piste, l'app trouve l'itinéraire le plus court", "Elle évite de traverser une piste quand c'est possible, et annonce les traversées"], readout: ["m", "Hangar IMEX → 30L : via B et B1"] },
        { label: "Météo / NOTAM", key: "WX", only: true, title: "Le briefing de la SAAA d'un coup d'œil", items: ["Météo officielle du départ et de l'arrivée, au format METAR", "Pistes classées selon le vent de face et de travers, la meilleure marquée ★", "Pistes fermées par NOTAM barrées, alertes VFR si le plafond est trop bas"], readout: ["g", "KSSA 14103KT 9999 OVC030 20/ · RWY 07 ★"] },
        { label: "Radar", key: "RDR", only: true, title: "Votre position remplie toute seule", items: ["L'app vous retrouve sur radar.gta.world grâce à votre immatriculation", "Altitude, lieu survolé, cap et direction d'arrivée suivent le radar", "Elle propose la phase suivante et alerte près des zones interdites"], readout: ["r", "WARNING · Inside Fort Zancudo (restricted airspace)"] },
        { label: "Écran multifonction", key: "MFD · CARTE / AÉROPORT", wide: true, title: "La carte de l'île en vol, la carte d'aéroport au sol", items: [["CARTE", "carte de GTA V avec cercles de distance, aéroports et zones réglementées ; sur GTA World, le trafic en direct et votre avion"], ["AÉROPORT", "carte officielle en mode nuit, avec zoom et déplacement. Cliquez sur une piste ou un parking pour le choisir, l'itinéraire est tracé en magenta"], ["", "L'écran bascule tout seul selon la phase de vol"]], readout: ["c", "N↑ · 2 NM · KLSI · KSSA · KLGP"] },
        { label: "Collationnement", key: "RB", title: "Le collationnement prêt à envoyer", items: ["Collez le message du contrôleur, récupérez la répétition avec votre indicatif", "Les politesses et la météo sont retirées, les questions signalées", "Sur GTA World, les messages qui vous sont adressés arrivent seuls depuis la fréquence /atc"], readout: ["g", "Autorisé décollage piste 2-5. N738IA."] },
        { label: "Urgences", key: "MAYDAY / PAN", title: "Le message d'urgence en deux choix", items: ["Boutons MAYDAY et PAN-PAN toujours visibles", "Choisissez la situation et l'action", "Le message complet est prêt à copier, avec votre position et votre altitude"], readout: ["a", "Mayday, Mayday, Mayday. Sandy Shores Trafic. N738IA. Panne moteur totale…"] },
        { label: "Hélicoptères", key: "HELI", wide: true, title: "Avion ou hélicoptère, au choix dès le prévol", items: ["Mission civile, MEDEVAC ou SD", "Décollage et poser sur hélisurface, parking, piste (translation) ou site hors aérodrome", "Briefing décollage pour l'équipage, urgences en autorotation et limites du syllabus Rotorcraft SAAA à chaque phase"], readout: ["m", "San Andreas Trafic. MEDEVAC N738IA. En orbite au-dessus de Pillbox Hill Medical Center pour reconnaître la zone de poser."] },
      ],
    },
    compare: {
      eyebrow: "Deux éditions",
      title: "Le même cockpit, deux serveurs",
      text: "L'édition France fonctionne seule : radar.gta.world et saaa.gta.world sont des services de GTA World (anglais), donc rien de ce qui en dépend n'y est affiché et ils ne sont jamais appelés.",
      cols: ["", "GTA World", "GTA World France"],
      rows: [
        ["Interface et messages", "English", "Français"],
        ["Aéroports, cartes, carte de l'île, roulage", "✓", "✓"],
        ["Messages CTAF / contrôleur, collationnement, urgences", "✓", "✓"],
        ["Météo, NOTAM et piste conseillée de la SAAA", "✓", "—"],
        ["Radar en direct, trafic, fréquence /atc", "✓", "—"],
      ],
    },
    how: {
      eyebrow: "Comment ça marche · GTA World",
      title: "Deux API publiques, utilisées en gentleman",
      text: "L'app ne fait que lire des données publiques. Votre navigateur ne contacte jamais la SAAA ni le radar directement : il passe par le serveur de Flight Instruments, qui garde les réponses en cache et les partage entre tous les pilotes connectés. Que vous soyez 1 ou 50 à voler, les sites de GTA World reçoivent le même petit nombre de requêtes.",
      flow: [
        ["Votre navigateur", "Flight Instruments", "Messages, cartes, itinéraires. Votre vol reste enregistré chez vous, nulle part ailleurs."],
        ["Serveur Flight Instruments", "Cache partagé", "Une seule requête vers chaque source par fenêtre de cache, pour tout le monde."],
        ["Sources publiques", "", ""],
      ],
      api: ["API", "Ce qu'on lit", "Rafraîchi au plus"],
      rows: [
        ["saaa.gta.world/api/airports", "Aéroports, cartes officielles, service ATC", "1 fois par jour"],
        ["saaa.gta.world/api/weather", "Météo par zone (vent, visibilité, nuages)", "1 fois par heure"],
        ["saaa.gta.world/api/notams", "NOTAM en vigueur (zones, pistes fermées)", "toutes les 15 min"],
        ["radar.gta.world/api/aircraft", "Positions des avions (radar allumé uniquement)", "toutes les 2 s, pour tous"],
        ["radar.gta.world/api · flux /atc", "Messages de la fréquence /atc", "toutes les 3 s, pour tous"],
      ],
      manners: [
        ["Discret", ["Le radar est éteint par défaut et n'interroge rien tant que vous ne l'allumez pas.", "En pause quand l'onglet est caché. Avec plusieurs onglets, un seul interroge.", "Jamais deux requêtes en même temps."]],
        ["Patient", ["Si le radar ne répond pas, le serveur attend 15 s et sert les dernières données reçues.", "Côté navigateur, le délai double à chaque erreur, jusqu'à 60 s.", "Si la SAAA est injoignable, l'app affiche une copie hors ligne et le signale."]],
        ["Transparent", ["Chaque requête s'identifie (gtaw-flight-instruments/1.0 avec l'adresse du site).", "Uniquement des lectures publiques : rien n'est écrit, rien n'est stocké côté serveur.", "L'identifiant en jeu des joueurs est retiré des messages /atc."]],
      ],
    },
    shots: {
      eyebrow: "À l'écran",
      title: "Trois colonnes, comme un poste de pilotage",
      text: "À gauche, le plan de vol (et sur GTA World la météo et la fréquence). Au centre, les phases et les messages. À droite, l'écran multifonction.",
      items: [
        ["/landing/cockpit.jpg", 1920, 1080, "Vue complète du cockpit : plan de vol et météo à gauche, messages de roulage au centre, carte de Los Santos International avec l'itinéraire en magenta à droite", "Au parking à Los Santos International.", " Le message de roulage et l'itinéraire vers la piste 30L sont générés depuis la carte."],
        ["/landing/taxi-sandy.jpg", 1570, 1020, "Roulage retour à Sandy Shores : message généré et itinéraire tracé sur la carte de l'aérodrome", "Roulage retour à Sandy Shores.", " L'itinéraire avec la traversée de la piste 04/22, tracé sur la carte."],
      ],
    },
    legs: {
      eyebrow: "Un vol type",
      title: "De l'apron au hangar",
      items: [
        ["Prévol", "Indicatif, aéroports, hangar de départ et piste, choisis sur la carte. Sur GTA World, météo et NOTAM sont juste en dessous."],
        ["Rouler", "L'itinéraire se calcule, se dessine sur la carte et s'écrit dans le message."],
        ["Décoller et voler", "Copiez vos comptes rendus de position en un clic. Sur GTA World, le radar remplit l'altitude, le cap et le lieu."],
        ["Arriver", "Intégration, vent arrière, base, finale : chaque annonce est prête, et l'app passe à la phase suivante après la copie."],
        ["Rejoindre le parking", "Piste dégagée, itinéraire de retour jusqu'au hangar, collationnement prêt si un contrôleur vous parle."],
      ],
    },
    footer: "Outil communautaire pour les pilotes de GTA World. Non affilié à GTA World, GTA World France ni à la SAAA.",
  },
};

// The same example flight in each edition's phraseology (generated by the app).
export const DEMO_CALLS = {
  en: [
    { phase: "Clearance", label: "VFR clearance", freq: "SA CENTER", text: "/atc San Andreas Center. N738IA. At IMEX Hangar at Los Santos International Airport. Request VFR clearance to Sandy Shores Airfield at 1,500ft." },
    { phase: "Ground", label: "Taxi to runway", freq: "CTAF", text: "/atc Los Santos Traffic. N738IA. At IMEX Hangar. Taxiing to Runway 3-0 Left via B and B1. Los Santos." },
    { phase: "Departure", label: "Takeoff, departing", freq: "CTAF", text: "/atc Los Santos Traffic. N738IA. Entering Runway 3-0 Left for departure. Departing to the north. Climbing and maintaining 1,500ft. Los Santos." },
    { phase: "En route", label: "Position update", freq: "CTAF", text: "/atc San Andreas Traffic. N738IA. Passing over Vinewood Hills at 1,500ft. Continuing north to Sandy Shores. San Andreas." },
    { phase: "Arrival", label: "Pattern entry", freq: "CTAF", text: "/atc Sandy Shores Traffic. N738IA. Inbound from the south over Grand Senora Desert at 1,500ft. Joining left downwind for Runway 2-5. Sandy Shores." },
    { phase: "Pattern", label: "Final", freq: "CTAF", text: "/atc Sandy Shores Traffic. N738IA. On final for Runway 2-5. Full stop. Sandy Shores." },
    { phase: "Taxi in", label: "Runway vacated, taxi to parking", freq: "CTAF", text: "/atc Sandy Shores Traffic. N738IA. Clear of Runway 2-5. Taxiing to Hangar via A1 and A, crossing Runway 04/22. Sandy Shores." },
  ],
  fr: [
    { phase: "Clairance", label: "Clairance VFR", freq: "SA CONTRÔLE", text: "/atc San Andreas Contrôle. N738IA. Au hangar IMEX à Los Santos International Airport. Demande clairance VFR vers Sandy Shores Airfield à 1 500 ft." },
    { phase: "Sol", label: "Roulage vers la piste", freq: "CTAF", text: "/atc Los Santos Trafic. N738IA. Au hangar IMEX. Roule vers la piste 3-0 gauche via B et B1. Los Santos." },
    { phase: "Départ", label: "Décollage, départ", freq: "CTAF", text: "/atc Los Santos Trafic. N738IA. S'aligne et décolle piste 3-0 gauche. Départ vers le nord. Montée vers 1 500 ft. Los Santos." },
    { phase: "En route", label: "Compte rendu de position", freq: "CTAF", text: "/atc San Andreas Trafic. N738IA. Verticale Vinewood Hills à 1 500 ft. Poursuit vers le nord en direction de Sandy Shores. San Andreas." },
    { phase: "Arrivée", label: "Intégration du circuit", freq: "CTAF", text: "/atc Sandy Shores Trafic. N738IA. En provenance du sud, verticale Grand Senora Desert, à 1 500 ft. Rejoint la vent arrière main gauche piste 2-5. Sandy Shores." },
    { phase: "Circuit", label: "Finale", freq: "CTAF", text: "/atc Sandy Shores Trafic. N738IA. En finale piste 2-5. Atterrissage complet. Sandy Shores." },
    { phase: "Roulage retour", label: "Piste dégagée, roulage au parking", freq: "CTAF", text: "/atc Sandy Shores Trafic. N738IA. Piste 2-5 dégagée. Roule vers le hangar via A1 et A, en traversant la piste 04/22. Sandy Shores." },
  ],
};
