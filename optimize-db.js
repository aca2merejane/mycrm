const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function optimizeDb() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 3306,
  });

  try {
    console.log('Optimizing database:', process.env.DB_NAME);

    const addIdx = async (table, name, columns) => {
      try {
        console.log(`Adding index ${name} on ${table}(${columns})...`);
        await connection.execute(`CREATE INDEX ${name} ON ${table}(${columns})`);
        console.log(`✅ Success: ${name}`);
      } catch (e) {
        if (e.code === 'ER_DUP_KEYNAME') {
          console.log(`ℹ️ Skip: Index ${name} already exists.`);
        } else {
          console.error(`❌ Error ${name}:`, e.message);
        }
      }
    };

    // 1. Table: Jurnal (Crucial for Reports)
    await addIdx('jurnal', 'idx_jurnal_transid', 'transid');
    await addIdx('jurnal', 'idx_jurnal_tgl', 'tgl');
    await addIdx('jurnal', 'idx_jurnal_office', 'office');
    await addIdx('jurnal', 'idx_jurnal_perkiraan', 'perkiraan');
    await addIdx('jurnal', 'idx_jurnal_iddonatur', 'iddonatur');
    await addIdx('jurnal', 'idx_jurnal_dana', 'dana');

    // 2. Table: Donatur (Crucial for Search & Relationship)
    await addIdx('donatur', 'idx_donatur_nama', 'nama');
    await addIdx('donatur', 'idx_donatur_no_hp', 'no_hp');
    await addIdx('donatur', 'idx_donatur_email', 'email');
    await addIdx('donatur', 'idx_donatur_office', 'office');
    await addIdx('donatur', 'idx_donatur_status', 'status');

    // 3. Table: Transaksi (Crucial for History & Stats)
    await addIdx('transaksi', 'idx_transaksi_status', 'status');
    await addIdx('transaksi', 'idx_transaksi_user', 'user');
    await addIdx('transaksi', 'idx_transaksi_date_insert', 'date_insert');

    // 4. Table: Detail
    await addIdx('detail', 'idx_detail_produk', 'produk');

    // 6. Covering Indexes for Statistics (Ultra Fast Aggregation)
    await addIdx('transaksi', 'idx_trans_stats_covering', 'office, status, tgl, total_donasi, donatur');
    await addIdx('detail', 'idx_detail_covering', 'trans_id, produk, sub_total');
    await addIdx('jurnal', 'idx_jurnal_covering', 'office, tgl, perkiraan, debit, kredit');

    console.log('\n--- Optimization Complete ---');

  } catch (error) {
    console.error('Failed:', error.message);
  } finally {
    await connection.end();
  }
}

optimizeDb();
