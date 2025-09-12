const { query } = require('../db.js');
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

module.exports = {
  callByIdAndPath
};
