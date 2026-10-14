const pool = require("./database");

async function testConnection() {
  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS total FROM nodes");

    console.log("MySQL connection successful!");
    console.log("Nodes in database:", rows[0].total);

    process.exit(0);
  } catch (error) {
    console.error("MySQL connection failed:");
    console.error(error.message);

    process.exit(1);
  }
}

testConnection();