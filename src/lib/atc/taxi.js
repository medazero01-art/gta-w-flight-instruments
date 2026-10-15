// Taxiway networks in chart pixels (read off the SAAA diagrams) and shortest-path routing.
// Edge names are what we say on the radio; "" = open apron, "X:<rwy>" = runway crossing.

const LSIA_NODES = {
  RWY21: [2826, 1609], C1H: [2902, 1660], C_N: [2966, 1735], FUEL: [3256, 1827], C_C2: [2776, 2088], C2H: [2675, 2088],
  C_F: [2591, 2524], F_AP: [3019, 2830], C_C3: [2490, 2684], C3H: [2373, 2650], C3E: [2595, 2776], C_C5: [2356, 2944],
  C5E: [2465, 3020], C_C4: [2205, 3196], C4H: [2062, 3196], C6E: [2323, 3255], C_C7: [2088, 3381], C7E: [2188, 3481],
  C_S: [1970, 3582], RWY03: [1668, 3632], RWY12L: [1879, 3796], A_W: [2117, 3693], A_A5: [2292, 3827], A5H: [2220, 3899],
  A_E10: [2468, 3920], E10: [2489, 3744], A_E9: [2613, 3992], E9: [2650, 3841], A_E8: [2757, 4069], E8: [2788, 3930],
  A_A4: [2871, 4127], A4H: [2819, 4230], A_E7: [2964, 4178], E7: [2923, 4027], A_E6: [3088, 4246], E6: [3067, 4060],
  A_E5: [3233, 4327], E5: [3222, 4143], A_E4: [3357, 4395], E4: [3361, 4220], A_A3: [3419, 4432], A3H: [3367, 4530],
  A_E3: [3505, 4478], E3: [3505, 4302], A_E2: [3650, 4561], E2: [3656, 4385], A_E1: [3795, 4643], E1: [3815, 4468],
  A_A2: [3910, 4709], A2H: [3910, 4829], A_A1: [4014, 4763], A1H: [4049, 4881], E11: [3016, 3734], E12: [2695, 3569],
  GA: [3522, 4168], DW: [3966, 4344], RWY12R: [1555, 4317], RWY30L: [4228, 5812], RWY30R: [4519, 5267],
  D_W: [1517, 4114], D9H: [1575, 4233], D_D7: [2175, 4284], D7N: [2208, 4157], D7S: [2074, 4426], D_D6: [2606, 4519],
  D6N: [2682, 4436], D6S: [2517, 4684], D_D4: [3493, 5059], D4N: [3556, 4942], D4S: [3417, 5183], D_D3: [3860, 5267],
  D3N: [4000, 5196], D3S: [3734, 5381], D_D2: [4050, 5388], D2N: [4114, 5279], D2S: [3987, 5520], D_D1: [4342, 5558],
  D1N: [4494, 5507], D1S: [4367, 5748], B_B6: [1960, 4823], B6H: [1889, 4704], B_B5: [2411, 5077], B5H: [2441, 5013],
  B_B4: [2530, 5140], B_B3: [2783, 5279], B3H: [2801, 5203], B_B2: [3240, 5533], B2H: [3257, 5457], B_B1: [3556, 5697],
  B1H: [3602, 5647], PEG: [1757, 4912], STERM: [2125, 5153], SMAINT: [2619, 5419], DK: [3202, 5773],
  // IMEX: the unnamed hangar right of Dale-Kelly, its apron meets B between B2 and B1.
  B_IMEX: [3430, 5630], IMEX: [3600, 5960],
};

const chain = (name, ids) => ids.slice(1).map((id, i) => [ids[i], id, name]);

const LSIA_EDGES = [
  ...chain("C", ["C_N", "C_C2", "C_F", "C_C3", "C_C5", "C_C4", "C_C7", "C_S"]),
  ["C_N", "C1H", "C1"], ["C_C2", "C2H", "C2"], ["C_C3", "C3H", "C3"], ["C_C4", "C4H", "C4"],
  ["C_C3", "C3E", "C3"], ["C_C5", "C5E", "C5"], ["C_C4", "C6E", "C6"], ["C_C7", "C7E", "C7"], ["C_F", "F_AP", "F"],
  ["C_N", "FUEL", ""],
  ...chain("", ["F_AP", "C3E", "C5E", "C6E", "C7E", "E12", "E10", "E9", "E8", "E7", "E6", "E5", "E4", "E3", "E2", "E1", "DW"]),
  ["E11", "E12", ""], ["E11", "E7", ""], ["GA", "E3", ""], ["GA", "E4", ""], ["GA", "E5", ""],
  ["C_S", "A_W", "A"],
  ...chain("A", ["A_W", "A_A5", "A_E10", "A_E9", "A_E8", "A_A4", "A_E7", "A_E6", "A_E5", "A_E4", "A_A3", "A_E3", "A_E2", "A_E1", "A_A2", "A_A1"]),
  ["A_A5", "A5H", "A5"], ["A_A4", "A4H", "A4"], ["A_A3", "A3H", "A3"], ["A_A2", "A2H", "A2"], ["A_A1", "A1H", "A1"],
  ["A_E10", "E10", "E10"], ["A_E9", "E9", "E9"], ["A_E8", "E8", "E8"], ["A_E7", "E7", "E7"], ["A_E6", "E6", "E6"],
  ["A_E5", "E5", "E5"], ["A_E4", "E4", "E4"], ["A_E3", "E3", "E3"], ["A_E2", "E2", "E2"], ["A_E1", "E1", "E1"],
  ...chain("D", ["D_W", "D_D7", "D_D6", "D_D4", "D_D3", "D_D2", "D_D1"]),
  ["D_W", "D9H", "D9"], ["D_W", "A_W", "D10"],
  ["D_D7", "D7N", "D7"], ["D_D7", "D7S", "D7"], ["D_D6", "D6N", "D6"], ["D_D6", "D6S", "D6"],
  ["D_D4", "D4N", "D4"], ["D_D4", "D4S", "D4"], ["D_D3", "D3N", "D3"], ["D_D3", "D3S", "D3"],
  ["D_D2", "D2N", "D2"], ["D_D2", "D2S", "D2"], ["D_D1", "D1N", "D1"], ["D_D1", "D1S", "D1"],
  ...chain("B", ["B_B6", "B_B5", "B_B4", "B_B3", "B_B2", "B_IMEX", "B_B1"]),
  ["B_B6", "B6H", "B6"], ["B_B5", "B5H", "B5"], ["B_B3", "B3H", "B3"], ["B_B2", "B2H", "B2"], ["B_B1", "B1H", "B1"],
  ["PEG", "B_B6", ""], ["STERM", "B_B5", ""], ["SMAINT", "B_B3", ""], ["DK", "B_B1", ""], ["IMEX", "B_IMEX", ""],
  // Runway crossings between facing connectors.
  ["A5H", "D7N", "X:12L/30R"], ["A4H", "D6N", "X:12L/30R"], ["A3H", "D4N", "X:12L/30R"], ["A2H", "D3N", "X:12L/30R"], ["A1H", "D2N", "X:12L/30R"],
  ["D7S", "B6H", "X:12R/30L"], ["D6S", "B5H", "X:12R/30L"], ["D4S", "B2H", "X:12R/30L"], ["D2S", "B1H", "X:12R/30L"],
];

// Sandy Shores: one parallel taxiway (A) from the apron to the runway 07 end, crossing 04/22.
const KSSA_NODES = {
  APRON: [5022, 1562], HS: [5059, 1786], A_E: [4836, 2158], X22A: [4600, 2330], X22B: [4480, 2420], A_W: [1600, 3367], A1H: [1451, 3236],
  RWY25: [4873, 1786], RWY07: [1302, 3088], RWY22: [4985, 1972], RWY04: [3664, 3497],
};
const KSSA_EDGES = [["APRON", "HS", ""], ["HS", "A_E", "A"], ["A_E", "X22A", "A"], ["X22A", "X22B", "X:04/22"], ["X22B", "A_W", "A"], ["A_W", "A1H", "A1"]];

export const TAXI = {
  KLSI: {
    nodes: LSIA_NODES,
    edges: LSIA_EDGES,
    // Where each parking spot joins the network.
    spots: {
      "Devin Weston Apron": "DW", "GA Parking": "GA", "IMEX Hangar": "IMEX", "South Terminal": "STERM",
      "Pegasus Hangar": "PEG", "South Aircraft Maintenance Area": "SMAINT", "Dale-Kelly Apron": "DK", "Fuel Farm": "FUEL",
    },
    // Holding points used to line up on each runway end.
    holds: { "21": ["C1H"], "03": ["C_S"], "12L": ["A_W"], "30R": ["A1H", "D1N"], "12R": ["D9H", "B6H"], "30L": ["D1S", "B1H"] },
    thresholds: { "21": "RWY21", "03": "RWY03", "12L": "RWY12L", "30R": "RWY30R", "12R": "RWY12R", "30L": "RWY30L" },
  },
  KSSA: {
    nodes: KSSA_NODES,
    edges: KSSA_EDGES,
    spots: { "GA Parking": "APRON", Hangar: "APRON", "Maintenance Area": "APRON", Terminal: "APRON" },
    holds: { "25": ["HS"], "22": ["HS"], "07": ["A1H"], "04": ["X22B"] },
    thresholds: { "25": "RWY25", "07": "RWY07", "22": "RWY22", "04": "RWY04" },
  },
};

const OPPOSITE = { "21": "03", "03": "21", "12L": "30R", "30R": "12L", "12R": "30L", "30L": "12R", "25": "07", "07": "25", "22": "04", "04": "22", "24": "06", "06": "24" };

const APRON_COST = 1.6;
// Crossing a runway is something to avoid when another way exists.
const CROSSING_COST = 3;

function adjacency(graph) {
  const adj = {};
  for (const [a, b, name] of graph.edges) {
    const [ax, ay] = graph.nodes[a];
    const [bx, by] = graph.nodes[b];
    const factor = name === "" ? APRON_COST : name.startsWith("X:") ? CROSSING_COST : 1;
    const cost = Math.hypot(ax - bx, ay - by) * factor;
    (adj[a] ||= []).push({ to: b, name, cost });
    (adj[b] ||= []).push({ to: a, name, cost });
  }
  return adj;
}

// Dijkstra from one node to the nearest of several targets. Graphs are tiny, a linear scan is enough.
function shortestPath(graph, from, targets) {
  const adj = adjacency(graph);
  const dist = { [from]: 0 };
  const prev = {};
  const open = new Set([from]);
  const done = new Set();
  while (open.size) {
    let current = null;
    for (const n of open) if (current == null || dist[n] < dist[current]) current = n;
    open.delete(current);
    done.add(current);
    if (targets.includes(current)) {
      const steps = [];
      for (let n = current; prev[n]; n = prev[n].from) steps.unshift({ from: prev[n].from, to: n, name: prev[n].name });
      return steps;
    }
    for (const e of adj[current] || []) {
      if (done.has(e.to)) continue;
      const d = dist[current] + e.cost;
      if (dist[e.to] == null || d < dist[e.to]) {
        dist[e.to] = d;
        prev[e.to] = { from: current, name: e.name };
        open.add(e.to);
      }
    }
  }
  return null;
}

// Radio wording: consecutive duplicates collapse, apron legs are silent, crossings are spelled out.
// "A, crossing Runway 04/22, A, A1" reads "A, crossing Runway 04/22, A1".
function viaTokens(steps) {
  const tokens = [];
  let lastTaxiway = null;
  for (const { name } of steps) {
    if (!name) continue;
    if (name.startsWith("X:")) {
      tokens.push(`crossing Runway ${name.slice(2)}`);
      continue;
    }
    const previous = tokens[tokens.length - 1];
    if (previous === name || (previous?.startsWith("crossing") && lastTaxiway === name)) continue;
    tokens.push(name);
    lastTaxiway = name;
  }
  return tokens;
}

const reverseSteps = (steps) => steps.slice().reverse().map(({ from, to, name }) => ({ from: to, to: from, name }));

export function nearestNode(graph, p) {
  let best = null;
  for (const [id, [x, y]] of Object.entries(graph.nodes)) {
    if (id.startsWith("RWY")) continue;
    const d = Math.hypot(x - p.x, y - p.y);
    if (!best || d < best.d) best = { id, d };
  }
  return best?.id ?? null;
}

// Outbound: parking spot (or a radar fix) -> holding point of the runway end.
// Inbound: vacating the landing runway (far end, or a radar fix) -> parking spot.
export function taxiRoute({ icao, spot, runway, direction, startNode }) {
  const graph = TAXI[icao];
  if (!graph || !runway) return null;
  let steps;
  let from;
  if (direction === "out") {
    from = startNode || graph.spots[spot];
    const targets = graph.holds[runway];
    if (!from || !targets?.length) return null;
    steps = shortestPath(graph, from, targets);
  } else {
    const parking = graph.spots[spot];
    if (!parking) return null;
    // Without a radar fix we assume the roll-out ends near the far end: search from the
    // parking spot to the best exit, then read the path the other way round.
    const exits = startNode ? [startNode] : graph.holds[OPPOSITE[runway]] || [];
    if (!exits.length) return null;
    const back = shortestPath(graph, parking, exits);
    steps = back && reverseSteps(back);
    from = steps?.[0]?.from ?? parking;
  }
  if (!steps) return null;

  const ids = steps.length ? [steps[0].from, ...steps.map((s) => s.to)] : [from];
  const threshold = graph.thresholds[runway];
  const points = ids.map((id) => graph.nodes[id]);
  if (direction === "out" && threshold) points.push(graph.nodes[threshold]);
  const named = steps.filter((s) => s.name && !s.name.startsWith("X:"));
  return {
    icao,
    via: viaTokens(steps),
    hold: direction === "out" ? named[named.length - 1]?.name ?? null : null,
    points,
    from,
    to: ids[ids.length - 1],
  };
}
