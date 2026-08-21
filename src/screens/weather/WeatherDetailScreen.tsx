import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card, SectionHeader } from '@/components/Card';
import { EmptyState, Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { useLocation, useWeather } from '@/hooks/useWeather';
import { describeWeatherCode, sprayCondition } from '@/services/weather/openMeteo';
import { fmtNum } from '@/utils/format';

const WeatherDetailScreen: React.FC = () => {
  const { palette } = useTheme();
  const { coords, locationName, status, request } = useLocation();
  const { data, loading, error, reload } = useWeather();

  if (!coords) {
    return (
      <Screen>
        <EmptyState
          icon="📍"
          title="Lokasi belum aktif"
          subtitle="Izinkan akses lokasi untuk melihat cuaca di sekitar lahan Anda."
        />
        <Button title={status === 'denied' ? 'Coba Lagi' : 'Aktifkan Lokasi'} onPress={request} />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen scroll={false} padded={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: palette.textMuted }}>Memuat cuaca...</Text>
        </View>
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <EmptyState icon="🌩️" title="Cuaca tidak tersedia" subtitle={error ?? undefined} />
        <Button title="Muat Ulang" onPress={reload} />
      </Screen>
    );
  }

  const now = describeWeatherCode(data.current.weatherCode);
  const spray = sprayCondition(data.current);
  const sprayColor =
    spray.level === 'ideal' ? palette.success : spray.level === 'hati-hati' ? palette.warning : palette.danger;

  return (
    <Screen>
      <Card style={{ backgroundColor: palette.primaryDark, borderColor: palette.primaryDark }}>
        <Text style={{ color: '#a7d7b6', fontSize: 13 }}>{locationName || 'Lokasi Anda'}</Text>
        <View style={styles.nowRow}>
          <Ionicons name={(now.icon ?? 'cloudy-outline') as never} size={56} color="#ffffff" />
          <View style={{ marginLeft: 16 }}>
            <Text style={styles.bigTemp}>{fmtNum(data.current.temperature, 1)}°C</Text>
            <Text style={{ color: '#c9ead4', fontSize: 15, fontWeight: '600' }}>{now.desc}</Text>
          </View>
        </View>
        <View style={styles.metrics}>
          <Metric label="Kelembapan" value={`${fmtNum(data.current.humidity, 0)}%`} />
          <Metric label="Angin" value={`${fmtNum(data.current.windSpeed, 0)} km/j`} />
          <Metric label="Hujan" value={`${fmtNum(data.current.precipitation, 1)} mm`} />
        </View>
      </Card>

      <Card style={{ borderLeftWidth: 4, borderLeftColor: sprayColor }}>
        <Text style={{ color: sprayColor, fontWeight: '800', fontSize: 14 }}>
          Kondisi Penyemprotan: {spray.level.toUpperCase()}
        </Text>
        {spray.reasons.map((r, i) => (
          <Text key={i} style={{ color: palette.textMuted, fontSize: 13, marginTop: 3 }}>
            • {r}
          </Text>
        ))}
        <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 8 }}>
          Kondisi lapangan tetap harus diverifikasi langsung oleh pengguna.
        </Text>
      </Card>

      <SectionHeader title="Prakiraan Per Jam" />
      <Card>
        {data.hourly.slice(0, 6).map((h) => {
          const w = describeWeatherCode(h.weatherCode);
          return (
            <View key={h.time} style={styles.hourRow}>
              <Text style={[styles.hourTime, { color: palette.textMuted }]}>
                {new Date(h.time).getHours().toString().padStart(2, '0')}.00
              </Text>
              <Ionicons name={w.icon as never} size={20} color={palette.primary} />
              <Text style={{ color: palette.text, flex: 1, marginLeft: 10 }}>{w.desc}</Text>
              <Text style={{ color: palette.textMuted, fontSize: 12, width: 52 }}>
                💧{h.precipitationProbability}%
              </Text>
              <Text style={{ color: palette.text, fontWeight: '700', width: 44, textAlign: 'right' }}>
                {fmtNum(h.temperature, 0)}°
              </Text>
            </View>
          );
        })}
      </Card>

      <SectionHeader title="Prakiraan Harian" />
      {data.daily.map((d) => {
        const w = describeWeatherCode(d.weatherCode);
        return (
          <Card key={d.date}>
            <View style={styles.dayRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.text, fontWeight: '700' }}>
                  {new Date(d.date).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
                <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>
                  {w.desc} • Hujan {fmtNum(d.precipitationSum, 1)} mm • Angin maks{' '}
                  {fmtNum(d.windMax, 0)} km/j
                </Text>
                {(d.windMax > 20 || d.precipitationSum > 20) && (
                  <Text style={{ color: palette.danger, fontSize: 12, marginTop: 4, fontWeight: '700' }}>
                    ⚠️ Potensi cuaca ekstrem — tunda kegiatan lapangan
                  </Text>
                )}
              </View>
              <Text style={{ color: palette.text, fontWeight: '800' }}>
                {fmtNum(d.tempMin, 0)}°–{fmtNum(d.tempMax, 0)}°
              </Text>
            </View>
          </Card>
        );
      })}
    </Screen>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={{ alignItems: 'center', flex: 1 }}>
    <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 16 }}>{value}</Text>
    <Text style={{ color: '#a7d7b6', fontSize: 11 }}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  nowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  bigTemp: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
  },
  metrics: {
    flexDirection: 'row',
    marginTop: 16,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  hourTime: {
    width: 44,
    fontSize: 12,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});

export default WeatherDetailScreen;
