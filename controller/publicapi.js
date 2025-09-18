const { query } = require('../db.js');
const mysql = require("mysql2/promise");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const callByIdAndPath = async (req, res) => {
  const { id, path } = req.params;

  try {
    const rows = await query('SELECT baseUrl FROM endpoints WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    const baseUrl = rows[0].baseUrl.replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+/, '');
    const fullUrl = `${baseUrl}/${cleanPath}`;

    console.log('🌍 Fetching:', fullUrl);

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      res.json(data);
    } else {
      const text = await response.text();
      res.status(200).json({
        warning: 'Response is not JSON',
        contentType,
        raw: text
      });
    }
  } catch (error) {
    console.error('Error while calling external API:', error.message);
    res.status(500).json({
      error: 'Failed to fetch from external URL',
      detail: error.message
    });
  }
};

const callByUuidAndPath = async (req, res) => {
  const { uuid, path } = req.params;

  try {
    // 1. Cari project dari UUID
    const [project] = await query("SELECT * FROM restapi WHERE uuid = ?", [uuid]);
    if (!project || !project.dsn) {
      return res.status(404).json({ error: "REST API UUID tidak ditemukan atau DSN kosong" });
    }

    const cleanPath = path.replace(/^\/+/, "");

    // 2. Koneksi ke database berdasarkan DSN
    const connection = await mysql.createConnection(project.dsn);

    // 3. Jalankan query SELECT * FROM {table}
    const [rows] = await connection.query(`SELECT * FROM \`${cleanPath}\``);
    await connection.end();

    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error callByUuidAndPath:", err.message);
    return res.status(500).json({
      error: "Gagal mengambil data dari database",
      detail: err.message,
    });
  }
};


module.exports = {
  callByIdAndPath,
  callByUuidAndPath
};
