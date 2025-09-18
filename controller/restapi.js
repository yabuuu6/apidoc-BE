// restapi.js (CommonJS version)

const { query } = require('../db.js');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const { URL } = require('url');

function parseMysqlDsn(dsnUrl) {
  try {
    const url = new URL(dsnUrl);
    return {
      host: url.hostname,
      user: url.username,
      password: url.password,
      port: Number(url.port || 3306),
      database: url.pathname.replace('/', '') // hapus tanda '/' di depan
    };
  } catch (err) {
    throw new Error('Format DSN URL tidak valid: ' + err.message);
  }
}

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

  try {
    // 1. Ambil proyek berdasarkan UUID
    const [project] = await query('SELECT * FROM restapi WHERE uuid = ?', [uuid]);

    if (!project) {
      return res.status(404).json({ error: 'Proyek tidak ditemukan' });
    }

      // 2. Validasi DSN string
      if (!project.dsn) {
        return res.status(400).json({ error: 'DSN tidak tersedia dalam proyek' });
      }

      let dsnConfig;
      try {
        dsnConfig = parseMysqlDsn(project.dsn);
      } catch (parseErr) {
        return res.status(400).json({ error: 'Format DSN tidak valid', detail: parseErr.message });
      }

      // 3. Koneksi ke database dengan hasil parsing
      let connection;
      try {
        connection = await mysql.createConnection(dsnConfig);
      } catch (connErr) {
        return res.status(500).json({ error: 'Gagal koneksi ke database', detail: connErr.message });
      }

    try {
      // 4. Ambil daftar tabel
      const [tables] = await connection.query('SHOW TABLES');
      const tableNames = tables.map(row => Object.values(row)[0]);

      // 5. Ambil struktur DESCRIBE untuk setiap tabel
      const tableDescriptions = {};
      for (const table of tableNames) {
        const [desc] = await connection.query(`DESCRIBE \`${table}\``);
        tableDescriptions[table] = desc;
      }

      res.json({
        message: 'Berhasil memuat tabel dan struktur',
        uuid,
        tables: tableNames,
        describe: tableDescriptions
      });
    } finally {
      await connection.end();
    }

  } catch (err) {
    console.error('Error describe table:', err);
    res.status(500).json({ error: 'Gagal mengambil tabel', detail: err.message });
  }
}

// ==========================
// GENERATE SINGLE ENDPOINT FROM DATABASE
// ==========================
async function generateOneEndpointFromDb(req, res) {
  const { uuid } = req.params;
  const { table } = req.body;

  if (!uuid || !table) {
    return res.status(400).json({ error: 'UUID dan nama tabel wajib dikirim' });
  }

  try {
    // Ambil data proyek berdasarkan UUID
    const projectRows = await query('SELECT * FROM restapi WHERE uuid = ?', [uuid]);
    const project = projectRows[0];
    if (!project) return res.status(404).json({ error: 'Proyek tidak ditemukan' });

    // Parse DSN
    let dsn;
    try {
      const dsnUrl = new URL(project.dsn);
      dsn = {
        host: dsnUrl.hostname,
        user: dsnUrl.username,
        password: dsnUrl.password,
        port: Number(dsnUrl.port || 3306),
        database: dsnUrl.pathname.replace('/', '')
      };
    } catch (err) {
      return res.status(400).json({ error: 'Format DSN tidak valid', detail: err.message });
    }

    // Koneksi ke DB proyek
    const connection = await mysql.createConnection(dsn);

    // Cek tabel
    const [tablesResult] = await connection.query('SHOW TABLES');
    const tableNames = tablesResult.map(row => Object.values(row)[0]);
    if (!tableNames.includes(table)) {
      await connection.end();
      return res.status(400).json({ error: `Tabel "${table}" tidak ditemukan` });
    }

    // Ambil 1 contoh row
    const [rows] = await connection.query(`SELECT * FROM \`${table}\` LIMIT 1`);
    const sample = rows[0] || {};

    // Data endpoint
    const endpointUUID = uuidv4();
    const endpointData = {
      baseUrl: `http://localhost:5000/api/uuid/${project.uuid}`,
      method: 'GET',
      path: `/${table}`,
      description: `Endpoint otomatis untuk tabel ${table}`,
      status: ('develop','production'),
      response: JSON.stringify(sample),
    };

    // Simpan ke tabel endpoints
    const insertQuery = `
      INSERT INTO endpoints (baseUrl, method, path, description, status, response)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await query(insertQuery, [
      endpointData.baseUrl,
      endpointData.method,
      endpointData.path,
      endpointData.description,
      endpointData.status,
      endpointData.response
    ]);

    await connection.end();

    res.json({
      message: `Endpoint untuk tabel "${table}" berhasil dibuat`,
      sample
    });
  } catch (err) {
    console.error('Gagal generate endpoint:', err);
    res.status(500).json({ error: 'Gagal generate endpoint', detail: err.message });
  }
}


// ==========================
// PREVIEW TABLES DARI DATABASE
// ==========================
// async function previewTables(req, res) {
//   const { uuid } = req.params;

//   try {
//     // Ambil info proyek dari database berdasarkan uuid
//     const [project] = await query('SELECT * FROM restapi WHERE uuid = ?', [uuid]);
//     if (!project) return res.status(404).json({ error: 'Proyek tidak ditemukan' });

//     // Buat koneksi ke database dari kolom dsn
//     const connection = await mysql.createConnection(project.dsn);

//     // Ambil semua nama tabel
//     const [tablesResult] = await connection.query('SHOW TABLES');
//     const tableNames = tablesResult.map(row => Object.values(row)[0]);

//     const result = {};

//     // Loop semua tabel dan ambil semua datanya
//     for (const table of tableNames) {
//       const [rows] = await connection.query(`SELECT * FROM \`${table}\``);
//       result[table] = rows;
//     }

//     await connection.end();

//     res.json({
//       uuid,
//       projectName: project.projectName,
//       tables: tableNames,
//       data: result
//     });
//   } catch (err) {
//     console.error('Gagal mengambil semua data:', err);
//     res.status(500).json({ error: 'Gagal mengambil semua data', detail: err.message });
//   }
// }

async function getDataFromOneTable(req, res) {
  const { uuid, tableName } = req.params;

  try {
    // Ambil DSN dari tabel restapi berdasarkan UUID
    const [project] = await query('SELECT * FROM restapi WHERE uuid = ?', [uuid]);
    if (!project) return res.status(404).json({ error: 'Proyek tidak ditemukan' });

    const connection = await mysql.createConnection(project.dsn);

    // Cek apakah tabel tersebut ada
    const [tablesResult] = await connection.query('SHOW TABLES');
    const tableNames = tablesResult.map(row => Object.values(row)[0]);

    if (!tableNames.includes(tableName)) {
      return res.status(400).json({ error: `Tabel "${tableName}" tidak ditemukan dalam database` });
    }

    const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
    await connection.end();

    res.json({
      table: tableName,
      data: rows
    });
  } catch (err) {
    console.error('Gagal mengambil data tabel:', err);
    res.status(500).json({ error: 'Gagal mengambil data dari tabel', detail: err.message });
  }
}

module.exports = {
  createRestApi,
  getAllRestApis,
  deleteRestApi,
  showTablesWithDescribe,
   generateOneEndpointFromDb,
  //  previewTables,
   getDataFromOneTable
};
