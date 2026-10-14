const mysql = require("mysql2/promise");

async function createDatabase() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: "127.0.0.1",
      port: 3306,
      user: "root",
      password: "24MIS0356",
    });

    await connection.query(
      "CREATE DATABASE IF NOT EXISTS airways_route_optimizer"
    );

    console.log("Airways database created successfully!");

    await connection.changeUser({
      database: "airways_route_optimizer",
    });

    await connection.query(`
      CREATE TABLE IF NOT EXISTS nodes (
        id VARCHAR(20) PRIMARY KEY,
        latitude DOUBLE NOT NULL,
        longitude DOUBLE NOT NULL,
        name VARCHAR(255),
        city VARCHAR(255),
        country VARCHAR(255),
        iata VARCHAR(10),
        icao VARCHAR(10)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS edges (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        from_node VARCHAR(20) NOT NULL,
        to_node VARCHAR(20) NOT NULL,
        distance DOUBLE NOT NULL,
        INDEX idx_from_node (from_node),
        INDEX idx_to_node (to_node)
      )
    `);

    console.log("Nodes and edges tables created successfully!");

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createDatabase();