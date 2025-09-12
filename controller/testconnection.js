
const mysql = require("mysql2/promise");
const pkg = require("pg");
const { Client: PgClient } = pkg;

const testConnection = async (req, res) => {
  const { engine, ip, port, username, password, database_name } = req.body;

  try {
    if (engine === "MySQL") {
      const connection = await mysql.createConnection({
        host: ip,
        user: username,
        password,
        port: port ? parseInt(port) : 3306,
        database: database_name,
      });

      const [tables] = await connection.query("SHOW TABLES");
      await connection.end();

      return res.status(200).json({ tables });
    }

    if (engine === "PostgreSQL") {
      const client = new PgClient({
        host: ip,
        user: username,
        password,
        port: port ? parseInt(port) : 5432,
        database: database_name,
      });

      await client.connect();
      const result = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `);
      await client.end();

      return res.status(200).json({ tables: result.rows });
    }

    return res.status(400).json({ error: "Engine tidak valid!" });
  } catch (err) {
    console.error("Error koneksi:", err);
    return res.status(500).json({ error: err.message });
  }
};

const describeTable = async (req, res) => {
  const { engine, ip, port, username, password, database_name, table } = req.body;

  try {
    const connection = await mysql.createConnection({
      host: ip,
      user: username,
      password: password,
      database: database_name,
      port: port || 3306,
    });

    const [rows] = await connection.query(`DESCRIBE \`${table}\``);
    await connection.end();

    res.json({ structure: rows });
  } catch (err) {
    console.error("Error describe table:", err.message);
    res.status(500).json({ error: "Gagal mendeskripsikan tabel" });
  }
};

module.exports = {
  testConnection,
  describeTable
};
