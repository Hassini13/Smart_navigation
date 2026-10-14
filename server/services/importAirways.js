const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const DB_CONFIG = {
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "24MIS0356",
  database: "airways_route_optimizer",
};

const AIRPORTS_FILE = path.join(
  __dirname,
  "../../database/data/airways/airports.dat"
);

const ROUTES_FILE = path.join(
  __dirname,
  "../../database/data/airways/routes.dat"
);

function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current);

  return fields.map((field) => field.trim());
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

async function importAirways() {
  let connection;

  try {
    console.log("Reading Airways dataset...");

    const airportText = fs.readFileSync(AIRPORTS_FILE, "utf8");
    const routeText = fs.readFileSync(ROUTES_FILE, "utf8");

    const airportLines = airportText
      .split(/\r?\n/)
      .filter((line) => line.trim());

    const routeLines = routeText
      .split(/\r?\n/)
      .filter((line) => line.trim());

    const airports = new Map();

    // -------------------------
    // Read airports
    // -------------------------
    for (const line of airportLines) {
      const fields = parseCSVLine(line);

      const id = fields[0];
      const name = fields[1];
      const city = fields[2];
      const country = fields[3];
      const iata = fields[4];
      const icao = fields[5];

      const latitude = Number(fields[6]);
      const longitude = Number(fields[7]);

      if (
        !id ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        continue;
      }

      airports.set(String(id), {
        id: String(id),
        name,
        city,
        country,
        iata,
        icao,
        latitude,
        longitude,
      });
    }

    console.log("Valid airports:", airports.size);

    connection = await mysql.createConnection(DB_CONFIG);

    // Clear only the Airways database.
    await connection.query("DELETE FROM edges");
    await connection.query("DELETE FROM nodes");

    // -------------------------
    // Insert airports
    // -------------------------
    const airportValues = Array.from(airports.values()).map((airport) => [
      airport.id,
      airport.latitude,
      airport.longitude,
      airport.name,
      airport.city,
      airport.country,
      airport.iata,
      airport.icao,
    ]);

    if (airportValues.length > 0) {
      await connection.query(
        `
        INSERT INTO nodes
        (id, latitude, longitude, name, city, country, iata, icao)
        VALUES ?
        `,
        [airportValues]
      );
    }

    console.log("Airports inserted:", airportValues.length);

    // -------------------------
    // Read routes
    // -------------------------
    const edges = new Map();

    for (const line of routeLines) {
      const fields = parseCSVLine(line);

      // OpenFlights routes.dat:
      // field 2 = source airport ID
      // field 4 = destination airport ID

      const sourceId = fields[3];
      const destinationId = fields[5];

      if (!sourceId || !destinationId) {
        continue;
      }

      const source = airports.get(String(sourceId));
      const destination = airports.get(String(destinationId));

      if (!source || !destination) {
        continue;
      }

      const distance = haversine(
        source.latitude,
        source.longitude,
        destination.latitude,
        destination.longitude
      );

      if (!Number.isFinite(distance) || distance <= 0) {
        continue;
      }

      // Keep one edge for each directed airport pair.
      const key = `${source.id}->${destination.id}`;

      if (!edges.has(key)) {
        edges.set(key, [
          source.id,
          destination.id,
          distance,
        ]);
      }
    }

    console.log("Valid unique routes:", edges.size);

    // -------------------------
    // Insert routes
    // -------------------------
    const edgeValues = Array.from(edges.values());

    if (edgeValues.length > 0) {
      await connection.query(
        `
        INSERT INTO edges
        (from_node, to_node, distance)
        VALUES ?
        `,
        [edgeValues]
      );
    }

    console.log("Routes inserted:", edgeValues.length);

    // -------------------------
    // Final counts
    // -------------------------
    const [nodeCount] = await connection.query(
      "SELECT COUNT(*) AS total FROM nodes"
    );

    const [edgeCount] = await connection.query(
      "SELECT COUNT(*) AS total FROM edges"
    );

    console.log("--------------------------------");
    console.log("Airways import completed!");
    console.log("Nodes in database:", nodeCount[0].total);
    console.log("Edges in database:", edgeCount[0].total);
    console.log("--------------------------------");

  } catch (error) {
    console.error("Airways import failed:");
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

importAirways();