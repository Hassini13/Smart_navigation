import osmnx as ox
import pandas as pd

print("Loading Vellore road network...")

G = ox.load_graphml("database/vellore_roads.graphml")

# Convert nodes
nodes_data = []

for node_id, data in G.nodes(data=True):
    nodes_data.append({
        "id": node_id,
        "latitude": data.get("y"),
        "longitude": data.get("x")
    })

nodes_df = pd.DataFrame(nodes_data)

# Convert edges
edges_data = []

for index, (u, v, data) in enumerate(G.edges(data=True)):
    edges_data.append({
        "id": index + 1,
        "from_node": u,
        "to_node": v,
        "distance": data.get("length", 0)
    })

edges_df = pd.DataFrame(edges_data)

# Save CSV files
nodes_df.to_csv("database/nodes.csv", index=False)
edges_df.to_csv("database/edges.csv", index=False)

print("Conversion complete!")
print("Nodes:", len(nodes_df))
print("Edges:", len(edges_df))
print("Created:")
print(" - database/nodes.csv")
print(" - database/edges.csv")