# Dokumentasi TAWANGTANI

Kumpulan dokumen perencanaan, audit, dan arsitektur proyek. Dokumen audit di bawah
`audit/` merupakan **rekaman historis** dari lintasan kode pada saat ditulis (Ags-2026)
dan dapat menyebut masalah yang sudah diperbaiki — gunakan sebagai referensi konteks,
bukan sebagai status terkini. Status saat ini selalu tercermin di kode + CI (jest, `check:contract`,
e2e lintas repo).

## Struktur

- [implementation-plan-5features.md](./implementation-plan-5features.md) — rencana implementasi 5 fitur utama (harga, AI, widget, notifikasi, sinkronisasi).
- [price-flow.md](./price-flow.md) — alur data harga: sumber resmi, cron 2×/hari, crowd-sync perangkat, dan koreksi dari laporan petani.
- [architecture/](./architecture/) — peta migrasi, target arsitektur, urutan refactor yang aman, dan prioritas masalah.
- [audit/](./audit/) — hasil audit otomatis per domain: [FINAL-AUDIT.md](./audit/FINAL-AUDIT.md) (ringkasan), kontrak API, basis data, keamanan, state, tipe, pegawai, dan inventori berkas.

## Kontrak & Verifikasi

- Kontrak bersama backend↔frontend hidup di repo; `npm run check:contract` membandingkan versi paket
  dan skema penting (daftar komoditas, batas harga, kode provinsi, dll) antara backend dan aplikasi.
- Tes: `jest` (unit, preset jest-expo) untuk frontend, pengujian e2e via `backend/scripts/e2e.mjs`
  terhadap deploy Vercel (dijalankan GitHub Actions pada tiap push ke `main`).