# 🌾 TAWANGTANI

**Asisten Pertanian Digital Berbasis React Native + AI Agent**

Aplikasi mobile berbahasa Indonesia untuk membantu petani mengelola budidaya: AI Agent pertanian, cuaca & suhu, kalkulator pupuk/pestisida/grid, dan database produk pertanian.

## ✨ Fitur (MVP)

| Modul | Status | Deskripsi |
|---|---|---|
| AI Tani | ✅ | Chat asisten dengan pola **Agent + Tools** (`get_weather`, `fertilizer_calculator`, `pesticide_calculator`, `product_search`, `farm_context`, `activity_log`). Multi-sesi chat, mode diagnosis hama/penyakit, tombol aksi menuju kalkulator, konteks otomatis (lahan, umur & fase tanaman). Mode lokal berjalan tanpa backend; mendukung backend LLM via URL di Profil. |
| Diagnosis Foto | ✅* | Lampirkan foto tanaman → dikirim ke endpoint `/ai/vision` server Anda (*butuh backend; V1.5 penuh). |
| Cuaca & Suhu | ✅ | Open-Meteo (tanpa API key) + **cache lokal 30 menit**: suhu, kelembapan, hujan, angin, prakiraan per jam & 5 hari, indikator kondisi semprot, peringatan ekstrem. |
| Kalkulator Pupuk | ✅ | Luas (m²/are/ha) × dosis (kg/ha, g/m², dst.), pembagian per petak/grid, **metode aplikasi** (tabur/kocor/larut air), rumus ditampilkan. |
| Kalkulator Grid | ✅ | Luas dari **panjang × lebar**, pembagian petak, konversi m²/are/ha. |
| Kalkulator Pestisida | ✅ | mL/L, g/L, mL/ha, g/ha — pencarian produk (merek/bahan aktif/komoditas/target), kebutuhan per tangki & total, sumber dosis + tanggal pembaruan, peringatan APD/interval masuk kembali/pra-panen. |
| Konversi Satuan | ✅ | Luas, berat, volume. |
| Database Produk | ✅ | Merek, bahan aktif, formulasi, dosis + **sumber, tanggal pembaruan, status verifikasi**, dan **audit trail** perubahan data. Dapat diperbarui dari server tanpa update APK (`replaceAll` tercatat di audit). |
| Lahan & Tanaman | ✅ | Profil lahan, jenis/varietas, tanggal tanam, fase pertumbuhan → konteks AI. |
| Aktivitas & Reminder | ✅ | Jadwal budidaya (tanam/pemupukan/penyemprotan/panen/dll.) dengan **pengingat notifikasi lokal**, tampil di Beranda. |
| Riwayat | ✅ | Simpan hasil kalkulasi (pupuk, pestisida, grid, konversi) + metode aplikasi. |
| Auth | ✅ | Login & signup lokal (demo). Siap diganti Supabase/Firebase Auth. |
| Build APK | ✅ | Konfigurasi `eas.json` siap `eas build -p android --profile preview`. |

## 🔒 Prinsip Keselamatan

- **API key tidak pernah ditanam di APK** — AI/cuaca diproses melalui backend (URL dapat dikonfigurasi pengguna).
- AI dilarang mengarang dosis; kalkulasi kritis dilakukan tool terstruktur.
- Setiap data dosis memiliki sumber dan status verifikasi; pengguna diarahkan ke label resmi.

## 🚀 Menjalankan

### Aplikasi mobile

```bash
npm install
npx expo start
```

Scan QR dengan aplikasi **Expo Go** (Android/iOS).

### Backend (AI online + auth + katalog)

Lihat [`backend/README.md`](backend/README.md). Ringkas:

```bash
cd backend
cp .env.example .env   # isi OPENROUTER_API_KEY (gratis dari openrouter.ai)
npm install && npm run dev
```

Model LLM gratis via OpenRouter (Llama 3.3 70B, Gemini Flash, Qwen 2.5 — otomatis fallback). API key hanya tersimpan di server, tidak pernah masuk APK.

### Build APK Android

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview   # APK
eas build -p android --profile production # AAB (Play Store)
```

### Regenerasi Aset Ikon

```bash
npm run generate-assets
```

### Test

```bash
npm test
```

## 🗂 Struktur

```
src/
  components/       # Design System (Card, Button, Input, Screen, ResultCard)
  screens/
    home/ ai/ calculator/ weather/ farm/ products/ history/ profile/ auth/
  navigation/       # Bottom tabs (5) + native stack
  store/            # Zustand + persist AsyncStorage
  services/
    api/ ai/ weather/
  features/
    fertilizer/ pesticide/ farm/   # Pure functions + unit test
  hooks/ utils/ types/ constants/ theme/
```

## 🧮 Rumus Inti

```
kebutuhan pupuk    = luas lahan (ha) × dosis (kg/ha)
total air          = volume air (L/ha) × luas (ha)
jumlah tangki      = ceil(total air ÷ volume tangki)
produk per tangki  = dosis (mL/L atau g/L) × volume tangki
```

## 🛠 Teknologi

React Native (Expo SDK 50) • TypeScript • React Navigation • Zustand • Open-Meteo • Jest

## ⚠️ Disclaimer

Kalkulator adalah alat bantu, bukan pengganti label resmi, penyuluh, atau regulasi.
