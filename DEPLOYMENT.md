# RuangBaca: konfigurasi lokal dan produksi

## Menjalankan aplikasi

Salin `backend/.env.example` ke `backend/.env` dan `frontend/.env.example` ke `frontend/.env.local`, lalu sesuaikan API, database, dan alamat situs. Untuk migrasi database lokal, jalankan dari folder `backend`:

```powershell
php artisan migrate
php artisan storage:link
php artisan serve
```

Di terminal lain jalankan `npm run dev` dari `frontend`.

## Akun, email, dan kontak

Pendaftaran pembaca langsung mengaktifkan akun; verifikasi email sengaja tidak dipakai. Fitur reset password mengirim email, jadi SMTP harus disetel untuk menerima email sungguhan. Untuk Gmail, gunakan App Password Gmail (bukan password akun biasa) dan isi `.env` backend:

```dotenv
MAIL_MAILER=smtp
MAIL_SCHEME=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=alamatpengelola@gmail.com
MAIL_PASSWORD=app-password-gmail
MAIL_FROM_ADDRESS=alamatpengelola@gmail.com
MAIL_FROM_NAME="RuangBaca"
```

Jangan masukkan App Password ke source code, frontend, atau chat dan jangan commit `.env`. Hapus spasi saat menyalin App Password. Setelah mengubah `.env` pada server dengan config cache, jalankan `php artisan config:clear` lalu `php artisan config:cache`.

Isi `NEXT_PUBLIC_CONTACT_EMAIL` di `frontend/.env.local` untuk tautan kontak di halaman `/contact`; variabel publik ini hanya untuk alamat email yang memang boleh ditampilkan. Email pengirim SMTP hanya berada di backend.

## Perlindungan spam

Pendaftaran dan login dibatasi lima percobaan per menit; komentar dan laporan juga punya rate limit. CAPTCHA Cloudflare Turnstile bersifat opsional: buat widget di Cloudflare, lalu isi `NEXT_PUBLIC_TURNSTILE_SITE_KEY` pada environment frontend dan `TURNSTILE_SECRET_KEY` pada environment backend. Jika secret backend kosong, CAPTCHA tidak diwajibkan (cocok untuk lokal). Setelah kunci backend diisi, pendaftaran, login, serta pengiriman laporan mewajibkan token CAPTCHA yang valid. Jangan pernah menaruh secret pada variabel `NEXT_PUBLIC_*`.

## Gambar artikel dan media

Editor menyediakan tombol **Unggah gambar** untuk menyisipkan gambar langsung ke naskah; format yang didukung JPEG, PNG, WebP, dan GIF hingga 5 MB. Secara lokal gunakan `MEDIA_DISK=public` dan `php artisan storage:link`. Untuk produksi, gunakan storage persisten atau layanan objek (S3 kompatibel), atur backup/versioning untuk gambar, dan batasi kredensial pada server.

## Backup dan pemulihan database

Perintah manual dari folder `backend`:

```powershell
php artisan blog:backup
php artisan blog:restore nama-file-backup.sql
```

Backup disimpan di `backend/storage/app/private/backups`, tidak di direktori publik. Perintah pemulihan meminta konfirmasi dan membuat backup database yang sedang aktif terlebih dahulu. Untuk MySQL/MariaDB, hosting harus menyediakan `mysqldump` dan `mysql`; isi `MYSQLDUMP_BINARY`/`MYSQL_BINARY` jika executable tidak berada di PATH. SQLite dicadangkan sebagai salinan file database. Backup berumur lebih dari 30 hari dibersihkan saat backup baru berhasil dibuat.

Jadwal aplikasi sudah menjalankan backup setiap hari pukul 02.00. Agar jadwal bekerja, server Linux perlu memanggil Laravel Scheduler tiap menit melalui cron:

```cron
* * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1
```

Di Windows lokal, jalankan `php artisan schedule:work` terus-menerus, atau buat tugas Windows Task Scheduler yang menjalankan `php artisan schedule:run` setiap menit. Simpan salinan terenkripsi di lokasi terpisah/off-site; backup lokal saja tidak melindungi dari kerusakan atau kehilangan server. Sebelum peluncuran, lakukan uji restore terencana dan verifikasi backup media.

## Fitur publikasi

- Artikel publik memiliki tag, pratinjau metadata SEO, tautan kanonis, Open Graph, dan kartu Twitter.
- Halaman arsip mengelompokkan artikel terbit berdasarkan bulan dan tahun.
- Riwayat bacaan tersedia pada `/reading-history`; tautan berbagi tersedia pada halaman artikel.
- Komentar dan balasan masuk antrean moderasi terlebih dahulu.
- Artikel terbit baru masuk antrean admin. Pengajuan penulis juga memerlukan persetujuan.

## Produksi

- Gunakan HTTPS; atur `APP_URL`, `FRONTEND_URL`, dan `NEXT_PUBLIC_SITE_URL` ke domain produksi yang benar.
- Set `APP_ENV=production`, `APP_DEBUG=false`, gunakan secret manager untuk kredensial, lalu jalankan `php artisan config:cache`.
- Siapkan antrean pekerjaan persisten bila notifikasi/email dikirim melalui queue.
- Google OAuth belum dikonfigurasi. Aktifkan hanya setelah menyiapkan OAuth Client ID/Secret dan callback domain HTTPS.
- Jalankan pemeriksaan alur daftar, login, menulis, moderasi, reset password, unggah gambar, restore backup, dan hapus akun sebelum membuka situs untuk umum.
