"""
Convert the raw Vellore OSM road network (graphml export) into a clean,
backend-ready NODES / EDGES dataset.

Source of truth: vellore_roads.graphml (osmnx export). This has the same
node/edge counts as nodes.csv/edges.csv but carries extra per-edge OSM
attributes (highway class, lanes, maxspeed, oneway, name/ref) that the
plain CSV export dropped. Those attributes are what let us derive a
deterministic traffic/cost weight instead of inventing one.

This script is deterministic: re-running it on the same input produces
byte-identical output, which matters because the next stage (hybrid
partitioning) needs a stable dataset to compare algorithms fairly.
"""
import json, ast, math

RAW_NODES = 'raw_nodes.json'
RAW_EDGES = 'raw_edges.json'

# ---------------------------------------------------------------------------
# Reference speed/congestion table, keyed by OSM `highway` class.
#
# free_flow_kmh: typical uncongested travel speed for that road class in an
#   Indian semi-urban/rural context (Vellore district). Used only as a
#   fallback when the edge itself has no maxspeed tag.
# congestion_factor: a fixed multiplier >= 1 applied to free-flow travel
#   time to approximate typical relative congestion for that road class
#   (arterial roads assumed less congested per-vehicle than narrow
#   residential/living streets). This is NOT measured traffic data -- it is
#   a documented, deterministic stand-in so the partitioning/routing
#   experiment has *some* cost signal beyond raw distance. Swap this table
#   out if/when real traffic counts become available.
# ---------------------------------------------------------------------------
HIGHWAY_PROFILE = {
    'motorway':       {'free_flow_kmh': 100, 'congestion_factor': 1.05},
    'trunk':          {'free_flow_kmh': 80,  'congestion_factor': 1.10},
    'trunk_link':     {'free_flow_kmh': 60,  'congestion_factor': 1.15},
    'primary':        {'free_flow_kmh': 60,  'congestion_factor': 1.20},
    'primary_link':   {'free_flow_kmh': 40,  'congestion_factor': 1.25},
    'secondary':      {'free_flow_kmh': 50,  'congestion_factor': 1.30},
    'secondary_link': {'free_flow_kmh': 40,  'congestion_factor': 1.30},
    'tertiary':       {'free_flow_kmh': 40,  'congestion_factor': 1.40},
    'tertiary_link':  {'free_flow_kmh': 30,  'congestion_factor': 1.40},
    'unclassified':   {'free_flow_kmh': 30,  'congestion_factor': 1.50},
    'residential':    {'free_flow_kmh': 25,  'congestion_factor': 1.60},
    'living_street':  {'free_flow_kmh': 15,  'congestion_factor': 1.80},
    'road':           {'free_flow_kmh': 30,  'congestion_factor': 1.50},  # OSM's generic/unknown class
}
DEFAULT_PROFILE = {'free_flow_kmh': 30, 'congestion_factor': 1.50}


def first_of(val):
    """OSM tags on merged/simplified edges can be stringified lists, e.g.
    "['tertiary','unclassified']" when a way changes classification along
    its length. We take the first tag as the edge's representative class
    rather than fabricate a blended value."""
    if val is None:
        return None
    if isinstance(val, str) and val.startswith('['):
        try:
            parsed = ast.literal_eval(val)
            return parsed[0] if parsed else None
        except (ValueError, SyntaxError):
            return val
    return val


def parse_maxspeed(val):
    v = first_of(val)
    if v is None:
        return None
    try:
        return float(''.join(ch for ch in v if ch.isdigit() or ch == '.'))
    except ValueError:
        return None


def parse_lanes(val):
    v = first_of(val)
    if v is None:
        return None
    try:
        return int(v)
    except ValueError:
        return None


def main():
    nodes = json.load(open(RAW_NODES))
    edges = json.load(open(RAW_EDGES))
    node_ids = set(n['id'] for n in nodes)

    # --- Cleaning -----------------------------------------------------
    # 1) Drop self-loops: a routing edge from a node to itself has no
    #    meaning for shortest-path search and would only ever be dead
    #    weight in the adjacency structure.
    no_self_loop = [e for e in edges if e['from'] != e['to']]
    removed_self_loops = len(edges) - len(no_self_loop)

    # 2) Collapse parallel edges (same from/to appearing more than once,
    #    e.g. from OSM ways that were split and re-merged during
    #    simplification). Keep the shortest-length duplicate: for
    #    shortest-path routing the longer parallel copy can never win,
    #    so dropping it changes no route, only removes dead weight.
    best_by_pair = {}
    for e in no_self_loop:
        key = (e['from'], e['to'])
        if key not in best_by_pair or e['length'] < best_by_pair[key]['length']:
            best_by_pair[key] = e
    deduped_edges = list(best_by_pair.values())
    removed_parallel = len(no_self_loop) - len(deduped_edges)

    # All endpoints were already verified to exist in nodes.csv/graphml
    # (checked separately: 0 missing endpoints), so no further endpoint
    # filtering is needed here.

    # --- Node degree (computed from the cleaned edge list) -------------
    # OSM's own `street_count` is a count of physical streets meeting at
    # the intersection (pre-simplification), which can differ slightly
    # from this graph's actual in/out degree. We add the *actual* degree
    # too since the partitioning algorithm will want real topology, not
    # OSM's original street-count metadata.
    degree = {n['id']: 0 for n in nodes}
    for e in deduped_edges:
        degree[e['from']] += 1
        degree[e['to']] += 1

    out_nodes = []
    for n in nodes:
        out_nodes.append({
            'id': n['id'],
            'lat': n['lat'],
            'lon': n['lon'],
            'street_count': n['street_count'],   # from OSM, pre-simplification
            'degree': degree[n['id']],            # actual degree in this graph
        })

    out_edges = []
    for e in deduped_edges:
        highway = first_of(e['highway']) or 'unclassified'
        profile = HIGHWAY_PROFILE.get(highway, DEFAULT_PROFILE)
        maxspeed = parse_maxspeed(e['maxspeed'])
        speed_kmh = maxspeed if maxspeed else profile['free_flow_kmh']
        distance_m = e['length']

        # Free-flow travel time in seconds, then scaled by the
        # highway-class congestion factor documented above. This is the
        # "synthetic_cost_weight" -- a deterministic traffic-adjusted
        # weight, NOT measured traffic. distance_m stays the real,
        # measured field and should be the default weight unless the
        # experiment specifically wants the traffic-adjusted one.
        travel_time_s = distance_m / (speed_kmh * 1000 / 3600)
        synthetic_cost_weight = round(travel_time_s * profile['congestion_factor'], 4)

        out_edges.append({
            'from': e['from'],
            'to': e['to'],
            'distance': round(distance_m, 4),          # meters, real (OSM `length`)
            'highway': highway,                          # real, from OSM
            'lanes': parse_lanes(e['lanes']),             # real where tagged, else null
            'oneway': (e['oneway'] == 'True'),            # real, from OSM
            'maxspeed_kmh': maxspeed,                     # real where tagged, else null
            'name': e['name'],                            # real where tagged, else null
            'ref': e['ref'],                              # real where tagged, else null
            'synthetic_cost_weight': synthetic_cost_weight,  # derived, documented, deterministic
        })

    json.dump(out_nodes, open('nodes_clean.json', 'w'))
    json.dump(out_edges, open('edges_clean.json', 'w'))

    report = {
        'raw_nodes': len(nodes),
        'raw_edges': len(edges),
        'removed_self_loops': removed_self_loops,
        'removed_parallel_duplicate_edges': removed_parallel,
        'final_nodes': len(out_nodes),
        'final_edges': len(out_edges),
    }
    json.dump(report, open('clean_report.json', 'w'), indent=2)
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()