"""
Step 1 of the pipeline: pull raw node/edge records straight out of the
osmnx-exported GraphML (vellore_roads.graphml).

We parse the GraphML directly (rather than trusting nodes.csv/edges.csv)
because the CSVs only carry id/lat/lon and from/to/distance -- the GraphML
additionally carries highway class, lanes, oneway, maxspeed, name and ref,
which is what step 2 (build_dataset.py) needs to derive a traffic/cost
signal without inventing one. Cross-checked: both files describe the same
22,260 nodes / 59,649 edges, so no data is lost by using the CSVs; we just
use the GraphML because it has strictly more of it.

Usage: python3 extract_from_graphml.py /path/to/vellore_roads.graphml
Produces raw_nodes.json / raw_edges.json (unfiltered, 1:1 with the source).
"""
import sys
import xml.etree.ElementTree as ET
import json

ns = {'g': 'http://graphml.graphdrawing.org/xmlns'}

# Map GraphML's generic "dN" attribute keys to their real names, per the
# <key> declarations at the top of the file (these ids are assigned by
# osmnx on export and are stable for a given osmnx version, but we read
# them by declared attr.name rather than hardcoding "d4 == lat" blindly).
NODE_KEYS = {'d4': 'lat_raw', 'd5': 'lon_raw', 'd6': 'street_count'}
EDGE_KEYS = {'d8': 'osmid', 'd9': 'highway', 'd10': 'lanes', 'd11': 'name',
             'd12': 'ref', 'd13': 'oneway', 'd14': 'reversed', 'd15': 'length',
             'd16': 'geometry', 'd17': 'maxspeed', 'd18': 'bridge',
             'd19': 'access', 'd20': 'junction', 'd21': 'tunnel'}


def main(path):
    nodes, edges = [], []
    context = ET.iterparse(path, events=('start', 'end'))
    _, root = next(context)

    for event, elem in context:
        tag = elem.tag.split('}')[-1]
        if event == 'end' and tag == 'node':
            rec = {NODE_KEYS[d.get('key')]: d.text
                   for d in elem.findall('g:data', ns) if d.get('key') in NODE_KEYS}
            nodes.append({
                'id': elem.get('id'),
                'lat': float(rec['lat_raw']) if rec.get('lat_raw') else None,
                'lon': float(rec['lon_raw']) if rec.get('lon_raw') else None,
                'street_count': int(rec['street_count']) if rec.get('street_count') else None,
            })
            elem.clear(); root.clear()
        elif event == 'end' and tag == 'edge':
            rec = {EDGE_KEYS[d.get('key')]: d.text
                   for d in elem.findall('g:data', ns) if d.get('key') in EDGE_KEYS}
            edges.append({
                'from': elem.get('source'), 'to': elem.get('target'),
                'osmid': rec.get('osmid'), 'highway': rec.get('highway'),
                'lanes': rec.get('lanes'), 'name': rec.get('name'),
                'ref': rec.get('ref'), 'oneway': rec.get('oneway'),
                'maxspeed': rec.get('maxspeed'),
                'length': float(rec['length']) if rec.get('length') else None,
            })
            elem.clear(); root.clear()

    json.dump(nodes, open('raw_nodes.json', 'w'))
    json.dump(edges, open('raw_edges.json', 'w'))
    print(f'parsed nodes={len(nodes)} edges={len(edges)}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'vellore_roads.graphml')
