const { query } = require('../db');

async function getAllEndpoints(req, res) {
  try {
    const endpoints = await query('SELECT * FROM endpoints');
    res.json(endpoints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function addEndpoint(req, res) {
  const { baseUrl, method, path, description, status, websites, response } = req.body;

  if (!baseUrl || !method || !path) {
    return res.status(400).json({ error: 'baseUrl, method, dan path wajib diisi' });
  }

  try {
    await query(
      'INSERT INTO endpoints (baseUrl, method, path, description, status, websites, response) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        baseUrl,
        method.toUpperCase(),
        path,
        description || '',
        status || 'Develop',
        websites ? websites.join(',') : '',
        JSON.stringify(response || {})
      ]
    );
    res.status(201).json({ message: 'Endpoint berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateEndpoint(req, res) {
  const { id } = req.params;

  const {
  baseUrl = '',
  method = '',
  path = '',
  description = '',
  status = 'Develop',
  websites = [],
  response = {}
} = req.body;

if (!baseUrl || !method || !path) {
  return res.status(400).json({ error: 'baseUrl, method, dan path wajib diisi' });
}


  try {
    await query(
      'UPDATE endpoints SET baseUrl=?, method=?, path=?, description=?, status=?, websites=?, response=? WHERE id=?',
      [
        baseUrl,
        method,
        path,
        description,
        status,
        websites ? websites.join(',') : '',
        JSON.stringify(response || {}),
        id
      ]
    );
    res.json({ message: 'Endpoint berhasil diupdate' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteEndpoint(req, res) {
  const { id } = req.params;

  try {
    await query('DELETE FROM endpoints WHERE id=?', [id]);
    res.json({ message: 'Endpoint berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getAllEndpoints,
  addEndpoint,
  updateEndpoint,
  deleteEndpoint,
};
