import React from 'react';
import {
  ActivityIndicator,
  AppState,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';

import { Card, SectionHeader } from '@/components/Card';
import { EmptyState, Screen } from '@/components/Screen';
import { PriceChart, ChartPoint } from '@/components/PriceChart';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useLocation } from '@/hooks/useWeather';
import { syncHargaJikaPerlu, PROVINCE_LIST } from '@/services/kemtanSync';
import { getExpoPushToken } from '@/services/pushRegister';
import { supabase } from '@/services/supabase';
import { COMMODITY_LABELS as LABELS, MARKET_LEVELS as LEVELS, MARKET_LEVEL_NAME as LEVEL_NAME } from '@/constants/commodities';
import { LEVEL_PLAIN, SUMBER_HARGA_JELASAN, COMMODITY_FRIENDLY } from '@/constants/bahasa';
import { commodityLabel } from '@/constants/bahasaDaerah';
import { fmtNum } from '@/utils/format';
import { saveCache, loadCache, enqueue, processQueue, queueCount } from '@/services/offline';
import { publishMarketWidget } from '@/services/widgetPublish';
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

interface FarmerAgg {
  commodity: string;
  count: number;
  avgSell: number | null;
  avgBuy: number | null;
  min: number;
  max: number;
}

interface FarmerRecent {
  commodity: string;
  village: string;
  role: 'jual' | 'beli';
  price: number;
  unit: string;
  at?: string;
}

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
  const language = useSettingsStore((s) => s.language);
  const gpsProvince = useSettingsStore((s) => s.province);
  const { request: requestLocation } = useLocation();
  const [prices, setPrices] = React.useState<PriceView[] | null>(null);
  const [selected, setSelected] = React.useState<string>('cabai_rawit_merah');
  const [province, setProvince] = React.useState<string>('nasional');
  const [provModal, setProvModal] = React.useState(false);
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [level, setLevel] = React.useState<number>(3);
  const [range, setRange] = React.useState<RangeKey>('daily');
  const [buckets, setBuckets] = React.useState<Bucket[] | null>(null);
  const [chartLoading, setChartLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [offline, setOffline] = React.useState(false);
  const [loadError, setLoadError] = React.useState(false);
  const [pendingSync, setPendingSync] = React.useState(0);

  // Laporan petani
  const [farmerAgg, setFarmerAgg] = React.useState<FarmerAgg[]>([]);
  const [farmerRecent, setFarmerRecent] = React.useState<FarmerRecent[]>([]);
  const [reportModal, setReportModal] = React.useState(false);
  const [repCommodity, setRepCommodity] = React.useState<string>('cabai_rawit_merah');
  const [repRole, setRepRole] = React.useState<'jual' | 'beli'>('jual');
  const [repPrice, setRepPrice] = React.useState('');
  const [repVillage, setRepVillage] = React.useState('');
  const [repStatus, setRepStatus] = React.useState<string>('');
  const [repSending, setRepSending] = React.useState(false);

  // Alarm harga
  const [alertModal, setAlertModal] = React.useState(false);
  const [alertDir, setAlertDir] = React.useState<'above' | 'below'>('below');
  const [alertTarget, setAlertTarget] = React.useState('');
  const [alertStatus, setAlertStatus] = React.useState<string>('');
  const [alertSending, setAlertSending] = React.useState(false);

  // Notifikasi pintar (perubahan harga >5%)
  const [smartOn, setSmartOn] = React.useState(false);
  const [smartLoading, setSmartLoading] = React.useState(false);
  const [smartAlertStatus, setSmartAlertStatus] = React.useState<string>('');

  const loadPrices = React.useCallback(
    async (prov?: string, lvl?: number) => {
      if (!backendUrl) return;
      const p = prov ?? province;
      const l = lvl ?? level;
      try {
        const res = await fetch(
          `${backendUrl.replace(/\/$/, '')}/api/market/prices?province=${encodeURIComponent(p)}&level=${l}`
        );
        if (!res.ok) throw new Error('http');
        const json = (await res.json()) as { prices?: PriceView[] };
        const rows = json.prices ?? [];
        setPrices(rows);
        setOffline(false);
        setLoadError(false);
        saveCache(`market_${p}_${l}`, rows);
        publishMarketWidget(
          rows.map((r) => ({ name: commodityLabel(r.commodity, language), price: r.price })),
          p
        );
      } catch {
        const cached = await loadCache<PriceView[]>(`market_${p}_${l}`);
        if (cached && cached.data.length > 0) {
          setPrices(cached.data);
          setOffline(true);
          setLoadError(false);
        } else {
          setPrices([]);
          setLoadError(true);
        }
      }
    },
    [backendUrl, province, level]
  );

  const loadReports = React.useCallback(async (prov?: string) => {
    if (!backendUrl) return;
    const p = prov ?? province;
    try {
      const res = await fetch(
        `${backendUrl.replace(/\/$/, '')}/api/market/reports?province=${encodeURIComponent(p)}&days=30`
      );
      if (!res.ok) return;
      const json = (await res.json()) as { aggregates?: FarmerAgg[]; recent?: FarmerRecent[] };
      setFarmerAgg(json.aggregates ?? []);
      setFarmerRecent(json.recent ?? []);
    } catch {}
  }, [backendUrl, province]);

  React.useEffect(() => {
    Promise.all([AsyncStorage.getItem('market_province'), AsyncStorage.getItem('market_level')]).then(
      ([pv, lv]) => {
        const p = pv ?? gpsProvince ?? 'nasional';
        if (pv || gpsProvince) setProvince(p);
        let l = 3;
        if (lv === '1' || lv === '2' || lv === '3') {
          l = Number(lv);
          setLevel(l);
        }
        loadPrices(p, l);
        loadReports(p);
        syncHargaJikaPerlu(p).then(() => loadPrices(p, l));
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsProvince]);

  // Sinkronkan antrean offline saat layar dibuka / aplikasi kembali aktif
  React.useEffect(() => {
    const flush = async (): Promise<void> => {
      if (!backendUrl) return;
      const n = await processQueue(backendUrl);
      if (n > 0) {
        setPendingSync(0);
        loadReports();
        loadPrices();
      } else {
        setPendingSync(await queueCount());
      }
    };
    flush();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') flush();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendUrl]);

  const changeProvince = (p: string): void => {    setProvModal(false);
    setProvince(p);
    AsyncStorage.setItem('market_province', p);
    setPrices(null);
    loadPrices(p);
    loadReports(p);
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
    await Promise.all([loadPrices(), loadReports()]);
    setRefreshing(false);
  }, [loadPrices, loadReports]);

  const submitReport = async (): Promise<void> => {
    if (!backendUrl) return;
    const price = Math.round(Number(repPrice.replace(/[^\d]/g, '')));
    if (!Number.isFinite(price) || price < 500) {
      setRepStatus('Isi harga yang wajar');
      return;
    }
    setRepSending(true);
    setRepStatus('');
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setRepStatus('Masuk dulu lewat layar Profil untuk melapor.');
        return;
      }
      const res = await fetch(`${backendUrl.replace(/\/$/, '')}/api/market/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          commodity: repCommodity,
          price,
          role: repRole,
          province,
          village: repVillage.trim(),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; status?: string; error?: string };
      if (json.ok && json.status === 'approved') {
        setRepStatus('Terima kasih! Laporan Anda langsung tampil.');
        setRepPrice('');
        setRepVillage('');
        loadReports();
        setTimeout(() => {
          setReportModal(false);
          setRepStatus('');
        }, 1500);
      } else if (json.ok && json.status === 'pending') {
        setRepStatus('Diterima & sedang diverifikasi (harga menyimpang jauh dari acuan).');
      } else {
        setRepStatus(json.error ?? 'Gagal mengirim');
      }
    } catch {
      await enqueue('report', '/api/market/report', {
        commodity: repCommodity,
        price,
        role: repRole,
        province,
        village: repVillage.trim(),
      });
      setPendingSync(await queueCount());
      setRepStatus('Sinyal hilang — laporan disimpan & dikirim otomatis saat online.');
      setRepPrice('');
      setTimeout(() => setReportModal(false), 1600);
    } finally {
      setRepSending(false);
    }
  };

  const createAlert = async (): Promise<void> => {
    if (!backendUrl) return;
    const target = Math.round(Number(alertTarget.replace(/[^\d]/g, '')));
    if (!Number.isFinite(target) || target < 500) {
      setAlertStatus('Isi target harga yang wajar');
      return;
    }
    setAlertSending(true);
    setAlertStatus('');
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setAlertStatus('Masuk dulu lewat layar Profil untuk memasang alarm.');
        return;
      }
      const expoToken = await getExpoPushToken();
      if (!expoToken) {
        setAlertStatus('Izinkan notifikasi untuk aplikasi ini terlebih dahulu.');
        return;
      }
      const res = await fetch(`${backendUrl.replace(/\/$/, '')}/api/push/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          expoToken,
          commodity: selected,
          target,
          direction: alertDir,
          province,
          level,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (json.ok) {
        setAlertStatus('Alarm aktif! Anda akan diberi notifikasi saat harga tersentuh.');
        setTimeout(() => {
          setAlertModal(false);
          setAlertStatus('');
        }, 1700);
      } else {
        setAlertStatus(json.error ?? 'Gagal membuat alarm');
      }
    } catch {
      const expoToken2 = await getExpoPushToken();
      if (expoToken2) {
        await enqueue('alert', '/api/push/alerts', {
          expoToken: expoToken2,
          commodity: selected,
          target,
          direction: alertDir,
          province,
          level,
        });
        setPendingSync(await queueCount());
        setAlertStatus('Sinyal hilang — alarm disimpan & dikirim otomatis saat online.');
        setTimeout(() => {
          setAlertModal(false);
          setAlertStatus('');
        }, 1800);
      } else {
        setAlertStatus('Gagal, coba lagi');
      }
    } finally {
      setAlertSending(false);
    }
  };

  const current = prices?.find((p) => p.commodity === selected);
  const points: ChartPoint[] = (buckets ?? []).map((b) => ({ label: b.label, value: b.close }));
  const chartPositive =
    points.length >= 2 ? points[points.length - 1].value >= points[0].value : true;
  const periodChangePct =
    points.length >= 2 && points[0].value > 0
      ? Math.round(((points[points.length - 1].value - points[0].value) / points[0].value) * 1000) / 10
      : null;

  // TTS harga — setelah `current` dideklarasikan
  const [speaking, setSpeaking] = React.useState(false);

  const speakPrice = React.useCallback(() => {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    if (!current) return;
    const nama = commodityLabel(current.commodity, language);
    const tingkat = LEVEL_PLAIN[level]?.title ?? `tingkat ${level}`;
    const ttsLang = language === 'jv' ? 'id-ID' : language === 'su' ? 'id-ID' : language === 'ms' ? 'ms-MY' : 'id-ID';
    const teks = `Harga ${nama} di ${PROV_LABEL(province)} Rp${fmtNum(current.price)} per ${current.unit}, tingkat ${tingkat}.`;
    setSpeaking(true);
    Speech.speak(teks, {
      language: ttsLang,
      rate: 0.9,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }, [current, level, province, speaking, language]);

  // Smart alert toggle — setelah `current` dideklarasikan
  const toggleSmartAlert = React.useCallback(async () => {
    if (!current) return;
    setSmartLoading(true);
    try {
      const token = await getExpoPushToken();
      const { data: sess } = await supabase.auth.getSession();
      const jwt = sess.session?.access_token;
      if (!jwt) {
        setSmartAlertStatus('Masuk dulu untuk mengaktifkan notifikasi pintar.');
        setSmartLoading(false);
        return;
      }
      if (smartOn) {
        const res = await fetch(`${backendUrl.replace(/\/$/, '')}/api/push/change-alerts`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        const data = await res.json();
        const my = (data.alerts ?? []).find(
          (a: any) => a.commodity === selected && a.province === province && a.level === level
        );
        if (my) {
          await fetch(`${backendUrl.replace(/\/$/, '')}/api/push/change-alerts?id=${my.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${jwt}` },
          });
        }
        setSmartOn(false);
      } else {
        await fetch(`${backendUrl.replace(/\/$/, '')}/api/push/change-alerts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
          body: JSON.stringify({ expoToken: token, commodity: selected, province, level, threshold: 5 }),
        });
        setSmartOn(true);
      }
    } catch {}
    setSmartLoading(false);
  }, [current, smartOn, selected, province, level, backendUrl]);

  // Load smart alert status on mount / commodity change
  React.useEffect(() => {
    if (!backendUrl || !current) return;
    let alive = true;
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const jwt = sess.session?.access_token;
        if (!jwt) return;
        const res = await fetch(`${backendUrl.replace(/\/$/, '')}/api/push/change-alerts`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        const data = await res.json();
        if (!alive) return;
        const my = (data.alerts ?? []).find(
          (a: any) => a.commodity === selected && a.province === province && a.level === level
        );
        setSmartOn(!!my);
      } catch {}
    })();
    return () => { alive = false; };
  }, [backendUrl, selected, province, level]);

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {offline && (
          <View style={[styles.offlineBar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Ionicons name="cloud-offline-outline" size={14} color={palette.primary} />
            <Text style={[styles.offlineText, { color: palette.textMuted }]}>
              Offline — menampilkan data terakhir yang tersimpan
            </Text>
          </View>
        )}
        {pendingSync > 0 && (
          <View style={[styles.offlineBar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Ionicons name="sync-outline" size={14} color={palette.primary} />
            <Text style={[styles.offlineText, { color: palette.textMuted }]}>
              {pendingSync} aksi menunggu dikirim otomatis saat online
            </Text>
          </View>
        )}
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

        {loadError ? (
          <View
            style={{
              alignItems: 'center',
              padding: 24,
              marginVertical: 10,
              backgroundColor: palette.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <Ionicons name="cloud-offline-outline" size={34} color={palette.textMuted} />
            <Text style={{ color: palette.text, fontWeight: '800', marginTop: 10 }}>
              Gagal memuat harga
            </Text>
            <Text style={{ color: palette.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
              Periksa koneksi internet Anda lalu coba lagi.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setLoadError(false);
                setPrices(null);
                loadPrices();
                loadReports();
              }}
              style={{
                marginTop: 12,
                paddingHorizontal: 18,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: palette.primary,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12.5 }}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : null}

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
                  {LEVEL_PLAIN[l.key]?.title ?? l.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {LEVEL_PLAIN[level] ? (
          <Text style={{ color: palette.textMuted, fontSize: 11.5, marginTop: -2, marginBottom: 6, lineHeight: 16 }}>
            💡 {LEVEL_PLAIN[level].jelasan}
          </Text>
        ) : null}

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
                  {commodityLabel(p.commodity, language)}
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
                  {commodityLabel(current.commodity, language)}{' '}
                  • {LEVEL_PLAIN[level]?.sub ?? `tingkat ${LEVEL_NAME[level]}`} • {PROV_LABEL(province)}
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
              <TouchableOpacity
                onPress={speakPrice}
                style={{
                  marginLeft: 8,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: speaking ? palette.primary + '22' : palette.border + '55',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                accessibilityLabel={speaking ? 'Hentikan suara' : 'Dengarkan harga'}
              >
                <Ionicons
                  name={speaking ? 'volume-high' : 'volume-medium'}
                  size={18}
                  color={speaking ? palette.primary : palette.textMuted}
                />
              </TouchableOpacity>
            </View>
            {current.hint ? (
              <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 10 }}>💡 {current.hint}</Text>
            ) : null}
          </Card>
        )}

        {/* Aksi: lapor harga & alarm */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => {
              setRepCommodity(selected);
              setReportModal(true);
            }}
            style={[styles.actionBtn, { backgroundColor: palette.primarySoft, borderColor: palette.primary }]}
          >
            <Ionicons name="create-outline" size={16} color={palette.primary} />
            <Text style={{ color: palette.primary, fontWeight: '800', fontSize: 12.5 }}>
              Lapor Harga
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (current) setAlertTarget(String(current.price));
              setAlertStatus('');
              setAlertModal(true);
            }}
            style={[styles.actionBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            <Ionicons name="notifications-outline" size={16} color={palette.textMuted} />
            <Text style={{ color: palette.text, fontWeight: '800', fontSize: 12.5 }}>Alarm Harga</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleSmartAlert}
            disabled={smartLoading}
            style={[
              styles.actionBtn,
              {
                backgroundColor: smartOn ? palette.primary + '18' : palette.surface,
                borderColor: smartOn ? palette.primary : palette.border,
              },
            ]}
          >
            <Ionicons
              name={smartOn ? 'notifications' : 'notifications-off-outline'}
              size={16}
              color={smartOn ? palette.primary : palette.textMuted}
            />
            <Text
              style={{
                color: smartOn ? palette.primary : palette.text,
                fontWeight: '800',
                fontSize: 12.5,
              }}
            >
              {smartLoading ? '...' : smartOn ? 'Pintar: ON' : 'Pintar: OFF'}
            </Text>
          </TouchableOpacity>
        </View>

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

        <SectionHeader title="Laporan Petani" />

        {farmerAgg.length === 0 ? (
          <Card>
            <Text style={{ color: palette.textMuted, fontSize: 13 }}>
              Belum ada laporan harga petani di {PROV_LABEL(province)} bulan ini. Jadi yang pertama
              dengan menekan tombol Lapor Harga di atas!
            </Text>
          </Card>
        ) : (
          <>
            {farmerAgg.slice(0, 6).map((a) => (
              <TouchableOpacity key={a.commodity} onPress={() => setSelected(a.commodity)}>
                <Card style={{ marginBottom: 8 }}>
                  <View style={styles.listRow}>
                    <Text style={{ color: palette.text, fontWeight: '800', flex: 1 }} numberOfLines={1}>
                      {commodityLabel(a.commodity, language)}
                    </Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: palette.text, fontWeight: '900' }}>
                        {a.avgSell ? `Rp${fmtNum(a.avgSell)}` : `Rp${fmtNum(a.avgBuy ?? 0)}`}
                        <Text style={{ color: palette.textMuted, fontSize: 11, fontWeight: '600' }}>
                          {a.avgSell ? ' (jual)' : ' (beli)'}
                        </Text>
                      </Text>
                      <Text style={{ color: palette.textMuted, fontSize: 10.5 }}>
                        {a.count} laporan • Rp{fmtNum(a.min)}–{fmtNum(a.max)}
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
            {farmerRecent.length > 0 && (
              <Card>
                <Text style={{ color: palette.textMuted, fontSize: 11.5, marginBottom: 6 }}>
                  Terbaru:
                </Text>
                {farmerRecent.slice(0, 5).map((r, i) => (
                  <Text key={i} style={{ color: palette.text, fontSize: 12, marginBottom: 3 }} numberOfLines={1}>
                    • {commodityLabel(r.commodity, language)} Rp{fmtNum(r.price)}/{r.unit}
                    {r.village ? ` — ${r.village}` : ''} ({r.role})
                  </Text>
                ))}
              </Card>
            )}
          </>
        )}

        <SectionHeader title="Semua Komoditas" />

        {(prices ?? []).map((p) => (
          <TouchableOpacity key={p.commodity} onPress={() => setSelected(p.commodity)}>
            <Card style={{ marginBottom: 8 }}>
              <View style={styles.listRow}>
                <Text style={{ color: palette.text, fontWeight: '800', flex: 1 }} numberOfLines={1}>
                  {commodityLabel(p.commodity, language)}
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

        <TouchableOpacity
          onPress={() => setInfoOpen(!infoOpen)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginVertical: 14,
            alignSelf: 'center',
          }}
        >
          <Ionicons
            name={infoOpen ? 'chevron-up' : 'help-circle-outline'}
            size={15}
            color={palette.primary}
          />
          <Text style={{ color: palette.primary, fontSize: 12, fontWeight: '700' }}>
            Dari mana data harga ini?
          </Text>
        </TouchableOpacity>
        {infoOpen ? (
          <View
            style={{
              backgroundColor: palette.surfaceAlt,
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: palette.textMuted, fontSize: 11.5, lineHeight: 18 }}>
              💡 {SUMBER_HARGA_JELASAN} Riwayat harga harian terekam otomatis sehingga tren bisa
              dilihat kapan saja.
            </Text>
          </View>
        ) : null}
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
              <TouchableOpacity
                onPress={async () => {
                  setProvModal(false);
                  await AsyncStorage.removeItem('market_province');
                  await requestLocation();
                }}
                style={[styles.provItem, { backgroundColor: palette.primary + '12', marginBottom: 4 }]}
              >
                <Ionicons name="locate" size={16} color={palette.primary} />
                <Text style={{ color: palette.primary, fontWeight: '700', marginLeft: 8 }}>
                  Deteksi Otomatis
                </Text>
              </TouchableOpacity>
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
      <Modal visible={reportModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: palette.surface }]}>
            <View style={styles.modalHead}>
              <Text style={{ color: palette.text, fontWeight: '900', fontSize: 16 }}>Lapor Harga Nyata</Text>
              <TouchableOpacity onPress={() => setReportModal(false)}>
                <Ionicons name="close" size={22} color={palette.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {Object.keys(LABELS).map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setRepCommodity(c)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: repCommodity === c ? palette.primary : palette.surface,
                      borderColor: repCommodity === c ? palette.primary : palette.border,
                    },
                  ]}
                >
                  <Text style={{ color: repCommodity === c ? '#fff' : palette.text, fontSize: 12, fontWeight: '700' }}>
                    {commodityLabel(c, language)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={[styles.rangeTabs, { borderColor: palette.border }]}>
              {(['jual', 'beli'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRepRole(r)}
                  style={[styles.rangeTab, { backgroundColor: repRole === r ? palette.primary : 'transparent' }]}
                >
                  <Text style={{ color: repRole === r ? '#fff' : palette.textMuted, fontWeight: '800', fontSize: 12.5 }}>
                    {r === 'jual' ? 'Saya Jual' : 'Saya Beli'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={repPrice}
              onChangeText={setRepPrice}
              keyboardType="number-pad"
              placeholder={`Harga per kg di ${repRole === 'jual' ? 'petani' : 'kios'} (Rp)`}
              placeholderTextColor={palette.textMuted}
              style={[styles.input, { backgroundColor: palette.background, borderColor: palette.border, color: palette.text }]}
            />
            <TextInput
              value={repVillage}
              onChangeText={setRepVillage}
              placeholder="Nama desa / pasar (opsional)"
              placeholderTextColor={palette.textMuted}
              style={[styles.input, { backgroundColor: palette.background, borderColor: palette.border, color: palette.text }]}
            />
            {!!repStatus && (
              <Text style={{ color: palette.primary, fontSize: 12.5, marginBottom: 8 }}>{repStatus}</Text>
            )}
            <TouchableOpacity
              onPress={submitReport}
              disabled={repSending}
              style={{ backgroundColor: palette.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', opacity: repSending ? 0.6 : 1 }}
            >
              {repSending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '900' }}>Kirim Laporan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={alertModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: palette.surface }]}>
            <View style={styles.modalHead}>
              <Text style={{ color: palette.text, fontWeight: '900', fontSize: 16 }}>
                Alarm Harga {commodityLabel(selected, language)}
              </Text>
              <TouchableOpacity onPress={() => setAlertModal(false)}>
                <Ionicons name="close" size={22} color={palette.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: palette.textMuted, fontSize: 12.5, marginBottom: 10 }}>
              {PROV_LABEL(province)} • tingkat {LEVEL_NAME[level]} • sekali picu lalu nonaktif otomatis.
            </Text>
            <View style={[styles.rangeTabs, { borderColor: palette.border }]}>
              {(['below', 'above'] as const).map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setAlertDir(d)}
                  style={[styles.rangeTab, { backgroundColor: alertDir === d ? palette.primary : 'transparent' }]}
                >
                  <Text style={{ color: alertDir === d ? '#fff' : palette.textMuted, fontWeight: '800', fontSize: 12.5 }}>
                    {d === 'below' ? 'Turun di bawah' : 'Naik di atas'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={alertTarget}
              onChangeText={setAlertTarget}
              keyboardType="number-pad"
              placeholder="Target harga (Rp)"
              placeholderTextColor={palette.textMuted}
              style={[styles.input, { backgroundColor: palette.background, borderColor: palette.border, color: palette.text }]}
            />
            {!!alertStatus && (
              <Text style={{ color: palette.primary, fontSize: 12.5, marginBottom: 8 }}>{alertStatus}</Text>
            )}
            <TouchableOpacity
              onPress={createAlert}
              disabled={alertSending}
              style={{ backgroundColor: palette.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', opacity: alertSending ? 0.6 : 1 }}
            >
              {alertSending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '900' }}>Pasang Alarm</Text>
              )}
            </TouchableOpacity>
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
  offlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  offlineText: { fontSize: 12, flex: 1, fontWeight: '600' },
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
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
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
