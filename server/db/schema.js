const { mysqlTable, varchar, decimal, date, int, bigint, datetime, unique, index, primaryKey } = require("drizzle-orm/mysql-core");

// Table: akun (COA)
exports.akun = mysqlTable("akun", {
  coa: varchar("coa", { length: 255 }).primaryKey(),
  perkiraan: varchar("perkiraan", { length: 255 }),
  defaul: varchar("defaul", { length: 255 }),
  group: varchar("group", { length: 255 }),
  kelompok: varchar("kelompok", { length: 255 }),
});

// Table: carabayar
exports.carabayar = mysqlTable("carabayar", {
  bayar_id: varchar("bayar_id", { length: 255 }).primaryKey(),
  tipe_bayar: varchar("tipe_bayar", { length: 255 }),
  cara_bayar: varchar("cara_bayar", { length: 255 }),
  office: varchar("office", { length: 255 }),
  on_off: varchar("on_off", { length: 255 }),
  akun: varchar("akun", { length: 255 }),
});

// Table: donatur
exports.donatur = mysqlTable("donatur", {
  donatur_id: varchar("donatur_id", { length: 100 }).primaryKey(),
  tipe_donatur: varchar("tipe_donatur", { length: 100 }),
  source: varchar("source", { length: 50 }),
  sapaan: varchar("sapaan", { length: 50 }),
  nama: varchar("nama", { length: 100 }),
  alamat: varchar("alamat", { length: 255 }),
  email: varchar("email", { length: 100 }),
  no_hp: varchar("no_hp", { length: 20 }),
  kelamin: varchar("kelamin", { length: 10 }),
  tgl_lahir: date("tgl_lahir"),
  d_tipe: varchar("d_tipe", { length: 20 }),
  c_bayar: varchar("c_bayar", { length: 100 }),
  kolektor: varchar("kolektor", { length: 50 }),
  marketer: varchar("marketer", { length: 50 }),
  nilai_donasi: decimal("nilai_donasi", { precision: 10, scale: 2 }),
  office: varchar("office", { length: 20 }),
  status: varchar("status", { length: 20 }),
  status_notes: varchar("status_notes", { length: 255 }),
  tgl_reg: date("tgl_reg"),
  npwz: varchar("npwz", { length: 50 }),
  npwp: varchar("npwp", { length: 50 }),
});

// Table: don_rutin
exports.don_rutin = mysqlTable("don_rutin", {
  rutinid: varchar("rutinid", { length: 255 }).primaryKey(),
  donatur_id: varchar("donatur_id", { length: 100 }),
  produk: varchar("produk", { length: 255 }),
  price: int("price"),
  qty: int("qty"),
  sub_total: int("sub_total"),
});

// Table: produk
exports.produk = mysqlTable("produk", {
  produk_id: varchar("produk_id", { length: 255 }).primaryKey(),
  dana: varchar("dana", { length: 255 }),
  produk: varchar("produk", { length: 255 }).notNull(),
  price: int("price"),
  aktif: varchar("aktif", { length: 1 }),
  akun: varchar("akun", { length: 20 }),
  akun_amil: varchar("akun_amil", { length: 20 }),
  akun_salur: varchar("akun_salur", { length: 20 }),
  hak_amil: decimal("hak_amil", { precision: 10, scale: 3 }),
});

// Table: tbl_office
exports.tbl_office = mysqlTable("tbl_office", {
  officeid: varchar("officeid", { length: 11 }).primaryKey(),
  kantor: varchar("kantor", { length: 255 }),
  kota: varchar("kota", { length: 255 }),
  alamat: varchar("alamat", { length: 255 }),
  wa_api: varchar("wa_api", { length: 255 }),
  wa_prodaya: varchar("wa_prodaya", { length: 255 }),
});

// Table: transaksi
exports.transaksi = mysqlTable("transaksi", {
  trans_id: varchar("trans_id", { length: 50 }).primaryKey(),
  id_rutin: varchar("id_rutin", { length: 50 }),
  tgl: date("tgl"),
  cara_bayar: varchar("cara_bayar", { length: 50 }),
  donatur: varchar("donatur", { length: 50 }),
  keterangan: varchar("keterangan", { length: 50 }),
  bukti: varchar("bukti", { length: 100 }),
  status: varchar("status", { length: 20 }),
  status_notes: varchar("status_notes", { length: 100 }),
  user: varchar("user", { length: 20 }),
  total_donasi: bigint("total_donasi", { mode: "number" }),
  date_insert: datetime("date_insert"),
  office: varchar("office", { length: 11 }),
  bukti_donasi: varchar("bukti_donasi", { length: 100 }),
  url_bukti: varchar("url_bukti", { length: 100 }),
  posting_date: varchar("posting_date", { length: 20 }),
}, (table) => ({
  idx_transaksi_trans_id: index("idx_transaksi_trans_id").on(table.trans_id),
  idx_transaksi_tgl: index("idx_transaksi_tgl").on(table.tgl),
  idx_transaksi_office: index("idx_transaksi_office").on(table.office),
  idx_transaksi_donatur: index("idx_transaksi_donatur").on(table.donatur),
}));

// Table: detail
exports.detail = mysqlTable("detail", {
  detail_id: varchar("detail_id", { length: 255 }).primaryKey(),
  trans_id: varchar("trans_id", { length: 255 }),
  produk: varchar("produk", { length: 255 }),
  price: bigint("price", { mode: "number" }),
  qty: int("qty"),
  sub_total: bigint("sub_total", { mode: "number" }),
  keterangan: varchar("keterangan", { length: 500 }),
}, (table) => ({
  idx_detail_trans_id: index("idx_detail_trans_id").on(table.trans_id),
}));

// Table: jurnal
exports.jurnal = mysqlTable("jurnal", {
  id: int("id").primaryKey().autoincrement(),
  jurnalid: varchar("jurnalid", { length: 255 }),
  transid: varchar("transid", { length: 255 }),
  tgl: date("tgl"),
  office: varchar("office", { length: 20 }),
  dana: varchar("dana", { length: 20 }),
  produk: varchar("produk", { length: 255 }),
  keterangan: varchar("keterangan", { length: 255 }),
  perkiraan: varchar("perkiraan", { length: 20 }),
  debit: decimal("debit", { precision: 12, scale: 2 }),
  kredit: decimal("kredit", { precision: 12, scale: 2 }),
  grup: varchar("grup", { length: 20 }),
  kelompok: varchar("kelompok", { length: 20 }),
  posttime: datetime("posttime"),
  user: varchar("user", { length: 20 }),
  cbayar: varchar("cbayar", { length: 50 }),
  pic: varchar("pic", { length: 20 }),
  marketer: varchar("marketer", { length: 50 }),
  kolektor: varchar("kolektor", { length: 50 }),
  iddonatur: varchar("iddonatur", { length: 50 }),
});

// Table: dataqurban
exports.dataqurban = mysqlTable("dataqurban", {
  detail_id: varchar("detail_id", { length: 100 }).primaryKey(),
  trans_id: varchar("trans_id", { length: 100 }),
  donaturid: varchar("donaturid", { length: 20 }),
  donatur: varchar("donatur", { length: 100 }),
  hpdonatur: varchar("hpdonatur", { length: 20 }),
  produk: varchar("produk", { length: 100 }),
  price: varchar("price", { length: 20 }),
  qty: varchar("qty", { length: 20 }),
  sub_total: varchar("sub_total", { length: 20 }),
  tgl: date("tgl"),
  sdana: varchar("sdana", { length: 50 }),
  sproduk: varchar("sproduk", { length: 50 }),
  cara_bayar: varchar("cara_bayar", { length: 50 }),
  notes: varchar("notes", { length: 255 }),
  keterangan: varchar("keterangan", { length: 500 }),
  bukti: varchar("bukti", { length: 100 }),
  status: varchar("status", { length: 50 }),
  user: varchar("user", { length: 50 }),
  office: varchar("office", { length: 50 }),
  waapi: varchar("waapi", { length: 100 }),
  distribusi: varchar("distribusi", { length: 50 }),
  pic_lapangan: varchar("pic_lapangan", { length: 50 }),
  foto1: varchar("foto1", { length: 100 }),
  foto2: varchar("foto2", { length: 100 }),
  foto3: varchar("foto3", { length: 100 }),
  status_kirim: varchar("status_kirim", { length: 50 }),
  status_log: varchar("status_log", { length: 50 }),
  status_kirim_log: varchar("status_kirim_log", { length: 1000 }),
  url_foto1: varchar("url_foto1", { length: 255 }),
  url_foto2: varchar("url_foto2", { length: 255 }),
  url_foto3: varchar("url_foto3", { length: 255 }),
  timestamp: datetime("timestamp"),
  alasan: varchar("alasan", { length: 255 }),
}, (table) => ({
  idxOffice: index("idxOffice").on(table.office),
}));

// Table: sec_users
exports.sec_users = mysqlTable("sec_users", {
  login: varchar("login", { length: 20 }).primaryKey(),
  pswd: varchar("pswd", { length: 255 }).notNull(),
  name: varchar("name", { length: 50 }),
  email: varchar("email", { length: 50 }),
  office: varchar("office", { length: 20 }),
  active: varchar("active", { length: 1 }),
  activation_code: varchar("activation_code", { length: 32 }),
  priv_admin: varchar("priv_admin", { length: 1 }),
});

// Table: sec_groups
exports.sec_groups = mysqlTable("sec_groups", {
  group_id: int("group_id").primaryKey().autoincrement(),
  description: varchar("description", { length: 255 }).unique(),
});

// Table: sec_users_groups
exports.sec_users_groups = mysqlTable("sec_users_groups", {
  login: varchar("login", { length: 20 }).notNull(),
  group_id: int("group_id").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.login, table.group_id] }),
}));

// Table: push_subscriptions
exports.push_subscriptions = mysqlTable("push_subscriptions", {
  id: int("id").primaryKey().autoincrement(),
  login: varchar("login", { length: 20 }).notNull(),
  endpoint: varchar("endpoint", { length: 500 }).notNull(),
  p256dh: varchar("p256dh", { length: 255 }).notNull(),
  auth: varchar("auth", { length: 255 }).notNull(),
  created_at: datetime("created_at"),
});
