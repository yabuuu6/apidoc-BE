const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rest_api_doc',
};

async function query(sql, params) {
  const conn = await mysql.createConnection(dbConfig);
  const [results] = await conn.execute(sql, params);
  await conn.end();
  return results;
}

module.exports = { query };
