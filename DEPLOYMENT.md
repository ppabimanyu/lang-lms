# 🚀 Panduan Deployment VPS - Lingua LMS

Dokumen ini menjelaskan panduan deployment **Lingua LMS** versi sederhana menggunakan **Docker Compose** (hanya 2 service: Backend di port **3000** & Frontend di port **3001**), dengan **Nginx & SSL (Let's Encrypt)** dikelola langsung di level sistem operasi host VPS.

---

## 🏗️ Arsitektur Sistem

```
                         [ Pengguna / Browser ]
                                   │
                                   ▼
             [ Host VPS: Nginx Reverse Proxy & SSL (Port 80 / 443) ]
                     │                                   │
       location /api/│                                   │location /
                     ▼                                   ▼
    [ Docker: lingua_backend ]              [ Docker: lingua_frontend ]
         (Port Host: 3000)                       (Port Host: 3001)
                 │
                 ▼
    [ Database PostgreSQL Eksternal / Cloud ]
```

| Komponen | Lingkungan | Port Host | Fungsi |
| :--- | :--- | :--- | :--- |
| **Nginx & Certbot** | Host VPS (Luar Docker) | `80`, `443` | Reverse proxy domain publik & SSL termination |
| **`lingua_frontend`** | Docker Container | `3001` | Menyajikan static files SPA Vue 3 via Nginx Alpine |
| **`lingua_backend`** | Docker Container | `3000` | REST API Node.js Express + Drizzle ORM |
| **PostgreSQL** | Eksternal / Cloud / Host | `5432` | Basis data utama via `DATABASE_URL` di `.env` |

---

## 📋 Prasyarat di VPS

- **OS**: Ubuntu 20.04 / 22.04 / 24.04 LTS (atau Debian).
- **Docker & Docker Compose** terpasang di VPS.
- **Nginx & Certbot** terpasang di host VPS (`sudo apt install nginx certbot python3-certbot-nginx`).
- **Domain**: A-Record domain (misal: `lms.domainanda.com`) sudah diarahkan ke IP publik VPS.
- **Firewall**: Port `22` (SSH), `80` (HTTP), dan `443` (HTTPS) terbuka.

---

## 🛠️ Langkah-Langkah Deployment

### 1. Clone Repositori ke VPS

```bash
cd ~
git clone <URL_REPOSITORI_ANDA> lang-lms
cd lang-lms
```

---

### 2. Konfigurasi File `.env`

Salin template `.env.example`:

```bash
cp .env.example .env
nano .env
```

Isi sesuai database PostgreSQL dan rahasia JWT Anda:

```env
# URL Database PostgreSQL Anda
DATABASE_URL=postgres://postgres:postgres@localhost/lang-lms

# Port & Keamanan
PORT=3000
NODE_ENV=production
JWT_SECRET=ganti_dengan_random_string_panjang_dan_rahasia_untuk_keamanan_jwt_token_2026
```

> **Catatan URL Encoding**: Jika password database Anda mengandung karakter `@`, gantikan dengan `%40` agar URL parsing valid.

---

### 3. Build & Jalankan Kontainer Docker

Jalankan perintah berikut untuk mengompilasi dan menyalakan container:

```bash
docker compose up -d --build
```

Container backend otomatis:
1. Menunggu database PostgreSQL siap menerima koneksi.
2. Menjalankan sinkronisasi skema tabel (`npm run db:push`).
3. Menjalankan server Express di port host `3000`.

Periksa apakah kedua container sudah aktif:

```bash
docker compose ps
```

Hasil yang diharapkan:
- `lingua_backend` -> `0.0.0.0:3000->3000/tcp` (Up)
- `lingua_frontend` -> `0.0.0.0:3001->80/tcp` (Up)

---

### 4. Migrasi Skema & Seeding Database

#### A. Migrasi Skema Tabel (`db:push`)
Lingua LMS menggunakan **Drizzle ORM** untuk manajemen database:
- **Otomatis**: Setiap kali kontainer `backend` menyala atau direstart (`docker compose up`), script `docker/backend-entrypoint.sh` secara otomatis menjalankan `npm run db:push` (`drizzle-kit push`). Skema tabel di database akan langsung sinkron dengan `server/db/schema.ts`.
- **Manual (Jika Dibutuhkan)**: Anda dapat memicu migrasi skema secara manual kapan saja tanpa perlu merestart kontainer:
  ```bash
  docker compose exec backend npm run db:push
  ```
- **Dari Laptop Lokal**: Anda juga bisa menjalankan `npm run db:push` dari laptop pengembang selama `.env` lokal mengarah ke `DATABASE_URL` yang sama.

#### B. Seeding Database (Mengisi Data Awal & Akun Default)
Proses seeding **hanya perlu dijalankan satu kali** saat pertama kali Anda menyiapkan server VPS:

```bash
docker compose exec backend npm run db:seed
```

Script seeding (`server/db/seed.ts`) akan menyiapkan:
1. **Akun Pengguna Default**:
   - 🛡️ **Administrator**: `admin@lingua.com` | Password: `admin123`
   - 📚 **Tim Kurikulum**: `kurikulum@lingua.com` | Password: `password123`
   - 🎓 **Murid Contoh**: `budi@lingua.com` | Password: `password123`
2. **Katalog Kursus Siap Pakai**:
   - Bahasa Jerman (A1 Beginner)
   - Bahasa Jepang (JLPT N5)
   - Bahasa Inggris Bisnis
3. **Materi Lengkap**: Bab materi interaktif, soal kuis pilihan ganda, dan kartu flashcard.

> ⚠️ **PERINGATAN**: Script `db:seed` dirancang untuk mengosongkan tabel sebelum mengisi data awal. **Jangan jalankan `db:seed` jika aplikasi sudah dipakai oleh siswa di tahap produksi**, karena progres belajar dan akun siswa akan terhapus.

---

### 5. Konfigurasi Nginx di Luar Docker (Host VPS)

Pasang Nginx di VPS jika belum terpasang:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

Salin template konfigurasi yang sudah disediakan di folder `nginx/`:

```bash
sudo cp nginx/lingua-lms.conf /etc/nginx/sites-available/lingua-lms.conf
```

Buka file konfigurasi dan ganti `YOUR_DOMAIN.com` dengan domain Anda:

```bash
# Ganti nama domain otomatis (contoh: lms.domainanda.com)
sudo sed -i 's/YOUR_DOMAIN.com/lms.domainanda.com/g' /etc/nginx/sites-available/lingua-lms.conf

# Atau edit manual dengan nano:
# sudo nano /etc/nginx/sites-available/lingua-lms.conf
```

Aktifkan konfigurasi Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/lingua-lms.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### 6. Pasang SSL Gratis (Let's Encrypt) dengan Certbot

Jalankan Certbot untuk secara otomatis menambahkan sertifikat HTTPS ke Nginx:

```bash
sudo certbot --nginx -d lms.domainanda.com
```

Ikuti petunjuk di layar:
1. Masukkan alamat email Anda untuk pemberitahuan sertifikat.
2. Setujui ketentuan layanan (*Agree to Terms*).
3. Certbot akan otomatis memverifikasi domain, memasang sertifikat SSL, dan mengarahkan semua lalu lintas HTTP ke HTTPS!

Aplikasi sekarang siap digunakan dan dapat diakses dengan aman di:
👉 **`https://lms.domainanda.com`**

---

## 🔄 Pemeliharaan & Operasional Harian

### 1. Cek Status & Logs Kontainer

```bash
# Cek container
docker compose ps

# Live logs
docker compose logs -f backend
docker compose logs -f frontend
```

### 2. Update Aplikasi (Deploy Versi Terbaru)

```bash
git pull origin main
docker compose up -d --build
```

### 3. Cek Status Nginx & Certbot di VPS Host

```bash
# Status Nginx
sudo systemctl status nginx

# Tes perpanjangan otomatis SSL
sudo certbot renew --dry-run
```
> Let's Encrypt akan diperbarui secara otomatis oleh `certbot.timer` bawaan sistem Ubuntu/Debian.

---

## ❓ Troubleshooting

| Gejala | Penyebab & Solusi |
| :--- | :--- |
| **Error 502 Bad Gateway** | Container Docker belum menyala. Cek dengan `docker compose ps` atau periksa port `3000` dan `3001`. |
| **API Error / Gagal Login** | Periksa `DATABASE_URL` di file `.env`. Pastikan database eksternal mengizinkan koneksi dari IP VPS Anda. Cek log backend: `docker compose logs backend`. |
| **Halaman blank / 404 saat refresh** | Nginx host harus memforward semua request frontend ke `http://127.0.0.1:3001/` (sudah ditangani oleh template `nginx/lingua-lms.conf`). |
