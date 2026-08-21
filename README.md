# 🌾 TAWANGTANI

**Asisten Pertanian Digital Berbasis React Native + AI Agent**

Aplikasi mobile berbahasa Indonesia untuk membantu petani mengelola budidaya: AI Agent pertanian, cuaca & suhu, kalkulator pupuk/pestisida/grid, dan database produk pertanian.

## ✨ Fitur (MVP)

| Modul | Status | Deskripsi |
|---|---|---|
| AI Tani | ✅ | Chat asisten dengan pola **Agent + Tools** (`get_weather`, `fertilizer_calculator`, `pesticide_calculator`, `product_search`, `farm_context`, `activity_log`). Mode lokal berjalan tanpa backend; mendukung backend LLM via URL yang diatur di Profil. |
| Cuaca & Suhu | ✅ | Data Open-Meteo (tanpa API key): suhu, kelembapan, hujan, angin, prakiraan per jam & 5 hari, indikator kondisi semprot, peringatan cuaca ekstrem. |
| Kalkulator Pupuk | ✅ | Luas (m²/are/ha) × dosis (kg/ha, g/m², dst.), pembagian per petak/grid, rumus ditampilkan. |
| Kalkulator Pestisida | ✅ | mL/L, g/L, mL/ha, g/ha — kebutuhan per tangki & total, peringatan APD/interval masuk kembali/pra-panen. |
| Konversi Satuan | ✅ | Luas, berat, volume. |
| Database Produk | ✅ | Merek, bahan aktif, formulasi, dosis + sumber & status verifikasi. Dapat diperbarui dari server tanpa update APK. |
| Lahan & Tanaman | ✅ | Profil lahan, jenis/varietas, tanggal tanam, fase pertumbuhan → konteks AI. |
| Riwayat | ✅ | Simpan hasil kalkulasi. |
| Auth | ✅ | Login & signup lokal (demo). Siap diganti Supabase/Firebase Auth. |

## 🔒 Prinsip Keselamatan

- **API key tidak pernah ditanam di APK** — AI/cuaca diproses melalui backend (URL dapat dikonfigurasi pengguna).
- AI dilarang mengarang dosis; kalkulasi kritis dilakukan tool terstruktur.
- Setiap data dosis memiliki sumber dan status verifikasi; pengguna diarahkan ke label resmi.

## 🚀 Menjalankan

```bash
npm install
npx expo start
```

Scan QR dengan aplikasi **Expo Go** (Android/iOS).

### Build APK Android

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
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
