/**
 * Evaluasi kualitas agent AI dengan pertanyaan emas.
 * Jalankan: npx tsx scripts/eval-ai.ts [--limit=N] [--json=out.json]
 * Keluar exit-code 1 bila tingkat lolos < 70%.
 */

import { runAgent } from '../src/services/agent';

interface GoldCase {
  q: string;
  kategori: string;
  tools?: string[];
  include?: string[];
  exclude?: string[];
}

const GOLD: GoldCase[] = [
  // ── Harga (10) ──
  { q: 'Berapa harga cabai rawit merah di Jawa Timur hari ini?', kategori: 'harga', tools: ['market_price'], include: ['rp'] },
  { q: 'Harga beras medium nasional berapa?', kategori: 'harga', tools: ['market_price'], include: ['rp'] },
  { q: 'GKP di Jawa Timur sekarang berapa?', kategori: 'harga', tools: ['market_price'], include: ['rp'] },
  { q: 'Harga telur ayam di DKI Jakarta?', kategori: 'harga', tools: ['market_price'], include: ['rp'] },
  { q: 'Harga gabah kering giling provinsi Jawa Barat berapa?', kategori: 'harga', tools: ['market_price'], include: ['rp'] },
  { q: 'Tren harga bawang merah 7 hari terakhir di Jawa Tengah seperti apa?', kategori: 'harga', tools: ['market_price'] },
  { q: 'Harga jagung pipilan di Sulawesi Selatan?', kategori: 'harga', tools: ['market_price'], include: ['rp'] },
  { q: 'Bandingkan harga cabai merah besar dan cabai keriting di Jawa Barat', kategori: 'harga', tools: ['market_price'], include: ['rp'] },
  { q: 'Harga sapi murni daerah Aceh berapa?', kategori: 'harga', tools: ['market_price'], include: ['rp'] },
  { q: 'Minyak goreng kemasan di Bali harganya berapa?', kategori: 'harga', tools: ['market_price'], include: ['rp'] },

  // ── Hama & penyakit (8) ──
  { q: 'Daun padi saya ada bercak bentuk mata tupai, itu penyakit apa?', kategori: 'hama_penyakit', tools: ['search_knowledge'] },
  { q: 'Ulat grayak menyerang jagung saya, bagaimana cara mengendalikannya?', kategori: 'hama_penyakit', tools: ['search_knowledge'] },
  { q: 'Daun cabai menguning dan keriting, kenapa ya?', kategori: 'hama_penyakit', tools: ['search_knowledge'] },
  { q: 'Daun bawang merah bolong-bolong seperti digores, apa penyebabnya?', kategori: 'hama_penyakit', tools: ['search_knowledge'] },
  { q: 'Tomat saya layu mendadak pagi hari, apa penyebabnya?', kategori: 'hama_penyakit', tools: ['search_knowledge'] },
  { q: 'Cara ngendalike wereng batang cokelat?', kategori: 'hama_penyakit', tools: ['search_knowledge'] },
  { q: 'Padi saya mati meluas sampai jadi hamparan kering, hama apa itu?', kategori: 'hama_penyakit', tools: ['search_knowledge'] },
  { q: 'Buah cabai ada bercak cekung cokelat gelap bulat, itu apa?', kategori: 'hama_penyakit', tools: ['search_knowledge'] },

  // ── Dosis & produk (5) ──
  { q: 'Untuk ulat daun cabai, produk pestisida apa yang tersedia di aplikasi ini?', kategori: 'produk', tools: ['product_search'] },
  { q: 'Obat wereng batang cokelat ada produk apa?', kategori: 'produk', tools: ['product_search'] },
  { q: 'Dosis pupuk NPK untuk cabai umur 30 HST berapa?', kategori: 'pemupukan', tools: ['search_knowledge'] },
  { q: 'Fungisida untuk antraknosa cabai, produk apa yang cocok?', kategori: 'produk', tools: ['product_search'] },
  { q: 'Herbisida untuk rumput di kebun jagung ada apa saja?', kategori: 'produk', tools: ['product_search'] },

  // ── Strategi & kualitas jawaban (7) ──
  { q: 'Kapan waktu terbaik menjual gabah saya?', kategori: 'strategi', tools: ['market_price'] },
  { q: 'Bagaimana cara menyimpan cabai agar awet dan dapat harga bagus?', kategori: 'strategi', tools: ['search_knowledge'], include: ['sumber'] },
  { q: 'Gabah mau dijual ke Bulog, syarat mutunya apa?', kategori: 'strategi', tools: ['search_knowledge'] },
  { q: 'Bagaimana cara sorting grading bawang merah sebelum dijual?', kategori: 'strategi', tools: ['search_knowledge'] },
  { q: 'Semprot pestisida perlu alat pelindung apa saja?', kategori: 'keselamatan', tools: ['search_knowledge'], include: ['sumber'] },
  { q: 'Bolehkah menyemprot pestisida saat siang terik?', kategori: 'keselamatan', tools: ['search_knowledge'] },
  { q: 'Apa itu interval pra-panen?', kategori: 'keselamatan', tools: ['search_knowledge'], include: ['sumber'] },
];

interface CaseResult {
  q: string;
  kategori: string;
  pass: boolean;
  alasan: string[];
  toolsTerpakai: string[];
  iterasi: number;
  ms: number;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const jsonArg = args.find((a) => a.startsWith('--json='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : GOLD.length;

  const results: CaseResult[] = [];
  let passed = 0;

  for (const [idx, gold] of GOLD.entries()) {
    if (idx >= limit) break;
    const t0 = Date.now();
    const alasan: string[] = [];
    let toolsTerpakai: string[] = [];
    let iterasi = 0;

    try {
      const out = await runAgent([{ role: 'user', content: gold.q }], {});
      iterasi = out.iterations;
      toolsTerpakai = out.toolCallsUsed ?? [];
      const replyLower = out.reply.toLowerCase();

      for (const t of gold.tools ?? []) {
        if (!toolsTerpakai.includes(t)) {
          alasan.push(`tool ${t} tidak dipanggil (terpakai: ${toolsTerpakai.join(',') || '-'})`);
        }
      }
      for (const inc of gold.include ?? []) {
        if (!replyLower.includes(inc.toLowerCase())) alasan.push(`harus memuat "${inc}"`);
      }
      for (const exc of gold.exclude ?? []) {
        if (replyLower.includes(exc.toLowerCase())) alasan.push(`tidak boleh memuat "${exc}"`);
      }
      if (out.reply.trim().length < 40) alasan.push('jawaban terlalu pendek');
    } catch (err) {
      alasan.push(`ERROR: ${(err as Error).message.slice(0, 120)}`);
    }

    const ms = Date.now() - t0;
    const ok = alasan.length === 0;
    if (ok) passed += 1;
    results.push({ q: gold.q, kategori: gold.kategori, pass: ok, alasan, toolsTerpakai, iterasi, ms });

    const tag = gold.kategori.padEnd(14);
    console.log(
      `[${String(idx + 1).padStart(2)}/${Math.min(limit, GOLD.length)}] ${ok ? 'PASS' : 'FAIL'} ${tag} ${gold.q.slice(0, 52)}`
    );
    if (!ok) for (const a of alasan) console.log(`     -> ${a}`);
  }

  const rate = Math.round((passed / Math.max(1, results.length)) * 100);
  const avgMs = Math.round(results.reduce((s, r) => s + r.ms, 0) / Math.max(1, results.length));
  console.log('\n========== RINGKASAN ==========');
  console.log(`Lolos: ${passed}/${results.length} (${rate}%)`);
  console.log(`Rata-rata latensi: ${avgMs} ms`);
  const byKat = new Map<string, { p: number; n: number }>();
  for (const r of results) {
    const cur = byKat.get(r.kategori) ?? { p: 0, n: 0 };
    cur.n += 1;
    if (r.pass) cur.p += 1;
    byKat.set(r.kategori, cur);
  }
  for (const [k, v] of byKat) console.log(`  ${k}: ${v.p}/${v.n}`);

  if (jsonArg) {
    const fs = await import('fs');
    fs.writeFileSync(jsonArg.split('=')[1], JSON.stringify(results, null, 2));
    console.log(`Laporan JSON: ${jsonArg.split('=')[1]}`);
  }

  if (rate < 70) process.exit(1);
}

main()
  .catch((e) => {
    console.error('FATAL:', e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
