const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "24MIS0356",
  database: "route_optimizer_asia",
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;