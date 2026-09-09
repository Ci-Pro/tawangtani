# Audit State & Sinkronisasi (Phase 7)

> **Ruang lingkup:** Seluruh store Zustand + persist dan layanan sinkronisasi offline.
> **File audit:** `src/store/useSettingsStore.ts`, `src/store/useProductStore.ts`, `src/store/useActivityStore.ts`, `src/store/useAuthStore.ts`, `src/store/useFarmStore.ts`, `src/store/useChatStore.ts`, `src/store/useHistoryStore.ts`, `src/services/offline.ts`, `src/services/chatSync.ts`, `src/services/farmSync.ts`, `src/services/catalogSync.ts`.
> **Status kesimpulan:** State lokal dengan persist AsyncStorage sudah konsisten dan berversi; kelemahan utama adalah sinkronisasi server yang "diam-diam" (silent catch) dan tidak adanya mekanisme conflict-resolution yang jelas.

---

## 1. Ringkasan Eksekutif

Tujuh store Zustand semuanya memakai `persist` + `createJSONStorage(() => AsyncStorage)` dengan kunci `twt-*`. Ini berarti setiap store **otomatis disimpan ke AsyncStorage** dan dipulihkan saat startup — desain yang sesuai untuk aplikasi offline-first. Sinkronisasi ke server bersifat **best-effort** dan hampir semuanya menelan kegagalan secara diam-diam, kecuali `farmSync` yang melempar error.

**Skor kesehatan keseluruhan: 7/10** — state lokal kuat; sinkronisasi lemah pada pelacakan kegagalan dan konflik.

---

## 2. Matriks Store

| Store | Kunci persist | Isi utama | Catatan |
|-------|--------------|-----------|---------|
| `useSettingsStore` | `twt-settings` | themeMode, backendUrl, locationName, coords, province, language | Pengaturan global non-akun |
| `useProductStore` | `twt-products` | products, audits, replaceAll, updateProduct, PRODUCT_SEED | Katalog di-seed lokal |
| `useActivityStore` | `twt-activities` | items, add, toggleDone, remove; reminder via expo-notifications | Aktivitas + jadwal |
| `useAuthStore` | *(tidak persist)* | user, ready, init, signIn, signUp, signOut; memanggil `syncFarmsToServer` | Sesuai sesi Supabase |
| `useFarmStore` | `twt-farms` | farms, activeFarmId, CRUD + CRUD tanaman | Data lahan |
| `useChatStore` | `twt-chat` | sessions, activeId, newSession, setActive, deleteSession, addUser, addAssistant; memanggil `syncChatSession` | Percakapan AI |
| `useHistoryStore` | `twt-history` | items, add, clear | Riwayat kalkulator |

> **Catatan:** `useAuthStore` sengaja **tidak persist** — ini benar, karena sesi dipegang oleh Supabase SDK (`supabase.auth.getSession()`). Menyimpan `user` di AsyncStorage akan menjadi sumber desinkronisasi.

---

## 3. Analisis per-Anatomi

### 3.1. Struktur Umum (Pola Baik)
- Semua store memakai **Zustand + persist**, bukan Context — efisien dan ideal untuk React Native.
- Pemulihan otomatis saat startup (`rehydrate`) membuat data offline langsung tampil.
- **Tidak ada store yang memakai `version`/`migrate`** dalam konfigurasi persist → perubahan bentuk skema di masa depan akan menyebabkan data lama tidak terbaca (hydrate error). Ini adalah temuan lintas store.

### 3.2. Sinkronisasi Chat (`chatSync.ts`)
- `syncChatSession()` POST ke `/api/chat/sync` dengan token Supabase.
- **Menelan semua error secara diam-diam** (`catch {}` dengan komentar). Tidak ada antrean ulang, tidak ada notifikasi pengguna, tidak ada retry.
- Hanya tersinkron saat panggilan eksplisit dari `useChatStore`; tidak ada estimasi offline → online.

### 3.3. Sinkronisasi Farm (`farmSync.ts`)
- `syncFarmsToServer()` POST `/api/farms/seed`.
- **Melempar error** (tidak diam) — dipanggil dengan `.catch(() => {})` dari `useAuthStore.init()`; jadi kegagalan tetap tak terlihat, namun pola ini lebih baik karena pemanggil tahu.
- Digunakan untuk sinkron satu arah (lokal → server) saat login.

### 3.4. Sinkronisasi Katalog (`catalogSync.ts`)
- `syncCatalog()` GET `/api/products`, `replaceAll`, throttle report 6 jam.
- Error **ditelan dengan `catch { return 0 }`** — tak ada indikasi ke pengguna.
- Throttle berbasis AsyncStorage key `catalog_last_sync`.

### 3.5. Antrean Offline (`offline.ts`)
- `twt_offline_queue` untuk item `report`/`alert`; cap 50 item.
- `processQueue()` mengirim dengan token sesi terbaru; **berhenti pada kegagalan pertama** (urutan terjaga).
- Cache umum `twt_cache_*` via `saveCache`/`loadCache`.
- **Semua fungsi memakai `try/catch {}` kosong** → kehilangan data diam-diam bila AsyncStorage gagal.

---

## 4. Temuan Utama

### 4.1. Konsistensi & Konflik

| # | Tingkat | Temuan | Lokasi |
|---|---------|--------|--------|
| S1 | **TINGGI** | Tidak ada **conflict resolution** antara data lokal & server. Contoh: `farmSync` menimpa server dengan data lokal utuh; `chatSync` menghapus lalu menyisipkan ulang seluruh pesan sesi (delete+insert) — bila dua perangkat sinkron, akan saling hapus menimpa. | farmSync.ts, chat.routes.ts:37 |
| S2 | **TINGGI** | `syncFarmsToServer` menimpa (seed-insert tanpa dedupe id) — setiap login ulang berpotensi menambah lahan kembar bila server sudah punya data (backend `seedFarmsFromLocal` meng-insert baru, tanpa upsert). | farms.ts:102 |
| S3 | **SEDANG** | Tidak ada `version`/`migrate` di persist store; perubahan skema data di masa depan akan merusak rehydrate. | semua `useXStore` |

### 4.2. Pelacakan Kegagalan & Retry

| # | Tingkat | Temuan | Lokasi |
|---|---------|--------|--------|
| S4 | **SEDANG** | Kegagalan sinkron chat/farm/katalog **ditelan diam-diam**; tidak ada indikator status (mis. badge "belum tersinkron") bagi pengguna. | chatSync.ts:32, catalogSync.ts:25 |
| S5 | **SEDANG** | `processQueue()` hanya memproses antrean saat dipanggil; tidak ada `NetInfo` listener otomatis → item antrean bisa menumpuk lama sebelum terkirim. | offline.ts:78 |
| S6 | **RENDAH** | Cap antrean 50 item; sisanya dibuang tanpa peringatan (data laporan harga bisa hilang). | offline.ts:70 |

### 4.3. Keamanan Data & Privasi

| # | Tingkat | Temuan | Lokasi |
|---|---------|--------|--------|
| S7 | **SEDANG** | AsyncStorage tidak dienkripsi; `twt-chat` menyimpan **transkrip percakapan**, `twt-farms` lokasi lahan — semua oleh aplikasi klien. Perangkat di-root/jailbreak dapat membaca. | semua persist store |
| S8 | **RENDAH** | Token Supabase disimpan oleh SDK di AsyncStorage (key supabase) — pola standar, namun rentan bila perangkat tidak aman. | (SDK internal) |
| S9 | **RENDAH** | `twt-settings` menyimpan `backendUrl` bebas — pengguna bisa mengarahkan ke server tidak tepercaya yang menipu AI (server AFK). Perlu validasi/whitelist host bila usernya bukan developer. | settingsStore |

### 4.4. Perilaku & Kebersihan

| # | Tingkat | Temuan | Lokasi |
|---|---------|--------|--------|
| S10 | **SEDANG** | `useChatStore` menyimpan seluruh riwayat percakapan tanpa batas ukuran; sesi besar memberatkan AsyncStorage & payload sync. | chatStore |
| S11 | **RENDAH** | `useHistoryStore` tanpa batas item; riwayat kalkulator tumbuh tanpa batas. | historyStore |
| S12 | **RENDAH** | Tidak ada pembersihan key cache lama (`twt_cache_*`) pada update aplikasi. | offline.ts |

---

## 5. Diagram Alur Sinkronisasi

```
[Login/Startup]
   useAuthStore.init()
       |-- supabase.auth.getSession() -> set user
       `-- onAuthStateChange(SIGNED_IN) -> syncFarmsToServer() --(throw)--> .catch(()=>{}) [silent]

[Chat]   addAssistant -> syncChatSession() --(catch{})--> [silent, no retry]
[Katalog]syncCatalog()  --(6h throttle)--> GET /api/products -> replaceAll --(catch ret 0)--> [silent]
[Report/Alert] enqueue() -> processQueue() --(NetInfo manual)--> POST --(stop on fail first)-->
```

**Garis merah:** Semua jalur sinkronisasi tidak memiliki umpan balik kegagalan ke UI dan tidak ada resolusi konflik antar-perangkat.

---

## 6. Rekomendasi Prioritas

1. **P0 (TINGGI):** Desain ulang `chatSync` & `farmSync` dengan strategi upsert/idempoten & timestamp (last-write-wins) + resolusi konflik yang eksplisit, bukan delete+insert.
2. **P0 (TINGGI):** Tambahkan NetInfo listener untuk memicu `processQueue()` otomatis saat kembali online.
3. **P1 (SEDANG):** Tambahkan `version` + `migrate` pada persist store agar evolusi skema aman.
4. **P1 (SEDANG):** Tampilkan status sinkronisasi (terkirim/gagal/antre) di UI; jangan semua diam-diam.
5. **P1 (SEDANG):** Batasi ukuran riwayat chat & history (mis. simpan N terbaru).
6. **P2 (RENDAH):** Dokumentasikan pertukaran data AsyncStorage & enkripsi bila menyimpan data sensitif.

---

## 7. Kesimpulan

State lokal dirancang *offline-first* dengan baik dan konsisten (persist+AsyncStorage untuk semua store kecuali auth yang ditangani Supabase). Kelemahan terbesar adalah layer sinkronisasi: **silent failure, tanpa retry otomatis, tanpa resolusi konflik, dan tanpa indikator kepada pengguna**. Prioritas perbaikan sebaiknya difokuskan pada ketahanan & transparansi sinkron antar-perangkat.
