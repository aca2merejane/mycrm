CREATE TABLE `akun` (
	`coa` varchar(255) NOT NULL,
	`perkiraan` varchar(255),
	`defaul` varchar(255),
	`group` varchar(255),
	`kelompok` varchar(255),
	CONSTRAINT `akun_coa` PRIMARY KEY(`coa`)
);
--> statement-breakpoint
CREATE TABLE `carabayar` (
	`bayar_id` varchar(255) NOT NULL,
	`tipe_bayar` varchar(255),
	`cara_bayar` varchar(255),
	`office` varchar(255),
	`on_off` varchar(255),
	`akun` varchar(255),
	CONSTRAINT `carabayar_bayar_id` PRIMARY KEY(`bayar_id`)
);
--> statement-breakpoint
CREATE TABLE `dataqurban` (
	`detail_id` varchar(100) NOT NULL,
	`trans_id` varchar(100),
	`donaturid` varchar(20),
	`donatur` varchar(100),
	`hpdonatur` varchar(20),
	`produk` varchar(100),
	`price` varchar(20),
	`qty` varchar(20),
	`sub_total` varchar(20),
	`tgl` date,
	`sdana` varchar(50),
	`sproduk` varchar(50),
	`cara_bayar` varchar(50),
	`notes` varchar(255),
	`keterangan` varchar(500),
	`bukti` varchar(100),
	`status` varchar(50),
	`user` varchar(50),
	`office` varchar(50),
	`waapi` varchar(100),
	`distribusi` varchar(50),
	`pic_lapangan` varchar(50),
	`foto1` varchar(100),
	`foto2` varchar(100),
	`foto3` varchar(100),
	`status_kirim` varchar(50),
	`status_log` varchar(50),
	`status_kirim_log` varchar(1000),
	`url_foto1` varchar(255),
	`url_foto2` varchar(255),
	`url_foto3` varchar(255),
	`timestamp` datetime,
	`alasan` varchar(255),
	CONSTRAINT `dataqurban_detail_id` PRIMARY KEY(`detail_id`)
);
--> statement-breakpoint
CREATE TABLE `detail` (
	`detail_id` varchar(255) NOT NULL,
	`trans_id` varchar(255),
	`produk` varchar(255),
	`price` bigint,
	`qty` int,
	`sub_total` bigint,
	`keterangan` varchar(500),
	CONSTRAINT `detail_detail_id` PRIMARY KEY(`detail_id`)
);
--> statement-breakpoint
CREATE TABLE `don_rutin` (
	`rutinid` varchar(255) NOT NULL,
	`donatur_id` varchar(100),
	`produk` varchar(255),
	`price` int,
	`qty` int,
	`sub_total` int,
	CONSTRAINT `don_rutin_rutinid` PRIMARY KEY(`rutinid`)
);
--> statement-breakpoint
CREATE TABLE `donatur` (
	`donatur_id` varchar(100) NOT NULL,
	`tipe_donatur` varchar(100),
	`source` varchar(50),
	`sapaan` varchar(50),
	`nama` varchar(100),
	`alamat` varchar(255),
	`email` varchar(100),
	`no_hp` varchar(20),
	`kelamin` varchar(10),
	`tgl_lahir` date,
	`d_tipe` varchar(20),
	`c_bayar` varchar(100),
	`kolektor` varchar(50),
	`marketer` varchar(50),
	`nilai_donasi` decimal(10,2),
	`office` varchar(20),
	`status` varchar(20),
	`status_notes` varchar(255),
	`tgl_reg` date,
	`npwz` varchar(50),
	`npwp` varchar(50),
	CONSTRAINT `donatur_donatur_id` PRIMARY KEY(`donatur_id`)
);
--> statement-breakpoint
CREATE TABLE `jurnal` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jurnalid` varchar(255),
	`transid` varchar(255),
	`tgl` date,
	`office` varchar(20),
	`dana` varchar(20),
	`produk` varchar(255),
	`keterangan` varchar(255),
	`perkiraan` varchar(20),
	`debit` decimal(12,2),
	`kredit` decimal(12,2),
	`grup` varchar(20),
	`kelompok` varchar(20),
	`posttime` datetime,
	`user` varchar(20),
	`cbayar` varchar(50),
	`pic` varchar(20),
	`marketer` varchar(50),
	`kolektor` varchar(50),
	`iddonatur` varchar(50),
	CONSTRAINT `jurnal_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `produk` (
	`produk_id` varchar(255) NOT NULL,
	`dana` varchar(255),
	`produk` varchar(255) NOT NULL,
	`price` int,
	`aktif` varchar(1),
	`akun` varchar(20),
	`akun_amil` varchar(20),
	`akun_salur` varchar(20),
	`hak_amil` decimal(10,3),
	CONSTRAINT `produk_produk_id` PRIMARY KEY(`produk_id`)
);
--> statement-breakpoint
CREATE TABLE `sec_groups` (
	`group_id` int AUTO_INCREMENT NOT NULL,
	`description` varchar(255),
	CONSTRAINT `sec_groups_group_id` PRIMARY KEY(`group_id`),
	CONSTRAINT `sec_groups_description_unique` UNIQUE(`description`)
);
--> statement-breakpoint
CREATE TABLE `sec_users` (
	`login` varchar(20) NOT NULL,
	`pswd` varchar(10) NOT NULL,
	`name` varchar(50),
	`email` varchar(50),
	`office` varchar(20),
	`active` varchar(1),
	`activation_code` varchar(32),
	`priv_admin` varchar(1),
	CONSTRAINT `sec_users_login` PRIMARY KEY(`login`)
);
--> statement-breakpoint
CREATE TABLE `sec_users_groups` (
	`login` varchar(20) NOT NULL,
	`group_id` int NOT NULL,
	CONSTRAINT `sec_users_groups_login_group_id_pk` PRIMARY KEY(`login`,`group_id`)
);
--> statement-breakpoint
CREATE TABLE `tbl_office` (
	`officeid` varchar(11) NOT NULL,
	`kantor` varchar(255),
	`kota` varchar(255),
	`alamat` varchar(255),
	`wa_api` varchar(255),
	`wa_prodaya` varchar(255),
	CONSTRAINT `tbl_office_officeid` PRIMARY KEY(`officeid`)
);
--> statement-breakpoint
CREATE TABLE `transaksi` (
	`trans_id` varchar(50) NOT NULL,
	`id_rutin` varchar(50),
	`tgl` date,
	`cara_bayar` varchar(50),
	`donatur` varchar(50),
	`keterangan` varchar(50),
	`bukti` varchar(100),
	`status` varchar(20),
	`status_notes` varchar(100),
	`user` varchar(20),
	`total_donasi` bigint,
	`date_insert` datetime,
	`office` varchar(11),
	`bukti_donasi` varchar(100),
	`url_bukti` varchar(100),
	`posting_date` varchar(20),
	CONSTRAINT `transaksi_trans_id` PRIMARY KEY(`trans_id`)
);
--> statement-breakpoint
CREATE INDEX `idxOffice` ON `dataqurban` (`office`);--> statement-breakpoint
CREATE INDEX `idx_detail_trans_id` ON `detail` (`trans_id`);--> statement-breakpoint
CREATE INDEX `idx_transaksi_trans_id` ON `transaksi` (`trans_id`);