// restapi.js (CommonJS version)

const { query } = require('../db.js');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function createRestApi(req, res) {
  try {
    const {
      projectName = '',
      engine = '',
      ip = '',
      port,
      username = '',
      password = '',
      database_name = ''
    } = req.body;

    if (!projectName.trim() || !engine.trim() || !ip.trim() || !username.trim() || !database_name.trim()) {
      return res.status(400).json({
        error: 'Field projectName, engine, ip, username, dan database_name wajib diisi'
      });
    }

    const [engineData] = await query(
      `SELECT default_port FROM db_engines WHERE LOWER(engine_name) = ?`,
      [engine.toLowerCase()]
    );

    if (!engineData) {
      return res.status(400).json({ error: `Engine "${engine}" tidak ditemukan di tabel db_engines` });
    }

    const finalPort = port ? parseInt(port) : engineData.default_port;
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const uuid = uuidv4();
    const dsn = `${engine.toLowerCase()}://${username}${password ? ':' + password : ''}@${ip}:${finalPort}/${database_name}`;

    await query(
      `INSERT INTO restapi 
       (uuid, projectName, engine, ip, port, username, password, database_name, dsn)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid,
        projectName.trim(),
        engine.trim(),
        ip.trim(),
        finalPort,
        username.trim(),
        hashedPassword,
        database_name.trim(),
        dsn
      ]
    );

    res.status(201).json({
      message: 'REST API berhasil ditambahkan',
      uuid,
      dsn
    });

  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan pada server', detail: err.message });
  }
}

async function getAllRestApis(req, res) {
  try {
    const rows = await query(`SELECT * FROM restapi ORDER BY id DESC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
}

async function deleteRestApi(req, res) {
  const { id } = req.params;

  try {
    const result = await query(`DELETE FROM restapi WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    res.json({ message: 'REST API berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
}

async function showTablesWithDescribe(req, res) {
  const { uuid } = req.params;
  const { tableName } = req.query;

  try {
    const [project] = await query(
      `SELECT * FROM restapi WHERE uuid = ?`,
      [uuid]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project dengan UUID tersebut tidak ditemukan' });
    }

    if (!project.dsn) {
      return res.status(400).json({ error: 'DSN belum tersedia untuk project ini' });
    }

    const connection = await mysql.createConnection(project.dsn);
    const [tablesData] = await connection.query('SHOW TABLES');
    const tables = tablesData.map(row => Object.values(row)[0]);
    let describe = null;

    if (tableName) {
      const [engine] = await query(
        `SELECT describe_syntax FROM db_engines WHERE LOWER(engine_name) = LOWER(?)`,
        [project.engine.toLowerCase()]
      );

      if (!engine || !engine.describe_syntax) {
        await connection.end();
        return res.status(400).json({ error: `Syntax DESCRIBE untuk engine "${project.engine}" tidak ditemukan.` });
      }

      const describeQuery = engine.describe_syntax.replace('{table_name}', tableName);

      try {
        const [descRows] = await connection.query(describeQuery);
        describe = descRows;
      } catch (err) {
        await connection.end();
        return res.status(500).json({
          error: `Gagal mengeksekusi DESCRIBE untuk tabel "${tableName}"`,
          detail: err.message
        });
      }
    }

    await connection.end();

    return res.json({
      uuid: project.uuid,
      message: "Berhasil mengambil tabel dari database",
      tables,
      ...(describe && { describe })
    });

  } catch (err) {
    console.error("showTablesWithDescribe error:", err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
}

module.exports = {
  createRestApi,
  getAllRestApis,
  deleteRestApi,
  showTablesWithDescribe
};
