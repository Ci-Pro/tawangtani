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
import { useActivityStore, activityLabel } from '@/store/useActivityStore';
import { isSameDay } from '@/utils/date';
import { RootStackParamList } from '@/navigation/types';
import {
  fetchWeatherAlerts,
  notifyWeatherAlerts,
  WeatherAlert,
} from '@/services/weatherAlertService';
import { getExpoPushToken } from '@/services/pushRegister';
import { supabase } from '@/services/supabase';

const QUICK_ACTIONS: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: keyof RootStackParamList;
}[] = [
  { label: 'Kalkulator', icon: 'calculator-outline', route: 'FertilizerCalculator' },
  { label: 'Harga', icon: 'pricetags-outline', route: 'Market' },
  { label: 'Produk', icon: 'cube-outline', route: 'ProductList' },
  { label: 'Aktivitas', icon: 'calendar-outline', route: 'Activities' },
  { label: 'Cuaca', icon: 'partly-sunny-outline', route: 'WeatherDetail' },
  { label: 'Panduan', icon: 'help-circle-outline', route: 'Guide' },
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
  const activities = useActivityStore((s) => s.items);
  const toggleDone = useActivityStore((s) => s.toggleDone);
  const todayActivities = activities.filter(
    (a) => !a.done && isSameDay(new Date(`${a.date}T00:00:00`), new Date())
  );
  const wc = weather ? describeWeatherCode(weather.current.weatherCode) : null;
  const spray = weather ? sprayCondition(weather.current) : null;

  const [alerts, setAlerts] = React.useState<WeatherAlert[]>([]);
  const backendUrl = useSettingsStore((s) => s.backendUrl);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!coords) return;
      const result = await fetchWeatherAlerts();
      if (!alive) return;
      setAlerts(result.alerts);
      if (result.isNew && result.alerts.length > 0) await notifyWeatherAlerts(result.alerts);
      if (backendUrl) {
        const token = await getExpoPushToken();
        if (token) {
          const session = await supabase.auth.getSession();
          fetch(`${backendUrl.replace(/\/$/, '')}/api/push/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session.data.session?.access_token
                ? { Authorization: `Bearer ${session.data.session.access_token}` }
                : {}),
            },
            body: JSON.stringify({
              expoToken: token,
              lat: coords.lat,
              lon: coords.lon,
              locationName: locationName ?? '',
            }),
          }).catch(() => undefined);
        }
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords?.lat, coords?.lon, backendUrl]);

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

      {alerts.length > 0 && (
        <TouchableOpacity
          onPress={() => navigation.navigate('WeatherDetail')}
          style={[styles.alertBanner, { backgroundColor: palette.danger + '18' }]}
        >
          <Ionicons name="warning" size={20} color={palette.danger} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: palette.danger, fontWeight: '900', fontSize: 13.5 }}>
              Peringatan Cuaca ({alerts.length})
            </Text>
            <Text style={{ color: palette.text, fontSize: 12, marginTop: 1 }} numberOfLines={2}>
              {alerts[0].message}
            </Text>
          </View>
        </TouchableOpacity>
      )}

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
        title="Aktivitas Hari Ini"
        action="Kelola"
        onAction={() => navigation.navigate('Activities')}
      />
      {todayActivities.length === 0 ? (
        <Card onPress={() => navigation.navigate('Activities')}>
          <Text style={{ color: palette.textMuted, textAlign: 'center', paddingVertical: 8 }}>
            🗓️ Tidak ada jadwal hari ini.{'\n'}Ketuk untuk menambah aktivitas & pengingat.
          </Text>
        </Card>
      ) : (
        todayActivities.slice(0, 3).map((a) => (
          <Card key={a.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity onPress={() => toggleDone(a.id)}>
                <Ionicons name="ellipse-outline" size={22} color={palette.textMuted} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.text, fontWeight: '700', fontSize: 14 }}>
                  {activityLabel(a.activity)}
                  {a.cropLabel ? ` • ${a.cropLabel}` : ''}
                </Text>
                {a.productName ? (
                  <Text style={{ color: palette.textMuted, fontSize: 12 }}>{a.productName}</Text>
                ) : null}
              </View>
              {a.remindAt ? (
                <Ionicons name="notifications" size={16} color={palette.primary} />
              ) : null}
            </View>
          </Card>
        ))
      )}

      <SectionHeader title="Tanaman Aktif" />
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
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
  weatherMain: {
    fontSize: 16,
    fontWeight: '800',
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
