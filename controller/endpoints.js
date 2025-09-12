const { query } = require('../db.js');

const getAllEndpoints = async (req, res) => {
  try {
    const endpoints = await query('SELECT * FROM endpoints');
    res.json(endpoints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const addEndpoint = async (req, res) => {
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
};

const updateEndpoint = async (req, res) => {
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
};

const deleteEndpoint = async (req, res) => {
  const { id } = req.params;

  try {
    await query('DELETE FROM endpoints WHERE id=?', [id]);
    res.json({ message: 'Endpoint berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Export semua fungsi
module.exports = {
  getAllEndpoints,
  addEndpoint,
  updateEndpoint,
  deleteEndpoint
};
