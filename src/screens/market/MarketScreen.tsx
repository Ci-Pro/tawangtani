import React from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Card, SectionHeader } from '@/components/Card';
import { EmptyState, Screen } from '@/components/Screen';
import { PriceChart, ChartPoint } from '@/components/PriceChart';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { syncHargaJikaPerlu, PROVINCE_LIST } from '@/services/kemtanSync';
import { fmtNum } from '@/utils/format';
import { RootProps } from '@/navigation/types';

interface PriceView {
  commodity: string;
  province: string;
  level?: number;
  price: number;
  prevPrice: number | null;
  changePct: number | null;
  trend: 'naik' | 'turun' | 'stabil';
  unit: string;
  hint: string;
}

interface Bucket {
  label: string;
  avg: number;
  min: number;
  max: number;
  close: number;
}

const LABELS: Record<string, string> = {
  gabah_kering_panen: 'GKP',
  gabah_kering_giling: 'GKG',
  beras_medium: 'Beras',
  beras_premium: 'Beras Prem',
  jagung_pipilan: 'Jagung',
  kedelai_kering: 'Kedelai',
  cabai_rawit_merah: 'Cb Rawit',
  cabai_rawit_hijau: 'Cb Rawit Hijau',
  cabai_merah_besar: 'Cb Besar',
  cabai_merah_keriting: 'Cb Keriting',
  cabai_hijau_besar: 'Cb Hijau',
  bawang_merah: 'Bwg Merah',
  bawang_putih: 'Bwg Putih',
  bawang_bombay: 'Bwg Bombay',
  bawang_daun: 'Bwg Daun',
  tomat: 'Tomat',
  kentang: 'Kentang',
  wortel: 'Wortel',
  kol: 'Kol',
  kacang_tanah: 'Kc Tanah',
  kacang_hijau: 'Kc Hijau',
  gula_pasir: 'Gula',
  minyak_goreng_curah: 'MGO Curah',
  minyak_goreng_kemasan: 'MGO Kemasan',
  tepung_terigu: 'Tepung',
  telur_ayam: 'Telur',
  ayam_broiler: 'Ayam',
  sapi_murni: 'Sapi',
  ikan_kembung: 'Kembung',
  ikan_bandeng: 'Bandeng',
  ikan_tongkol: 'Tongkol',
  ikan_lele: 'Lele',
  ikan_nila: 'Nila',
  udang_windu: 'Udang',
};

const LEVELS: { key: number; label: string; sub: string }[] = [
  { key: 3, label: 'Konsumen', sub: 'pasar eceran' },
  { key: 2, label: 'Grosir', sub: 'pasar besar' },
  { key: 1, label: 'Produsen', sub: 'di petani' },
];
const LEVEL_NAME: Record<number, string> = { 1: 'Produsen', 2: 'Grosir', 3: 'Konsumen' };

const PROV_LABEL = (p: string): string =>
  p === 'nasional' ? 'Nasional' : p.replace(/\b\w/g, (c) => c.toUpperCase());

const RANGES: { key: RangeKey; label: string; desc: string }[] = [
  { key: 'daily', label: 'Harian', desc: '30 hari' },
  { key: 'weekly', label: 'Mingguan', desc: '12 minggu' },
  { key: 'monthly', label: 'Bulanan', desc: '24 bulan' },
  { key: 'yearly', label: 'Tahunan', desc: 'per tahun' },
];

type RangeKey = 'daily' | 'weekly' | 'monthly' | 'yearly';

const MarketScreen: React.FC<RootProps<'Market'>> = ({ navigation }) => {
  const { palette } = useTheme();
  const backendUrl = useSettingsStore((s) => s.backendUrl);
  const [prices, setPrices] = React.useState<PriceView[] | null>(null);
  const [selected, setSelected] = React.useState<string>('cabai_rawit_merah');
  const [province, setProvince] = React.useState<string>('nasional');
  const [provModal, setProvModal] = React.useState(false);
  const [level, setLevel] = React.useState<number>(3);
  const [range, setRange] = React.useState<RangeKey>('daily');
  const [buckets, setBuckets] = React.useState<Bucket[] | null>(null);
  const [chartLoading, setChartLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadPrices = React.useCallback(
    async (prov?: string, lvl?: number) => {
      if (!backendUrl) return;
      const p = prov ?? province;
      const l = lvl ?? level;
      try {
        const res = await fetch(
          `${backendUrl.replace(/\/$/, '')}/api/market/prices?province=${encodeURIComponent(p)}&level=${l}`
        );
        if (!res.ok) return;
        const json = (await res.json()) as { prices?: PriceView[] };
        setPrices(json.prices ?? []);
      } catch {}
    },
    [backendUrl, province, level]
  );

  React.useEffect(() => {
    Promise.all([AsyncStorage.getItem('market_province'), AsyncStorage.getItem('market_level')]).then(
      ([pv, lv]) => {
        const p = pv ?? 'nasional';
        if (pv) setProvince(p);
        let l = 3;
        if (lv === '1' || lv === '2' || lv === '3') {
          l = Number(lv);
          setLevel(l);
        }
        loadPrices(p, l);
        syncHargaJikaPerlu(p).then(() => loadPrices(p, l));
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeProvince = (p: string): void => {
    setProvModal(false);
    setProvince(p);
    AsyncStorage.setItem('market_province', p);
    setPrices(null);
    loadPrices(p);
    syncHargaJikaPerlu(p).then(() => loadPrices(p));
  };

  const changeLevel = (l: number): void => {
    setLevel(l);
    AsyncStorage.setItem('market_level', String(l));
    setPrices(null);
    loadPrices(undefined, l);
  };

  React.useEffect(() => {
    if (!backendUrl || !selected) return;
    let alive = true;
    setChartLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `${backendUrl.replace(/\/$/, '')}/api/market/history?commodity=${selected}&range=${range}&province=${encodeURIComponent(province)}&level=${level}`
        );
        if (!res.ok) throw new Error('http');
        const json = (await res.json()) as { buckets?: Bucket[] };
        if (alive) setBuckets(json.buckets ?? []);
      } catch {
        if (alive) setBuckets([]);
      } finally {
        if (alive) setChartLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [backendUrl, selected, range, province]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadPrices();
    setRefreshing(false);
  }, [loadPrices]);

  const current = prices?.find((p) => p.commodity === selected);
  const points: ChartPoint[] = (buckets ?? []).map((b) => ({ label: b.label, value: b.close }));
  const chartPositive =
    points.length >= 2 ? points[points.length - 1].value >= points[0].value : true;
  const periodChangePct =
    points.length >= 2 && points[0].value > 0
      ? Math.round(((points[points.length - 1].value - points[0].value) / points[0].value) * 1000) / 10
      : null;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Pemilih provinsi */}
        <TouchableOpacity
          onPress={() => setProvModal(true)}
          style={[styles.provButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <Ionicons name="location-outline" size={15} color={palette.primary} />
          <Text style={{ color: palette.text, fontWeight: '800', fontSize: 12.5, flex: 1 }}>
            Harga {PROV_LABEL(province)}
          </Text>
          <Ionicons name="chevron-down" size={15} color={palette.textMuted} />
        </TouchableOpacity>

        {/* Pemilih tingkat pasar (PIHPS) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {LEVELS.map((l) => {
            const active = l.key === level;
            return (
              <TouchableOpacity
                key={l.key}
                onPress={() => changeLevel(l.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? palette.primarySoft : palette.surface,
                    borderColor: active ? palette.primary : palette.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? palette.primary : palette.textMuted,
                    fontSize: 12,
                    fontWeight: '800',
                  }}
                >
                  {l.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Pemilih komoditas */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {(prices ?? []).map((p) => {
            const active = p.commodity === selected;
            return (
              <TouchableOpacity
                key={p.commodity}
                onPress={() => setSelected(p.commodity)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? palette.primary : palette.surface,
                    borderColor: active ? palette.primary : palette.border,
                  },
                ]}
              >
                <Text style={{ color: active ? '#fff' : palette.text, fontSize: 12.5, fontWeight: '700' }}>
                  {LABELS[p.commodity] ?? p.commodity}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {!backendUrl && (
          <Card>
            <Text style={{ color: palette.text }}>
              Grafik harga butuh koneksi ke server. Buka Profil → Server AI.
            </Text>
          </Card>
        )}

        {/* Header gaya trading */}
        {current && (
          <Card>
            <View style={styles.priceRow}>
              <View>
                <Text style={[styles.bigPrice, { color: palette.text }]}>
                  Rp{fmtNum(current.price)}
                  <Text style={{ fontSize: 13, color: palette.textMuted }}>/{current.unit}</Text>
                </Text>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                  Referensi {LEVEL_NAME[level]} {PROV_LABEL(province)} •{' '}
                  {LABELS[current.commodity] ?? current.commodity}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      current.trend === 'naik'
                        ? palette.success + '22'
                        : current.trend === 'turun'
                          ? palette.danger + '22'
                          : palette.border + '55',
                  },
                ]}
              >
                <Ionicons
                  name={
                    current.trend === 'naik' ? 'trending-up' : current.trend === 'turun' ? 'trending-down' : 'remove'
                  }
                  size={16}
                  color={
                    current.trend === 'naik'
                      ? palette.success
                      : current.trend === 'turun'
                        ? palette.danger
                        : palette.textMuted
                  }
                />
                <Text
                  style={{
                    color:
                      current.trend === 'naik'
                        ? palette.success
                        : current.trend === 'turun'
                          ? palette.danger
                          : palette.textMuted,
                    fontWeight: '900',
                    fontSize: 13,
                    marginLeft: 4,
                  }}
                >
                  {current.changePct === null ? '—' : `${current.changePct > 0 ? '+' : ''}${current.changePct}%`}
                </Text>
              </View>
            </View>
            {current.hint ? (
              <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 10 }}>💡 {current.hint}</Text>
            ) : null}
          </Card>
        )}

        {/* Tab rentang waktu */}
        <View style={[styles.rangeTabs, { borderColor: palette.border }]}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.key}
              onPress={() => setRange(r.key)}
              style={[
                styles.rangeTab,
                { backgroundColor: range === r.key ? palette.primary : 'transparent' },
              ]}
            >
              <Text style={{ color: range === r.key ? '#fff' : palette.textMuted, fontWeight: '800', fontSize: 12.5 }}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart */}
        <Card>
          {chartLoading ? (
            <ActivityIndicator color={palette.primary} style={{ marginVertical: 60 }} />
          ) : points.length >= 2 ? (
            <>
              <View style={styles.chartHead}>
                <Text style={{ color: palette.textMuted, fontSize: 11.5 }}>
                  {RANGES.find((r) => r.key === range)?.desc} • tutup per periode
                </Text>
                {periodChangePct !== null && (
                  <Text
                    style={{
                      color: chartPositive ? palette.success : palette.danger,
                      fontWeight: '900',
                      fontSize: 12.5,
                    }}
                  >
                    {periodChangePct > 0 ? '+' : ''}
                    {periodChangePct}% / periode
                  </Text>
                )}
              </View>
              <PriceChart points={points} positive={chartPositive} />
              {/* Statistik ala trading */}
              <View style={styles.statRow}>
                {(() => {
                  const vals = points.map((p) => p.value);
                  return (
                    <>
                      <Stat label="Tertinggi" value={`Rp${fmtNum(Math.max(...vals))}`} palette={palette} />
                      <Stat label="Terendah" value={`Rp${fmtNum(Math.min(...vals))}`} palette={palette} />
                      <Stat
                        label="Rata-rata"
                        value={`Rp${fmtNum(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length))}`}
                        palette={palette}
                      />
                    </>
                  );
                })()}
              </View>
            </>
          ) : (
            <EmptyState
              icon="📈"
              title="Belum cukup data"
              subtitle="Riwayat harga terkumpul otomatis setiap hari lewat cron."
            />
          )}
        </Card>

        <TouchableOpacity
          onPress={() =>
            (navigation.navigate as (...args: unknown[]) => void)(
              'Main',
              {
                screen: 'AI',
                params: {
                  prefill: `Analisis tren harga ${LABELS[selected] ?? selected} periode ${range}. Kapan sebaiknya saya menjual?`,
                },
              }
            )
          }
        >
          <Card style={{ backgroundColor: palette.primary + '14', marginTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="analytics-outline" size={20} color={palette.primary} />
              <Text style={{ color: palette.primary, fontWeight: '800', marginLeft: 8 }}>
                Minta AI analisa grafik ini
              </Text>
            </View>
          </Card>
        </TouchableOpacity>

        <SectionHeader title="Semua Komoditas" />

        {(prices ?? []).map((p) => (
          <TouchableOpacity key={p.commodity} onPress={() => setSelected(p.commodity)}>
            <Card style={{ marginBottom: 8 }}>
              <View style={styles.listRow}>
                <Text style={{ color: palette.text, fontWeight: '800', flex: 1 }} numberOfLines={1}>
                  {LABELS[p.commodity] ?? p.commodity}
                </Text>
                <Text style={{ color: palette.text, fontWeight: '900' }}>Rp{fmtNum(p.price)}</Text>
                <Text
                  style={{
                    width: 62,
                    textAlign: 'right',
                    color:
                      p.trend === 'naik' ? palette.success : p.trend === 'turun' ? palette.danger : palette.textMuted,
                    fontSize: 12.5,
                    fontWeight: '800',
                  }}
                >
                  {p.changePct === null ? '' : `${p.changePct > 0 ? '+' : ''}${p.changePct}%`}
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        <Text style={{ color: palette.textMuted, fontSize: 11, marginVertical: 16, textAlign: 'center' }}>
          Sumber resmi Panel Harga ({PROV_LABEL(province)}); riwayat harian terekam otomatis. Harga bisa berbeda dari harga di pasar terdekat Anda.
        </Text>
      </ScrollView>

      <Modal visible={provModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: palette.surface }]}>
            <View style={styles.modalHead}>
              <Text style={{ color: palette.text, fontWeight: '900', fontSize: 16 }}>Pilih Wilayah</Text>
              <TouchableOpacity onPress={() => setProvModal(false)}>
                <Ionicons name="close" size={22} color={palette.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {['nasional', ...PROVINCE_LIST].map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => changeProvince(p)}
                  style={[
                    styles.provItem,
                    p === province && { backgroundColor: palette.primary + '18' },
                  ]}
                >
                  <Text
                    style={{
                      color: p === province ? palette.primary : palette.text,
                      fontWeight: p === province ? '900' : '600',
                    }}
                  >
                    {PROV_LABEL(p)}
                  </Text>
                  {p === province && (
                    <Ionicons name="checkmark" size={18} color={palette.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const Stat: React.FC<{ label: string; value: string; palette: { text: string; textMuted: string } }> = ({
  label,
  value,
  palette,
}) => (
  <View style={{ flex: 1, alignItems: 'center' }}>
    <Text style={{ color: palette.textMuted, fontSize: 10.5 }}>{label}</Text>
    <Text style={{ color: palette.text, fontWeight: '900', fontSize: 12.5 }}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  chipRow: { marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bigPrice: { fontSize: 27, fontWeight: '900' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  rangeTabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  rangeTab: { flex: 1, alignItems: 'center', paddingVertical: 9 },
  chartHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statRow: { flexDirection: 'row', marginTop: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  provButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  provItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
});

export default MarketScreen;
