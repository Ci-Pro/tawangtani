import {
  buildSopPlan,
  normalizeCrop,
  extractDoseLine,
  stageForAge,
  SUPPORTED_CROPS,
} from '../backend/src/services/planEngine';

const NOW = new Date('2026-09-09T00:00:00Z');

function fakeSearch() {
  return async (q: string, _k: number) => {
    const stage = q.includes('semai')
      ? 'semai'
      : q.includes('pematangan')
        ? 'pematangan'
        : q.includes('vegetatif')
          ? 'vegetatif'
          : q.includes('generatif')
            ? 'generatif'
            : 'panen';
    const withDose = stage === 'vegetatif' || stage === 'generatif';
    return [
      {
        id: 1,
        doc_id: 'kb-test',
        title: 'Artikel uji',
        crop: 'umum',
        topic: stage,
        content: withDose
          ? 'Pemupukan: beri urea 100 kg/ha saat fase pemupukan. Ikuti label resmi.'
          : 'Artikel ini tidak memuat dosis, hanya pengelolaan umum.',
        source: 'Sumber Uji',
        score: 1,
      },
    ];
  };
}

describe('planEngine — normalizeCrop', () => {
  it('mengenali slug kanonik & alias populer', () => {
    expect(normalizeCrop('padi')).toBe('padi');
    expect(normalizeCrop('Padi')).toBe('padi');
    expect(normalizeCrop('cabai rawit')).toBe('cabai');
    expect(normalizeCrop('bawang merah')).toBe('bawang_merah');
    expect(normalizeCrop('cabe')).toBe('cabai');
    expect(normalizeCrop('beras')).toBe('padi');
  });
  it('menolak komoditas tak dikenal', () => {
    expect(normalizeCrop('durian')).toBeNull();
    expect(normalizeCrop('')).toBeNull();
  });
  it('mengenali alias komoditas baru', () => {
    expect(normalizeCrop('terung')).toBe('terong');
    expect(normalizeCrop('kacang')).toBe('kacang_tanah');
    expect(normalizeCrop('kedelai')).toBe('kedelai');
    expect(normalizeCrop('kentang')).toBe('kentang');
  });
});

describe('planEngine — extractDoseLine', () => {
  it('menganbil baris dosis yg memuat angka + satuan + jenis pupuk', () => {
    const line = extractDoseLine('Pemupukan I: beri urea 100 kg/ha saat 7-14 HST.\nPenyiraman rutin.');
    expect(line).toContain('urea');
    expect(line).toContain('kg/ha');
  });
  it('tidak mengarang bila tak ada angka/satuan dosis', () => {
    expect(extractDoseLine('beri pupuk secukupnya sesuai kondisi lahan')).toBeNull();
    expect(extractDoseLine('jangan lupa menyiram')).toBeNull();
    expect(extractDoseLine('panen saat gabah matang')).toBeNull();
  });
});

describe('planEngine — stageForAge', () => {
  const schedule = { phases: [
    { stage: 'vegetatif', hstStart: 0, hstEnd: 45 },
    { stage: 'panen', hstStart: 110, hstEnd: 135 },
  ] } as Parameters<typeof stageForAge>[0];
  it('memetakan umur ke fase yang benar', () => {
    expect(stageForAge(schedule, 30)).toBe('vegetatif');
    expect(stageForAge(schedule, 130)).toBe('panen');
    expect(stageForAge(schedule, null)).toBe('vegetatif');
  });
});

describe('planEngine — buildSopPlan', () => {
  it('menolak komoditas tidak didukung dengan alasan jelas', async () => {
    const r = await buildSopPlan({ cropType: 'durian' }, { search: fakeSearch(), now: () => NOW });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('durian');
  });

  it('menghasilkan 4 fase padi, grounding KB, tanpa mengarang dosis', async () => {
    const planted = new Date(NOW.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
    const r = await buildSopPlan(
      { cropType: 'padi', plantingDate: planted },
      { search: fakeSearch(), now: () => NOW }
    );
    expect(r.ok).toBe(true);
    expect(r.phases).toHaveLength(4);
    const veg = r.phases?.find((p) => p.stage === 'vegetatif');
    expect(veg?.active).toBe(true);
    expect(veg?.steps.length).toBeGreaterThan(0);
    expect(veg?.source).toBe('Sumber Uji');
    // grounding: dosis hanya dari chunk KB untuk fase pengelolaan yang relevan
    expect(veg!.doseText).toContain('urea');
    expect(veg!.doseText).toContain('kg/ha');
    // fase yang KB-nya tidak memuat dosis → null (tidak mengarang)
    const mat = r.phases?.find((p) => p.stage === 'pematangan');
    expect(mat!.doseText).toBeNull();
  });

  it('fresh tanam → fase vegetatif aktif (usia 0)', async () => {
    const r = await buildSopPlan(
      { cropType: 'padi', plantingDate: '2026-09-09' },
      { search: fakeSearch(), now: () => NOW }
    );
    expect(r.ok).toBe(true);
    expect(r.crop?.ageDays).toBe(0);
    const active = r.phases?.filter((p) => p.active).map((p) => p.stage);
    expect(active).toEqual(['vegetatif']);
  });

  it('growthStage dipakai bila plantingDate tidak ada (mis. lahan belum dibuat)', async () => {
    const r = await buildSopPlan(
      { cropType: 'tomat', growthStage: 'panen' },
      { search: fakeSearch(), now: () => NOW }
    );
    expect(r.ok).toBe(true);
    expect(r.crop?.ageDays).toBeNull();
    expect(r.phases?.find((p) => p.stage === 'panen')?.active).toBe(true);
    expect(r.phases?.find((p) => p.stage === 'vegetatif')?.active).toBe(false);
  });

  it('estimasikan hari panen dari fase terakhir (jadwal per komoditas)', async () => {
    const r = await buildSopPlan({ cropType: 'jagung' }, { search: fakeSearch(), now: () => NOW });
    expect(r.ok).toBe(true);
    expect(r.crop?.harvestDaysEstimate).toBe(100);
  });

  it('semua komoditas didukung punya jadwal fase lengkap', async () => {
    for (const c of SUPPORTED_CROPS) {
      const r = await buildSopPlan({ cropType: c.slug }, { search: fakeSearch(), now: () => NOW });
      expect(r.ok).toBe(true);
      expect(r.phases!.length).toBeGreaterThanOrEqual(3);
      expect(r.crop?.harvestDaysEstimate).toBeGreaterThan(0);
      for (const p of r.phases!) {
        expect(p.steps.length).toBeGreaterThan(0);
      }
    }
  });

  it('kedelai: fase & estimasi panen 85 HST', async () => {
    const r = await buildSopPlan({ cropType: 'kedelai' }, { search: fakeSearch(), now: () => NOW });
    expect(r.ok).toBe(true);
    expect(r.phases).toHaveLength(4);
    expect(r.crop?.label).toBe('Kedelai');
    expect(r.crop?.harvestDaysEstimate).toBe(85);
  });
});