require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db, poolConnection } = require('./db');
const { sec_users, sec_users_groups, sec_groups, transaksi, donatur, tbl_office, carabayar, akun, produk, detail, jurnal, push_subscriptions, don_rutin } = require('./db/schema');
const { eq, and, sql, desc, asc, like, or, inArray } = require('drizzle-orm');
const webpush = require('web-push');

// Configure Web Push
webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const storageUtil = require('./utils/storage');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'bmh-secret-key-2024';

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Serve local uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Fallback: If not found locally, redirect to Tencent COS
app.get('/uploads/:filename', (req, res, next) => {
  const { filename } = req.params;
  if (storageUtil.isCosConfigured()) {
    const cosUrl = storageUtil.getFileUrl(filename);
    return res.redirect(cosUrl);
  }
  next();
});

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed (jpeg, jpg, png, gif)'));
  }
});

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'bmhapps API is running' });
});

// --- PUSH NOTIFICATION ROUTES ---

// 1. Subscribe to Push Notifications
app.post('/api/notifications/subscribe', authenticateToken, async (req, res) => {
  const subscription = req.body;
  
  try {
    // Check if subscription already exists for this user/endpoint
    const existing = await db.select()
      .from(push_subscriptions)
      .where(and(
        eq(push_subscriptions.login, req.user.login),
        eq(push_subscriptions.endpoint, subscription.endpoint)
      ))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(push_subscriptions).values({
        login: req.user.login,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        created_at: new Date()
      });
    }

    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Push Subscription Error:', error);
    res.status(500).json({ message: 'Error subscribing to notifications' });
  }
});

// 2. Unsubscribe / Clear Push Subscription
app.post('/api/notifications/unsubscribe', authenticateToken, async (req, res) => {
  const { endpoint } = req.body;
  try {
    await db.delete(push_subscriptions)
      .where(and(
        eq(push_subscriptions.login, req.user.login),
        eq(push_subscriptions.endpoint, endpoint)
      ));
    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error unsubscribing' });
  }
});

// 3. Broadcast Notification (Admin Only)
app.post('/api/notifications/broadcast', authenticateToken, async (req, res) => {
  // Check if admin (Group 1 typically is Admin)
  if (req.user.role !== 1 && req.user.priv_admin !== 'Y') {
    return res.status(403).json({ message: 'Only admins can send broadcasts' });
  }

  const { title, message, url } = req.body;
  const payload = JSON.stringify({ 
    title: title || 'Notifikasi Baru', 
    body: message || 'Ada pesan baru dari Admin', 
    url: url || '/' 
  });

  try {
    const subscriptions = await db.select().from(push_subscriptions);
    
    const sendPromises = subscriptions.map(sub => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      return webpush.sendNotification(pushConfig, payload).catch(err => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription expired or no longer valid, delete it
          return db.delete(push_subscriptions).where(eq(push_subscriptions.id, sub.id));
        }
        console.error('Error sending notification to', sub.login, err);
      });
    });

    await Promise.all(sendPromises);
    res.json({ message: `Broadcast sent to ${subscriptions.length} subscribers` });
  } catch (error) {
    console.error('Broadcast Error:', error);
    res.status(500).json({ message: 'Error sending broadcast' });
  }
});

// Login Route (Plain Text Password per user request)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const users = await db.select({
      login: sec_users.login,
      pswd: sec_users.pswd,
      name: sec_users.name,
      email: sec_users.email,
      office: sec_users.office,
      priv_admin: sec_users.priv_admin,
      wa_code: tbl_office.wa_api,
      role : sec_users_groups.group_id
    })
    .from(sec_users)
    .leftJoin(tbl_office, eq(sec_users.office, tbl_office.officeid))
    .leftJoin(sec_users_groups, eq(sec_users.login, sec_users_groups.login))
    .where(eq(sec_users.email, email))
    .limit(1);

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = users[0];
    const isPasswordMatch = await bcrypt.compare(password, user.pswd);

    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { 
        login: user.login, 
        name: user.name, 
        office: user.office, 
        wa_code: user.wa_code,
        role: user.role,
        priv_admin: user.priv_admin
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        login: user.login,
        name: user.name,
        office: user.office,
        wa_code: user.wa_code,
        role: user.role,
        priv_admin: user.priv_admin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Verify user for password reset (Option 2: Security Match)
app.post('/api/verify-reset', async (req, res) => {
  const { username, email } = req.body;
  try {
    const users = await db.select()
      .from(sec_users)
      .where(and(eq(sec_users.login, username), eq(sec_users.email, email)))
      .limit(1);

    if (users.length === 0) {
      return res.status(404).json({ message: 'Username and Email combination not found.' });
    }

    res.json({ message: 'User verified. You can now reset your password.' });
  } catch (error) {
    console.error('Verify reset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Perform password reset (Security Match)
app.post('/api/perform-reset', async (req, res) => {
  const { username, email, newPassword } = req.body;
  try {
    // Re-verify for safety
    const users = await db.select()
      .from(sec_users)
      .where(and(eq(sec_users.login, username), eq(sec_users.email, email)))
      .limit(1);

    if (users.length === 0) {
      return res.status(404).json({ message: 'Verification failed.' });
    }

    // Update password with hash
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(sec_users)
      .set({ pswd: hashedPassword })
      .where(eq(sec_users.login, username));

    res.json({ message: 'Password reset successful. Please login with your new password.' });
  } catch (error) {
    console.error('Perform reset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload endpoint
app.post('/api/upload', authenticateToken, upload.single('bukti'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  try {
    // If COS is configured, upload to COS
    if (storageUtil.isCosConfigured()) {
      await storageUtil.uploadToCos(req.file.path, req.file.filename);
      
      // Clean up temporary local file
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Failed to delete temporary local upload file:', err);
      }
    }
    
    const fileUrl = storageUtil.getFileUrl(req.file.filename);
    res.json({ 
      message: 'File uploaded successfully', 
      filename: req.file.filename,
      url: fileUrl
    });
  } catch (error) {
    console.error('Upload handling error:', error);
    res.status(500).json({ message: 'Error processing uploaded file' });
  }
});

// Dashboard Statistics Cache
const statsCache = new Map();
const STATS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Dashboard Statistics Route
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const userOffice = req.user.office || '0';
    const officePrefix = userOffice.startsWith('0') && userOffice.length === 1 ? '0%' : `${userOffice}%`;
    const cacheKey = `stats_${userOffice}`;
    const now = Date.now();

    // Check Cache
    if (statsCache.has(cacheKey)) {
      const cached = statsCache.get(cacheKey);
      if (now - cached.timestamp < STATS_CACHE_TTL) {
        return res.json(cached.data);
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    const currentMonth = new Date().getMonth() + 1;
    const firstDayOfMonth = new Date(currentYear, new Date().getMonth(), 1).toISOString().split('T')[0];

    const startOfYear = `${currentYear}-01-01`;
    const endOfYear = `${currentYear}-12-31`;
    const startOfLastYear = `${lastYear}-01-01`;
    const endOfLastYear = `${lastYear}-12-31`;
    const endOfCurrentMonth = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
    const endOfLastYearSameMonth = new Date(lastYear, currentMonth, 0).toISOString().split('T')[0];

    // execute all queries in parallel
    const [
      ytdCurrentRows,
      ytdLastRows,
      currentDonorsRows,
      lastYearDonorsRows,
      monthRows,
      yearlyDataRaw,
      distributionData,
      recentTxRows
    ] = await Promise.all([
      // 1. YTD Collection (Current Year)
      db.select({ total: sql`sum(${transaksi.total_donasi})` })
        .from(transaksi)
        .where(and(
          sql`${transaksi.tgl} >= ${startOfYear}`,
          sql`${transaksi.tgl} <= ${endOfCurrentMonth}`,
          sql`${transaksi.status} IN ('Success', 'PAID')`,
          like(transaksi.office, officePrefix)
        )),
      
      // 2. YTD Last Collection (Last Year)
      db.select({ total: sql`sum(${transaksi.total_donasi})` })
        .from(transaksi)
        .where(and(
          sql`${transaksi.tgl} >= ${startOfLastYear}`,
          sql`${transaksi.tgl} <= ${endOfLastYearSameMonth}`,
          sql`${transaksi.status} IN ('Success', 'PAID')`,
          like(transaksi.office, officePrefix)
        )),

      // 3. Current Donors (Unique donors this year)
      db.select({ count: sql`count(distinct ${transaksi.donatur})` })
        .from(transaksi)
        .where(and(
          sql`${transaksi.tgl} >= ${startOfYear}`,
          sql`${transaksi.tgl} <= ${endOfYear}`,
          sql`${transaksi.status} IN ('Success', 'PAID')`,
          like(transaksi.office, officePrefix)
        )),

      // 4. Last Year Donors (Unique donors last year)
      db.select({ count: sql`count(distinct ${transaksi.donatur})` })
        .from(transaksi)
        .where(and(
          sql`${transaksi.tgl} >= ${startOfLastYear}`,
          sql`${transaksi.tgl} <= ${endOfLastYear}`,
          sql`${transaksi.status} IN ('Success', 'PAID')`,
          like(transaksi.office, officePrefix)
        )),

      // 5. Month Result (Total this month)
      db.select({ total: sql`sum(${transaksi.total_donasi})` })
        .from(transaksi)
        .where(and(
          sql`${transaksi.tgl} >= ${firstDayOfMonth}`,
          sql`${transaksi.tgl} <= ${endOfCurrentMonth}`,
          sql`${transaksi.status} IN ('Success', 'PAID')`,
          like(transaksi.office, officePrefix)
        )),

      // 6. Yearly trend (Last 2 years)
      db.select({
        month: sql`MONTH(${transaksi.tgl})`,
        year: sql`YEAR(${transaksi.tgl})`,
        total: sql`SUM(${transaksi.total_donasi})`
      })
      .from(transaksi)
      .where(and(
        sql`${transaksi.tgl} >= ${startOfLastYear}`,
        sql`${transaksi.tgl} <= ${endOfYear}`,
        sql`${transaksi.status} IN ('Success', 'PAID')`,
        like(transaksi.office, officePrefix)
      ))
      .groupBy(sql`YEAR(${transaksi.tgl})`, sql`MONTH(${transaksi.tgl})`),

      // 7. Distribution (Current Year by Fund Type)
      db.select({
        label: sql`${produk.dana}`.as('label'),
        value: sql`SUM(${detail.sub_total})`
      })
      .from(detail)
      .innerJoin(transaksi, eq(detail.trans_id, transaksi.trans_id))
      .innerJoin(produk, eq(detail.produk, produk.produk_id))
      .where(and(
        like(transaksi.office, officePrefix),
        sql`${transaksi.tgl} >= ${startOfYear}`,
        sql`${transaksi.tgl} <= ${endOfYear}`,
        sql`${transaksi.status} IN ('Success', 'PAID')`,
        sql`${produk.dana} IN ('ZAKAT', 'INFAK', 'INFAK_KHUSUS', 'QURBAN', 'DSKL', 'WAKAF', 'TITIPAN')`
      ))
      .groupBy(produk.dana),

      // 8. Recent Tx
      db.select({
        id: transaksi.trans_id,
        date: transaksi.tgl,
        donor_id: transaksi.donatur,
        donor_name: donatur.nama,
        total: transaksi.total_donasi,
        status: transaksi.status
      })
      .from(transaksi)
      .leftJoin(donatur, eq(transaksi.donatur, donatur.donatur_id))
      .where(like(transaksi.office, officePrefix))
      .orderBy(desc(transaksi.trans_id))
      .limit(5)
    ]);

    // Process Trend Data
    const trend = { current: Array(12).fill(0), last: Array(12).fill(0) };
    yearlyDataRaw.forEach(row => {
      const idx = row.month - 1;
      if (row.year === currentYear) trend.current[idx] = Number(row.total);
      else if (row.year === lastYear) trend.last[idx] = Number(row.total);
    });

    const result = {
      kpis: {
        ytdCollection: Number(ytdCurrentRows[0]?.total || 0),
        ytdLastCollection: Number(ytdLastRows[0]?.total || 0),
        donors: Number(currentDonorsRows[0]?.count || 0),
        lastYearDonors: Number(lastYearDonorsRows[0]?.count || 0),
        monthly: Number(monthRows[0]?.total || 0),
        target: 500000000
      },
      trend,
      distribution: distributionData.map(d => ({ 
        label: d.label || 'Lainnya', 
        value: Number(d.value) 
      })),
      recentTransactions: recentTxRows.map(tx => ({
        id: tx.id,
        date: tx.date,
        donor_name: tx.donor_name || tx.donor_id || 'Unknown',
        total: tx.total || 0,
        status: tx.status
      }))
    };

    // Save to Cache
    statsCache.set(cacheKey, { timestamp: now, data: result });

    res.json(result);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
});

// --- MASTER DATA ROUTES ---

// 1. Office (tbl_office)
app.get('/api/master/office', authenticateToken, async (req, res) => {
  try {
    const userOffice = req.user.office || '0';
    const officePrefix = userOffice.startsWith('0') && userOffice.length === 1 ? '0%' : `${userOffice}%`;
    
    const data = await db.select().from(tbl_office).where(like(tbl_office.officeid, officePrefix));
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching offices' });
  }
});

app.post('/api/master/office', authenticateToken, async (req, res) => {
  try {
    await db.insert(tbl_office).values(req.body);
    res.json({ message: 'Office created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating office' });
  }
});

app.put('/api/master/office/:id', authenticateToken, async (req, res) => {
  try {
    await db.update(tbl_office).set(req.body).where(eq(tbl_office.officeid, req.params.id));
    res.json({ message: 'Office updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating office' });
  }
});

app.delete('/api/master/office/:id', authenticateToken, async (req, res) => {
  try {
    await db.delete(tbl_office).where(eq(tbl_office.officeid, req.params.id));
    res.json({ message: 'Office deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting office' });
  }
});

// 2. Payment Methods (carabayar)
app.get('/api/master/payment-method', authenticateToken, async (req, res) => {
  try {
    const userOffice = req.user.office || '0';
    const data = await db.select().from(carabayar).where(eq(carabayar.office, userOffice));
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payment methods' });
  }
});

app.post('/api/master/payment-method', authenticateToken, async (req, res) => {
  try {
    await db.insert(carabayar).values(req.body);
    res.json({ message: 'Payment method created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating payment method' });
  }
});

app.put('/api/master/payment-method/:id', authenticateToken, async (req, res) => {
  try {
    await db.update(carabayar).set(req.body).where(eq(carabayar.bayar_id, req.params.id));
    res.json({ message: 'Payment method updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating payment method' });
  }
});

app.delete('/api/master/payment-method/:id', authenticateToken, async (req, res) => {
  try {
    await db.delete(carabayar).where(eq(carabayar.bayar_id, req.params.id));
    res.json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting payment method' });
  }
});

// 3. COA (akun)
app.get('/api/master/coa', authenticateToken, async (req, res) => {
  try {
    const data = await db.select().from(akun);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching accounts' });
  }
});

app.post('/api/master/coa', authenticateToken, async (req, res) => {
  try {
    await db.insert(akun).values(req.body);
    res.json({ message: 'Account created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating account' });
  }
});

app.put('/api/master/coa/:id', authenticateToken, async (req, res) => {
  try {
    await db.update(akun).set(req.body).where(eq(akun.coa, req.params.id));
    res.json({ message: 'Account updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating account' });
  }
});

app.delete('/api/master/coa/:id', authenticateToken, async (req, res) => {
  try {
    await db.delete(akun).where(eq(akun.coa, req.params.id));
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting account' });
  }
});

// --- ROUTINE DONATIONS LOGIC ---

/**
 * Optimized generation of routine transactions using batch inserts
 */
async function batchGenerateRoutine(targetYear, reqUser, donaturId = null) {
  const conditions = [
    eq(donatur.d_tipe, 'RUTIN'),
    inArray(donatur.status, ['ACTIVE', 'AKTIF'])
  ];
  
  if (donaturId) {
    conditions.push(eq(donatur.donatur_id, donaturId));
  } else {
    const userOffice = reqUser.office || '0';
    const officePrefix = userOffice.startsWith('0') && userOffice.length === 1 ? '0%' : `${userOffice}%`;
    conditions.push(like(donatur.office, officePrefix));
  }

  const activeDonors = await db.select().from(donatur).where(and(...conditions));

  console.log(`Generating transactions for ${activeDonors.length} donors for year ${targetYear}`);
  
  const CHUNK_SIZE = 100; // Process 100 donors at a time
  for (let i = 0; i < activeDonors.length; i += CHUNK_SIZE) {
    const chunk = activeDonors.slice(i, i + CHUNK_SIZE);
    
    await db.transaction(async (tx) => {
      for (const d of chunk) {
        const routines = await tx.select().from(don_rutin).where(eq(don_rutin.donatur_id, d.donatur_id));
        if (routines.length === 0) continue;

        const startMonth = targetYear > new Date().getFullYear() ? 0 : new Date().getMonth();
        
        for (let month = startMonth; month <= 11; month++) {
          const monthYear = `${(month + 1).toString().padStart(2, '0')}${targetYear}`;
          const rutinTag = `RUTIN-${d.donatur_id}-${monthYear}`;
          
          // Using a check for existing to avoid duplicates
          const existing = await tx.select({ id: transaksi.trans_id })
            .from(transaksi)
            .where(eq(transaksi.id_rutin, rutinTag))
            .limit(1);

          if (existing.length === 0) {
            const transId = `TX-RUTIN-${d.donatur_id.substring(0, 5)}-${Math.floor(Math.random() * 1000000)}`;
            const totalDonasi = routines.reduce((sum, r) => sum + Number(r.sub_total || 0), 0);

            await tx.insert(transaksi).values({
              trans_id: transId,
              id_rutin: rutinTag,
              tgl: `${targetYear}-${(month + 1).toString().padStart(2, '0')}-15`,
              cara_bayar: d.c_bayar || 'CASH',
              donatur: d.donatur_id,
              keterangan: `Donasi Rutin Bulan ${month + 1} ${targetYear}`,
              status: 'PENDING',
              user: reqUser.login,
              office: d.office,
              total_donasi: totalDonasi,
              date_insert: new Date()
            });

            const detailValues = routines.map(r => ({
              detail_id: `${transId}-${Math.floor(Math.random() * 1000)}`,
              trans_id: transId,
              produk: r.produk,
              price: r.price,
              qty: r.qty,
              sub_total: r.sub_total,
              keterangan: `Item Rutin: ${r.produk}`
            }));
            
            if (detailValues.length > 0) {
              await tx.insert(detail).values(detailValues);
            }
          }
        }
      }
    });
  }
}

// 1. Get Routine Donors
app.get('/api/routine/donors', authenticateToken, async (req, res) => {
  try {
    const userOffice = req.user.office || '0';
    const officePrefix = userOffice.startsWith('0') && userOffice.length === 1 ? '0%' : `${userOffice}%`;
    
    const data = await db.select({
      donatur_id: donatur.donatur_id,
      nama: donatur.nama,
      no_hp: donatur.no_hp,
      office: donatur.office,
      c_bayar: donatur.c_bayar,
      kolektor: donatur.kolektor,
      marketer: donatur.marketer,
      status: donatur.status,
      d_tipe: donatur.d_tipe
    })
    .from(donatur)
    .where(and(
      like(donatur.office, officePrefix),
      eq(donatur.d_tipe, 'RUTIN')
    ));
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching routine donors' });
  }
});

// 2. Get Donor Routine Products
app.get('/api/routine/products/:donatur_id', authenticateToken, async (req, res) => {
  try {
    const data = await db.select().from(don_rutin).where(eq(don_rutin.donatur_id, req.params.donatur_id));
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching routine products' });
  }
});

// 3. Save/Update Routine Donor Commitment
app.post('/api/routine/save', authenticateToken, async (req, res) => {
  const { donatur_id, products, c_bayar, kolektor, marketer } = req.body;
  
  try {
    // 1. Update Donor Info
    await db.update(donatur).set({
      d_tipe: 'RUTIN',
      c_bayar,
      kolektor,
      marketer,
      status: 'ACTIVE'
    }).where(eq(donatur.donatur_id, donatur_id));

    // 2. Refresh Routine Products
    await db.delete(don_rutin).where(eq(don_rutin.donatur_id, donatur_id));
    
    for (const p of products) {
      await db.insert(don_rutin).values({
        rutinid: `${donatur_id}-${p.produk_id}-${Date.now()}`,
        donatur_id,
        produk: p.produk_id,
        price: p.price,
        qty: p.qty,
        sub_total: p.price * p.qty
      });
    }

    // 3. Generate Transactions for current year (Optimized)
    await batchGenerateRoutine(new Date().getFullYear(), req.user, donatur_id);

    res.json({ message: 'Komitmen rutin berhasil disimpan. Transaksi PENDING untuk tahun ini telah digenerate.' });
  } catch (error) {
    console.error('Save routine error:', error);
    res.status(500).json({ message: 'Gagal menyimpan komitmen rutin' });
  }
});

// 4. Batch Generate for New Year (Admin only)
app.post('/api/routine/generate-yearly', authenticateToken, async (req, res) => {
  // Check if admin (Group 1 typically is Admin)
  if (req.user.role !== 1 && req.user.priv_admin !== 'Y') {
    return res.status(403).json({ message: 'Akses ditolak' });
  }

  const { year } = req.body;
  const targetYear = year || (new Date().getFullYear() + 1);

  try {
    await batchGenerateRoutine(targetYear, req.user);
    res.json({ message: `Berhasil men-generate transaksi rutin tahun ${targetYear}.` });
  } catch (error) {
    console.error('Yearly generation error:', error);
    res.status(500).json({ message: 'Gagal men-generate transaksi tahunan' });
  }
});

// 5. Products (produk)
app.get('/api/master/product', authenticateToken, async (req, res) => {
  try {
    const data = await db.select().from(produk).where(eq(produk.aktif, 'Y'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products' });
  }
});

app.post('/api/master/product', authenticateToken, async (req, res) => {
  if (req.user.office !== '0' && req.user.office !== 0) {
    return res.status(403).json({ message: 'Akses ditolak: Hanya admin kantor pusat yang dapat menambah produk' });
  }
  try {
    await db.insert(produk).values(req.body);
    res.json({ message: 'Product created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating product' });
  }
});

app.put('/api/master/product/:id', authenticateToken, async (req, res) => {
  if (req.user.office !== '0' && req.user.office !== 0) {
    return res.status(403).json({ message: 'Akses ditolak: Hanya admin kantor pusat yang dapat mengedit produk' });
  }
  try {
    await db.update(produk).set(req.body).where(eq(produk.produk_id, req.params.id));
    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating product' });
  }
});

app.delete('/api/master/product/:id', authenticateToken, async (req, res) => {
  if (req.user.office !== '0' && req.user.office !== 0) {
    return res.status(403).json({ message: 'Akses ditolak: Hanya admin kantor pusat yang dapat menghapus produk' });
  }
  try {
    await db.delete(produk).where(eq(produk.produk_id, req.params.id));
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product' });
  }
});

// 5. Donors (donatur)
app.get('/api/master/donatur', authenticateToken, async (req, res) => {
  try {
    const userOffice = req.user.office || '0';
    const officePrefix = userOffice.startsWith('0') && userOffice.length === 1 ? '0%' : `${userOffice}%`;
    const searchTerm = req.query.search || '';
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    let conditions = [like(donatur.office, officePrefix)];

    if (searchTerm) {
      conditions.push(sql`(
        ${donatur.nama} LIKE ${'%' + searchTerm + '%'} OR 
        ${donatur.no_hp} LIKE ${'%' + searchTerm + '%'} OR 
        ${donatur.donatur_id} LIKE ${'%' + searchTerm + '%'} OR
        ${donatur.email} LIKE ${'%' + searchTerm + '%'}
      )`);
    }

    // Get total count for pagination
    const [countResult] = await db.select({ 
      count: sql`count(*)` 
    })
    .from(donatur)
    .where(and(...conditions));

    const totalCount = Number(countResult.count);

    const data = await db.select()
      .from(donatur)
      .where(and(...conditions))
      .orderBy(searchTerm ? asc(donatur.nama) : desc(donatur.donatur_id))
      .limit(limit)
      .offset(offset);

    res.json({
      data,
      pagination: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Fetch donors error:', error);
    res.status(500).json({ message: 'Error fetching donors' });
  }
});

app.post('/api/master/donatur', authenticateToken, async (req, res) => {
  try {
    const data = { ...req.body };
    
    // Sanitize empty strings to null for database compatibility (especially for DATE fields)
    for (const key in data) {
      if (data[key] === '') data[key] = null;
    }

    // 1. Validation: At least one contact method must be present
    if (!data.no_hp && !data.email) {
      return res.status(400).json({ message: 'Nomor HP atau Email wajib diisi salah satu' });
    }

    // 2. Check duplicate Phone
    if (data.no_hp) {
      const existing = await db.select().from(donatur).where(eq(donatur.no_hp, data.no_hp)).limit(1);
      if (existing.length > 0) return res.status(400).json({ message: 'Nomor HP sudah terdaftar' });
    }

    // 3. Check duplicate Email
    if (data.email) {
      const existing = await db.select().from(donatur).where(eq(donatur.email, data.email)).limit(1);
      if (existing.length > 0) return res.status(400).json({ message: 'Email sudah terdaftar' });
    }

    // Generate donatur_id: DON + 3 digit office + yymm + 4 random digits
    if (!data.donatur_id) {
      const officeCode = (req.user.office || '000').substring(0, 3).padEnd(3, '0');
      const now = new Date();
      const yy = now.getFullYear().toString().slice(-2);
      const mm = (now.getMonth() + 1).toString().padStart(2, '0');
      const random4 = Math.floor(1000 + Math.random() * 9000);
      
      data.donatur_id = `DON-${officeCode}-${yy}${mm}-${random4}`;
    }

    // Mapping frontend field 'kategori' to backend 'tipe_donatur'
    if (data.kategori) {
      data.tipe_donatur = data.kategori;
      delete data.kategori;
    }
    
    await db.insert(donatur).values(data);
    res.json({ message: 'Donor created successfully' });
  } catch (error) {
    console.error('Error saat tambah donatur:', error);
    res.status(500).json({ message: 'Error creating donor: ' + (error.sqlMessage || error.message) });
  }
});




app.put('/api/master/donatur/:id', authenticateToken, async (req, res) => {
  try {
    const data = { ...req.body };
    for (const key in data) {
      if (data[key] === '') data[key] = null;
    }
    
    // Convert 'kategori' back to 'tipe_donatur' if present
    if (data.kategori) {
      data.tipe_donatur = data.kategori;
      delete data.kategori;
    }

    await db.update(donatur).set(data).where(eq(donatur.donatur_id, req.params.id));
    res.json({ message: 'Donor updated successfully' });
  } catch (error) {
    console.error('Error updating donor:', error);
    res.status(500).json({ message: 'Error updating donor: ' + error.message });
  }
});


app.delete('/api/master/donatur/:id', authenticateToken, async (req, res) => {
  try {
    await db.delete(donatur).where(eq(donatur.donatur_id, req.params.id));
    res.json({ message: 'Donor deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting donor' });
  }
});

// DONATION TRANSACTIONS
// 1. Transaction History (with Pagination & Search)
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const userOffice = req.user.office || '0';
    const officePrefix = userOffice.startsWith('0') && userOffice.length === 1 ? '0%' : `${userOffice}%`;
    
    // Pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Filter params
    const searchTerm = req.query.search || '';
    const statusFilter = req.query.status && req.query.status !== 'Semua Status' ? req.query.status : null;

    // Base conditions
    const conditions = [like(transaksi.office, officePrefix)];
    
    if (searchTerm) {
      conditions.push(sql`(
        ${transaksi.trans_id} LIKE ${'%' + searchTerm + '%'} OR 
        ${donatur.nama} LIKE ${'%' + searchTerm + '%'} OR
        ${donatur.alamat} LIKE ${'%' + searchTerm + '%'} OR
        ${carabayar.cara_bayar} LIKE ${'%' + searchTerm + '%'}
      )`);
    }
    
    if (statusFilter) {
      conditions.push(eq(transaksi.status, statusFilter));
    }

    const whereClause = and(...conditions);

    // Get total count for pagination
    const [countResult] = await db.select({ 
      count: sql`count(*)` 
    })
    .from(transaksi)
    .leftJoin(donatur, eq(transaksi.donatur, donatur.donatur_id))
    .leftJoin(carabayar, eq(transaksi.cara_bayar, carabayar.bayar_id))
    .where(whereClause);

    const totalCount = Number(countResult.count);
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch data with limit/offset
    const data = await db.select({
      id: transaksi.trans_id,
      date: transaksi.tgl,
      donor_id: transaksi.donatur,
      donor_name: donatur.nama,
      donor_address: donatur.alamat,
      payment_method: carabayar.cara_bayar,
      total: transaksi.total_donasi,
      status: transaksi.status,
      user: transaksi.user,
      office: transaksi.office
    })
    .from(transaksi)
    .leftJoin(donatur, eq(transaksi.donatur, donatur.donatur_id))
    .leftJoin(carabayar, eq(transaksi.cara_bayar, carabayar.bayar_id))
    .where(whereClause)
    .orderBy(desc(transaksi.date_insert))
    .limit(limit)
    .offset(offset);

    res.json({
      data,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    });
  } catch (error) {
    console.error('Fetch transactions error:', error);
    res.status(500).json({ message: 'Error fetching transactions' });
  }
});

// 1b. Transaction Detail
app.get('/api/transactions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Header
    const [header] = await db.select({
      id: transaksi.trans_id,
      date: transaksi.tgl,
      donor_name: donatur.nama,
      donor_hp: donatur.no_hp,
      donor_address: donatur.alamat,
      payment_method: carabayar.cara_bayar,
      total: transaksi.total_donasi,
      keterangan: transaksi.keterangan,
      status: transaksi.status,
      user: transaksi.user,
      office: transaksi.office,
      bukti: transaksi.bukti,
      date_insert: transaksi.date_insert
    })
    .from(transaksi)
    .leftJoin(donatur, eq(transaksi.donatur, donatur.donatur_id))
    .leftJoin(carabayar, eq(transaksi.cara_bayar, carabayar.bayar_id))
    .where(eq(transaksi.trans_id, id))
    .limit(1);

    if (!header) return res.status(404).json({ message: 'Transaction not found' });

    // Items
    const items = await db.select({
      id: detail.detail_id,
      produk_name: produk.produk,
      dana: produk.dana,
      price: detail.price,
      qty: detail.qty,
      sub_total: detail.sub_total,
      keterangan: detail.keterangan
    })
    .from(detail)
    .leftJoin(produk, eq(detail.produk, produk.produk_id))
    .where(eq(detail.trans_id, id));

    res.json({ ...header, items });
  } catch (error) {
    console.error('Fetch transaction detail error:', error);
    res.status(500).json({ message: 'Error fetching detailed transaction' });
  }
});

// 2. Create Transaction (with Automated Journaling)
app.post('/api/transactions/:id/approve', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    await db.transaction(async (tx) => {
      // 1. Check transaction exists and status is Open
      const [trx] = await tx.select().from(transaksi).where(eq(transaksi.trans_id, id)).limit(1);
      if (!trx) throw new Error('Transaction not found');
      const validStatuses = ['open', 'pending'];
      if (!trx.status || !validStatuses.includes(trx.status.toLowerCase())) {
        throw new Error(`Transaction current status (${trx.status}) is already processed or invalid for approval`);
      }

      // 2. Fetch Details
      const details = await tx.select().from(detail).where(eq(detail.trans_id, id));
      
      // 3. Fetch Payment Method for Debit
      const [pm] = await tx.select().from(carabayar).where(eq(carabayar.bayar_id, trx.cara_bayar)).limit(1);

      // Formatting Date helper to ensure YYYY-MM-DD for MySQL DATE type
      const formatMySQLDate = (date) => {
        if (!date) return null;
        const d = new Date(date);
        if (isNaN(d.getTime())) return date;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };

      // 4. Fetch Donor Info for Data Qurban Mapping
      const [donorData] = await tx.select().from(donatur).where(eq(donatur.donatur_id, trx.donatur)).limit(1);

      // 5. Create Jurnal Pairs (Debit & Credit per product)
      for (const d of details) {
        const [prod] = await tx.select().from(produk).where(eq(produk.produk_id, d.produk)).limit(1);
        if (prod && prod.akun) {
          const isMinus = Number(d.sub_total) < 0;
          const nominal = Math.abs(Number(d.sub_total)).toString();

          // A. Entry Akun Produk (Normalnya Kredit/Revenue)
          // Jika minus => akun produk di Debit
          await tx.insert(jurnal).values({
            jurnalid: `J-${d.detail_id}-${isMinus ? 'DR' : 'CR'}`,
            transid: id,
            tgl: formatMySQLDate(trx.tgl),
            office: trx.office,
            produk: d.produk,
            keterangan: `Donasi ${prod.produk} - ${id}`,
            perkiraan: prod.akun,
            debit: isMinus ? nominal : "0",
            kredit: isMinus ? "0" : nominal,
            cbayar: trx.cara_bayar,
            dana: prod.dana,
            user: req.user.login,
            posttime: new Date(),
            iddonatur: trx.donatur
          });

          // B. Entry Akun Cara Bayar (Normalnya Debit/Cash In)
          // Jika minus => akun cara bayar di Kredit
          if (pm && pm.akun) {
            await tx.insert(jurnal).values({
              jurnalid: `J-${d.detail_id}-${isMinus ? 'CR' : 'DR'}`,
              transid: id,
              tgl: formatMySQLDate(trx.tgl),
              office: trx.office,
              produk: d.produk,
              keterangan: `Penerimaan Kas ${prod.produk} - ${id}`,
              perkiraan: pm.akun,
              debit: isMinus ? "0" : nominal,
              kredit: isMinus ? nominal : "0",
              cbayar: trx.cara_bayar,
              dana: prod.dana,
              user: req.user.login,
              posttime: new Date(),
              iddonatur: trx.donatur
            });
          }

          // C. SYNC TO DATAQURBAN (myprodaya_dev.dataqurban)
          // If fund type is QURBAN, copy to myprodaya_dev.dataqurban
          if (prod.dana && prod.dana.toUpperCase() === 'QURBAN') {
            await tx.execute(sql`
              REPLACE INTO myprodaya_dev.dataqurban (
                detail_id, trans_id, donaturid, donatur, hpdonatur, 
                produk, price, qty, sub_total, tgl, 
                sdana, sproduk, cara_bayar, keterangan, bukti, 
                status, user, office, timestamp
              ) VALUES (
                ${d.detail_id}, ${id}, ${trx.donatur}, ${donorData?.nama || ''}, ${donorData?.no_hp || ''},
                ${d.produk}, ${d.price.toString()}, ${d.qty.toString()}, ${d.sub_total.toString()}, ${formatMySQLDate(trx.tgl)},
                ${prod.dana}, ${prod.produk}, ${trx.cara_bayar}, ${d.keterangan || ''}, ${trx.bukti || ''},
                'Paid', ${req.user.login}, ${trx.office}, NOW()
              )
            `);
          }
        }
      }


      // 5. Update Status
      await tx.update(transaksi).set({ status: 'Success' }).where(eq(transaksi.trans_id, id));
    });


    res.json({ message: 'Transaction approved and journaled successfully' });
  } catch (error) {
    console.error('Approve transaction error:', error);
    res.status(500).json({ message: error.message || 'Error processing approval' });
  }
});

app.post('/api/transactions', authenticateToken, async (req, res) => {
  const { donor_id, payment_id, tgl, items, keterangan, bukti } = req.body;
  const userOffice = req.user.office || '0';
  
  // Generate trans_id: tx-010-2404-123456
  const officePrefix = userOffice.substring(0, 3).padEnd(3, '0');
  const now = new Date();
  const yymm = now.getFullYear().toString().slice(-2) + (now.getMonth() + 1).toString().padStart(2, '0');
  const random6 = Math.floor(100000 + Math.random() * 900000);
  const trans_id = `tx-${officePrefix}-${yymm}-${random6}`;

  try {
    const trx_result = await db.transaction(async (tx) => {
      const total_donasi = items.reduce((sum, item) => sum + (item.price * item.qty || 0), 0);

      // A. Insert into transaksi
      await tx.insert(transaksi).values({
        trans_id,
        tgl: tgl || new Date().toISOString().split('T')[0],
        cara_bayar: payment_id,
        donatur: donor_id,
        keterangan: keterangan || '',
        user: req.user.login,
        total_donasi,
        office: userOffice,
        status: 'Open',
        bukti: bukti || null,
        date_insert: new Date()
      });

      // B. Process Items (Only Detail)
      let index = 1;
      for (const item of items) {
        const detail_id = `${trans_id}-D${index++}`;
        await tx.insert(detail).values({
          detail_id,
          trans_id,
          produk: item.produk_id,
          price: item.price,
          qty: item.qty,
          sub_total: item.price * item.qty,
          keterangan: item.keterangan || ''
        });
      }

      return { trans_id };
    });

    res.json({ message: 'Transaction created successfully', trans_id: trx_result.trans_id });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ message: 'Gagal menyimpan transaksi: ' + (error.message || 'Error Unknown') });
  }
});


app.put('/api/transactions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { payment_id, tgl, items, keterangan } = req.body;

  try {
    const trx_result = await db.transaction(async (tx) => {
      // 1. Check if transaction exists
      const [trx] = await tx.select().from(transaksi).where(eq(transaksi.trans_id, id)).limit(1);
      if (!trx) throw new Error('Transaksi tidak ditemukan');

      // 2. Validate status
      const validStatuses = ['open', 'pending'];
      if (!trx.status || !validStatuses.includes(trx.status.toLowerCase())) {
        throw new Error(`Transaksi dengan status (${trx.status}) tidak dapat diubah.`);
      }

      const total_donasi = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.qty) || 0), 0);

      // 3. Update transaksi
      await tx.update(transaksi).set({
        cara_bayar: payment_id,
        tgl: tgl || trx.tgl,
        keterangan: keterangan || '',
        total_donasi
      }).where(eq(transaksi.trans_id, id));

      // 4. Delete existing items
      await tx.delete(detail).where(eq(detail.trans_id, id));

      // 5. Insert new items
      let index = 1;
      const detailValues = items.map(item => ({
        detail_id: `${id}-D${index++}`,
        trans_id: id,
        produk: item.produk_id,
        price: Number(item.price),
        qty: Number(item.qty),
        sub_total: Number(item.price) * Number(item.qty),
        keterangan: item.keterangan || ''
      }));

      if (detailValues.length > 0) {
        await tx.insert(detail).values(detailValues);
      }

      return { trans_id: id };
    });

    res.json({ message: 'Transaksi berhasil diperbarui', trans_id: trx_result.trans_id });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ message: 'Gagal memperbarui transaksi: ' + (error.message || 'Error Unknown') });
  }
});
// Utility function to send WhatsApp notification via Custom WA-API
async function sendWhatsAppNotification(to, message, waApiKey = null) {
  const waUrl = process.env.WA_API_URL;
  const waKey = waApiKey || process.env.WA_API_KEY;

  if (!waUrl || waUrl === 'your_custom_wa_api_url') {
    console.log('WA_API_URL not configured. Skipping WhatsApp notification.');
    return;
  }

  // Clean the phone number (remove +, spaces, leading 0 to 62, etc.)
  let cleanTo = String(to).replace(/[^0-9]/g, '');
  if (cleanTo.startsWith('0')) {
    cleanTo = '62' + cleanTo.substring(1);
  }

  try {
    const payload = {
      to: cleanTo,
      target: cleanTo,
      phone: cleanTo,
      number: cleanTo,
      message: message,
      text: message,
      token: waKey,
      key: waKey,
      api_key: waKey
    };

    console.log(`Sending WA to ${cleanTo} via ${waUrl}...`);
    const response = await fetch(waUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${waKey}`,
        'x-api-key': waKey
      },
      body: JSON.stringify(payload)
    });

    const resText = await response.text();
    console.log(`WhatsApp API Response (Status ${response.status}):`, resText);
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
  }
}


// --- QURBAN REPORT MODULE ---

app.get('/api/reports/qurban', authenticateToken, async (req, res) => {
  try {
    const userOffice = req.user.office || '0';
    const officePrefix = userOffice.startsWith('0') && userOffice.length === 1 ? '0%' : `${userOffice}%`;

    const { startDate, endDate, office, search, group_by, groupBy, status } = req.query;

    const targetOffice = office || userOffice;
    const targetOfficePrefix = targetOffice.startsWith('0') && targetOffice.length === 1 ? '0%' : `${targetOffice}%`;

    // Security check: Branch admin can only query their own branch or sub-branches
    if (userOffice !== '0' && !targetOffice.startsWith(userOffice)) {
      return res.status(403).json({ message: 'Akses ditolak: Anda hanya dapat mengakses kantor Anda sendiri.' });
    }

    const queryParams = [];
    let baseSql = '';
    let filterSql = " WHERE 1=1 AND LOWER(sproduk) NOT LIKE '%diskon%' AND LOWER(produk) NOT LIKE '%dsk%'";

    // 1. Add date range filter
    if (startDate) {
      filterSql += ' AND tgl >= ?';
      queryParams.push(startDate);
    }
    if (endDate) {
      filterSql += ' AND tgl <= ?';
      queryParams.push(endDate);
    }

    // 2. Add office filter
    filterSql += ' AND office LIKE ?';
    queryParams.push(targetOfficePrefix);

    // 3. Add search filter
    if (search) {
      filterSql += ' AND (donatur LIKE ? OR trans_id LIKE ? OR sproduk LIKE ? OR hpdonatur LIKE ?)';
      const term = `%${search}%`;
      queryParams.push(term, term, term, term);
    }

    // 4. Add status filter
    if (status) {
      filterSql += ' AND status = ?';
      queryParams.push(status);
    }

    const type = group_by || groupBy || 'detail';

    if (type === 'detail') {
      baseSql = `
        SELECT detail_id, trans_id, donaturid, donatur, hpdonatur, produk, price, qty, sub_total, tgl, sdana, sproduk, cara_bayar, notes, keterangan, bukti, status, user, office, timestamp, distribusi, pic_lapangan, status_kirim, alasan, url_foto1, url_foto2, url_foto3
        FROM myprodaya_dev.dataqurban
        ${filterSql}
        ORDER BY tgl DESC, detail_id DESC
      `;
    } else if (type === 'donor') {
      baseSql = `
        SELECT donaturid, donatur, hpdonatur, COUNT(DISTINCT trans_id) as total_transaksi, SUM(CAST(qty AS SIGNED)) as total_qty, SUM(CAST(sub_total AS SIGNED)) as total_nominal
        FROM myprodaya_dev.dataqurban
        ${filterSql}
        GROUP BY donaturid, donatur, hpdonatur
        ORDER BY total_nominal DESC
      `;
    } else if (type === 'product') {
      baseSql = `
        SELECT produk, sproduk as nama_produk, COUNT(DISTINCT trans_id) as total_transaksi, SUM(CAST(qty AS SIGNED)) as total_qty, SUM(CAST(sub_total AS SIGNED)) as total_nominal
        FROM myprodaya_dev.dataqurban
        ${filterSql}
        GROUP BY produk, sproduk
        ORDER BY total_nominal DESC
      `;
    } else if (type === 'office') {
      baseSql = `
        SELECT office, COUNT(DISTINCT trans_id) as total_transaksi, SUM(CAST(qty AS SIGNED)) as total_qty, SUM(CAST(sub_total AS SIGNED)) as total_nominal
        FROM myprodaya_dev.dataqurban
        ${filterSql}
        GROUP BY office
        ORDER BY total_nominal DESC
      `;
    } else if (type === 'payment_method') {
      baseSql = `
        SELECT cara_bayar, COUNT(DISTINCT trans_id) as total_transaksi, SUM(CAST(qty AS SIGNED)) as total_qty, SUM(CAST(sub_total AS SIGNED)) as total_nominal
        FROM myprodaya_dev.dataqurban
        ${filterSql}
        GROUP BY cara_bayar
        ORDER BY total_nominal DESC
      `;
    } else if (type === 'date') {
      baseSql = `
        SELECT tgl, COUNT(DISTINCT trans_id) as total_transaksi, SUM(CAST(qty AS SIGNED)) as total_qty, SUM(CAST(sub_total AS SIGNED)) as total_nominal
        FROM myprodaya_dev.dataqurban
        ${filterSql}
        GROUP BY tgl
        ORDER BY tgl DESC
      `;
    } else if (type === 'month') {
      baseSql = `
        SELECT DATE_FORMAT(tgl, '%Y-%m') as bulan, COUNT(DISTINCT trans_id) as total_transaksi, SUM(CAST(qty AS SIGNED)) as total_qty, SUM(CAST(sub_total AS SIGNED)) as total_nominal
        FROM myprodaya_dev.dataqurban
        ${filterSql}
        GROUP BY DATE_FORMAT(tgl, '%Y-%m')
        ORDER BY bulan DESC
      `;
    } else if (type === 'year') {
      baseSql = `
        SELECT YEAR(tgl) as tahun, COUNT(DISTINCT trans_id) as total_transaksi, SUM(CAST(qty AS SIGNED)) as total_qty, SUM(CAST(sub_total AS SIGNED)) as total_nominal
        FROM myprodaya_dev.dataqurban
        ${filterSql}
        GROUP BY YEAR(tgl)
        ORDER BY tahun DESC
      `;
    }

    const [results] = await poolConnection.execute(baseSql, queryParams);
    res.json(results);
  } catch (error) {
    console.error('Get qurban report error:', error);
    res.status(500).json({ message: 'Gagal mengambil laporan qurban: ' + error.message });
  }
});

app.put('/api/reports/qurban/:detail_id/finish', authenticateToken, async (req, res) => {
  const { detail_id } = req.params;

  try {
    // 1. Get the qurban detail transaction
    const [rows] = await poolConnection.execute(`
      SELECT detail_id, trans_id, donatur, hpdonatur, sproduk, office, url_foto1, url_foto2, url_foto3
      FROM myprodaya_dev.dataqurban
      WHERE detail_id = ?
      LIMIT 1
    `, [detail_id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Data qurban tidak ditemukan' });
    }

    const qurban = rows[0];

    // 2. Check office permission
    const userOffice = req.user.office || '0';
    const isAuthorized = userOffice.startsWith('0') && userOffice.length === 1 || qurban.office.startsWith(userOffice);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Akses ditolak: Anda tidak memiliki akses ke kantor cabang ini' });
    }

    // 3. Update status in database to 'FINISH'
    await poolConnection.execute(`
      UPDATE myprodaya_dev.dataqurban
      SET status = 'FINISH', timestamp = NOW()
      WHERE detail_id = ?
    `, [detail_id]);

    // 4. Retrieve WA API key from tbl_office (optional, fallback to env)
    const [officeRows] = await db.select({ wa_api: tbl_office.wa_api })
      .from(tbl_office)
      .where(eq(tbl_office.officeid, qurban.office))
      .limit(1);

    const waApiKey = officeRows.length > 0 ? officeRows[0].wa_api : null;

    // 5. Send WhatsApp notification
    let message = `Bismillah. Pequrban yang terhormat *${qurban.donatur}*, ibadah Qurban Anda untuk produk *${qurban.sproduk}* (ID Transaksi: *${qurban.trans_id}*) telah selesai dilaksanakan dengan baik. Semoga Allah menerima amal ibadah Qurban Anda. Aamiin.`;

    const photos = [];
    if (qurban.url_foto1) photos.push(qurban.url_foto1);
    if (qurban.url_foto2) photos.push(qurban.url_foto2);
    if (qurban.url_foto3) photos.push(qurban.url_foto3);

    if (photos.length > 0) {
      message += `\n\nBerikut dokumentasi pelaksanaan Qurban Anda:\n` + photos.map((p, idx) => `- Foto ${idx + 1}: ${p}`).join('\n');
    }

    if (qurban.hpdonatur) {
      // Send WA notification asynchronously
      sendWhatsAppNotification(qurban.hpdonatur, message, waApiKey).catch(err => {
        console.error('WA notification send error:', err);
      });
    }

    res.json({ message: 'Status qurban berhasil diubah menjadi FINISH dan notifikasi WA dikirim.' });
  } catch (error) {
    console.error('Finish qurban error:', error);
    res.status(500).json({ message: 'Gagal mengubah status qurban: ' + (error.message || 'Error Unknown') });
  }
});

app.put('/api/reports/qurban/:detail_id/reject', authenticateToken, async (req, res) => {
  const { detail_id } = req.params;
  const { alasan } = req.body;

  try {
    // 1. Get the qurban detail transaction
    const [rows] = await poolConnection.execute(`
      SELECT detail_id, trans_id, donatur, hpdonatur, sproduk, office
      FROM myprodaya_dev.dataqurban
      WHERE detail_id = ?
      LIMIT 1
    `, [detail_id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Data qurban tidak ditemukan' });
    }

    const qurban = rows[0];

    // 2. Check office permission
    const userOffice = req.user.office || '0';
    const isAuthorized = userOffice.startsWith('0') && userOffice.length === 1 || qurban.office.startsWith(userOffice);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Akses ditolak: Anda tidak memiliki akses ke kantor cabang ini' });
    }

    // 3. Update status in database to 'BATAL' and record the reason 'alasan'
    await poolConnection.execute(`
      UPDATE myprodaya_dev.dataqurban
      SET status = 'BATAL', alasan = ?, timestamp = NOW()
      WHERE detail_id = ?
    `, [alasan || '', detail_id]);

    res.json({ message: 'Status qurban berhasil diubah menjadi BATAL.' });
  } catch (error) {
    console.error('Reject qurban error:', error);
    res.status(500).json({ message: 'Gagal menolak/membatalkan qurban: ' + (error.message || 'Error Unknown') });
  }
});



// --- REPORT ROUTES ---

// 1. Rekap Donasi (By Product)
app.get('/api/reports/rekap-donasi', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, office, dana, product } = req.query;
    const userOffice = req.user.office || '0';
    let officeCondition;
    if (office) {
      officeCondition = like(transaksi.office, `${office}%`);
    } else {
      officeCondition = eq(transaksi.office, userOffice);
    }

    const conditions = [officeCondition];
    if (startDate) conditions.push(sql`${transaksi.tgl} >= ${startDate}`);
    if (endDate) conditions.push(sql`${transaksi.tgl} <= ${endDate}`);
    if (dana) conditions.push(eq(produk.dana, dana));
    if (product) conditions.push(eq(produk.produk_id, product));

    const data = await db.select({
      produk_id: produk.produk_id,
      produk_name: produk.produk,
      dana: produk.dana,
      total_qty: sql`SUM(${detail.qty})`,
      total_amount: sql`SUM(${detail.sub_total})`
    })
    .from(detail)
    .innerJoin(transaksi, eq(detail.trans_id, transaksi.trans_id))
    .innerJoin(produk, eq(detail.produk, produk.produk_id))
    .where(and(...conditions))
    .groupBy(produk.produk_id, produk.produk, produk.dana);

    res.json(data);
  } catch (error) {
    console.error('Rekap donasi error:', error);
    res.status(500).json({ message: 'Error generating rekap donasi' });
  }
});

// 2. Laporan Jurnal
app.get('/api/reports/jurnal', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, office, search } = req.query;
    const userOffice = req.user.office || '0';
    let officeCondition;
    if (office) {
      officeCondition = like(jurnal.office, `${office}%`);
    } else {
      officeCondition = eq(jurnal.office, userOffice);
    }

    const conditions = [officeCondition];
    if (startDate) conditions.push(sql`${jurnal.tgl} >= ${startDate}`);
    if (endDate) conditions.push(sql`${jurnal.tgl} <= ${endDate}`);
    if (req.query.dana) conditions.push(eq(jurnal.dana, req.query.dana));
    if (search) {
      conditions.push(sql`(
        ${jurnal.keterangan} LIKE ${'%' + search + '%'} OR 
        ${jurnal.transid} LIKE ${'%' + search + '%'} OR 
        ${jurnal.perkiraan} LIKE ${'%' + search + '%'}
      )`);
    }

    const data = await db.select({
      id: jurnal.id,
      jurnalid: jurnal.jurnalid,
      transid: jurnal.transid,
      tgl: jurnal.tgl,
      office: jurnal.office,
      keterangan: jurnal.keterangan,
      perkiraan: jurnal.perkiraan, // This is the COA code
      nama_perkiraan: akun.perkiraan, // This is the COA name
      debit: jurnal.debit,
      kredit: jurnal.kredit,
      cbayar: jurnal.cbayar,
      marketer: jurnal.marketer,
      kolektor: jurnal.kolektor,
      user: jurnal.user
    })
    .from(jurnal)
    .innerJoin(akun, eq(jurnal.perkiraan, akun.coa))
    .where(and(...conditions))
    .orderBy(desc(jurnal.tgl), desc(jurnal.transid), asc(jurnal.id));

    res.json(data);
  } catch (error) {
    console.error('Fetch jurnal error:', error);
    res.status(500).json({ message: 'Error fetching jurnal' });
  }
});

// 3. Laporan Keuangan (Simple Profit & Loss)
app.get('/api/reports/keuangan', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, office } = req.query;
    const userOffice = req.user.office || '0';
    let officeCondition;
    if (office) {
      officeCondition = like(jurnal.office, `${office}%`);
    } else {
      officeCondition = eq(jurnal.office, userOffice);
    }

    const conditions = [officeCondition];
    if (startDate) conditions.push(sql`${jurnal.tgl} >= ${startDate}`);
    if (endDate) conditions.push(sql`${jurnal.tgl} <= ${endDate}`);
    if (req.query.dana) conditions.push(eq(jurnal.dana, req.query.dana));

    // Get current balances of ALL Revenue (4xx), Cost (5xx), Expense (6xx) accounts
    // Map them into Revenue vs Expense categories
    const results = await db.select({
      coa: jurnal.perkiraan,
      perkiraan: akun.perkiraan,
      group: akun.group,
      kelompok: akun.kelompok,
      total_debit: sql`SUM(${jurnal.debit})`,
      total_kredit: sql`SUM(${jurnal.kredit})`
    })
    .from(jurnal)
    .innerJoin(akun, eq(jurnal.perkiraan, akun.coa))
    .where(and(...conditions))
    .groupBy(jurnal.perkiraan, akun.perkiraan, akun.group, akun.kelompok);

    // Categorize for Income Statement
    // This logic might need refinement based on exact COA group definitions in user's system
    const reports = {
      pendapatan: results.filter(r => r.coa.startsWith('4')),
      pengeluaran: results.filter(r => r.coa.startsWith('5') || r.coa.startsWith('6'))
    };

    res.json(reports);
  } catch (error) {
    console.error('Financial report error:', error);
    res.status(500).json({ message: 'Error generating financial report' });
  }
});

// Verify Token Route
app.get('/api/me', authenticateToken, (req, res) => {
  res.json(req.user);
});


// --- PROFILE & USER SETTINGS ---
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const [user] = await db.select({
      login: sec_users.login,
      name: sec_users.name,
      email: sec_users.email,
      office: sec_users.office,
      active: sec_users.active,
      priv_admin: sec_users.priv_admin
    })
    .from(sec_users)
    .where(eq(sec_users.login, req.user.login))
    .limit(1);

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;
    await db.update(sec_users)
      .set({ name, email })
      .where(eq(sec_users.login, req.user.login));
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile' });
  }
});

app.put('/api/profile/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const [user] = await db.select().from(sec_users).where(eq(sec_users.login, req.user.login)).limit(1);
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(oldPassword, user.pswd);
    if (!isMatch) return res.status(400).json({ message: 'Password lama salah' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(sec_users).set({ pswd: hashedPassword }).where(eq(sec_users.login, req.user.login));
    res.json({ message: 'Password berhasil diperbarui' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
});

// --- SETTINGS (USER MANAGEMENT) ---
app.get('/api/settings/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Y' && req.user.role !== 1) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  try {
    const users = await db.select({
      login: sec_users.login,
      name: sec_users.name,
      email: sec_users.email,
      office: sec_users.office,
      active: sec_users.active,
      priv_admin: sec_users.priv_admin,
      group_id: sec_users_groups.group_id,
      group_name: sec_groups.description
    })
    .from(sec_users)
    .leftJoin(sec_users_groups, eq(sec_users.login, sec_users_groups.login))
    .leftJoin(sec_groups, eq(sec_users_groups.group_id, sec_groups.group_id));
    
    res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

app.post('/api/settings/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Y' && req.user.role !== 1) return res.status(403).json({ message: 'Forbidden' });
  try {
    const { login, pswd, name, email, office, active, priv_admin, group_id } = req.body;
    const hashedPassword = await bcrypt.hash(pswd, 10);
    
    await db.insert(sec_users).values({
      login, pswd: hashedPassword, name, email, office, active, priv_admin
    });
    
    if (group_id) {
      await db.insert(sec_users_groups).values({ login, group_id });
    }
    
    res.json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

app.put('/api/settings/users/:login', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Y' && req.user.role !== 1) return res.status(403).json({ message: 'Forbidden' });
  try {
    const { login: paramLogin } = req.params;
    const { name, email, office, active, priv_admin, pswd, group_id } = req.body;
    
    const updateData = { name, email, office, active, priv_admin };
    if (pswd) {
      updateData.pswd = await bcrypt.hash(pswd, 10);
    }
    
    await db.update(sec_users).set(updateData).where(eq(sec_users.login, paramLogin));
    
    if (group_id) {
      const existing = await db.select().from(sec_users_groups).where(eq(sec_users_groups.login, paramLogin)).limit(1);
      if (existing.length > 0) {
        await db.update(sec_users_groups).set({ group_id }).where(eq(sec_users_groups.login, paramLogin));
      } else {
        await db.insert(sec_users_groups).values({ login: paramLogin, group_id });
      }
    }
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
});



// --- GROUP MANAGEMENT ---
app.get('/api/settings/groups', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Y' && req.user.role !== 1) return res.status(403).json({ message: 'Forbidden' });
  try {
    const groups = await db.select().from(sec_groups);
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching groups' });
  }
});

app.post('/api/settings/groups', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Y' && req.user.role !== 1) return res.status(403).json({ message: 'Forbidden' });
  try {
    const { description } = req.body;
    await db.insert(sec_groups).values({ description });
    res.json({ message: 'Group created successfully' });
  } catch (error) {
    console.error('Error saat tambah group:', error);
    res.status(500).json({ message: 'Error creating group: ' + (error.sqlMessage || error.message) });
  }
});


app.put('/api/settings/groups/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Y' && req.user.role !== 1) return res.status(403).json({ message: 'Forbidden' });
  try {
    const { id } = req.params;
    const { description } = req.body;
    await db.update(sec_groups).set({ description }).where(eq(sec_groups.group_id, id));
    res.json({ message: 'Group updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating group' });
  }
});

app.delete('/api/settings/groups/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Y' && req.user.role !== 1) return res.status(403).json({ message: 'Forbidden' });
  try {
    const { id } = req.params;
    await db.delete(sec_groups).where(eq(sec_groups.group_id, id));
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting group' });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

