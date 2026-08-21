import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Card, SectionHeader } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useAuthStore } from '@/store/useAuthStore';
import { useFarmStore } from '@/store/useFarmStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTheme } from '@/theme/ThemeProvider';
import { useLocation, useWeather } from '@/hooks/useWeather';
import { describeWeatherCode, sprayCondition } from '@/services/weather/openMeteo';
import { fmtNum } from '@/utils/format';
import { describeCrop } from '@/features/farm/helpers';
import { RootStackParamList } from '@/navigation/types';

const QUICK_ACTIONS: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: keyof RootStackParamList;
}[] = [
  { label: 'Kalkulator', icon: 'calculator-outline', route: 'FertilizerCalculator' },
  { label: 'Produk', icon: 'cube-outline', route: 'ProductList' },
  { label: 'Riwayat', icon: 'time-outline', route: 'History' },
  { label: 'Cuaca', icon: 'partly-sunny-outline', route: 'WeatherDetail' },
];

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { palette } = useTheme();
  const user = useAuthStore((s) => s.user);
  const farms = useFarmStore((s) => s.farms);
  const coords = useSettingsStore((s) => s.coords);
  const locationName = useSettingsStore((s) => s.locationName);
  const { request } = useLocation();
  const { data: weather, loading, error } = useWeather();

  const crops = farms.flatMap((f) => f.crops);
  const wc = weather ? describeWeatherCode(weather.current.weatherCode) : null;
  const spray = weather ? sprayCondition(weather.current) : null;

  const sprayColor =
    spray?.level === 'ideal'
      ? palette.success
      : spray?.level === 'hati-hati'
        ? palette.warning
        : palette.danger;

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: palette.textMuted }]}>Selamat datang,</Text>
          <Text style={[styles.name, { color: palette.text }]}>{user?.name ?? 'Petani'} 👋</Text>
        </View>
        {!coords ? (
          <TouchableOpacity onPress={request} style={[styles.locBtn, { borderColor: palette.primary }]}>
            <Ionicons name="location-outline" size={16} color={palette.primary} />
            <Text style={{ color: palette.primary, fontSize: 12, fontWeight: '700' }}>Aktifkan Lokasi</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.locRow}>
            <Ionicons name="location" size={14} color={palette.primary} />
            <Text style={[styles.locText, { color: palette.textMuted }]}>
              {locationName || 'Lokasi Anda'}
            </Text>
          </View>
        )}
      </View>

      <Card
        onPress={coords ? () => navigation.navigate('WeatherDetail') : undefined}
        style={{ backgroundColor: palette.primaryDark, borderColor: palette.primaryDark }}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : error || !weather ? (
          <View style={styles.weatherRow}>
            <Ionicons name="cloud-offline-outline" size={34} color="#c9ead4" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.weatherMain}>{error ?? 'Aktifkan lokasi untuk cuaca'}</Text>
              <Text style={styles.weatherSub}>Data cuaca membantu jadwal semprot & tanam</Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.weatherRow}>
              <Ionicons name={(wc?.icon ?? 'cloudy-outline') as never} size={44} color="#ffffff" />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.weatherTemp}>
                  {fmtNum(weather.current.temperature, 1)}°C{' '}
                  <Text style={styles.weatherDesc}>{wc?.desc}</Text>
                </Text>
                <Text style={styles.weatherSub}>
                  Kelembapan {fmtNum(weather.current.humidity, 0)}% • Angin{' '}
                  {fmtNum(weather.current.windSpeed, 0)} km/jam
                </Text>
              </View>
            </View>
            {spray ? (
              <View style={[styles.sprayBadge, { backgroundColor: `${sprayColor}33` }]}>
                <Text style={{ color: sprayColor, fontWeight: '800', fontSize: 13 }}>
                  Kondisi Semprot: {spray.level.toUpperCase()}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </Card>

      <SectionHeader title="Akses Cepat" />
      <View style={styles.quickGrid}>
        {QUICK_ACTIONS.map((a) => (
          <TouchableOpacity
            key={a.label}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(a.route as never)}
            style={[styles.quickItem, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            <Ionicons name={a.icon} size={26} color={palette.primary} />
            <Text style={[styles.quickLabel, { color: palette.text }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionHeader
        title="Tanaman Aktif"
        action="Kelola"
        onAction={() => navigation.navigate('FarmForm')}
      />
      {crops.length === 0 ? (
        <Card onPress={() => navigation.navigate('FarmForm')}>
          <Text style={{ color: palette.textMuted, textAlign: 'center', paddingVertical: 10 }}>
            🌱 Belum ada tanaman.{'\n'}Tambahkan lahan & tanaman untuk konteks AI yang lebih akurat.
          </Text>
        </Card>
      ) : (
        crops.slice(0, 3).map((c) => (
          <Card key={c.id}>
            <Text style={{ color: palette.text, fontWeight: '700', fontSize: 15 }}>
              🌿 {describeCrop(c)}
            </Text>
          </Card>
        ))
      )}

      <Text style={[styles.disclaimer, { color: palette.textMuted }]}>
        TAWANGTANI adalah alat bantu. Selalu ikuti label resmi produk dan rekomendasi penyuluh.
      </Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 13,
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
  },
  locBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locText: {
    fontSize: 12,
    maxWidth: 110,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherTemp: {
    fontSize: 30,
    fontWeight: '900',
    color: '#ffffff',
  },
  weatherDesc: {
    fontSize: 15,
    fontWeight: '600',
  },
  weatherSub: {
    color: '#a7d7b6',
    fontSize: 12,
    marginTop: 2,
  },
  sprayBadge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  quickItem: {
    width: '23%',
    minWidth: 78,
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 18,
    lineHeight: 16,
  },
});

export default HomeScreen;
