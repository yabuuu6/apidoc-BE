const { query } = require('../db');

async function getAllDomains(req, res) {
  try {
    const domains = await query('SELECT * FROM domains');
    res.json(domains);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function addDomain(req, res) {
  const { url } = req.body;

  if (!url) return res.status(400).json({ error: 'URL wajib diisi' });

  try {
    await query('INSERT INTO domains (url) VALUES (?)', [url]);
    res.status(201).json({ message: 'Domain berhasil ditambahkan', url });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Domain sudah ada' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = {
  getAllDomains,
  addDomain
};