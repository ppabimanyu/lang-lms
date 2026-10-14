# 📖 Buku Panduan Penggunaan Lengkap: Lingua LMS

Selamat datang di **Lingua LMS**, platform pembelajaran bahasa mandiri (*Personal Language Learning Companion*) yang dirancang fleksibel, interaktif, dan berestetika modern.

Aplikasi ini memungkinkan Anda membaca materi tata bahasa berbasis **Markdown (`.md`)** dan berlatih soal interaktif berbasis **CSV (`.csv`)** dengan koreksi otomatis, audio pelafalan aksen penutur asli (*Text-to-Speech*), dan pelacakan progres belajar.

---

## 📑 Daftar Isi

1. [Cara Menjalankan Aplikasi](#1-cara-menjalankan-aplikasi)
2. [Alur Navigasi & Penggunaan Utama](#2-alur-navigasi--penggunaan-utama)
3. [Panduan Format Berkas CSV Soal Latihan](#3-panduan-format-berkas-csv-soal-latihan)
   - [Skema 6 Kolom Standar](#skema-6-kolom-standar)
   - [Format 1: Isian Rumpang Manual (`input`)](#format-1-isian-rumpang-manual-input)
   - [Format 2: Pilihan Ganda Rumpang (`choice`)](#format-2-pilihan-ganda-rumpang-choice)
   - [Format 3: Susun Kalimat Utuh (`sentence`)](#format-3-susun-kalimat-utuh-sentence)
   - [Tips Menulis di Microsoft Excel & Google Sheets](#tips-menulis-di-microsoft-excel--google-sheets)
4. [Panduan Penulisan Berkas Markdown Materi](#4-panduan-penulisan-berkas-markdown-materi)
   - [Header YAML Frontmatter](#header-yaml-frontmatter)
   - [Menghubungkan Materi dengan Kuis Terkait](#menghubungkan-materi-dengan-kuis-terkait)
   - [Tabel Tata Bahasa & Tips Callout](#tabel-tata-bahasa--tips-callout)
   - [Panduan Warna Gender Bahasa Jerman](#panduan-warna-gender-bahasa-jerman)
5. [Fitur Interaktif Latihan & Audio TTS](#5-fitur-interaktif-latihan--audio-tts)
   - [Audio Pelafalan Suara & 11 Pilihan Bahasa/Aksen](#audio-pelafalan-suara--11-pilihan-bahasaaksen)
   - [Pengatur Kecepatan Bicara (Speech Rate)](#pengatur-kecepatan-bicara-speech-rate)
   - [Pemeriksaan Jawaban Cerdas & Toleran](#pemeriksaan-jawaban-cerdas--toleran)
   - [Mode Review Soal yang Salah](#mode-review-soal-yang-salah)
   - [Sistem Poin XP & Streak Harian](#sistem-poin-xp--streak-harian)
6. [Pengelolaan Data, Cadangan & Reset](#6-pengelolaan-data-cadangan--reset)
   - [Mengunggah Berkas Baru](#mengunggah-berkas-baru)
   - [Mencadangkan & Memulihkan Data (JSON Backup)](#mencadangkan--memulihkan-data-json-backup)
   - [Mengembalikan ke Starter Pack Asli](#mengembalikan-ke-starter-pack-asli)
7. [Penyelesaian Masalah (Troubleshooting)](#7-penyelesaian-masalah-troubleshooting)

---

## 1. Cara Menjalankan Aplikasi

Aplikasi dibangun dengan arsitektur **Full-Stack Modern**:
- **Frontend**: Vue 3 + Vite + Tailwind CSS v4 + shadcn-vue + Lucide Icons.
- **Backend Service**: Node.js + Express.js + TypeScript.
- **Database & ORM**: PostgreSQL 16 (via Docker Compose) + Drizzle ORM.
- **Autentikasi**: JSON Web Token (JWT) + enkripsi password `bcryptjs`.
- **Dukungan Dual-Mode**: Terhubung otomatis ke PostgreSQL dengan fallback lokal seamless jika database offline.

### Menjalankan di Komputer Lokal

1. **Jalankan Database PostgreSQL (Docker Compose)**:
   ```bash
   docker compose up -d
   ```
   *Container `lang-lms-postgres` akan berjalan di latar belakang pada port `5432`.*

2. **Pasang Dependensi**:
   ```bash
   npm install
   ```

3. **Migrasi Skema & Seed Data Awal (Opsional / Pertama Kali)**:
   ```bash
   # Push skema tabel ke PostgreSQL
   npm run db:push

   # Isi starter pack (Akun demo, Materi Jerman A1, Soal Latihan & Pertanyaan)
   npm run db:seed
   ```

4. **Jalankan Frontend & Backend Sekaligus**:
   ```bash
   npm run dev:all
   ```
   *Atau jalankan secara terpisah:*
   - Backend API: `npm run server` (berjalan di `http://localhost:3001`)
   - Frontend Vite: `npm run dev` (berjalan di `http://localhost:5173`)

5. **Akses Aplikasi di Browser**:
   Buka `http://localhost:5173/`. Status koneksi *"PostgreSQL Terhubung"* akan muncul di bilah navigasi samping kiri.

### Akun Demo Bawaan
- **Email**: `demo@lingua.com`
- **Kata Sandi**: `password123`
*(Tersedia tombol 1-klik "Pakai Akun Demo" di jendela Masuk / Daftar)*

### Membangun Versi Produksi
```bash
npm run build
npm run preview
```


---

## 2. Alur Navigasi & Penggunaan Utama

Lingua LMS dilengkapi dengan bilah samping (*collapsible sidebar*) di sisi kiri:

- **Dashboard**: Halaman ringkasan aktivitas, jumlah *streak* hari berturut-turut, total skor XP, kartu pintas modul, dan riwayat latihan terakhir.
- **Modul Materi**: Katalog catatan teori tata bahasa berbasis Markdown. Anda dapat membaca materi, mendengarkan pelafalan judul, dan langsung mengklik tombol *"Mulai Latihan Topik Ini"*.
- **Bank Latihan**: Daftar paket soal latihan interaktif berbasis CSV. Menampilkan jumlah soal, tingkat kesulitan, dan tombol untuk memulai sesi kuis.
- **Impor & Kelola File**: Tempat mengunggah berkas `.md` atau `.csv` baru, mengunduh template contoh, melihat daftar konten tersimpan, serta melakukan *backup/restore*.
- **Pengaturan Audio & Aksen** *(Kiri Bawah)*: Mengganti bahasa sasaran (11 pilihan bahasa) dan mengatur kecepatan suara (*0.75x*, *0.85x*, *1.0x*).
- **Toggle Mode Gelap/Terang** *(Kiri Bawah)*: Mengganti tema visual antarmuka agar nyaman di mata.

---

## 3. Panduan Format Berkas CSV Soal Latihan

Berkas latihan soal menggunakan format **Comma-Separated Values (`.csv`)** standar.

### Skema 6 Kolom Standar

Baris pertama berkas CSV **wajib** berupa header kolom berikut:

```csv
type,question,answer,options,translation,explanation
```

| Nama Kolom | Wajib? | Keterangan | Contoh |
| :--- | :---: | :--- | :--- |
| `type` | Ya | Tipe soal: `input`, `choice`, atau `sentence` | `choice` |
| `question` | Ya | Teks soal. Berikan tanda `___` untuk bagian rumpang | `Das ist ___ Mann.` |
| `answer` | Ya | Kunci jawaban yang tepat | `ein` |
| `options` | Kondisional | Pilihan jawaban dipisah tanda pipa `\|`. Wajib untuk tipe `choice`. | `ein\|eine\|einen\|einer` |
| `translation` | Ya | Terjemahan / arti kalimat dalam Bahasa Indonesia | `Itu adalah seorang pria.` |
| `explanation` | Opsional | Tips penjelasan tata bahasa saat jawaban diperiksa | `Mann adalah kata benda maskulin (Nominativ).` |

---

### Format 1: Isian Rumpang Manual (`input`)

Pengguna diminta mengetik kata yang tepat pada kalimat rumpang.

- Kolom `type`: isi dengan `input`
- Kolom `question`: gunakan tanda `___` (3 garis bawah) pada posisi kata yang diisi
- Kolom `options`: biarkan kosong

```csv
input,Ich gehe in ___ Schule.,die,,Saya pergi ke sekolah.,"Schule adalah kata benda feminin (die Schule)."
```

---

### Format 2: Pilihan Ganda Rumpang (`choice`)

Pengguna memilih satu opsi yang benar dari beberapa tombol pilihan.

- Kolom `type`: isi dengan `choice`
- Kolom `question`: gunakan tanda `___` untuk bagian rumpang
- Kolom `options`: tuliskan opsi-opsi yang dipisahkan tanda `|` (misal: `der|die|das|den`)

```csv
choice,Das ist ___ Apfel.,"ein","ein|eine|einen|einem",Itu adalah sebuah apel.,"Apfel adalah maskulin (der Apfel) dalam kasus Nominativ."
```

> [!TIP]
> Jika kunci jawaban di kolom `answer` lupa Anda masukkan ke kolom `options`, sistem akan otomatis menyisipkannya sehingga soal tetap valid!

---

### Format 3: Susun Kalimat Utuh (`sentence`)

Pengguna menyusun kalimat utuh menggunakan kepingan kata acak (*word tiles* ala Duolingo) atau mengetik kalimat lengkap secara bebas.

- Kolom `type`: isi dengan `sentence`
- Kolom `question`: tuliskan kalimat target yang benar
- Kolom `answer`: tuliskan kalimat lengkap yang sama persis
- Kolom `options`: biarkan kosong

```csv
sentence,Ich trinke jeden Morgen Kaffee.,Ich trinke jeden Morgen Kaffee.,,Saya minum kopi setiap pagi.,"Pola kalimat Jerman: Subjek + Verba + Waktu + Objek."
```

---

### Contoh Berkas CSV Lengkap (Siap Disalin)

Simpan teks di bawah ini ke dalam berkas bernama `latihan_dasar.csv`:

```csv
type,question,answer,options,translation,explanation
choice,Das ist ___ Mann.,"ein","ein|eine|einen|einer",Itu adalah seorang pria.,"Mann adalah kata benda maskulin (der Mann) dalam kasus Nominativ."
input,Ich gehe heute in ___ Schule.,die,,Saya pergi ke sekolah hari ini.,"Schule adalah kata benda bergender feminin (die Schule)."
sentence,Das Kind liest ein Buch.,Das Kind liest ein Buch.,,Anak itu sedang membaca sebuah buku.,"Pola kalimat dasar: Subjek + Kata Kerja + Objek."
choice,Er kauft ___ Apfel auf dem Markt.,"einen","ein|eine|einen|einem",Dia membeli apel di pasar.,"Apfel bergender maskulin, berubah menjadi einen dalam kasus Akkusativ."
input,Wir ___ heute zusammen Deutsch.,lernen,,Kami belajar bahasa Jerman bersama hari ini.,"Konjugasi kata kerja lernen untuk subjek wir adalah lernen."
```

---

### Tips Menulis di Microsoft Excel & Google Sheets

1. Buat 6 kolom dengan urutan: `type`, `question`, `answer`, `options`, `translation`, `explanation`.
2. Jika ada kalimat yang mengandung tanda koma, jangan khawatir — saat Anda memilih **File > Save As / Download > Comma Separated Values (.csv)**, Excel dan Google Sheets otomatis membungkus sel tersebut dengan tanda petik `""`.
3. Gunakan tanda pipa `|` (tombol `Shift + \` di atas Enter) untuk memisahkan pilihan di kolom `options`.

---

## 4. Panduan Penulisan Berkas Markdown Materi

Materi pembelajaran menggunakan format teks **Markdown (`.md`)** standar dengan blok metadata di bagian paling atas (*YAML Frontmatter*).

### Header YAML Frontmatter

Tuliskan metadata di baris paling atas diapit tanda tiga strip `---`:

```markdown
---
id: modul-jerman-artikel
title: Mengenal Artikel Der, Die, Das
level: A1
category: Grammatik
quizId: quiz-german-artikel
targetLanguage: de-DE
description: Panduan memahami gender kata benda maskulin, feminin, dan netral bahasa Jerman.
---
```

| Bidang | Fungsi |
| :--- | :--- |
| `id` | Pengenal unik modul materi (opsional, otomatis dibuat jika kosong) |
| `title` | Judul materi yang ditampilkan di kartu dan halaman modul |
| `level` | Tingkat kemahiran (contoh: `A1`, `A2`, `B1`, `Umum`) |
| `category` | Kategori materi (contoh: `Grammatik`, `Kosakata`, `Percakapan`) |
| `quizId` | ID paket kuis CSV terkait untuk menampilkan tombol jalan pintas |
| `targetLanguage` | Kode bahasa audio pelafalan (contoh: `de-DE`, `en-US`, `fr-FR`) |
| `description` | Penjelasan ringkas modul materi |

---

### Menghubungkan Materi dengan Kuis Terkait

Agar tombol **"Mulai Latihan Topik Ini"** muncul otomatis di bilah atas dan di bawah catatan materi Anda:
- Pastikan nilai `quizId` pada materi Markdown sama dengan ID kuis CSV Anda, **atau**
- Kuis default yang disertakan starter pack:
  * `quiz-german-artikel` — Latihan Artikel
  * `quiz-german-praesens` — Latihan Konjugasi Präsens
  * `quiz-german-akkusativ` — Latihan Kasus Akkusativ

---

### Tabel Tata Bahasa & Tips Callout

Lingua LMS memformat tabel tata bahasa dan blok kutipan secara otomatis agar berpenampilan modern:

```markdown
## Tabel Deklinasi Artikel

| Kasus | Maskulin | Feminin | Netral | Jamak |
|---|---|---|---|---|
| **Nominativ** | der / ein | die / eine | das / ein | die / - |
| **Akkusativ** | den / einen | die / eine | das / ein | die / - |

> **Tips Cepat**: Kata benda berakhiran **-ung**, **-heit**, **-keit** selalu feminin (*die*).
```

---

### Panduan Warna Gender Bahasa Jerman

Pada pembaca materi Jerman, aplikasi menyediakan pedoman warna standar:
- 🔵 **der** (Maskulin / Biru)
- 🔴 **die** (Feminin / Merah-Rose)
- 🟢 **das** (Netral / Hijau-Emerald)

---

## 5. Fitur Interaktif Latihan & Audio TTS

### Audio Pelafalan Suara & 11 Pilihan Bahasa/Aksen

Aplikasi menggunakan **Web Speech API** yang berjalan langsung di peramban Anda tanpa memerlukan koneksi ke server pihak ketiga atau kuota API key berbayar.

Daftar bahasa yang didukung:
- 🇩🇪 **Jerman** (`de-DE`) *(Bawaan)*
- 🇺🇸 **Inggris (US)** (`en-US`)
- 🇬🇧 **Inggris (UK)** (`en-GB`)
- 🇫🇷 **Prancis** (`fr-FR`)
- 🇪🇸 **Spanyol** (`es-ES`)
- 🇮🇹 **Italia** (`it-IT`)
- 🇯🇵 **Jepang** (`ja-JP`)
- 🇰🇷 **Korea** (`ko-KR`)
- 🇨🇳 **Mandarin** (`zh-CN`)
- 🇳🇱 **Belanda** (`nl-NL`)
- 🇮🇩 **Indonesia** (`id-ID`)

**Cara Mengganti Bahasa & Aksen:**
1. Klik tombol bendera bahasa di bilah samping kiri bawah, **atau**
2. Klik *badge* aksen di bilah atas saat sedang membaca materi atau mengerjakan kuis (misal `[🇩🇪 de-DE (0.85x)]`).
3. Pilih bahasa yang diinginkan dan klik **"Coba Suara"** untuk mendengarkan contoh pelafalan.
4. Klik **"Simpan & Tutup"**.

### Pengatur Kecepatan Bicara (Speech Rate)
- **`0.75x` (Lambat)**: Direkomendasikan bagi pemula yang sedang melatih artikulasi fonetik kata baru.
- **`0.85x` (Nyaman)**: Rekomendasi seimbang antara kejelasan artikulasi dan tempo natural.
- **`1.0x` (Normal)**: Kecepatan wajar penutur asli dalam percakapan sehari-hari.

---

### Pemeriksaan Jawaban Cerdas & Toleran

Sistem pengecekan jawaban dirancang tidak kaku (*forgiving learner check*):
- Mengabaikan perbedaan spasi ganda.
- Mengabaikan tanda baca penutup seperti titik (`.`), tanda tanya (`?`), atau tanda seru (`!`).
- Toleran terhadap huruf kapital/kecil (tetap menampilkan ejaan baku yang tepat di kunci jawaban).

---

### Mode Review Soal yang Salah

Jika Anda menjawab keliru pada beberapa soal dalam satu sesi latihan:
1. Di layar hasil akhir, tombol oranye **"Review X Soal yang Salah"** akan muncul.
2. Mengklik tombol ini akan membuka sesi khusus yang **hanya berisi soal-soal yang tadi dijawab salah**.
3. Ini memungkinkan Anda fokus mengulang materi yang belum dikuasai hingga memperoleh akurasi 100%!

---

### Sistem Poin XP & Streak Harian

- Setiap jawaban benar memberikan **+15 XP**.
- Menyelesaikan sesi latihan dengan akurasi 100% memberikan bonus **+50 XP** dan hujan selebrasi *confetti*.
- Konsistensi belajar harian otomatis menambah hitungan **Streak Hari**.

---

## 6. Pengelolaan Data, Cadangan & Reset

Masuk ke menu **"Impor & Kelola File"** di bilah samping:

### Mengunggah Berkas Baru
1. Buka tab **Unggah File**.
2. Tarik (*drag*) berkas `.csv`, `.md`, atau `.json` ke dalam area bergaris putus-putus, atau klik tombol **"Pilih File dari Komputer"**.
3. Sistem akan memverifikasi berkas secara langsung dan menampilkan pesan sukses beserta jumlah baris yang berhasil diimpor.

### Mengunduh Berkas Template
Pada tab **Unggah File**, tersedia 2 tombol:
- **Unduh Contoh Template CSV** — mengunduh `template_latihan_soal.csv`.
- **Unduh Contoh Template MD** — mengunduh `template_materi_belajar.md`.

### Mencadangkan & Memulihkan Data (JSON Backup)
- Klik tombol **"Cadangkan Data"** di pojok kanan atas halaman Impor untuk mengunduh satu berkas `.json` berisi seluruh materi, bank soal, dan riwayat belajar Anda.
- Untuk memulihkan data di komputer/peramban lain, cukup unggah berkas `.json` tersebut ke area unggah file.

### Mengembalikan ke Starter Pack Asli
Buka tab **Template & Opsi**, lalu klik tombol merah **"Kembalikan ke Starter Data"** jika Anda ingin mengembalikan pustaka materi ke set bawaan Bahasa Jerman A1.

---

## 7. Penyelesaian Masalah (Troubleshooting)

| Masalah | Penyebab Umum | Solusi |
| :--- | :--- | :--- |
| **Suara TTS tidak bersuara sama sekali** | Peramban memblokir audio otomatis atau sistem belum mengunduh paket suara bahasa tersebut. | Pastikan volume komputer menyala dan klik tombol "Coba Suara" di menu Pengaturan Audio. Di Windows/Mac, pastikan paket bahasa (misal Jerman/Prancis) terpasang di OS. |
| **Gagal mengimpor berkas CSV** | Header kolom tidak sesuai atau kolom `question`/`answer` kosong. | Pastikan baris pertama berisi `type,question,answer,options,translation,explanation` dan pisahkan pilihan ganda dengan `\|`. |
| **Soal kalimat tersusun tapi tidak bisa diperiksa** | Kepingan kata belum dipilih atau kotak isian masih kosong. | Klik minimal satu kepingan kata atau ketik kalimat di kolom isian sebelum mengklik tombol "Periksa Jawaban". |
| **Data hilang saat berpindah peramban** | Data tersimpan di *LocalStorage* peramban lokal. | Gunakan fitur **"Cadangkan Data"** untuk mengekspor berkas JSON, lalu unggah di peramban yang baru. |

---

*Lingua LMS — Belajar bahasa secara terstruktur, mandiri, dan menyenangkan.*
