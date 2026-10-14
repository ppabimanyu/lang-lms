# 🎓 Lingua LMS — Modern Language Learning Platform

Lingua LMS adalah aplikasi web pembelajaran bahasa mandiri (*Personal Language Learning Companion*) yang dibangun dengan **Vue 3**, **Vite**, **Tailwind CSS v4**, dan **shadcn-vue**.

Aplikasi ini mendukung pembacaan materi teori tata bahasa berbasis **Markdown (`.md`)** dan bank latihan soal interaktif berbasis **CSV (`.csv`)** dengan koreksi otomatis, audio pelafalan suara penutur asli (*Text-to-Speech*), toleransi pengetikan cerdas, serta pelacakan progres belajar.

---

## 📚 Buku Panduan Penggunaan Lengkap

Panduan terperinci mengenai format CSV, penulisan Markdown, integrasi TTS, dan pengelolaan data dapat Anda baca di:

👉 **[PANDUAN_PENGGUNAAN.md](file:///Users/ppa/Dev/lang-lms/PANDUAN_PENGGUNAAN.md)**

---

## ⚡ Fitur Utama

- **Pembaca Materi Markdown**: Render tabel tata bahasa rapi, badge warna gender Jerman (*der* biru, *die* merah, *das* hijau), dan tombol pintas langsung ke kuis latihan terkait.
- **3 Format Soal Latihan CSV**:
  1. `input`: Melengkapi kalimat rumpang manual (*fill-in-the-blank*).
  2. `choice`: Melengkapi kalimat pilihan ganda (*multiple-choice buttons*).
  3. `sentence`: Susun satu kalimat lengkap secara *hybrid* (*word tiles Duolingo-style* + tombol switch ketik bebas).
- **Arti / Terjemahan di Setiap Soal**: Terjemahan bahasa Indonesia selalu tampil jelas di bawah kalimat soal.
- **Audio TTS Bawaan (11 Bahasa)**: Mendukung pelafalan Jerman, Inggris US/UK, Prancis, Spanyol, Italia, Jepang, Korea, Mandarin, Belanda, dan Indonesia dengan pengatur kecepatan bicara (*0.75x*, *0.85x*, *1.0x*).
- **Mode Review Soal Salah**: Mengulang khusus soal yang tadi dijawab keliru di akhir kuis hingga tuntas 100%.
- **Gamifikasi Ringan**: Poin XP, akurasi %, streak belajar harian, dan animasi selebrasi *confetti*.
- **Client-Side & Offline-Ready**: Seluruh materi tersimpan aman di peramban (*LocalStorage*), dilengkapi fitur unduh template resmi dan cadangan data JSON.

---

## 🚀 Menjalankan Aplikasi Secara Lokal

```bash
# 1. Pasang dependensi
npm install

# 2. Jalankan server pengembangan
npm run dev

# 3. Bangun versi produksi
npm run build
npm run preview
```

Server pengembangan akan aktif di: **`http://localhost:5173/`**
