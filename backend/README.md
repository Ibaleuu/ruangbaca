<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Alur akun RuangBaca

1. Pengunjung mendaftar di `/register` dengan nama, email, dan password. Akun langsung aktif dengan peran `reader` dan pengguna masuk otomatis.
2. Pembaca yang ingin menulis membuka **Jadi penulis**, melengkapi nama pena, nomor telepon, dan bio. Pengajuannya berstatus `pending` sampai admin meninjau.
3. Admin menyetujui atau menolak pengajuan di `/admin/moderation`. Persetujuan mengubah peran akun menjadi `writer`; penulis dapat membuat artikel, dan artikel terbit masuk antrean moderasi.

### Mengirim email reset password lewat Gmail

Pendaftaran tidak memerlukan email verifikasi. Fitur reset password tetap mengirim email. Secara bawaan, `.env.example` menggunakan `MAIL_MAILER=log`, sehingga email reset dicatat ke log Laravel dan tidak dikirim ke Gmail. Untuk pengiriman sungguhan, aktifkan verifikasi 2 langkah pada akun Google, buat **App Password**, kemudian isi konfigurasi berikut di `backend/.env` (jangan commit atau membagikan App Password):

```dotenv
APP_URL=http://localhost
FRONTEND_URL=http://localhost:3000
MAIL_MAILER=smtp
MAIL_SCHEME=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=alamat-gmail-pengirim@gmail.com
MAIL_PASSWORD=app-password-google
MAIL_FROM_ADDRESS=alamat-gmail-pengirim@gmail.com
MAIL_FROM_NAME="RuangBaca"
```

Setelah mengubah `.env`, jalankan `php artisan config:clear` di folder `backend`. Untuk tautan reset yang dibuka dari komputer lain, `APP_URL` dan `FRONTEND_URL` harus memakai alamat server yang dapat dijangkau perangkat tersebut; `localhost` hanya menunjuk ke komputer yang sedang membuka tautan.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework. You can also check out [Laravel Learn](https://laravel.com/learn), where you will be guided through building a modern Laravel application.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the [Laravel Partners program](https://partners.laravel.com).

### Premium Partners

- **[Vehikl](https://vehikl.com)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Redberry](https://redberry.international/laravel-development)**
- **[Active Logic](https://activelogic.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
