import { Product } from '@/types';

// DIHASILKAN OTOMATIS dari backend/src/data/products.seed.json — jangan edit manual.
export const PRODUCT_SEED: Product[] = [
  {
    "id": "pup-petrokimia-gresik-urea",
    "brand": "Petrokimia Gresik",
    "name": "Urea",
    "category": "pupuk",
    "formulation": "Granular 46% N",
    "activeIngredient": "Nitrogen (N) 46%",
    "doses": [
      {
        "id": "pup-petrokimia-gresik-urea-d1",
        "crop": "Padi",
        "target": "Pemupukan dasar + susulan I & II (dibagi)",
        "dose": 200,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      },
      {
        "id": "pup-petrokimia-gresik-urea-d2",
        "crop": "Jagung",
        "target": "Dasar + susulan",
        "dose": 300,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      },
      {
        "id": "pup-petrokimia-gresik-urea-d3",
        "crop": "Sayuran",
        "target": "Setengah dasar, sisanya susulan",
        "dose": 150,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Aplikasi bertahap agar efisiensi nitrogen lebih baik"
      ]
    }
  },
  {
    "id": "pup-petrosida-gresik-phonska-npk-15-15-15",
    "brand": "Petrosida Gresik",
    "name": "Phonska NPK 15-15-15",
    "category": "pupuk",
    "formulation": "Granular NPK",
    "activeIngredient": "N 15% - P2O5 15% - K2O 15%",
    "doses": [
      {
        "id": "pup-petrosida-gresik-phonska-npk-15-15-15-d1",
        "crop": "Padi/Palawija",
        "target": "Dasar",
        "dose": 250,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      },
      {
        "id": "pup-petrosida-gresik-phonska-npk-15-15-15-d2",
        "crop": "Cabai/Tomat",
        "target": "Susulan berkala tiap 2 minggu",
        "dose": 300,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-petrokimia-gresik-sp-36-super-phos",
    "brand": "Petrokimia Gresik",
    "name": "SP-36 Super Phos",
    "category": "pupuk",
    "formulation": "Granular 36% P2O5",
    "activeIngredient": "Fosfat (P2O5) 36%",
    "doses": [
      {
        "id": "pup-petrokimia-gresik-sp-36-super-phos-d1",
        "crop": "Padi",
        "target": "Dasar",
        "dose": 125,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      },
      {
        "id": "pup-petrokimia-gresik-sp-36-super-phos-d2",
        "crop": "Kacang-kacangan",
        "target": "Dasar",
        "dose": 75,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-petrokimia-gresik-za-ammonium-sulphate",
    "brand": "Petrokimia Gresik",
    "name": "ZA Ammonium Sulphate",
    "category": "pupuk",
    "formulation": "Kristalin 21% N + 24% S",
    "activeIngredient": "Ammonium sulfat (N 21%, S 24%)",
    "doses": [
      {
        "id": "pup-petrokimia-gresik-za-ammonium-sulphate-d1",
        "crop": "Bawang Merah",
        "target": "Dasar + susulan",
        "dose": 200,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      },
      {
        "id": "pup-petrokimia-gresik-za-ammonium-sulphate-d2",
        "crop": "Padi/Teh",
        "target": "Susulan",
        "dose": 250,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-impor-mop-kcl-muriate-of-potash",
    "brand": "Impor (MOP)",
    "name": "KCl Muriate of Potash",
    "category": "pupuk",
    "formulation": "Granular 50% K2O",
    "activeIngredient": "Kalium (K2O) 50%",
    "doses": [
      {
        "id": "pup-impor-mop-kcl-muriate-of-potash-d1",
        "crop": "Kentang",
        "target": "Dasar + susulan",
        "dose": 150,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      },
      {
        "id": "pup-impor-mop-kcl-muriate-of-potash-d2",
        "crop": "Cabai/Tomat",
        "target": "Fase generatif",
        "dose": 100,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-lokal-kapur-dolomit",
    "brand": "Lokal (kapur)",
    "name": "Dolomit",
    "category": "pupuk",
    "formulation": "Serbuk CaMg(CO3)2",
    "activeIngredient": "Dolomit (Ca-Mg karbonat)",
    "doses": [
      {
        "id": "pup-lokal-kapur-dolomit-d1",
        "crop": "Umum tanaman",
        "target": "Pembenah tanah masam pH < 5,5",
        "dose": 1500,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-impor-zk-sulphate-of-potash",
    "brand": "Impor",
    "name": "ZK Sulphate of Potash",
    "category": "pupuk",
    "formulation": "Kristalin 50% K2O + 17% S",
    "activeIngredient": "Kalium sulfat (K2SO4)",
    "doses": [
      {
        "id": "pup-impor-zk-sulphate-of-potash-d1",
        "crop": "Tembakau/Kentang",
        "target": "Dasar",
        "dose": 100,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-mutiara-agro-sentosa-npk-mutiara-16-16-16",
    "brand": "Mutiara Agro Sentosa",
    "name": "NPK Mutiara 16-16-16",
    "category": "pupuk",
    "formulation": "Kristal larut air + unsur mikro",
    "activeIngredient": "NPK seimbang 16-16-16 + TE",
    "doses": [
      {
        "id": "pup-mutiara-agro-sentosa-npk-mutiara-16-16-16-d1",
        "crop": "Sayuran/Horti",
        "target": "Semprot daun tiap 7-10 hari",
        "dose": 3,
        "unit": "g/L",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      },
      {
        "id": "pup-mutiara-agro-sentosa-npk-mutiara-16-16-16-d2",
        "crop": "Cabai/Tomat",
        "target": "Fertigasi tetes",
        "dose": 4,
        "unit": "g/L",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-yara-yaramila-complex-12-11-18-te",
    "brand": "Yara",
    "name": "YaraMila Complex 12-11-18+TE",
    "category": "pupuk",
    "formulation": "Granular NPK+TE",
    "activeIngredient": "N 12% - P2O5 11% - K2O 18% + TE",
    "doses": [
      {
        "id": "pup-yara-yaramila-complex-12-11-18-te-d1",
        "crop": "Kentang",
        "target": "Terbagi dasar + 2x susulan",
        "dose": 600,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-yara-yarabela-can",
    "brand": "Yara",
    "name": "YaraBela CAN",
    "category": "pupuk",
    "formulation": "Prilled 27% N",
    "activeIngredient": "Kalsium amonium nitrat (N 27%, Ca)",
    "doses": [
      {
        "id": "pup-yara-yarabela-can-d1",
        "crop": "Sayuran",
        "target": "Dasar/susulan",
        "dose": 150,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-impor-map-12-61-0",
    "brand": "Impor",
    "name": "MAP 12-61-0",
    "category": "pupuk",
    "formulation": "Kristal mononium fosfat",
    "activeIngredient": "N 12% - P2O5 61%",
    "doses": [
      {
        "id": "pup-impor-map-12-61-0-d1",
        "crop": "Jagung",
        "target": "Starter dasar",
        "dose": 100,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      },
      {
        "id": "pup-impor-map-12-61-0-d2",
        "crop": "Cabai",
        "target": "Fertigasi fase awal",
        "dose": 2,
        "unit": "g/L",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-haifa-multi-k-potassium-nitrate",
    "brand": "Haifa",
    "name": "Multi-K Potassium Nitrate",
    "category": "pupuk",
    "formulation": "Kristal larut air 13-0-46",
    "activeIngredient": "KNO3 (N 13%, K2O 46%)",
    "doses": [
      {
        "id": "pup-haifa-multi-k-potassium-nitrate-d1",
        "crop": "Cabai/Tomat",
        "target": "Fertigasi generatif (terbagi)",
        "dose": 100,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      },
      {
        "id": "pup-haifa-multi-k-potassium-nitrate-d2",
        "crop": "Semua tanaman",
        "target": "Semprot daun",
        "dose": 3,
        "unit": "g/L",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-haifa-polyfeed-19-19-19-te",
    "brand": "Haifa",
    "name": "Polyfeed 19-19-19+TE",
    "category": "pupuk",
    "formulation": "Powder soluble",
    "activeIngredient": "NPK seimbang 19-19-19 + TE",
    "doses": [
      {
        "id": "pup-haifa-polyfeed-19-19-19-te-d1",
        "crop": "Hidroponik/Fertigasi",
        "target": "Larutan harian",
        "dose": 1.2,
        "unit": "g/L",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-hydro-agri-rotterdam-kristalon-merah-12-36-12",
    "brand": "Hydro Agri Rotterdam",
    "name": "Kristalon Merah 12-36-12",
    "category": "pupuk",
    "formulation": "Powder soluble",
    "activeIngredient": "N 12% - P2O5 36% - K2O 12% + TE",
    "doses": [
      {
        "id": "pup-hydro-agri-rotterdam-kristalon-merah-12-36-12-d1",
        "crop": "Sayuran/Horti",
        "target": "Fertigasi fase vegetatif",
        "dose": 1.5,
        "unit": "g/L",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-gandasil-gandasil-d-6-30-30-te",
    "brand": "Gandasil",
    "name": "Gandasil D 6-30-30+TE",
    "category": "pupuk",
    "formulation": "Bubuk larut air",
    "activeIngredient": "N 6% - P2O5 30% - K2O 30% + TE",
    "doses": [
      {
        "id": "pup-gandasil-gandasil-d-6-30-30-te-d1",
        "crop": "Semua tanaman",
        "target": "Semprot daun fase generatif",
        "dose": 3,
        "unit": "g/L",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-bayer-bayfolan-forte",
    "brand": "Bayer",
    "name": "Bayfolan Forte",
    "category": "pupuk",
    "formulation": "Cair NPK+TE",
    "activeIngredient": "NPK + unsur mikro (cair)",
    "doses": [
      {
        "id": "pup-bayer-bayfolan-forte-d1",
        "crop": "Semua tanaman",
        "target": "Semprot daun",
        "dose": 4,
        "unit": "mL/L",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-hyponex-japan-hyponex-27-15-12",
    "brand": "Hyponex Japan",
    "name": "Hyponex 27-15-12",
    "category": "pupuk",
    "formulation": "Bubuk larut air",
    "activeIngredient": "N 27% - P 15% - K 12%",
    "doses": [
      {
        "id": "pup-hyponex-japan-hyponex-27-15-12-d1",
        "crop": "Tanaman pot/Hortikultura",
        "target": "Penyiraman larutan",
        "dose": 2,
        "unit": "g/L",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-grow-more-usa-growmore-32-10-10",
    "brand": "Grow More USA",
    "name": "Growmore 32-10-10",
    "category": "pupuk",
    "formulation": "Bubuk larut air",
    "activeIngredient": "N 32% - P2O5 10% - K2O 10%",
    "doses": [
      {
        "id": "pup-grow-more-usa-growmore-32-10-10-d1",
        "crop": "Semua tanaman",
        "target": "Semprot daun fase vegetatif",
        "dose": 5,
        "unit": "g/L",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-guano-ciamis-guano-fosfat-alam",
    "brand": "Guano Ciamis",
    "name": "Guano Fosfat Alam",
    "category": "pupuk",
    "formulation": "Serbuk/granul 20% P2O5",
    "activeIngredient": "Fosfat alam guano",
    "doses": [
      {
        "id": "pup-guano-ciamis-guano-fosfat-alam-d1",
        "crop": "Umum tanaman",
        "target": "Dasar",
        "dose": 200,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-lokal-batuan-fosfat-alam",
    "brand": "Lokal",
    "name": "Batuan Fosfat Alam",
    "category": "pupuk",
    "formulation": "Serbuk 30% P2O5",
    "activeIngredient": "Rock phosphate",
    "doses": [
      {
        "id": "pup-lokal-batuan-fosfat-alam-d1",
        "crop": "Umum tanaman",
        "target": "Dasar untuk tanah masam",
        "dose": 300,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-impor-kieserite-mgso4-h2o",
    "brand": "Impor",
    "name": "Kieserite MgSO4.H2O",
    "category": "pupuk",
    "formulation": "Granular 26% MgO",
    "activeIngredient": "Magnesium sulfat monohidrat",
    "doses": [
      {
        "id": "pup-impor-kieserite-mgso4-h2o-d1",
        "crop": "Kelapa Sawit",
        "target": "Per pokok per tahun",
        "dose": 750,
        "unit": "g/pokok",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      },
      {
        "id": "pup-impor-kieserite-mgso4-h2o-d2",
        "crop": "Sayuran",
        "target": "Dasar",
        "dose": 100,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-impor-lokal-gypsum-caso4-2h2o",
    "brand": "Impor/Lokal",
    "name": "Gypsum CaSO4.2H2O",
    "category": "pupuk",
    "formulation": "Serbuk 23% Ca + 18% S",
    "activeIngredient": "Kalsium sulfat",
    "doses": [
      {
        "id": "pup-impor-lokal-gypsum-caso4-2h2o-d1",
        "crop": "Padi",
        "target": "Perbaikan tanah sulfat masam",
        "dose": 500,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-impor-borax-na2b4o7-10h2o",
    "brand": "Impor",
    "name": "Borax Na2B4O7.10H2O",
    "category": "pupuk",
    "formulation": "Kristal 11% B",
    "activeIngredient": "Borat (mikro B 11%)",
    "doses": [
      {
        "id": "pup-impor-borax-na2b4o7-10h2o-d1",
        "crop": "Kacang/Sawi",
        "target": "Dasar bila gejala defisiensi B",
        "dose": 12,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-impor-kelat-fe-edta-13-fe",
    "brand": "Impor",
    "name": "Kelat Fe EDTA 13% Fe",
    "category": "pupuk",
    "formulation": "Kristal kelat besi",
    "activeIngredient": "Fe-EDTA 13%",
    "doses": [
      {
        "id": "pup-impor-kelat-fe-edta-13-fe-d1",
        "crop": "Semua tanaman",
        "target": "Semprot daun klorosis Fe",
        "dose": 1,
        "unit": "g/L",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-peternakan-lokal-pupuk-kandang-ayam-matang",
    "brand": "Peternakan Lokal",
    "name": "Pupuk Kandang Ayam Matang",
    "category": "pupuk",
    "formulation": "Fermentasi matang >= 30 hari",
    "activeIngredient": "Organik (C-organik, N-P-K alami)",
    "doses": [
      {
        "id": "pup-peternakan-lokal-pupuk-kandang-ayam-matang-d1",
        "crop": "Umum tanaman",
        "target": "Dasar",
        "dose": 3000,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-kompos-lokal-kompos-bokashi",
    "brand": "Kompos Lokal",
    "name": "Kompos Bokashi",
    "category": "pupuk",
    "formulation": "Granul organik fermentasi",
    "activeIngredient": "Organik + mikroba dekomposer",
    "doses": [
      {
        "id": "pup-kompos-lokal-kompos-bokashi-d1",
        "crop": "Umum tanaman",
        "target": "Dasar",
        "dose": 1500,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-kasgot-lokal-vermikompos",
    "brand": "Kasgot Lokal",
    "name": "Vermikompos",
    "category": "pupuk",
    "formulation": "Organik cacing tanah",
    "activeIngredient": "Organik halus kaya humus",
    "doses": [
      {
        "id": "pup-kasgot-lokal-vermikompos-d1",
        "crop": "Hortikultura",
        "target": "Dasar",
        "dose": 2000,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pup-lokal-arang-sekam-biochar",
    "brand": "Lokal",
    "name": "Arang Sekam (Biochar)",
    "category": "pupuk",
    "formulation": "Karbon organik",
    "activeIngredient": "Pembenah tanah (C organik tinggi)",
    "doses": [
      {
        "id": "pup-lokal-arang-sekam-biochar-d1",
        "crop": "Umum tanaman",
        "target": "Dicampur tanah bedengan",
        "dose": 2000,
        "unit": "kg/ha",
        "source": "Rekomendasi umum label/Balittanaman; wajib sesuaikan rekomendasi lokal (BP3K/PPL)"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari produk pupuk yang beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Sarung tangan saat penanganan",
      "notes": [
        "Simpan di tempat kering dan teduh; jauhkan dari jangkauan anak"
      ]
    }
  },
  {
    "id": "pes-syngenta-vertimec-1-8-ec",
    "brand": "Syngenta",
    "name": "Vertimec 1,8 EC",
    "category": "pestisida",
    "formulation": "Insektisida EC 18 g/L",
    "activeIngredient": "Abamektin 18 g/L",
    "doses": [
      {
        "id": "pes-syngenta-vertimec-1-8-ec-d1",
        "crop": "Cabai/Tomat",
        "target": "Insektisida — Kutu daun, thrips, kutu api, tungau",
        "dose": 2,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-upl-biomek-1-8-ec",
    "brand": "UPL",
    "name": "Biomek 1,8 EC",
    "category": "pestisida",
    "formulation": "Insektisida EC 18 g/L",
    "activeIngredient": "Abamektin 18 g/L",
    "doses": [
      {
        "id": "pes-upl-biomek-1-8-ec-d1",
        "crop": "Cabai/Bawang",
        "target": "Insektisida — Thrips, kutu daun, kutu api",
        "dose": 2,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-proclaim-5-sg",
    "brand": "Syngenta",
    "name": "Proclaim 5 SG",
    "category": "pestisida",
    "formulation": "Insektisida WDG 50 g/kg",
    "activeIngredient": "Emamektin benzoat 50 g/kg",
    "doses": [
      {
        "id": "pes-syngenta-proclaim-5-sg-d1",
        "crop": "Cabai/Tomat/Bawang",
        "target": "Insektisida — Ulat grayak, ulat daun, penggerek buah",
        "dose": 0.4,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-fmc-coragen-200-sc",
    "brand": "FMC",
    "name": "Coragen 200 SC",
    "category": "pestisida",
    "formulation": "Insektisida SC 200 g/L",
    "activeIngredient": "Klorantraniliprol 200 g/L",
    "doses": [
      {
        "id": "pes-fmc-coragen-200-sc-d1",
        "crop": "Cabai/Tomat/Jagung",
        "target": "Insektisida — Ulat grayak, pengorok daun, penggerek buah",
        "dose": 0.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 3,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-fmc-ferterra-0-4-gr",
    "brand": "FMC",
    "name": "Ferterra 0,4 GR",
    "category": "pestisida",
    "formulation": "Insektisida GR 4 g/kg",
    "activeIngredient": "Klorantraniliprol 4 g/kg",
    "doses": [
      {
        "id": "pes-fmc-ferterra-0-4-gr-d1",
        "crop": "Padi",
        "target": "Insektisida — Penggerek batang (sundep/pengganggang)",
        "dose": 15,
        "unit": "kg/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-nihon-nohyaku-belt-480-wg",
    "brand": "Nihon Nohyaku",
    "name": "Belt 480 WG",
    "category": "pestisida",
    "formulation": "Insektisida WDG 480 g/kg",
    "activeIngredient": "Flubendiamid 480 g/kg",
    "doses": [
      {
        "id": "pes-nihon-nohyaku-belt-480-wg-d1",
        "crop": "Cabai/Kol/Tomat",
        "target": "Insektisida — Ulat daun, ulat grayak muda",
        "dose": 0.25,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 7,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-fmc-steward-300-ec",
    "brand": "FMC",
    "name": "Steward 300 EC",
    "category": "pestisida",
    "formulation": "Insektisida EC 300 g/L",
    "activeIngredient": "Indoksakarb 300 g/L",
    "doses": [
      {
        "id": "pes-fmc-steward-300-ec-d1",
        "crop": "Kol/Sayuran",
        "target": "Insektisida — Ulat krop, ulat daun (DBM)",
        "dose": 1,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-bayer-regent-50-sc",
    "brand": "Bayer",
    "name": "Regent 50 SC",
    "category": "pestisida",
    "formulation": "Insektisida SC 50 g/L",
    "activeIngredient": "Fipronil 50 g/L",
    "doses": [
      {
        "id": "pes-bayer-regent-50-sc-d1",
        "crop": "Padi",
        "target": "Insektisida — Wereng batang cokelat",
        "dose": 1.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-bayer-vulcan-50-wdg",
    "brand": "Bayer",
    "name": "Vulcan 50 WDG",
    "category": "pestisida",
    "formulation": "Insektisida WDG 50 g/kg",
    "activeIngredient": "Fipronil 50 g/kg",
    "doses": [
      {
        "id": "pes-bayer-vulcan-50-wdg-d1",
        "crop": "Cabai/Bawang",
        "target": "Insektisida — Kutu daun, thrips",
        "dose": 0.5,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-bayer-confidor-200-sl",
    "brand": "Bayer",
    "name": "Confidor 200 SL",
    "category": "pestisida",
    "formulation": "Insektisida SL 200 g/L",
    "activeIngredient": "Imidakloprid 200 g/L",
    "doses": [
      {
        "id": "pes-bayer-confidor-200-sl-d1",
        "crop": "Sayuran/Dalam",
        "target": "Insektisida — Kutu daun, vektor virus",
        "dose": 0.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-actara-25-wg",
    "brand": "Syngenta",
    "name": "Actara 25 WG",
    "category": "pestisida",
    "formulation": "Insektisida WG 250 g/kg",
    "activeIngredient": "Tiametoksam 250 g/kg",
    "doses": [
      {
        "id": "pes-syngenta-actara-25-wg-d1",
        "crop": "Cabai/Kentang",
        "target": "Insektisida — Wereng, kutu daun, thrips",
        "dose": 0.5,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-sumitomo-dantotsu-16-sc",
    "brand": "Sumitomo",
    "name": "Dantotsu 16 SC",
    "category": "pestisida",
    "formulation": "Insektisida SC 160 g/L",
    "activeIngredient": "Klotianidin 160 g/L",
    "doses": [
      {
        "id": "pes-sumitomo-dantotsu-16-sc-d1",
        "crop": "Padi/Sayuran",
        "target": "Insektisida — Wereng batang cokelat, kutu daun",
        "dose": 0.4,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-karate-zeon-50-cs",
    "brand": "Syngenta",
    "name": "Karate Zeon 50 CS",
    "category": "pestisida",
    "formulation": "Insektisida CS 50 g/L",
    "activeIngredient": "Lambda-sihalotrin 50 g/L",
    "doses": [
      {
        "id": "pes-syngenta-karate-zeon-50-cs-d1",
        "crop": "Sayuran/Padi",
        "target": "Insektisida — Penghisap saps, ulat kecil, wereng",
        "dose": 1,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 7,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-basf-fastac-15-ec",
    "brand": "BASF",
    "name": "Fastac 15 EC",
    "category": "pestisida",
    "formulation": "Insektisida EC 15 g/L",
    "activeIngredient": "Alfa-sipermetrin 15 g/L",
    "doses": [
      {
        "id": "pes-basf-fastac-15-ec-d1",
        "crop": "Sayuran/Padi",
        "target": "Insektisida — Hama kontak kerja cepat",
        "dose": 1,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 7,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-bayer-bulldock-125-ec",
    "brand": "Bayer",
    "name": "Bulldock 125 EC",
    "category": "pestisida",
    "formulation": "Insektisida EC 125 g/L",
    "activeIngredient": "Beta-siflutrin 125 g/L",
    "doses": [
      {
        "id": "pes-bayer-bulldock-125-ec-d1",
        "crop": "Sayuran/Jagung",
        "target": "Insektisida — Ulat, kutu daun, penghisap",
        "dose": 1,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 7,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-bayer-decis-25-ec",
    "brand": "Bayer",
    "name": "Decis 25 EC",
    "category": "pestisida",
    "formulation": "Insektisida EC 25 g/L",
    "activeIngredient": "Deltametrin 25 g/L",
    "doses": [
      {
        "id": "pes-bayer-decis-25-ec-d1",
        "crop": "Sayuran/Padi",
        "target": "Insektisida — Penggerek, ulat daun, wereng",
        "dose": 1,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 7,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-curacron-500-ec",
    "brand": "Syngenta",
    "name": "Curacron 500 EC",
    "category": "pestisida",
    "formulation": "Insektisida EC 500 g/L",
    "activeIngredient": "Profenofos 500 g/L",
    "doses": [
      {
        "id": "pes-syngenta-curacron-500-ec-d1",
        "crop": "Cabai/Kol",
        "target": "Insektisida — Ulat daun, kutu daun, DBM",
        "dose": 1.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 21,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-control-chemicals-profex-super-550-ec",
    "brand": "Control Chemicals",
    "name": "Profex Super 550 EC",
    "category": "pestisida",
    "formulation": "Insektisida EC profenofos+sipermetrin",
    "activeIngredient": "Profenofos 400 g/L + Sipermetrin 40 g/L",
    "doses": [
      {
        "id": "pes-control-chemicals-profex-super-550-ec-d1",
        "crop": "Sayuran",
        "target": "Insektisida — Ulat daun, kutu daun",
        "dose": 2,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-arysta-lifescience-padan-95-sp",
    "brand": "Arysta LifeScience",
    "name": "Padan 95 SP",
    "category": "pestisida",
    "formulation": "Insektisida SP 950 g/kg",
    "activeIngredient": "Kartap hidroklorida 950 g/kg",
    "doses": [
      {
        "id": "pes-arysta-lifescience-padan-95-sp-d1",
        "crop": "Padi",
        "target": "Insektisida — Wereng batang cokelat, penggerek batang",
        "dose": 2,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-sumitomo-evisect-s-50-wp",
    "brand": "Sumitomo",
    "name": "Evisect S 50 WP",
    "category": "pestisida",
    "formulation": "Insektisida WP 500 g/kg",
    "activeIngredient": "Tiociklam hydrogen oksalat 500 g/kg",
    "doses": [
      {
        "id": "pes-sumitomo-evisect-s-50-wp-d1",
        "crop": "Kol/Sayuran",
        "target": "Insektisida — Ulat krop, ulat daun",
        "dose": 1,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-nihon-nohyaku-applaud-40-sc",
    "brand": "Nihon Nohyaku",
    "name": "Applaud 40 SC",
    "category": "pestisida",
    "formulation": "Insektisida SC 400 g/L",
    "activeIngredient": "Buprofezin 400 g/L",
    "doses": [
      {
        "id": "pes-nihon-nohyaku-applaud-40-sc-d1",
        "crop": "Padi/Sayuran",
        "target": "Insektisida — Nimfa wereng, kutu api (IGR)",
        "dose": 1.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-polo-500-sc",
    "brand": "Syngenta",
    "name": "Polo 500 SC",
    "category": "pestisida",
    "formulation": "Insektisida SC 500 g/L",
    "activeIngredient": "Diafenthiuron 500 g/L",
    "doses": [
      {
        "id": "pes-syngenta-polo-500-sc-d1",
        "crop": "Cabai/Teh",
        "target": "Insektisida — Tungau, kutu daun, whitefly",
        "dose": 1.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 7,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-upl-omite-570-ew",
    "brand": "UPL",
    "name": "Omite 570 EW",
    "category": "pestisida",
    "formulation": "Akarisida EW 570 g/L",
    "activeIngredient": "Propargit 570 g/L",
    "doses": [
      {
        "id": "pes-upl-omite-570-ew-d1",
        "crop": "Cabai/Tomat",
        "target": "Akarisida — Tungau merah dewasa",
        "dose": 1,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-nissan-chemical-nissourun-10-wp",
    "brand": "Nissan Chemical",
    "name": "Nissourun 10 WP",
    "category": "pestisida",
    "formulation": "Akarisida WP 100 g/L",
    "activeIngredient": "Hexitiazoks 100 g/L",
    "doses": [
      {
        "id": "pes-nissan-chemical-nissourun-10-wp-d1",
        "crop": "Cabai/Semangka",
        "target": "Akarisida — Telur & nimfa tungau (ovisida)",
        "dose": 1,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-sumitomo-sanmite-20-wp",
    "brand": "Sumitomo",
    "name": "Sanmite 20 WP",
    "category": "pestisida",
    "formulation": "Akarisida WP 200 g/L",
    "activeIngredient": "Piridaben 200 g/L",
    "doses": [
      {
        "id": "pes-sumitomo-sanmite-20-wp-d1",
        "crop": "Cabai/Apel",
        "target": "Akarisida — Tungau merah",
        "dose": 0.5,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 7,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-upl-magister-400-ec",
    "brand": "UPL",
    "name": "Magister 400 EC",
    "category": "pestisida",
    "formulation": "Akarisida EC 400 g/L",
    "activeIngredient": "Fenazaquin 400 g/L",
    "doses": [
      {
        "id": "pes-upl-magister-400-ec-d1",
        "crop": "Cabai/Tomat",
        "target": "Akarisida — Tungau merah",
        "dose": 1,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-chess-50-wg",
    "brand": "Syngenta",
    "name": "Chess 50 WG",
    "category": "pestisida",
    "formulation": "Insektisida WG 500 g/kg",
    "activeIngredient": "Pyrimetrozin 500 g/kg",
    "doses": [
      {
        "id": "pes-syngenta-chess-50-wg-d1",
        "crop": "Padi/Sayuran",
        "target": "Insektisida — Wereng, aphid, vektor virus",
        "dose": 0.5,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-fmc-benevia-100-od",
    "brand": "FMC",
    "name": "Benevia 100 OD",
    "category": "pestisida",
    "formulation": "Insektisida OD 100 g/L",
    "activeIngredient": "Siantraniliprol 100 g/L",
    "doses": [
      {
        "id": "pes-fmc-benevia-100-od-d1",
        "crop": "Cabai/Tomat/Bawang",
        "target": "Insektisida — Thrips, kutu api, ulat",
        "dose": 1,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 3,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-isk-biosciences-atabron-50-ec",
    "brand": "ISK Biosciences",
    "name": "Atabron 50 EC",
    "category": "pestisida",
    "formulation": "Insektisida EC 50 g/L",
    "activeIngredient": "Klorfluazuron 50 g/L",
    "doses": [
      {
        "id": "pes-isk-biosciences-atabron-50-ec-d1",
        "crop": "Kol/Cabai",
        "target": "Insektisida — Ulat daun, DBM (IGR)",
        "dose": 1,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-match-50-ec",
    "brand": "Syngenta",
    "name": "Match 50 EC",
    "category": "pestisida",
    "formulation": "Insektisida EC 50 g/L",
    "activeIngredient": "Lufenuron 50 g/L",
    "doses": [
      {
        "id": "pes-syngenta-match-50-ec-d1",
        "crop": "Kol/Sayuran",
        "target": "Insektisida — Ulat krop, ulat daun (IGR)",
        "dose": 1,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-adama-rimon-100-ec",
    "brand": "Adama",
    "name": "Rimon 100 EC",
    "category": "pestisida",
    "formulation": "Insektisida EC 100 g/L",
    "activeIngredient": "Novaluron 100 g/L",
    "doses": [
      {
        "id": "pes-adama-rimon-100-ec-d1",
        "crop": "Kol/Tomat",
        "target": "Insektisida — Ulat daun, DBM (IGR)",
        "dose": 1,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-basf-nomolt-150-ec",
    "brand": "BASF",
    "name": "Nomolt 150 EC",
    "category": "pestisida",
    "formulation": "Insektisida EC 150 g/L",
    "activeIngredient": "Teflubenzuron 150 g/L",
    "doses": [
      {
        "id": "pes-basf-nomolt-150-ec-d1",
        "crop": "Kol/Cabai",
        "target": "Insektisida — Ulat daun (IGR)",
        "dose": 1,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-sumitomo-virtako-40-wg",
    "brand": "Sumitomo",
    "name": "Virtako 40 WG",
    "category": "pestisida",
    "formulation": "Insektisida WG klorfluazuron+tiametoksam",
    "activeIngredient": "Klorfluazuron 200 g/kg + Tiametoksam 200 g/kg",
    "doses": [
      {
        "id": "pes-sumitomo-virtako-40-wg-d1",
        "crop": "Padi",
        "target": "Insektisida — Wereng batang cokelat, penggerek batang",
        "dose": 1.2,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-nippon-soda-mospilan-70-sg",
    "brand": "Nippon Soda",
    "name": "Mospilan 70 SG",
    "category": "pestisida",
    "formulation": "Insektisida SG 700 g/kg",
    "activeIngredient": "Asetamiprid 700 g/kg",
    "doses": [
      {
        "id": "pes-nippon-soda-mospilan-70-sg-d1",
        "crop": "Sayuran/Teh",
        "target": "Insektisida — Kutu daun, thrips, whitefly",
        "dose": 0.3,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 7,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-corteva-radiant-120-sc",
    "brand": "Corteva",
    "name": "Radiant 120 SC",
    "category": "pestisida",
    "formulation": "Insektisida SC 120 g/L",
    "activeIngredient": "Spinetoram 120 g/L",
    "doses": [
      {
        "id": "pes-corteva-radiant-120-sc-d1",
        "crop": "Cabai/Bawang/Kol",
        "target": "Insektisida — Thrips, ulat daun",
        "dose": 0.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 3,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-sumitomo-xentari",
    "brand": "Sumitomo",
    "name": "XenTari",
    "category": "pestisida",
    "formulation": "Insektisida hayati WG Bt subsp. aizawai",
    "activeIngredient": "Bacillus thuringiensis subsp. aizawai",
    "doses": [
      {
        "id": "pes-sumitomo-xentari-d1",
        "crop": "Kol/Cabai",
        "target": "Insektisida hayati — DBM (ulat krop), ulat grayak",
        "dose": 1,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 0,
      "notes": [
        "Biopestisida selektif, ramah musuh alami",
        "Efektif untuk larva muda; hindari sinar matahari langsung berlebih"
      ]
    }
  },
  {
    "id": "pes-valent-biosciences-dipel-2x",
    "brand": "Valent BioSciences",
    "name": "Dipel 2X",
    "category": "pestisida",
    "formulation": "Insektisida hayati WP Bt subsp. kurstaki",
    "activeIngredient": "Bacillus thuringiensis subsp. kurstaki",
    "doses": [
      {
        "id": "pes-valent-biosciences-dipel-2x-d1",
        "crop": "Sayuran/Kedelai",
        "target": "Insektisida hayati — Ulat daun muda",
        "dose": 1,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 0,
      "notes": [
        "Biopestisida selektif, aman bagi musuh alami"
      ]
    }
  },
  {
    "id": "pes-t-stanes-nimbecidine-0-03-ec",
    "brand": "T. Stanes",
    "name": "Nimbecidine 0,03 EC",
    "category": "pestisida",
    "formulation": "Insektisida hayati EC azadiraktin",
    "activeIngredient": "Azadiraktin 0,03% (ekstrak mimba)",
    "doses": [
      {
        "id": "pes-t-stanes-nimbecidine-0-03-ec-d1",
        "crop": "Sayuran",
        "target": "Insektisida hayati — Multi hama: ulat, kutu, thrips (anti makan)",
        "dose": 3,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 0,
      "notes": [
        "Neem alami, cocok sistem IPM"
      ]
    }
  },
  {
    "id": "pes-lokal-bio-bio-metarril-wp",
    "brand": "Lokal (bio)",
    "name": "Bio Metarril WP",
    "category": "pestisida",
    "formulation": "Insektisida hayati WP cendawan entomopatogen",
    "activeIngredient": "Metarhizium anisopliae",
    "doses": [
      {
        "id": "pes-lokal-bio-bio-metarril-wp-d1",
        "crop": "Padi/Sayuran",
        "target": "Insektisida hayati — Penggerek batang, wereng (hayati)",
        "dose": 10,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 0,
      "notes": [
        "Agen hayati; jangan dicampur fungisida kimia"
      ]
    }
  },
  {
    "id": "pes-lokal-bio-beauveria-bassiana-wp",
    "brand": "Lokal (bio)",
    "name": "Beauveria Bassiana WP",
    "category": "pestisida",
    "formulation": "Insektisida hayati WP cendawan entomopatogen",
    "activeIngredient": "Beauveria bassiana",
    "doses": [
      {
        "id": "pes-lokal-bio-beauveria-bassiana-wp-d1",
        "crop": "Sayuran",
        "target": "Insektisida hayati — Kutu daun, tungau, ulat (hayati)",
        "dose": 10,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 0,
      "notes": [
        "Agen hayati; aplikasi sore hari"
      ]
    }
  },
  {
    "id": "pes-corteva-dithane-m-45-80-wp",
    "brand": "Corteva",
    "name": "Dithane M-45 80 WP",
    "category": "pestisida",
    "formulation": "Fungisida WP 800 g/kg",
    "activeIngredient": "Mankozeb 800 g/kg",
    "doses": [
      {
        "id": "pes-corteva-dithane-m-45-80-wp-d1",
        "crop": "Umum tanaman",
        "target": "Fungisida — Antraknose, bercak daun, downy mildew",
        "dose": 3,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 7,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-ridomil-gold-mz-72-wp",
    "brand": "Syngenta",
    "name": "Ridomil Gold MZ 72 WP",
    "category": "pestisida",
    "formulation": "Fungisida WP metalaksil-M + mankozeb",
    "activeIngredient": "Metalaksil-M 40 g/kg + Mankozeb 640 g/kg",
    "doses": [
      {
        "id": "pes-syngenta-ridomil-gold-mz-72-wp-d1",
        "crop": "Tomat/Kentang",
        "target": "Fungisida — Late blight (busuk daun), busuk buah",
        "dose": 3,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-upl-curzate-m-8-72-wp",
    "brand": "UPL",
    "name": "Curzate M-8 72 WP",
    "category": "pestisida",
    "formulation": "Fungisida WP cymoxanil + mankozeb",
    "activeIngredient": "Simoksanil 80 g/kg + Mankozeb 640 g/kg",
    "doses": [
      {
        "id": "pes-upl-curzate-m-8-72-wp-d1",
        "crop": "Kentang/Tomat/Timun",
        "target": "Fungisida — Downy mildew, late blight",
        "dose": 2.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-daconil-75-wp",
    "brand": "Syngenta",
    "name": "Daconil 75 WP",
    "category": "pestisida",
    "formulation": "Fungisida WP 750 g/kg",
    "activeIngredient": "Klorotalonil 750 g/kg",
    "doses": [
      {
        "id": "pes-syngenta-daconil-75-wp-d1",
        "crop": "Umum tanaman",
        "target": "Fungisida — Bercak daun, antraknose",
        "dose": 2,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 7,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-amistar-250-sc",
    "brand": "Syngenta",
    "name": "Amistar 250 SC",
    "category": "pestisida",
    "formulation": "Fungisida SC 250 g/L",
    "activeIngredient": "Azoksistrobin 250 g/L",
    "doses": [
      {
        "id": "pes-syngenta-amistar-250-sc-d1",
        "crop": "Padi/Sayuran",
        "target": "Fungisida — Blas, bercak daun",
        "dose": 1,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-amistar-top-325-sc",
    "brand": "Syngenta",
    "name": "Amistar Top 325 SC",
    "category": "pestisida",
    "formulation": "Fungisida SC azoksistrobin+difenokonazol",
    "activeIngredient": "Azoksistrobin 200 g/L + Difenokonazol 125 g/L",
    "doses": [
      {
        "id": "pes-syngenta-amistar-top-325-sc-d1",
        "crop": "Cabai/Tomat",
        "target": "Fungisida — Embun tepung, bercak daun, antraknose",
        "dose": 1,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-bayer-nativo-75-wg",
    "brand": "Bayer",
    "name": "Nativo 75 WG",
    "category": "pestisida",
    "formulation": "Fungisida WG trifloksistrobin+tebukonazol",
    "activeIngredient": "Trifloksistrobin 250 g/kg + Tebukonazol 500 g/kg",
    "doses": [
      {
        "id": "pes-bayer-nativo-75-wg-d1",
        "crop": "Cabai/Padi",
        "target": "Fungisida — Blas, karpena, bercak daun",
        "dose": 1,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-bayer-folicur-250-ew",
    "brand": "Bayer",
    "name": "Folicur 250 EW",
    "category": "pestisida",
    "formulation": "Fungisida EW 250 g/L",
    "activeIngredient": "Tebukonazol 250 g/L",
    "doses": [
      {
        "id": "pes-bayer-folicur-250-ew-d1",
        "crop": "Padi/Kedelai",
        "target": "Fungisida — Blas, karpena, karat",
        "dose": 1,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-score-250-ec",
    "brand": "Syngenta",
    "name": "Score 250 EC",
    "category": "pestisida",
    "formulation": "Fungisida EC 250 g/L",
    "activeIngredient": "Difenokonazol 250 g/L",
    "doses": [
      {
        "id": "pes-syngenta-score-250-ec-d1",
        "crop": "Cabai/Apel",
        "target": "Fungisida — Karpena, embun tepung",
        "dose": 0.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-tilt-250-ec",
    "brand": "Syngenta",
    "name": "Tilt 250 EC",
    "category": "pestisida",
    "formulation": "Fungisida EC 250 g/L",
    "activeIngredient": "Propikonazol 250 g/L",
    "doses": [
      {
        "id": "pes-syngenta-tilt-250-ec-d1",
        "crop": "Padi/Gandum",
        "target": "Fungisida — Blas, septoria, karat",
        "dose": 1,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-alto-100-sc",
    "brand": "Syngenta",
    "name": "Alto 100 SC",
    "category": "pestisida",
    "formulation": "Fungisida SC 100 g/L",
    "activeIngredient": "Siprokonazol 100 g/L",
    "doses": [
      {
        "id": "pes-syngenta-alto-100-sc-d1",
        "crop": "Jagung/Kentang",
        "target": "Fungisida — Karat, bercak daun",
        "dose": 0.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-anvil-5-sc",
    "brand": "Syngenta",
    "name": "Anvil 5 SC",
    "category": "pestisida",
    "formulation": "Fungisida SC 50 g/L",
    "activeIngredient": "Heksakonazol 50 g/L",
    "doses": [
      {
        "id": "pes-syngenta-anvil-5-sc-d1",
        "crop": "Sayuran/Tebu",
        "target": "Fungisida — Embun tepung, karat",
        "dose": 1.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-corteva-systhane-12-ew",
    "brand": "Corteva",
    "name": "Systhane 12 EW",
    "category": "pestisida",
    "formulation": "Fungisida EW 120 g/L",
    "activeIngredient": "Miklobutanil 120 g/L",
    "doses": [
      {
        "id": "pes-corteva-systhane-12-ew-d1",
        "crop": "Cabai/Mangga",
        "target": "Fungisida — Embun tepung, karpena",
        "dose": 1,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-topas-100-ec",
    "brand": "Syngenta",
    "name": "Topas 100 EC",
    "category": "pestisida",
    "formulation": "Fungisida EC 100 g/L",
    "activeIngredient": "Penkonazol 100 g/L",
    "doses": [
      {
        "id": "pes-syngenta-topas-100-ec-d1",
        "crop": "Sayuran/Apel",
        "target": "Fungisida — Embun tepung",
        "dose": 0.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-corteva-beam-75-wp",
    "brand": "Corteva",
    "name": "Beam 75 WP",
    "category": "pestisida",
    "formulation": "Fungisida WP 750 g/kg",
    "activeIngredient": "Trikliazol 750 g/kg",
    "doses": [
      {
        "id": "pes-corteva-beam-75-wp-d1",
        "crop": "Padi",
        "target": "Fungisida — Blas (Pyricularia)",
        "dose": 1,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 21,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-basf-win-200-sc",
    "brand": "BASF",
    "name": "Win 200 SC",
    "category": "pestisida",
    "formulation": "Fungisida SC 200 g/L",
    "activeIngredient": "Karpropamid 200 g/L",
    "doses": [
      {
        "id": "pes-basf-win-200-sc-d1",
        "crop": "Padi",
        "target": "Fungisida — Blas (preventif)",
        "dose": 1,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-nihon-nohyaku-fuji-one-40-ec",
    "brand": "Nihon Nohyaku",
    "name": "Fuji-One 40 EC",
    "category": "pestisida",
    "formulation": "Fungisida EC 400 g/L",
    "activeIngredient": "Isoprotilan 400 g/L",
    "doses": [
      {
        "id": "pes-nihon-nohyaku-fuji-one-40-ec-d1",
        "crop": "Padi",
        "target": "Fungisida — Blas + wereng (gabungan)",
        "dose": 1.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-bayer-hinosan-30-ec",
    "brand": "Bayer",
    "name": "Hinosan 30 EC",
    "category": "pestisida",
    "formulation": "Fungisida EC 300 g/L",
    "activeIngredient": "Edifenfos 300 g/L",
    "doses": [
      {
        "id": "pes-bayer-hinosan-30-ec-d1",
        "crop": "Padi",
        "target": "Fungisida — Layu, bercak pelepah",
        "dose": 1.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-sumitomo-validacin-3-sl",
    "brand": "Sumitomo",
    "name": "Validacin 3 SL",
    "category": "pestisida",
    "formulation": "Fungisida SL 30 g/L",
    "activeIngredient": "Validamisin 30 g/L (antibiotik)",
    "doses": [
      {
        "id": "pes-sumitomo-validacin-3-sl-d1",
        "crop": "Padi",
        "target": "Fungisida — Busuk pelepah (sheath blight)",
        "dose": 1.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-hokko-chemical-kasumin-2-l",
    "brand": "Hokko Chemical",
    "name": "Kasumin 2 L",
    "category": "pestisida",
    "formulation": "Bakterisida SL 20 g/L",
    "activeIngredient": "Kasugamisin 20 g/L",
    "doses": [
      {
        "id": "pes-hokko-chemical-kasumin-2-l-d1",
        "crop": "Padi/Sayuran",
        "target": "Bakterisida — Busuk bakteri, blas",
        "dose": 2,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-novartis-agrimycin-100",
    "brand": "Novartis",
    "name": "Agrimycin-100",
    "category": "pestisida",
    "formulation": "Bakterisida WP streptomisin+oksitetrasiklin",
    "activeIngredient": "Streptomisin sulfat + oksitetrasiklin",
    "doses": [
      {
        "id": "pes-novartis-agrimycin-100-d1",
        "crop": "Cabai/Tomat/Bawang",
        "target": "Bakterisida — Layu bakteri, bercak bakteri",
        "dose": 1,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-sumitomo-starner-20-wp",
    "brand": "Sumitomo",
    "name": "Starner 20 WP",
    "category": "pestisida",
    "formulation": "Bakterisida WP 200 g/kg",
    "activeIngredient": "Asit oksolinik 200 g/kg",
    "doses": [
      {
        "id": "pes-sumitomo-starner-20-wp-d1",
        "crop": "Kentang/Cabai",
        "target": "Bakterisida — Busuk bakteri, layu bakteri",
        "dose": 2,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 21,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-bayer-aliette-80-wg",
    "brand": "Bayer",
    "name": "Aliette 80 WG",
    "category": "pestisida",
    "formulation": "Fungisida WG 800 g/kg",
    "activeIngredient": "Fosetil-AL 800 g/kg",
    "doses": [
      {
        "id": "pes-bayer-aliette-80-wg-d1",
        "crop": "Lada/Nanas/Sayuran",
        "target": "Fungisida — Phytophthora, downy mildew",
        "dose": 2.5,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-bayer-previcur-n-66-sl",
    "brand": "Bayer",
    "name": "Previcur N 66 SL",
    "category": "pestisida",
    "formulation": "Fungisida SL 666 g/L",
    "activeIngredient": "Propamokarb-HCl 666 g/L",
    "doses": [
      {
        "id": "pes-bayer-previcur-n-66-sl-d1",
        "crop": "Sayuran bibit",
        "target": "Fungisida — Damping-off, layu",
        "dose": 2,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-bayer-infinito-687-5-sc",
    "brand": "Bayer",
    "name": "Infinito 687,5 SC",
    "category": "pestisida",
    "formulation": "Fungisida SC fluopikolid+propamokarb",
    "activeIngredient": "Fluopikolid 62,5 g/L + Propamokarb 625 g/L",
    "doses": [
      {
        "id": "pes-bayer-infinito-687-5-sc-d1",
        "crop": "Kentang/Tomat/Lada",
        "target": "Fungisida — Late blight, busuk akar",
        "dose": 3,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-basf-acrobat-mz-69-wp",
    "brand": "BASF",
    "name": "Acrobat MZ 69 WP",
    "category": "pestisida",
    "formulation": "Fungisida WP dimetomorf+mankozeb",
    "activeIngredient": "Dimetomorf 90 g/kg + Mankozeb 600 g/kg",
    "doses": [
      {
        "id": "pes-basf-acrobat-mz-69-wp-d1",
        "crop": "Kentang/Anggur",
        "target": "Fungisida — Downy mildew, late blight",
        "dose": 2.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-basf-melody-duo-66-75-wp",
    "brand": "BASF",
    "name": "Melody Duo 66,75 WP",
    "category": "pestisida",
    "formulation": "Fungisida WP iprovalikarb+propineb",
    "activeIngredient": "Iprovalikarb + Propineb",
    "doses": [
      {
        "id": "pes-basf-melody-duo-66-75-wp-d1",
        "crop": "Timun/Kentang",
        "target": "Fungisida — Downy mildew",
        "dose": 2.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-corteva-gavel-75-df",
    "brand": "Corteva",
    "name": "Gavel 75 DF",
    "category": "pestisida",
    "formulation": "Fungisida DG zoksamid+mankozeb",
    "activeIngredient": "Zoksamid 66,7 g/kg + Mankozeb 683 g/kg",
    "doses": [
      {
        "id": "pes-corteva-gavel-75-df-d1",
        "crop": "Kentang/Tomat",
        "target": "Fungisida — Late blight, downy mildew",
        "dose": 2,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-basf-polyram-df-70-dg",
    "brand": "BASF",
    "name": "Polyram DF 70 DG",
    "category": "pestisida",
    "formulation": "Fungisida DG 700 g/kg",
    "activeIngredient": "Metiram 700 g/kg",
    "doses": [
      {
        "id": "pes-basf-polyram-df-70-dg-d1",
        "crop": "Umum tanaman",
        "target": "Fungisida — Bercak daun, antraknose",
        "dose": 2.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-adama-folpan-500-sc",
    "brand": "Adama",
    "name": "Folpan 500 SC",
    "category": "pestisida",
    "formulation": "Fungisida SC 500 g/L",
    "activeIngredient": "Folpet 500 g/L",
    "doses": [
      {
        "id": "pes-adama-folpan-500-sc-d1",
        "crop": "Sayuran/Apel",
        "target": "Fungisida — Antraknose, Alternaria",
        "dose": 2,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-nordox-nordox-75-wg",
    "brand": "Nordox",
    "name": "Nordox 75 WG",
    "category": "pestisida",
    "formulation": "Fungisida WG 750 g/kg",
    "activeIngredient": "Oksida kuprous (kuprombahan) 750 g/kg",
    "doses": [
      {
        "id": "pes-nordox-nordox-75-wg-d1",
        "crop": "Umum tanaman",
        "target": "Fungisida — Bakteri, bercak daun (tembaga)",
        "dose": 3,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 3,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-champion-champion-77-wp",
    "brand": "Champion",
    "name": "Champion 77 WP",
    "category": "pestisida",
    "formulation": "Fungisida WP 770 g/kg",
    "activeIngredient": "Oksiklorida kuprum 770 g/kg",
    "doses": [
      {
        "id": "pes-champion-champion-77-wp-d1",
        "crop": "Umum tanaman",
        "target": "Fungisida — Bakteri, bercak daun, antraknose",
        "dose": 3,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 3,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-certis-fmc-kocide-2000",
    "brand": "Certis/FMC",
    "name": "Kocide 2000",
    "category": "pestisida",
    "formulation": "Fungisida DF 538 g/kg",
    "activeIngredient": "Hidroksida kuprum 538 g/kg",
    "doses": [
      {
        "id": "pes-certis-fmc-kocide-2000-d1",
        "crop": "Tomat/Sayuran",
        "target": "Fungisida — Bakteri, blight (tembaga)",
        "dose": 2.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 3,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-thiovit-jet-80-wg",
    "brand": "Syngenta",
    "name": "Thiovit Jet 80 WG",
    "category": "pestisida",
    "formulation": "Fungisida WG 800 g/kg",
    "activeIngredient": "Belerang (sulfur) 800 g/kg",
    "doses": [
      {
        "id": "pes-syngenta-thiovit-jet-80-wg-d1",
        "crop": "Cabai/Mangga/Teh",
        "target": "Fungisida — Embun tepung + tungau",
        "dose": 3,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 1,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-basf-kumulus-df-80-wg",
    "brand": "BASF",
    "name": "Kumulus DF 80 WG",
    "category": "pestisida",
    "formulation": "Fungisida DG 800 g/kg",
    "activeIngredient": "Belerang (sulfur) 800 g/kg",
    "doses": [
      {
        "id": "pes-basf-kumulus-df-80-wg-d1",
        "crop": "Sayuran/Kebun",
        "target": "Fungisida — Embun tepung",
        "dose": 3,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 1,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-bayer-antracol-70-wp",
    "brand": "Bayer",
    "name": "Antracol 70 WP",
    "category": "pestisida",
    "formulation": "Fungisida WP 700 g/kg",
    "activeIngredient": "Propineb 700 g/kg",
    "doses": [
      {
        "id": "pes-bayer-antracol-70-wp-d1",
        "crop": "Cabai/Tomat/Kentang",
        "target": "Fungisida — Antraknose, bercak daun",
        "dose": 2.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 7,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-basf-cabrio-250-ec",
    "brand": "BASF",
    "name": "Cabrio 250 EC",
    "category": "pestisida",
    "formulation": "Fungisida EC 250 g/L",
    "activeIngredient": "Piraklostrobin 250 g/L",
    "doses": [
      {
        "id": "pes-basf-cabrio-250-ec-d1",
        "crop": "Sayuran/Kentang",
        "target": "Fungisida — Karpena, bercak daun",
        "dose": 1,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-revus-250-sc",
    "brand": "Syngenta",
    "name": "Revus 250 SC",
    "category": "pestisida",
    "formulation": "Fungisida SC 250 g/L",
    "activeIngredient": "Mandipropamid 250 g/L",
    "doses": [
      {
        "id": "pes-syngenta-revus-250-sc-d1",
        "crop": "Kentang/Tomat",
        "target": "Fungisida — Late blight, downy mildew",
        "dose": 0.6,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 7,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-corteva-roundup-486-sl",
    "brand": "Corteva",
    "name": "Roundup 486 SL",
    "category": "pestisida",
    "formulation": "Herbisida SL IPA-garam",
    "activeIngredient": "Glifosat 480 g/L (IPA garam)",
    "doses": [
      {
        "id": "pes-corteva-roundup-486-sl-d1",
        "crop": "Umum lahan",
        "target": "Herbisida — Gulma daun sempit & lebar (tanpa olah tanah)",
        "dose": 3,
        "unit": "L/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 7,
      "notes": [
        "Herbisida spektrum luas; hindari terkena tanaman budidaya",
        "Jangan semprot saat gulma basah/tertekan"
      ]
    }
  },
  {
    "id": "pes-sundat-solutions-sunup-486-sl",
    "brand": "Sundat Solutions",
    "name": "SunUp 486 SL",
    "category": "pestisida",
    "formulation": "Herbisida SL IPA-garam",
    "activeIngredient": "Glifosat 486 g/L",
    "doses": [
      {
        "id": "pes-sundat-solutions-sunup-486-sl-d1",
        "crop": "Umum lahan",
        "target": "Herbisida — Gulma tahunan & tahunan inangsial",
        "dose": 3,
        "unit": "L/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 7,
      "notes": [
        "Hindari drift ke tanaman budidaya"
      ]
    }
  },
  {
    "id": "pes-kaput-kaput-486-sl",
    "brand": "Kaput",
    "name": "Kaput 486 SL",
    "category": "pestisida",
    "formulation": "Herbisida SL IPA-garam",
    "activeIngredient": "Glifosat 486 g/L",
    "doses": [
      {
        "id": "pes-kaput-kaput-486-sl-d1",
        "crop": "Umum lahan",
        "target": "Herbisida — Gulma serbaguna pra-tanam",
        "dose": 3,
        "unit": "L/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 7,
      "notes": [
        "Hindari drift ke tanaman budidaya"
      ]
    }
  },
  {
    "id": "pes-basf-basta-200-sl",
    "brand": "BASF",
    "name": "Basta 200 SL",
    "category": "pestisida",
    "formulation": "Herbisida SL",
    "activeIngredient": "Glufosinat amonium 200 g/L",
    "doses": [
      {
        "id": "pes-basf-basta-200-sl-d1",
        "crop": "Kebun Sawit/Horti",
        "target": "Herbisida — Gulma daun lebar & sempit (pasca tumbuh)",
        "dose": 3,
        "unit": "L/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Kontak cepat; hindari tanaman muda"
      ]
    }
  },
  {
    "id": "pes-corteva-formula-245",
    "brand": "Corteva",
    "name": "Formula 245",
    "category": "pestisida",
    "formulation": "Herbisida SL asam 2,4-D",
    "activeIngredient": "Asam 2,4-D 720 g/L",
    "doses": [
      {
        "id": "pes-corteva-formula-245-d1",
        "crop": "Padi/Perkebunan",
        "target": "Herbisida — Gulma daun lebar (sedge)",
        "dose": 1.5,
        "unit": "L/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Hindari drift ke tanaman daun sempit budidaya"
      ]
    }
  },
  {
    "id": "pes-corteva-ally-20-sp",
    "brand": "Corteva",
    "name": "Ally 20 SP",
    "category": "pestisida",
    "formulation": "Herbisida SP 200 g/kg",
    "activeIngredient": "Metsulfuron metil 200 g/kg",
    "doses": [
      {
        "id": "pes-corteva-ally-20-sp-d1",
        "crop": "Padi/Tebu",
        "target": "Herbisida — Gulma daun lebar",
        "dose": 10,
        "unit": "g/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Dosis sangat rendah; gunakan alat ukur teliti + surfaktan"
      ]
    }
  },
  {
    "id": "pes-corteva-londax-60-df",
    "brand": "Corteva",
    "name": "Londax 60 DF",
    "category": "pestisida",
    "formulation": "Herbisida DF 600 g/kg",
    "activeIngredient": "Bensulfuron metil 600 g/kg",
    "doses": [
      {
        "id": "pes-corteva-londax-60-df-d1",
        "crop": "Padi Sawah",
        "target": "Herbisida — Gulma daun lebar & rumput-rumputan",
        "dose": 100,
        "unit": "g/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-kumiai-chemical-nominee-100-sc",
    "brand": "Kumiai Chemical",
    "name": "Nominee 100 SC",
    "category": "pestisida",
    "formulation": "Herbisida SC 100 g/L",
    "activeIngredient": "Bispiribak-natrium 100 g/L",
    "doses": [
      {
        "id": "pes-kumiai-chemical-nominee-100-sc-d1",
        "crop": "Padi Sawah",
        "target": "Herbisida — Gulma pasca tumbuh awal",
        "dose": 1.5,
        "unit": "L/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-sofit-super-537-ec",
    "brand": "Syngenta",
    "name": "Sofit Super 537 EC",
    "category": "pestisida",
    "formulation": "Herbisida EC pretilaklor+safener",
    "activeIngredient": "Pretilaklor 300 g/L + safener",
    "doses": [
      {
        "id": "pes-syngenta-sofit-super-537-ec-d1",
        "crop": "Padi Sawah",
        "target": "Herbisida — Pra-tumbuh gulma",
        "dose": 3,
        "unit": "L/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-dual-gold-960-ec",
    "brand": "Syngenta",
    "name": "Dual Gold 960 EC",
    "category": "pestisida",
    "formulation": "Herbisida EC 960 g/L",
    "activeIngredient": "S-metolahlor 960 g/L",
    "doses": [
      {
        "id": "pes-syngenta-dual-gold-960-ec-d1",
        "crop": "Jagung/Kacang-kacangan",
        "target": "Herbisida — Pra tumbuh gulma daun sempit",
        "dose": 1.5,
        "unit": "L/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-basf-stomp-330-ec",
    "brand": "BASF",
    "name": "Stomp 330 EC",
    "category": "pestisida",
    "formulation": "Herbisida EC 330 g/L",
    "activeIngredient": "Pendimetalin 330 g/L",
    "doses": [
      {
        "id": "pes-basf-stomp-330-ec-d1",
        "crop": "Jagung/Kacang",
        "target": "Herbisida — Pra tumbuh gulma",
        "dose": 2.5,
        "unit": "L/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-ronstar-250-ec",
    "brand": "Syngenta",
    "name": "Ronstar 250 EC",
    "category": "pestisida",
    "formulation": "Herbisida EC 250 g/L",
    "activeIngredient": "Oksadiazon 250 g/L",
    "doses": [
      {
        "id": "pes-syngenta-ronstar-250-ec-d1",
        "crop": "Padi/Prasawi",
        "target": "Herbisida — Pra & pasca tumbuh awal",
        "dose": 1.5,
        "unit": "L/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-corteva-goal-240-ec",
    "brand": "Corteva",
    "name": "Goal 240 EC",
    "category": "pestisida",
    "formulation": "Herbisida EC 240 g/L",
    "activeIngredient": "Oksifluorfen 240 g/L",
    "doses": [
      {
        "id": "pes-corteva-goal-240-ec-d1",
        "crop": "Prasawi/Bibit",
        "target": "Herbisida — Gulma pra & pasca awal",
        "dose": 1,
        "unit": "L/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-adama-atrazine-500-sc",
    "brand": "Adama",
    "name": "Atrazine 500 SC",
    "category": "pestisida",
    "formulation": "Herbisida SC 500 g/L",
    "activeIngredient": "Atrazin 500 g/L",
    "doses": [
      {
        "id": "pes-adama-atrazine-500-sc-d1",
        "crop": "Jagung/Tebu",
        "target": "Herbisida — Pra & pasca tumbuh gulma",
        "dose": 3,
        "unit": "L/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Hanya untuk lahan jagung/tebu; residu bisa ganggu palawija berikutnya"
      ]
    }
  },
  {
    "id": "pes-adama-diurex-80-wp",
    "brand": "Adama",
    "name": "Diurex 80 WP",
    "category": "pestisida",
    "formulation": "Herbisida WP 800 g/kg",
    "activeIngredient": "Diuron 800 g/kg",
    "doses": [
      {
        "id": "pes-adama-diurex-80-wp-d1",
        "crop": "Tebu/Perkebunan",
        "target": "Herbisida — Gulma pra tumbuh",
        "dose": 2,
        "unit": "kg/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-syngenta-fusilade-forte-150-ec",
    "brand": "Syngenta",
    "name": "Fusilade Forte 150 EC",
    "category": "pestisida",
    "formulation": "Herbisida EC 150 g/L",
    "activeIngredient": "Fluazifop-P-butil 150 g/L",
    "doses": [
      {
        "id": "pes-syngenta-fusilade-forte-150-ec-d1",
        "crop": "Sayuran/Kacang",
        "target": "Herbisida — Graminisida (gulma rumput) pasca tumbuh",
        "dose": 1,
        "unit": "L/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Selektif hanya membunuh rumput; aman untuk tanaman daun lebar"
      ]
    }
  },
  {
    "id": "pes-corteva-gallant-super-108-ec",
    "brand": "Corteva",
    "name": "Gallant Super 108 EC",
    "category": "pestisida",
    "formulation": "Herbisida EC 108 g/L",
    "activeIngredient": "Haloksifop-R-metil 108 g/L",
    "doses": [
      {
        "id": "pes-corteva-gallant-super-108-ec-d1",
        "crop": "Kedelai/Kacang/Sayuran",
        "target": "Herbisida — Graminisida pasca tumbuh",
        "dose": 1,
        "unit": "L/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Selektif rumput saja"
      ]
    }
  },
  {
    "id": "pes-nissan-chemical-targa-super-50-ec",
    "brand": "Nissan Chemical",
    "name": "Targa Super 50 EC",
    "category": "pestisida",
    "formulation": "Herbisida EC 50 g/L",
    "activeIngredient": "Kuizalofop-P-etil 50 g/L",
    "doses": [
      {
        "id": "pes-nissan-chemical-targa-super-50-ec-d1",
        "crop": "Kacang/Sayuran",
        "target": "Herbisida — Graminisida pasca tumbuh",
        "dose": 2,
        "unit": "L/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Selektif rumput saja"
      ]
    }
  },
  {
    "id": "pes-arysta-lifescience-select-120-ec",
    "brand": "Arysta LifeScience",
    "name": "Select 120 EC",
    "category": "pestisida",
    "formulation": "Herbisida EC 120 g/L",
    "activeIngredient": "Kletodim 120 g/L",
    "doses": [
      {
        "id": "pes-arysta-lifescience-select-120-ec-d1",
        "crop": "Kedelai/Sayuran",
        "target": "Herbisida — Graminisida pasca tumbuh",
        "dose": 1,
        "unit": "L/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Selektif rumput saja"
      ]
    }
  },
  {
    "id": "pes-bayer-sencor-70-wg",
    "brand": "Bayer",
    "name": "Sencor 70 WG",
    "category": "pestisida",
    "formulation": "Herbisida WG 700 g/kg",
    "activeIngredient": "Metribuzin 700 g/kg",
    "doses": [
      {
        "id": "pes-bayer-sencor-70-wg-d1",
        "crop": "Kentang/Tomat/Tebu",
        "target": "Herbisida — Pra & pasca awal gulma",
        "dose": 500,
        "unit": "g/ha",
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 12,
      "preHarvestDays": 14,
      "notes": [
        "Beracun bagi lebah dan ikan; hindari penyemprotan saat tanaman berbunga dan dekat badan air",
        "Jangan mencampur sembarangan dengan bahan lain tanpa uji kompatibilitas"
      ]
    }
  },
  {
    "id": "pes-bayer-planofix-4-5-sl",
    "brand": "Bayer",
    "name": "Planofix 4,5 SL",
    "category": "pestisida",
    "formulation": "ZPT SL 45 g/L",
    "activeIngredient": "Asam naftalen asetat (NAA) 45 g/L",
    "doses": [
      {
        "id": "pes-bayer-planofix-4-5-sl-d1",
        "crop": "Cabai/Mangga/Jeruk",
        "target": "ZPT — Mencegah rontok bunga & buah muda",
        "dose": 0.25,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 0,
      "notes": [
        "Zat pengatur tumbuh; ikuti dosis teliti, overdosis berbahaya"
      ]
    }
  },
  {
    "id": "pes-nissan-chemical-atonik-asl",
    "brand": "Nissan Chemical",
    "name": "Atonik ASL",
    "category": "pestisida",
    "formulation": "ZPT ASL nitrofenolat",
    "activeIngredient": "Sodium nitroguajakolat + nitrokresolat + o-nitrofenolat",
    "doses": [
      {
        "id": "pes-nissan-chemical-atonik-asl-d1",
        "crop": "Semua tanaman",
        "target": "ZPT — Perangsang vegetatif pulih setelah stress",
        "dose": 2,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 0,
      "notes": [
        "Zat pengatur tumbuh (perangsang tumbuh)"
      ]
    }
  },
  {
    "id": "pes-roota-roota-fc",
    "brand": "Roota",
    "name": "Roota FC",
    "category": "pestisida",
    "formulation": "ZPT Cair IBA+NAA",
    "activeIngredient": "Indol butirat (IBA) + Asam naftalen asetat (NAA)",
    "doses": [
      {
        "id": "pes-roota-roota-fc-d1",
        "crop": "Stek/Semai",
        "target": "ZPT — Merangsang pertumbuhan akar",
        "dose": 2,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 0,
      "notes": [
        "Rendam pangkal stek/celup larutan"
      ]
    }
  },
  {
    "id": "pes-agen-hayati-lokal-trichoderma-sp-10-wp",
    "brand": "Agen Hayati Lokal",
    "name": "Trichoderma sp. 10 WP",
    "category": "pestisida",
    "formulation": "Fungisida hayati WP agens hayati",
    "activeIngredient": "Trichoderma sp. (spora >= 10^8 CFU/g)",
    "doses": [
      {
        "id": "pes-agen-hayati-lokal-trichoderma-sp-10-wp-d1",
        "crop": "Umum tanaman",
        "target": "Fungisida hayati — Supresi layu fusarium, penguatan akar",
        "dose": 10,
        "unit": "g/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 0,
      "notes": [
        "Biofungisida; jangan dicampur fungisida kimia; aplikasi pagi/sore"
      ]
    }
  },
  {
    "id": "pes-momentive-silwet-l-77",
    "brand": "Momentive",
    "name": "Silwet L-77",
    "category": "pestisida",
    "formulation": "Adjuvan Cair silikon non-ionik",
    "activeIngredient": "Polietilen siloksan (silikon surfaktan)",
    "doses": [
      {
        "id": "pes-momentive-silwet-l-77-d1",
        "crop": "Semua tanaman",
        "target": "Adjuvan — Pelekat & penembus semprotan",
        "dose": 0.5,
        "unit": "mL/L",
        "waterVolumeLPerHa": 500,
        "source": "Rentang umum label di pasaran; WAJIB diverifikasi ke label kemasan sebelum digunakan"
      }
    ],
    "source": "Kurasi katalog TAWANGTANI dari label umum pestisida beredar di Indonesia",
    "verified": false,
    "warnings": {
      "apd": "Masker, sarung tangan karet, topi, pakaian lengan panjang, sepatu tertutup",
      "reEntryHours": 0,
      "notes": [
        "Adjuvan; dosis kecil sudah cukup, jangan lebih"
      ]
    }
  }
];
