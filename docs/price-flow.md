# Alur Data Harga (Harga & Lapor Harga)

Dokumen satu halaman: dari mana harga berasal, bagaimana diperbarui, dan ke mana laporan petani mengalir.

## 1. Sumber resmi

| Sumber | Endpoint | Peran |
| --- | --- | --- |
| Panel Harga Kementan (PIHPS) | `app3.pertanian.go.id/panelharga/export_harian_excel.php` | HTML resmi per provinsi × 3 tingkat (1=Produsen, 2=Grosir, 3=Konsumen); ±28 komoditas inti |
| SP2KP Kemendag | `api-sp2kp.kemendag.go.id/report/api/average-price-public` | JSON resmi, terbuka dari cloud, harian; >50 komoditas + grade varian |
| Laporan petani | `farmer_prices` (RLS, butuh login) | Sumber sekunder / koreksi harga bila resmi basi |

## 2. Alur penyegaran resmi (realtime ≈ 2×/hari)

```
Vercel cron "0 6,18 * * *"  ──▶  POST /api/market/sync-cron  (Bearer CRON_SECRET)
        │
        └── runUpstreamSync()
             1. PIHPS: panen nasional + 38 provinsi × 3 tingkat (konkurensi 5, retry 3×)
                   sanitize → banding → prev_price/price → upsert market_prices
                   harga tak berubah tetap di-"touch" (updated_at) agar freshness jujur
             2. SP2KP: table harga rata-rata per kabupaten/provinsi (page kecil 400 utk
                   tahan jaringan lintas benua) → pilih varian prioritas → upsert + riwayat
                   komoditas tanpa baris nasional → nasional = median harga semenjak
                   provinsi, bila baris nasional basi/absent
             3. snapshotToday(provinsi) → market_price_history (idempoten per tanggal)
             4. writeSyncHealth → tabel sync_health (dashboard admin)
```

Cadangan: `POST /api/market/sync` (token admin, manual).

## 3. Crowd-sync perangkat (menembus WAF)

Situs Kementan hanya memblokir IP cloud (Vercel/Supabase), bukan IP seluler petani.
Oleh karena itu layar Harga juga menyumbang data:

```
MarketScreen dibuka
   → saveProvinceDataAge(ageHours)   (umur data dari /api/market/prices)
   → syncHargaJikaPerlu():
        data segar (<24 jam)  → tunggu 20 jam
        data basi  (>=24 jam) → tarik ulang tiap 1 jam  (throttle adaptif)
   → fetchKemtanPrices(provinsi) → POST /api/market/ingest
```

## 4. Laporan petani → koreksi harga resmi

```
USER:  Lapor Harga Nyata (komoditas, jual/beli, harga, desa)
        │
        ├─ Moderasi otomatis: rasio 0,4–2,5× harga referensi → approved; di luar itu pending
        │
        ├─ (approved)  mergeFarmerReference(commodity, province)
        │     • ambil laporan approved 7 hari terakhir min. 2 data
        │     • median jual  → level 1,  median beli → level 3
        │     • hanya dipakai bila referensi PIHPS basi (>24 jam) atau belum ada
        │     • sumber diberi label  "farmer:verified"
        │
        └─ (pending)  moderator admin   →
             POST /api/admin/farmer-prices/:id/moderate
             bila approved → mergeFarmerReference() juga dijalankan
```

Hasilnya: harga provinsi yang tak pernah tersentuh cron tetap bisa ter-update
dari laporan petani yang terverifikasi — tidak lagi "terisolasi" dari laporan.

## 5. Keakuratan & transparansi

- `GET /api/market/prices` kini mengembalikan `dataAgeHours` per baris.
- Layar Harga menampilkan badge bila data >24 jam ("belum diperbarui — coba tarik refresh").
- Sumber tiap harga terlihat: `upstream:kemtan-panelharga`, `sp2kp:kemendag-api`, atau `farmer:verified`.
- Cache perangkat offline diberi TTL 60 menit agar tidak menampilkan data basi diam-diam.
- `market_price_history` unik per `(commodity, province, level, date)` — backfill diperbaiki agar
  tidak crash saat `level` ikut konflik.
- Tabel `sync_health` mencatat status tiap cron (ok/errors, jumlah baris) untuk dashboard admin.

## 6. Operasional

- Cron membutuhkan env `CRON_SECRET` di Vercel.
- Endpoint admin `/api/admin/market-health` menampilkan jumlah baris, provinsi, sinkron terakhir.
- Bila cron WAF keempat gagal: desain aman (tabel tidak berubah, cache dipakai, crowd-sync
  dan laporan petani tetap menyegarkan nasional/provinsi).