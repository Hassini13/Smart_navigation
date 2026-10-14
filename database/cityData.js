// Graph data — nodes have NO partition field; partitions are auto-detected.
// To use real data: replace NODES and EDGES exports with DB queries returning
// the same shape. The weight formula lives in graphEngine._weight(), not here.

const NODES = [
  // CENTRAL
  { id: "metro",       label: "Metro Station",   type: "transit",      x: 480, y: 360, priority: 2 },
  { id: "mall",        label: "Shopping Mall",   type: "commercial",   x: 530, y: 420, priority: 3 },
  { id: "bank",        label: "City Bank",        type: "finance",      x: 440, y: 310, priority: 3 },
  { id: "office",      label: "Office Complex",   type: "business",     x: 500, y: 270, priority: 3 },

  // NORTH
  { id: "airport_a",   label: "Airport A",        type: "airport",      x: 300, y: 80,  priority: 1 },
  { id: "airport_b",   label: "Airport B",        type: "airport",      x: 560, y: 90,  priority: 1 },
  { id: "university",  label: "University",        type: "education",    x: 420, y: 150, priority: 2 },
  { id: "hotel",       label: "Grand Hotel",       type: "hospitality",  x: 340, y: 170, priority: 3 },
  { id: "fuel_n",      label: "Fuel Station N",    type: "fuel",         x: 490, y: 200, priority: 4 },

  // SOUTH
  { id: "hospital",    label: "Hospital",          type: "medical",      x: 460, y: 620, priority: 1 },
  { id: "fire",        label: "Fire Station",       type: "emergency",    x: 380, y: 580, priority: 1 },
  { id: "warehouse",   label: "Warehouse",          type: "logistics",    x: 560, y: 600, priority: 3 },
  { id: "park",        label: "Central Park",       type: "recreation",   x: 430, y: 540, priority: 4 },
  { id: "fuel_s",      label: "Fuel Station S",     type: "fuel",         x: 510, y: 560, priority: 4 },

  // EAST
  { id: "it_park",     label: "IT Park",            type: "business",     x: 710, y: 300, priority: 2 },
  { id: "railway",     label: "Railway Station",    type: "transit",      x: 680, y: 380, priority: 1 },
  { id: "industrial",  label: "Industrial Area",    type: "industrial",   x: 750, y: 440, priority: 3 },
  { id: "school_e",    label: "East School",        type: "education",    x: 660, y: 240, priority: 3 },

  // WEST
  { id: "police",      label: "Police Station",     type: "emergency",    x: 190, y: 370, priority: 1 },
  { id: "bus_term",    label: "Bus Terminal",       type: "transit",      x: 220, y: 430, priority: 2 },
  { id: "residential", label: "Residential Area",   type: "residential",  x: 170, y: 300, priority: 3 },
  { id: "school_w",    label: "West School",        type: "education",    x: 240, y: 260, priority: 3 },
  { id: "fuel_w",      label: "Fuel Station W",     type: "fuel",         x: 200, y: 500, priority: 4 },
];

const EDGES = [
  // Central internal
  { from: "metro",    to: "mall",      distance: 600,  travelTime: 90,  roadType: "urban",    trafficLevel: 3 },
  { from: "metro",    to: "bank",      distance: 500,  travelTime: 75,  roadType: "urban",    trafficLevel: 2 },
  { from: "metro",    to: "office",    distance: 800,  travelTime: 100, roadType: "urban",    trafficLevel: 3 },
  { from: "mall",     to: "office",    distance: 700,  travelTime: 95,  roadType: "urban",    trafficLevel: 4 },
  { from: "bank",     to: "office",    distance: 400,  travelTime: 60,  roadType: "urban",    trafficLevel: 2 },

  // North internal
  { from: "airport_a", to: "hotel",    distance: 2500, travelTime: 300, roadType: "highway",  trafficLevel: 2 },
  { from: "airport_a", to: "university", distance: 3200, travelTime: 380, roadType: "highway", trafficLevel: 2 },
  { from: "airport_b", to: "university", distance: 1800, travelTime: 210, roadType: "arterial", trafficLevel: 3 },
  { from: "airport_b", to: "fuel_n",  distance: 1200, travelTime: 140, roadType: "arterial", trafficLevel: 2 },
  { from: "university", to: "hotel",  distance: 1400, travelTime: 170, roadType: "arterial", trafficLevel: 3 },
  { from: "university", to: "fuel_n", distance: 1100, travelTime: 130, roadType: "local",    trafficLevel: 2 },
  { from: "hotel",    to: "fuel_n",   distance: 2000, travelTime: 240, roadType: "arterial", trafficLevel: 3 },

  // South internal
  { from: "hospital", to: "fire",     distance: 1100, travelTime: 130, roadType: "arterial", trafficLevel: 2 },
  { from: "hospital", to: "warehouse", distance: 1300, travelTime: 160, roadType: "urban",   trafficLevel: 3 },
  { from: "fire",     to: "park",     distance: 900,  travelTime: 110, roadType: "urban",    trafficLevel: 2 },
  { from: "park",     to: "fuel_s",   distance: 700,  travelTime: 85,  roadType: "local",    trafficLevel: 1 },
  { from: "fuel_s",   to: "warehouse", distance: 800, travelTime: 95,  roadType: "urban",    trafficLevel: 2 },

  // East internal
  { from: "it_park",  to: "railway",  distance: 1500, travelTime: 180, roadType: "arterial", trafficLevel: 4 },
  { from: "it_park",  to: "school_e", distance: 1200, travelTime: 145, roadType: "urban",    trafficLevel: 3 },
  { from: "railway",  to: "industrial", distance: 1800, travelTime: 220, roadType: "arterial", trafficLevel: 3 },
  { from: "school_e", to: "railway",  distance: 1600, travelTime: 190, roadType: "urban",    trafficLevel: 3 },

  // West internal
  { from: "police",   to: "bus_term", distance: 1200, travelTime: 145, roadType: "urban",    trafficLevel: 3 },
  { from: "police",   to: "residential", distance: 900, travelTime: 110, roadType: "urban",  trafficLevel: 2 },
  { from: "bus_term", to: "fuel_w",   distance: 1000, travelTime: 120, roadType: "urban",    trafficLevel: 3 },
  { from: "residential", to: "school_w", distance: 800, travelTime: 95, roadType: "local",   trafficLevel: 1 },
  { from: "school_w", to: "police",   distance: 1100, travelTime: 130, roadType: "urban",    trafficLevel: 2 },

  // Inter-partition — Central ↔ North
  { from: "office",   to: "university", distance: 2800, travelTime: 340, roadType: "arterial", trafficLevel: 3 },
  { from: "bank",     to: "hotel",    distance: 3200, travelTime: 390, roadType: "arterial", trafficLevel: 3 },
  { from: "metro",    to: "fuel_n",   distance: 3000, travelTime: 360, roadType: "highway",  trafficLevel: 2 },

  // Central ↔ South
  { from: "metro",    to: "park",     distance: 1800, travelTime: 220, roadType: "arterial", trafficLevel: 2 },
  { from: "mall",     to: "hospital", distance: 2200, travelTime: 270, roadType: "arterial", trafficLevel: 3 },
  { from: "office",   to: "fire",     distance: 2500, travelTime: 300, roadType: "arterial", trafficLevel: 2 },

  // Central ↔ East
  { from: "metro",    to: "railway",  distance: 2100, travelTime: 250, roadType: "highway",  trafficLevel: 3 },
  { from: "office",   to: "it_park",  distance: 2400, travelTime: 290, roadType: "highway",  trafficLevel: 4 },
  { from: "mall",     to: "industrial", distance: 2800, travelTime: 340, roadType: "arterial", trafficLevel: 3 },

  // Central ↔ West
  { from: "bank",     to: "police",   distance: 2600, travelTime: 315, roadType: "arterial", trafficLevel: 3 },
  { from: "metro",    to: "bus_term", distance: 2900, travelTime: 350, roadType: "highway",  trafficLevel: 2 },
  { from: "office",   to: "residential", distance: 3100, travelTime: 375, roadType: "arterial", trafficLevel: 3 },

  // North ↔ East
  { from: "airport_b", to: "school_e", distance: 2200, travelTime: 265, roadType: "arterial", trafficLevel: 2 },
  { from: "fuel_n",   to: "it_park",  distance: 2600, travelTime: 315, roadType: "arterial", trafficLevel: 3 },

  // North ↔ West
  { from: "airport_a", to: "residential", distance: 3800, travelTime: 455, roadType: "highway", trafficLevel: 2 },
  { from: "hotel",    to: "school_w", distance: 2900, travelTime: 350, roadType: "arterial", trafficLevel: 3 },

  // South ↔ East
  { from: "warehouse", to: "industrial", distance: 1900, travelTime: 230, roadType: "arterial", trafficLevel: 2 },
  { from: "hospital", to: "railway",  distance: 2600, travelTime: 315, roadType: "arterial", trafficLevel: 3 },

  // South ↔ West
  { from: "fire",     to: "bus_term", distance: 2400, travelTime: 290, roadType: "arterial", trafficLevel: 2 },
  { from: "park",     to: "fuel_w",   distance: 2800, travelTime: 340, roadType: "arterial", trafficLevel: 3 },

  // West ↔ East (cross-city)
  { from: "bus_term", to: "railway",  distance: 4800, travelTime: 580, roadType: "highway",  trafficLevel: 3 },
];

module.exports = { NODES, EDGES };
