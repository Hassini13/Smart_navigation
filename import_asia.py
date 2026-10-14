import csv
import math
import mysql.connector

# =========================================================
# MYSQL CONNECTION
# =========================================================

DB_HOST = "127.0.0.1"
DB_PORT = 3306
DB_USER = "root"
DB_PASSWORD = "24MIS0356"
DB_NAME = "route_optimizer_asia"


# =========================================================
# HAVERSINE DISTANCE
# =========================================================

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0

    lat1 = math.radians(lat1)
    lon1 = math.radians(lon1)
    lat2 = math.radians(lat2)
    lon2 = math.radians(lon2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )

    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# =========================================================
# CONNECT TO MYSQL
# =========================================================

print("Connecting to MySQL...")

conn = mysql.connector.connect(
    host=DB_HOST,
    port=DB_PORT,
    user=DB_USER,
    password=DB_PASSWORD
)

cursor = conn.cursor()

# Create Asia database
cursor.execute(
    f"CREATE DATABASE IF NOT EXISTS {DB_NAME}"
)

cursor.execute(
    f"USE {DB_NAME}"
)

print("Using database:", DB_NAME)


# =========================================================
# CREATE TABLES
# =========================================================

cursor.execute("""
CREATE TABLE IF NOT EXISTS nodes (
    id INT PRIMARY KEY,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS edges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_node INT NOT NULL,
    to_node INT NOT NULL,
    distance DOUBLE NOT NULL,
    FOREIGN KEY (from_node) REFERENCES nodes(id),
    FOREIGN KEY (to_node) REFERENCES nodes(id)
)
""")


# =========================================================
# CLEAR OLD ASIA DATA
# =========================================================

cursor.execute("DELETE FROM edges")
cursor.execute("DELETE FROM nodes")

conn.commit()

print("Old Asia data cleared.")


# =========================================================
# LOAD ASIAN AIRPORTS
# =========================================================

print("Loading Asian airports...")

airports = {}

with open(
    "asia_airports.dat",
    "r",
    encoding="utf-8"
) as f:

    reader = csv.reader(f)

    for row in reader:

        if len(row) < 8:
            continue

        try:
            airport_id = int(row[0])
            latitude = float(row[6])
            longitude = float(row[7])
        except ValueError:
            continue

        airports[airport_id] = {
            "latitude": latitude,
            "longitude": longitude
        }


print("Asian airports loaded:", len(airports))


# =========================================================
# INSERT NODES
# =========================================================

node_data = [
    (
        airport_id,
        data["latitude"],
        data["longitude"]
    )
    for airport_id, data in airports.items()
]

cursor.executemany(
    """
    INSERT INTO nodes
    (id, latitude, longitude)
    VALUES (%s, %s, %s)
    """,
    node_data
)

conn.commit()

print("Nodes inserted:", len(node_data))


# =========================================================
# LOAD ASIAN ROUTES
# =========================================================

print("Loading Asian routes...")

edges = []
seen = set()

with open(
    "asia_routes.dat",
    "r",
    encoding="utf-8"
) as f:

    reader = csv.reader(f)

    for row in reader:

        if len(row) < 6:
            continue

        try:
            source = int(row[3])
            destination = int(row[5])
        except ValueError:
            continue

        if source not in airports:
            continue

        if destination not in airports:
            continue

        # Treat the route as an undirected graph edge.
        # This also removes duplicate A-B / B-A routes.
        pair = tuple(
            sorted((source, destination))
        )

        if pair in seen:
            continue

        seen.add(pair)

        source_coord = airports[source]
        destination_coord = airports[destination]

        distance = haversine(
            source_coord["latitude"],
            source_coord["longitude"],
            destination_coord["latitude"],
            destination_coord["longitude"]
        )

        edges.append(
            (
                source,
                destination,
                distance
            )
        )


print("Unique Asian routes:", len(edges))


# =========================================================
# INSERT EDGES
# =========================================================

cursor.executemany(
    """
    INSERT INTO edges
    (from_node, to_node, distance)
    VALUES (%s, %s, %s)
    """,
    edges
)

conn.commit()

print("Edges inserted:", len(edges))


# =========================================================
# VERIFY
# =========================================================

cursor.execute(
    "SELECT COUNT(*) FROM nodes"
)

node_count = cursor.fetchone()[0]

cursor.execute(
    "SELECT COUNT(*) FROM edges"
)

edge_count = cursor.fetchone()[0]


print()
print("===================================")
print("      ASIA DATABASE READY")
print("===================================")
print("Database :", DB_NAME)
print("Nodes    :", node_count)
print("Edges    :", edge_count)
print("===================================")


cursor.close()
conn.close()