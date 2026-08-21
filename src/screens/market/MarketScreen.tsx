import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card, SectionHeader } from '@/components/Card';
import { EmptyState, Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { fmtNum } from '@/utils/format';
import { RootProps } from '@/navigation/types';

interface PriceView {
  commodity: string;
  province: string;
  price: number;
  prevPrice: number | null;
  changePct: number | null;
  trend: 'naik' | 'turun' | 'stabil';
  unit: string;
  hint: string;
}

interface PricesResponse {
  sourceLabel?: string;
  prices?: PriceView[];
}

const LABELS: Record<string, string> = {
  bawang_merah: 'Bawang Merah',
  bawang_putih: 'Bawang Putih',
  cabai_rawit_merah: 'Cabai Rawit Merah',
  cabai_merah_besar: 'Cabai Merah Besar',
  tomat: 'Tomat',
  kentang: 'Kentang',
  wortel: 'Wortel',
  kol: 'Kol/Kubis',
  jagung_pipilan: 'Jagung Pipilan',
  beras_medium: 'Beras Medium',
};

const MarketScreen: React.FC<RootProps<'Market'>> = ({ navigation }) => {
  const { palette } = useTheme();
  const backendUrl = useSettingsStore((s) => s.backendUrl);
  const [prices, setPrices] = React.useState<PriceView[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!backendUrl) {
      setError('Atur URL server di menu Profil untuk melihat harga pasar.');
      setPrices(null);
      return;
    }
    setError(null);
    try {
      const res = await fetch(
        `${backendUrl.replace(/\/$/, '')}/api/market/prices`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as PricesResponse;
      setPrices(json.prices ?? []);
    } catch (e) {
      setError('Gagal memuat harga. Periksa koneksi atau server.');
    }
  }, [backendUrl]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: palette.text }]}>Harga Pasar</Text>
            <Text style={{ color: palette.textMuted, fontSize: 13 }}>
              Referensi harga nasional harian
            </Text>
          </View>
        </View>

        {!backendUrl && (
          <Card>
            <Text style={{ color: palette.text }}>
              Harga pasar butuh koneksi ke server. Buka Profil → Server AI, isi URL backend.
            </Text>
          </Card>
        )}

        {error && backendUrl && (
          <Card>
            <Text style={{ color: palette.danger }}>{error}</Text>
          </Card>
        )}

        {prices === null && !error && (
          <ActivityIndicator style={{ marginTop: 24 }} color={palette.primary} />
        )}

        {Array.isArray(prices) && prices.length === 0 && (
          <EmptyState
            icon="📉"
            title="Belum ada data"
            subtitle="Data harga belum tersedia. Tarik ke bawah untuk menyegarkan."
          />
        )}

        {Array.isArray(prices) &&
          prices.map((p) => {
            const up = p.trend === 'naik';
            const down = p.trend === 'turun';
            const trendColor = up ? palette.success : down ? palette.danger : palette.textMuted;
            return (
              <Card key={`${p.commodity}-${p.province}`} style={{ marginBottom: 10 }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.commodity, { color: palette.text }]}>
                      {LABELS[p.commodity] ?? p.commodity}
                    </Text>
                    <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                      Rp{fmtNum(p.prevPrice ?? p.price)} → hari ini
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.price, { color: palette.text }]}>
                      Rp{fmtNum(p.price)}
                      <Text style={{ fontSize: 12, color: palette.textMuted }}>/{p.unit}</Text>
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons
                        name={up ? 'trending-up' : down ? 'trending-down' : 'remove'}
                        size={15}
                        color={trendColor}
                      />
                      <Text style={{ color: trendColor, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>
                        {p.changePct === null
                          ? '—'
                          : `${p.changePct > 0 ? '+' : ''}${p.changePct}%`}
                      </Text>
                    </View>
                  </View>
                </View>
                {p.hint ? (
                  <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 8 }}>
                    💡 {p.hint}
                  </Text>
                ) : null}
              </Card>
            );
          })}

        {Array.isArray(prices) && prices.length > 0 && (
          <TouchableOpacity
            onPress={() =>
              (
                navigation.navigate as (
                  ...args: unknown[]
                ) => void
              )(
                'Main',
                { screen: 'AI', params: { prefill: 'Berdasarkan harga pasar sekarang, kapan waktu terbaik menjual hasil panen saya dan bagaimana strateginya?' } }
              )
            }
          >
            <Card style={{ backgroundColor: palette.primary + '14' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={palette.primary} />
                <Text style={{ color: palette.primary, fontWeight: '800', marginLeft: 8 }}>
                  Tanya AI soal strategi jual
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}

        <Text style={{ color: palette.textMuted, fontSize: 11, marginVertical: 16, textAlign: 'center' }}>
          Data merupakan referensi nasional dan bisa berbeda dari harga di daerah Anda.
        </Text>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerRow: { marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center' },
  commodity: { fontSize: 15.5, fontWeight: '800' },
  price: { fontSize: 16, fontWeight: '900' },
});

export default MarketScreen;
