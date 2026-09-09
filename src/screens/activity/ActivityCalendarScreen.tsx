import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card, SectionHeader } from '@/components/Card';
import { EmptyState, Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { useActivityStore, activityLabel } from '@/store/useActivityStore';
import { useSopPlanStore } from '@/store/useSopPlanStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { fetchWeatherCached, describeWeatherCode } from '@/services/weather/openMeteo';
import { planStepSchedule, todayISO } from '@/services/ai/sopPlan';
import { ActivityType, FarmActivity, WeatherDailyItem } from '@/types';

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAYS_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const TYPE_COLOR: Record<ActivityType, string> = {
  tanam: '#2f9e44',
  pemupukan: '#e8a713',
  penyemprotan: '#3b82f6',
  penyiraman: '#06b6d4',
  penyiangan: '#8b5cf6',
  panen: '#d9480f',
  lainnya: '#6b7280',
};

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const ActivityCalendarScreen: React.FC = () => {
  const { palette } = useTheme();
  const items = useActivityStore((s) => s.items);
  const toggleDone = useActivityStore((s) => s.toggleDone);
  const remove = useActivityStore((s) => s.remove);
  const addActivity = useActivityStore((s) => s.add);

  const pinned = useSopPlanStore((s) => s.pinned);
  const loggedKeys = useSopPlanStore((s) => s.loggedKeys);
  const markLogged = useSopPlanStore((s) => s.markLogged);

  const coords = useSettingsStore((s) => s.coords);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string>(isoDate(now.getFullYear(), now.getMonth(), now.getDate()));
  const [daily, setDaily] = useState<WeatherDailyItem[] | null>(null);

  useEffect(() => {
    if (!coords) return;
    let alive = true;
    fetchWeatherCached(coords.lat, coords.lon)
      .then((w) => alive && setDaily(w.daily))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [coords?.lat, coords?.lon]);

  const plannedByDate = useMemo(() => {
    const map = new Map<string, Array<{ key: string; label: string; activity: ActivityType; doseText?: string }>>();
    if (!pinned) return map;
    const planned = planStepSchedule(pinned.plan, pinned.base).filter((e) => !loggedKeys.includes(e.key));
    for (const e of planned) {
      map.set(e.date, [
        ...(map.get(e.date) ?? []),
        {
          key: e.key,
          label: `${e.step.title}`,
          activity: e.step.activity,
          doseText: e.phase.doseText ?? undefined,
        },
      ]);
    }
    return map;
  }, [pinned, loggedKeys]);

  const byDate = useMemo(() => {
    const map = new Map<string, FarmActivity[]>();
    for (const it of items) {
      const key = it.date.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), it]);
    }
    return map;
  }, [items]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: Array<{ day: number | null; iso?: string }> = [];
    for (let i = 0; i < offset; i += 1) out.push({ day: null });
    for (let d = 1; d <= daysInMonth; d += 1) out.push({ day: d, iso: isoDate(year, month, d) });
    while (out.length % 7 !== 0) out.push({ day: null });
    return out;
  }, [year, month]);

  const moveMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
  };

  const logPlanned = async (key: string, label: string, activity: ActivityType, date: string, doseText?: string) => {
    const today = todayISO();
    await addActivity({
      cropLabel: pinned?.plan.crop?.label,
      activity,
      date,
      remindAt: date > today ? `${date}T07:00:00` : undefined,
      doseText,
      note: `Rencana SOP ${pinned?.plan.crop?.label ?? ''}`.trim(),
      source: 'ai',
    });
    markLogged(key);
  };

  const selectedItems = byDate.get(selected) ?? [];
  const selectedPlanned = plannedByDate.get(selected) ?? [];

  return (
    <Screen>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => moveMonth(-1)} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color={palette.primary} />
        </TouchableOpacity>
        <Text style={{ color: palette.text, fontWeight: '900', fontSize: 18 }}>
          {MONTHS_ID[month]} {year}
        </Text>
        <TouchableOpacity onPress={() => moveMonth(1)} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={22} color={palette.primary} />
        </TouchableOpacity>
      </View>

      {daily && daily.length > 0 ? (
        <Card>
          <View style={styles.weatherRow}>
            {daily.slice(0, 7).map((d) => {
              const wc = describeWeatherCode(d.weatherCode);
              const isSel = d.date === selected;
              return (
                <TouchableOpacity
                  key={d.date}
                  onPress={() => setSelected(d.date)}
                  style={[
                    styles.weatherCell,
                    isSel && { backgroundColor: palette.primarySoft, borderRadius: 10 },
                  ]}
                >
                  <Text style={{ color: palette.textMuted, fontSize: 10, fontWeight: '700' }}>
                    {new Date(`${d.date}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'short' })}
                  </Text>
                  <Text style={{ fontSize: 14, marginVertical: 2 }}>{wc.icon === 'sunny-outline' ? '☀️' : wc.icon === 'cloudy-outline' ? '⛅' : '🌧️'}</Text>
                  <Text style={{ color: palette.text, fontSize: 11, fontWeight: '800' }}>
                    {Math.round(d.tempMax)}°
                  </Text>
                  {d.precipitationSum > 0.1 ? (
                    <Text style={{ color: '#3b82f6', fontSize: 9 }}>💧{Math.round(d.precipitationSum)}mm</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>
      ) : null}

      <Card>
        <View style={styles.weekRow}>
          {DAYS_ID.map((d) => (
            <Text key={d} style={[styles.weekCell, { color: palette.textMuted }]}>
              {d}
            </Text>
          ))}
        </View>
        <View>
          {Array.from({ length: cells.length / 7 }).map((_, row) => (
            <View key={row} style={styles.weekRow}>
              {cells.slice(row * 7, row * 7 + 7).map((cell, col) => {
                if (!cell.iso) return <View key={col} style={styles.dayCell} />;
                const dayItems = byDate.get(cell.iso) ?? [];
                const dayPlanned = plannedByDate.get(cell.iso) ?? [];
                const isToday = cell.iso === isoDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
                const isSelected = cell.iso === selected;
                return (
                  <TouchableOpacity
                    key={col}
                    style={[
                      styles.dayCell,
                      isSelected && { backgroundColor: palette.primarySoft, borderRadius: 10 },
                    ]}
                    onPress={() => setSelected(cell.iso!)}
                  >
                    <Text
                      style={{
                        color: isSelected ? palette.primary : palette.text,
                        fontWeight: isToday || isSelected ? '900' : '500',
                        fontSize: 13.5,
                      }}
                    >
                      {cell.day}
                    </Text>
                    <View style={styles.dotRow}>
                      {dayItems.slice(0, 2).map((it) => (
                        <View key={it.id} style={[styles.dot, { backgroundColor: TYPE_COLOR[it.activity] }]} />
                      ))}
                      {dayPlanned.slice(0, 2).map((pl) => (
                        <View
                          key={pl.key}
                          style={[styles.dot, styles.dotPlanned, { borderColor: TYPE_COLOR[pl.activity] }]}
                        />
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
        <View style={styles.legendRow}>
          {(Object.keys(TYPE_COLOR) as ActivityType[]).map((t) => (
            <View key={t} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: TYPE_COLOR[t] }]} />
              <Text style={{ color: palette.textMuted, fontSize: 9.5 }}>{activityLabel(t)}</Text>
            </View>
          ))}
          <View style={styles.legendItem}>
            <View style={[styles.dot, styles.dotPlanned, { borderColor: '#6b7280' }]} />
            <Text style={{ color: palette.textMuted, fontSize: 9.5 }}>Rencana SOP</Text>
          </View>
          {pinned ? (
            <View style={styles.legendItem}>
              <Ionicons name="leaf" size={10} color="#2f9e44" />
              <Text style={{ color: palette.textMuted, fontSize: 9.5 }}>
                {pinned.plan.crop?.label} (pin)
              </Text>
            </View>
          ) : null}
        </View>
      </Card>

      <SectionHeader title={`Aktivitas ${selected.split('-').reverse().join('/')}`} />
      {selectedItems.length === 0 && selectedPlanned.length === 0 ? (
        <EmptyState icon="🗓️" title="Tidak ada aktivitas" subtitle="Tambahkan lewat tab Aktivitas atau Rencana SOP." />
      ) : (
        <>
          {selectedItems.map((it) => (
            <Card key={it.id}>
              <View style={styles.itemRow}>
                <View style={[styles.itemDot, { backgroundColor: TYPE_COLOR[it.activity] }]} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: it.done ? palette.textMuted : palette.text,
                      fontWeight: '800',
                      textDecorationLine: it.done ? 'line-through' : 'none',
                    }}
                  >
                    {activityLabel(it.activity)}
                    {it.cropLabel ? ` — ${it.cropLabel}` : ''}
                  </Text>
                  {it.productName ? (
                    <Text style={{ color: palette.textMuted, fontSize: 12.5, marginTop: 2 }}>
                      {it.productName}
                      {it.doseText ? ` • ${it.doseText}` : ''}
                    </Text>
                  ) : null}
                  {it.note ? (
                    <Text style={{ color: palette.textMuted, fontSize: 12.5, marginTop: 2 }}>
                      {it.note}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => toggleDone(it.id)}>
                  <Ionicons
                    name={it.done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={it.done ? palette.primary : palette.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(it.id)}>
                  <Ionicons name="trash-outline" size={19} color={palette.danger} />
                </TouchableOpacity>
              </View>
            </Card>
          ))}

          {selectedPlanned.map((pl) => (
            <Card key={pl.key}>
              <View style={styles.itemRow}>
                <View style={[styles.itemDot, styles.dotPlanned, { borderColor: TYPE_COLOR[pl.activity] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.textMuted, fontWeight: '700' }}>
                    {activityLabel(pl.activity)} — {pl.label}
                  </Text>
                  {pl.doseText ? (
                    <Text style={{ color: palette.textMuted, fontSize: 12.5, marginTop: 2 }}>{pl.doseText}</Text>
                  ) : null}
                  <Text style={{ color: palette.primary, fontSize: 10.5, fontWeight: '800', marginTop: 2 }}>
                    RENCANA SOP {pinned?.plan.crop?.label ?? ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => logPlanned(pl.key, pl.label, pl.activity, selected, pl.doseText)}>
                  <Ionicons name="add-circle-outline" size={24} color={palette.primary} />
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: { padding: 6 },
  weekRow: { flexDirection: 'row' },
  weekCell: { flex: 1, textAlign: 'center', fontSize: 11.5, fontWeight: '700', paddingVertical: 4 },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 6, minHeight: 44 },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 3, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dotPlanned: { backgroundColor: 'transparent', borderWidth: 1, width: 6, height: 6, borderRadius: 3 },
  weatherRow: { flexDirection: 'row', gap: 6 },
  weatherCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.25)',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemDot: { width: 10, height: 10, borderRadius: 5 },
});

export default ActivityCalendarScreen;