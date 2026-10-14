/**
 * cityData.js
 *
 * Loader for the cleaned Vellore road network dataset used by the
 * partitioning/routing backend.
 *
 * Data lives in data/nodes.json and data/edges.json rather than as inline
 * object literals here -- at ~22k nodes / ~59k edges, JSON.parse on a
 * dedicated file is significantly faster (and easier on editors/diff
 * tools) than V8 parsing a multi-megabyte JS object literal.
 *
 * Shapes match what the existing backend expects:
 *
 *   NODES: [{ id, lat, lon, street_count, degree }, ...]
 *   EDGES: [{ from, to, distance, highway, lanes, oneway, maxspeed_kmh,
 *              name, ref, synthetic_cost_weight }, ...]
 *
 * Field notes:
 *   - id/from/to are OSM node ids, kept as strings (some exceed 2^53 and
 *     would silently lose precision as JS numbers).
 *   - distance is real, in meters, taken from OSM way geometry (`length`).
 *   - synthetic_cost_weight is a DERIVED, deterministic traffic-adjusted
 *     weight (free-flow travel time x a highway-class congestion factor).
 *     It is NOT measured traffic data -- see README.md before treating it
 *     as ground truth. distance is the field to route on by default.
 *   - There is intentionally no `partition` field. Partition membership is
 *     the output of the next stage (hybrid partitioning), not an input.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const NODES = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'nodes.json'), 'utf8')
);
const EDGES = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'edges.json'), 'utf8')
);

module.exports = { NODES, EDGES };
// Also expose named exports for ESM-interop bundlers (e.g. `import { NODES } from './cityData.js'`)
module.exports.NODES = NODES;
module.exports.EDGES = EDGES;