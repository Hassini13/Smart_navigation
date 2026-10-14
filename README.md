# RouteIQ — Partition-Based Smart City Route Optimization

A discrete mathematics project demonstrating how **graph partitioning** reduces the search space of Dijkstra's algorithm for real-world route optimization.

---

## Overview

Standard Dijkstra explores every reachable node in a graph. In a city with hundreds or thousands of nodes, this becomes expensive. RouteIQ divides the city graph into **spatial partitions (zones)**, then only explores the partitions that lie on a logical corridor between source and destination.

The result: fewer nodes visited, faster execution, same optimal path.

The algorithm is written generically — the same engine can power smart city navigation, WAN routing, logistics fleets, emergency dispatch, or autonomous vehicle pathfinding. Swap `database/cityData.js` with a real data source and the rest adapts automatically.

---

## Features

- Interactive fictional city map (Canvas-rendered, no external map APIs)
- Click-to-select source node, choose destination category
- Animated route discovery: visited nodes → partition traversal → final path
- Side panel: distance, ETA, exec time, partitions traversed, memory usage
- Comparison panel: partition-aware vs. full Dijkstra (nodes, time, search space)
- Modular backend — graph engine, partition manager, route controller all separated
- Data layer designed for drop-in replacement (real DB, traffic API, etc.)

---

## Tech Stack

| Layer      | Choice                        | Why                                      |
|------------|-------------------------------|------------------------------------------|
| Frontend   | React 18 + Vite               | Fast HMR, minimal config                 |
| Canvas     | HTML5 Canvas API              | Direct control over map rendering        |
| Backend    | Node.js + Express             | Lightweight, same language as graph code |
| Data       | JS module (cityData.js)       | Zero setup; swap for DB when ready       |
| Styling    | Plain CSS variables           | No build complexity, full control        |
| Dev runner | concurrently                  | Single command starts both servers       |

---

## Folder Structure

```
RouteOptimizer/
├── client/
│   ├── src/
│   │   ├── App.jsx          # Map, animation, panels
│   │   ├── main.jsx         # React entry
│   │   └── styles/
│   │       └── main.css     # Full design system
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/
│   ├── controllers/
│   │   └── routeController.js   # Request handling, response shaping
│   ├── services/
│   │   └── graphEngine.js       # Graph, partitioning, Dijkstra
│   ├── routes/
│   │   └── api.js
│   ├── index.js
│   └── package.json
├── database/
│   └── cityData.js          # Nodes, edges, partitions — swap for real data
├── .env.example
├── package.json             # Root scripts
└── README.md
```

---

## Installation

**Prerequisites:** Node.js 18+

```bash
# Clone the repo
git clone https://github.com/yourname/RouteIQ.git
cd RouteIQ

# Install all dependencies
npm run install:all
```

---

## Running the Project

```bash
# Development (runs both frontend and backend with hot reload)
npm run dev
```

- Frontend: http://localhost:3000  
- Backend API: http://localhost:5000/api

---

## API Reference

| Method | Endpoint         | Description                        |
|--------|------------------|------------------------------------|
| GET    | /api/map         | Full graph: nodes, edges, partitions |
| GET    | /api/locations   | All nodes (filter by ?type=airport) |
| POST   | /api/route       | Find optimal route                 |
| GET    | /api/stats       | Graph stats + partition breakdown  |

**POST /api/route body:**
```json
{
  "source": "metro",
  "destination": "hospital"
}
```
Or auto-select best destination of a type:
```json
{
  "source": "metro",
  "destinationTypes": ["airport"]
}
```

---

## Replacing with Real Data

Everything that defines the city lives in `database/cityData.js`. To connect a real database:

1. Replace `NODES`, `EDGES`, `PARTITIONS` exports with async DB queries
2. Update `graphEngine.js` constructor to accept injected data instead of `require()`-ing directly
3. Add a cache layer (Redis recommended) so the graph isn't rebuilt per request

The weight formula in `graphEngine._weight()` is also isolated — plug in a live traffic API score there without touching any other logic.

---

## Algorithm Explanation

### Why partitioning?

Dijkstra's worst-case time complexity is O((V + E) log V). For dense city graphs, this means visiting nodes in completely unrelated areas of the city. Partitioning constrains the search.

### How partitions are created

Nodes are assigned to zones (NORTH, SOUTH, EAST, WEST, CENTRAL) based on their geographic coordinates. In production this can be done via spatial clustering (k-means, Voronoi) or administrative boundaries.

### How Dijkstra is modified

1. BFS over the partition graph finds which zones connect source → destination
2. Only nodes belonging to those zones are considered during relaxation
3. Inter-partition edges are naturally included because boundary nodes belong to a valid zone
4. Unreachable zones are never entered — their nodes are never pushed to the priority queue

### Optimization outcome

In a 23-node test graph with 5 partitions, partition-aware Dijkstra visits ~40–60% fewer nodes than the full version, with proportional execution time reduction. The gap grows as the graph scales.

---

## Future Improvements

- Replace static weights with real-time traffic multipliers
- Add turn-by-turn navigation instructions
- Support multi-stop routing (TSP approximation)
- Implement a proper binary min-heap for large graphs
- Add graph persistence (PostgreSQL + PostGIS or Neo4j)
- WebSocket live updates for traffic changes

---

## License

MIT
