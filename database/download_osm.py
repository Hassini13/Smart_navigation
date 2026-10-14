import osmnx as ox

place = "Vellore, Tamil Nadu, India"

print("Downloading vellore real road network...")

G = ox.graph.graph_from_place(
    place,
    network_type="drive",
    simplify=True
)

print("Download complete!")
print("Nodes:", len(G.nodes))
print("Edges:", len(G.edges))

output = "database/vellore_roads.graphml"

ox.io.save_graphml(G, output)

print("Saved as", output)