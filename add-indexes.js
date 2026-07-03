const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function addIndexes() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 3306,
  });
  try {
    console.log('Adding indexes to transaksi table in:', process.env.DB_NAME);
    
    // Check if index exists before adding
    const addIdx = async (name, column) => {
      try {
        await connection.execute(`CREATE INDEX ${name} ON transaksi(${column})`);
        console.log(`Success adding index ${name}`);
      } catch (e) {
        if (e.code === 'ER_DUP_KEYNAME') {
          console.log(`Index ${name} already exists.`);
        } else {
          console.error(`Error adding ${name}:`, e.message);
        }
      }
    };

    await addIdx('idx_transaksi_tgl', 'tgl');
    await addIdx('idx_transaksi_office', 'office');
    await addIdx('idx_transaksi_donatur', 'donatur');

  } catch (error) {
    console.error('Failed:', error.message);
  } finally {
    await connection.end();
  }
}

addIndexes();
