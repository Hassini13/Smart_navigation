# Vellore Road Network Dataset — prepared for hybrid partitioning + routing

This package is the output of converting the raw uploaded dataset into a
NODES/EDGES structure the existing graph/routing backend can consume. No
partitioning algorithm, routing logic, or backend code has been written or
changed — this is data preparation only, as scoped.

## 1. What the raw dataset contained

Three files were uploaded, all describing the **same** OSM road network
around Vellore, Tamil Nadu (bounding box roughly lat 12.66–13.15,
lon 78.65–79.29):

- `vellore_roads.graphml` — a full osmnx export: 22,260 nodes, 59,649
  directed edges, with rich per-edge tags (`highway` class, `lanes`,
  `oneway`, `maxspeed`, `name`, `ref`, `geometry`, plus `bridge`/`tunnel`/
  `access`/`junction` which we did not need).
- `nodes.csv` / `edges.csv` — the same 22,260 nodes / 59,649 edges,
  pre-flattened to just `id,latitude,longitude` and
  `id,from_node,to_node,distance`.

The CSV and GraphML were cross-checked and describe an identical graph, so
no data was lost by choosing one; **the GraphML was used as the source of
truth** because it carries the extra tags (highway class, lanes, maxspeed,
oneway) that make a real, documented cost signal possible instead of a
fabricated one.

The graph is **directed**: 58,708 of 59,649 raw edges have a reciprocal
edge in the opposite direction (i.e. most roads are represented as two
one-way edges), consistent with standard osmnx export behaviour.

## 2. How it was converted

`extract_from_graphml.py` streams the GraphML (it's 26MB, so it's parsed
incrementally rather than loaded whole) into raw per-node and per-edge
records, resolving osmnx's generic `d0`–`d21` attribute keys back to their
real names via the `<key attr.name=...>` declarations in the file.

`build_dataset.py` then cleans and reshapes those records into the final
`data/nodes.json` / `data/edges.json`:

```
NODES: { id, lat, lon, street_count, degree }
EDGES: { from, to, distance, highway, lanes, oneway, maxspeed_kmh,
         name, ref, synthetic_cost_weight }
```

`id`/`from`/`to` are kept as strings — some OSM node ids exceed 2^53 and
would silently lose precision as JS numbers.

## 3. Attributes available for hybrid partitioning

Per the project's stated hybrid partitioning inputs:

- **Topology / connectivity**: `EDGES` (from/to adjacency) and each node's
  `degree` (computed from the cleaned edge list, not OSM's own
  `street_count`, which is a pre-simplification street count and can
  disagree slightly with actual graph degree — both are included).
- **Geographic proximity**: `lat`/`lon` on every node (real, from OSM),
  so Euclidean/haversine clustering is directly possible.
- **Traffic / cost information**: real where OSM tagged it (`maxspeed_kmh`,
  `lanes`), plus a derived `synthetic_cost_weight` per edge — see below.

There is **no partition field** anywhere in this dataset. Per the brief,
partition membership is the *output* of the next stage, not an input, so
nothing was pre-partitioned or hard-coded.

## 4. Assumptions made

- **`synthetic_cost_weight` is synthetic and clearly labeled as such.** The
  raw dataset has no real traffic counts. Rather than pretend it does, or
  use random noise (which would make different partitioning algorithms
  incomparable across runs), each edge's weight is a deterministic function
  of its real `highway` classification:

  ```
  travel_time_s = distance_m / (speed_kmh * 1000/3600)
  synthetic_cost_weight = travel_time_s * congestion_factor(highway)
  ```

  `speed_kmh` uses the edge's real OSM `maxspeed` tag when present (only
  436/58,847 edges are tagged), otherwise a fixed free-flow speed looked up
  by `highway` class (e.g. trunk=80km/h, residential=25km/h — see the
  `HIGHWAY_PROFILE` table at the top of `build_dataset.py`).
  `congestion_factor` is a fixed multiplier per class (1.05 for motorway up
  to 1.8 for living_street), reflecting the general assumption that
  arterial roads carry traffic more efficiently per vehicle than narrow
  residential streets. **This table is an assumption for the experiment,
  not measured data** — swap it out if real traffic counts become
  available. `distance` (real, meters) remains the field to route on by
  default; `synthetic_cost_weight` is there specifically for the
  "traffic-adjusted" comparison the backend calls for.

- Where an edge's `highway` tag was itself a list (a small number of
  simplified/merged OSM ways carry multiple classifications, e.g.
  `['tertiary','unclassified']`), the **first** listed class was used as
  the edge's representative class rather than blending them.

- `lanes` and `maxspeed_kmh` are `null` where OSM didn't tag them (most
  edges — OSM tagging is sparse in this region). No values were invented
  for these fields; only `synthetic_cost_weight` uses a fallback, and that
  fallback is documented above.

## 5. Data cleaning performed

From the raw 22,260 nodes / 59,649 edges:

| Check                              | Result                          |
|-------------------------------------|----------------------------------|
| Duplicate node ids                  | 0                                |
| Edges referencing nonexistent nodes | 0                                |
| Invalid coordinates                 | 0 (all within the Vellore bbox)  |
| Self-loop edges (from == to)        | **94 removed**                   |
| Parallel duplicate (from,to) edges  | **708 removed** (kept the shorter of each duplicate pair — the longer one could never win a shortest-path search anyway) |
| Disconnected components             | 0 — graph is a single connected component both before and after cleaning (verified with networkx) |
| Isolated nodes                      | 0                                |

Final dataset: **22,260 nodes, 58,847 edges.** Nothing was subset or
sampled — the full network was kept, since 22k/59k is well within what
Dijkstra/partitioning on a student laptop handles comfortably; a
geographic subset was not needed.

Full before/after counts are also in `data/clean_report.json`.

## 6. Output files

```
cityData.js              # Node.js loader: require() this for { NODES, EDGES }
data/nodes.json          # 22,260 nodes
data/edges.json          # 58,847 edges
data/clean_report.json   # cleaning counts (see table above)
extract_from_graphml.py  # step 1: GraphML -> raw_nodes.json / raw_edges.json
build_dataset.py         # step 2: raw json -> cleaned data/nodes.json, data/edges.json
```

`cityData.js` reads the JSON files at require-time rather than inlining
them as JS object literals — at this size, `JSON.parse` on a dedicated
file parses meaningfully faster than V8 parsing an equivalent JS literal.

To reproduce from scratch:
```
python3 extract_from_graphml.py vellore_roads.graphml
python3 build_dataset.py
```

## 7. Compatibility changes needed in the existing backend

None required to *load* this data — `require('./cityData.js')` gives you
`{ NODES, EDGES }` in the shape described in section 2. Two things worth
knowing before wiring it into the existing routing/partitioning code:

- Treat node ids as **strings**, not numbers, everywhere (map keys,
  comparisons, etc.) — some OSM ids overflow safe JS integer range.
- The backend's adjacency construction should default to `edge.distance`
  as the routing weight. Only use `edge.synthetic_cost_weight` where the
  experiment specifically wants the traffic-adjusted comparison — and it
  should be presented as synthetic when you do, per the assumptions above.

No changes to Dijkstra, API endpoints, frontend, auth, or deployment were
made or are required by this data alone.
