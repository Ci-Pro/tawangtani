import React from 'react';
import {
  ActivityIndicator,
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

import { Card, SectionHeader } from '@/components/Card';
import { EmptyState, Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { supabase } from '@/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  COMMODITY_LABELS,
  HARVEST_DAYS_DEFAULTS,
  YIELD_DEFAULTS,
  reminderTemplate,
} from '@/constants/commodities';
import { fmtNum } from '@/utils/format';

interface Planting {
  id: string;
  commodity: string;
  name: string;
  area: number;
  planted_at: string;
  harvest_days: number;
  yield_kg_per_ha: number;
  cost_total: number;
  status: 'active' | 'harvested' | 'failed';
}

interface PriceLite {
  commodity: string;
  price: number;
}

function todayISO(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 864e5);
  return d.toISOString().slice(0, 10);
}

const PlantingsScreen: React.FC = () => {
  const { palette } = useTheme();
  const backendUrl = useSettingsStore((s) => s.backendUrl);
  const [items, setItems] = React.useState<Planting[] | null>(null);
  const [prices, setPrices] = React.useState<Record<string, number>>({});
  const [province, setProvince] = React.useState('nasional');
  const [refreshing, setRefreshing] = React.useState(false);

  // Form tambah
  const [formOpen, setFormOpen] = React.useState(false);
  const [fCommodity, setFCommodity] = React.useState('gabah_kering_panen');
  const [fName, setFName] = React.useState('');
  const [fArea, setFArea] = React.useState('');
  const [fPlanted, setFPlanted] = React.useState(todayISO());
  const [fDays, setFDays] = React.useState('');
  const [fYield, setFYield] = React.useState('');
  const [fCost, setFCost] = React.useState('');
  const [fReminders, setFReminders] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [status, setStatus] = React.useState('');

  const loadPrices = React.useCallback(async (prov: string) => {
    if (!backendUrl) return;
    try {
      const res = await fetch(
        `${backendUrl.replace(/\/$/, '')}/api/market/prices?province=${encodeURIComponent(prov)}&level=1`
      );
      if (!res.ok) return;
      const json = (await res.json()) as { prices?: PriceLite[] };
      const map: Record<string, number> = {};
      for (const p of json.prices ?? []) map[p.commodity] = p.price;
      setPrices(map);
    } catch {}
  }, [backendUrl]);

  const load = React.useCallback(async () => {
    if (!backendUrl) return;
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setItems([]);
        return;
      }
      const res = await fetch(`${backendUrl.replace(/\/$/, '')}/api/plantings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('http');
      const json = (await res.json()) as { plantings?: Planting[] };
      setItems(json.plantings ?? []);
    } catch {
      setItems([]);
    }
  }, [backendUrl]);

  React.useEffect(() => {
    (async () => {
      const pv = (await AsyncStorage.getItem('market_province')) ?? 'nasional';
      setProvince(pv);
      await Promise.all([load(), loadPrices(pv)]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hstOf = (p: Planting): number =>
    Math.max(0, Math.floor((Date.parse(todayISO()) - Date.parse(p.planted_at)) / 864e5));

  const profitOf = (p: Planting): number | null => {
    const price = prices[p.commodity];
    if (!price) return null;
    const production =
      p.yield_kg_per_ha > 0 ? (p.area * p.yield_kg_per_ha) : (YIELD_DEFAULTS[p.commodity] ?? 0) * p.area;
    return Math.round(production * price - p.cost_total);
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([load(), loadPrices(province)]);
    setRefreshing(false);
  }, [load, loadPrices, province]);

  const pickCommodity = (c: string): void => {
    setFCommodity(c);
    setFDays(String(HARVEST_DAYS_DEFAULTS[c] ?? 90));
    setFYield(String(YIELD_DEFAULTS[c] ?? ''));
  };

  const submit = async (): Promise<void> => {
    if (!backendUrl) return;
    const area = Number(fArea.replace(',', '.'));
    if (!Number.isFinite(area) || area <= 0) {
      setStatus('Isi luas lahan dengan angka yang benar');
      return;
    }
    const harvestDays = Number(fDays) || HARVEST_DAYS_DEFAULTS[fCommodity] || 90;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fPlanted)) {
      setStatus('Tanggal tanam format YYYY-MM-DD');
      return;
    }
    setSending(true);
    setStatus('');
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setStatus('Masuk dulu lewat layar Profil untuk mencatat tanaman.');
        return;
      }
      const res = await fetch(`${backendUrl.replace(/\/$/, '')}/api/plantings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          commodity: fCommodity,
          name: fName.trim() || COMMODITY_LABELS[fCommodity],
          area,
          plantedAt: fPlanted,
          harvestDays,
          yieldKgPerHa: Number(fYield) || YIELD_DEFAULTS[fCommodity] || 0,
          costTotal: Math.round(Number(fCost.replace(/[^\d]/g, ''))) || 0,
          reminders: fReminders ? reminderTemplate(fCommodity) : [],
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (json.ok) {
        setFormOpen(false);
        setStatus('');
        setFName('');
        setFArea('');
        setFCost('');
        setFPlanted(todayISO());
        await load();
      } else {
        setStatus(json.error ?? 'Gagal menyimpan');
      }
    } catch {
      setStatus('Gagal menghubungi server');
    } finally {
      setSending(false);
    }
  };

  const markHarvested = async (p: Planting): Promise<void> => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;
      await fetch(`${backendUrl?.replace(/\/$/, '')}/api/plantings/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'harvested' }),
      });
      await load();
    } catch {}
  };

  const remove = async (p: Planting): Promise<void> => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;
      await fetch(`${backendUrl?.replace(/\/$/, '')}/api/plantings/${p.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch {}
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Card style={{ backgroundColor: palette.primarySoft }}>
          <Text style={{ color: palette.text, fontWeight: '900', fontSize: 15 }}>
            🌱 Tanamanku & Estimasi Untung
          </Text>
          <Text style={{ color: palette.textMuted, fontSize: 12.5, marginTop: 4 }}>
            Pantau umur tanaman (HST), dapat pengingat otomatis, dan hitung untung-rugi pakai harga
            produsen {province === 'nasional' ? 'nasional' : province} terkini.
          </Text>
        </Card>

        <Button title="+ Catat Tanaman Baru" onPress={() => setFormOpen(true)} />

        {!backendUrl && (
          <Card>
            <Text style={{ color: palette.text }}>Fitur ini butuh koneksi server. Atur di Profil → Server AI.</Text>
          </Card>
        )}

        {items === null ? (
          <ActivityIndicator color={palette.primary} style={{ marginVertical: 40 }} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="🌾"
            title="Belum ada tanaman"
            subtitle="Catat tanaman Anda untuk pantauan HST, pengingat pemupukan, dan estimasi keuntungan."
          />
        ) : (
          <>
            <SectionHeader title="Daftar Tanaman" />
            {items.map((p) => {
              const hst = hstOf(p);
              const pct = Math.min(100, Math.round((hst / p.harvest_days) * 100));
              const profit = profitOf(p);
              const done = p.status !== 'active';
              return (
                <Card key={p.id} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: palette.text, fontWeight: '900', fontSize: 14.5 }} numberOfLines={1}>
                        {COMMODITY_LABELS[p.commodity] ?? p.commodity}
                        {p.name && p.name !== COMMODITY_LABELS[p.commodity] ? ` • ${p.name}` : ''}
                      </Text>
                      <Text style={{ color: palette.textMuted, fontSize: 11.5, marginTop: 2 }}>
                        Tanam {p.planted_at} • {Number(p.area)} ha • HST {hst}/{p.harvest_days}
                        {done ? ` • ${p.status === 'harvested' ? '✔ dipanen' : '✖ gagal'}` : ''}
                      </Text>
                    </View>
                    {profit !== null && !done && (
                      <Text
                        style={{
                          color: profit >= 0 ? palette.success : palette.danger,
                          fontWeight: '900',
                          fontSize: 13.5,
                        }}
                      >
                        {profit >= 0 ? '+' : '−'}Rp{fmtNum(Math.abs(profit))}
                      </Text>
                    )}
                  </View>
                  {!done && (
                    <>
                      <View style={[styles.progressBg, { backgroundColor: palette.border }]}>
                        <View
                          style={{
                            width: `${pct}%`,
                            backgroundColor: pct >= 100 ? palette.success : palette.primary,
                            height: '100%',
                            borderRadius: 6,
                          }}
                        />
                      </View>
                      <Text style={{ color: palette.textMuted, fontSize: 10.5, marginTop: 3 }}>
                        {pct >= 100 ? 'Perkiraan panen telah tiba!' : `${pct}% menuju panen`}
                      </Text>
                    </>
                  )}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    {!done && (
                      <TouchableOpacity
                        onPress={() => markHarvested(p)}
                        style={[styles.rowBtn, { borderColor: palette.success }]}
                      >
                        <Ionicons name="checkmark-circle-outline" size={14} color={palette.success} />
                        <Text style={{ color: palette.success, fontWeight: '800', fontSize: 11.5 }}>
                          Sudah Panen
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => remove(p)}
                      style={[styles.rowBtn, { borderColor: palette.danger }]}
                    >
                      <Ionicons name="trash-outline" size={14} color={palette.danger} />
                      <Text style={{ color: palette.danger, fontWeight: '800', fontSize: 11.5 }}>Hapus</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })}
          </>
        )}

        <Text style={{ color: palette.textMuted, fontSize: 11, marginVertical: 16, textAlign: 'center' }}>
          Pengingat HST dikirim sebagai notifikasi pagi hari. Estimasi untung = produksi × harga
          produsen − biaya; angka riil bisa berbeda.
        </Text>
      </ScrollView>

      {/* Form catat tanaman */}
      <Modal visible={formOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: palette.surface }]}>
            <View style={styles.modalHead}>
              <Text style={{ color: palette.text, fontWeight: '900', fontSize: 16 }}>Catat Tanaman</Text>
              <TouchableOpacity onPress={() => setFormOpen(false)}>
                <Ionicons name="close" size={22} color={palette.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {Object.keys(YIELD_DEFAULTS).map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => pickCommodity(c)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: fCommodity === c ? palette.primary : palette.surface,
                        borderColor: fCommodity === c ? palette.primary : palette.border,
                      },
                    ]}
                  >
                    <Text style={{ color: fCommodity === c ? '#fff' : palette.text, fontSize: 12, fontWeight: '700' }}>
                      {COMMODITY_LABELS[c] ?? c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TextInput
                value={fName}
                onChangeText={setFName}
                placeholder="Nama petak (opsional, mis. Sawah belakang)"
                placeholderTextColor={palette.textMuted}
                style={[styles.input, { backgroundColor: palette.background, borderColor: palette.border, color: palette.text }]}
              />
              <TextInput
                value={fArea}
                onChangeText={setFArea}
                keyboardType="decimal-pad"
                placeholder="Luas (ha), mis. 0.5"
                placeholderTextColor={palette.textMuted}
                style={[styles.input, { backgroundColor: palette.background, borderColor: palette.border, color: palette.text }]}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={fPlanted}
                  onChangeText={setFPlanted}
                  placeholder="Tanam YYYY-MM-DD"
                  placeholderTextColor={palette.textMuted}
                  style={[styles.input, { flex: 1, backgroundColor: palette.background, borderColor: palette.border, color: palette.text }]}
                />
                <TouchableOpacity
                  onPress={() => setFPlanted(todayISO())}
                  style={[styles.presetBtn, { borderColor: palette.border }]}
                >
                  <Text style={{ color: palette.primary, fontWeight: '800', fontSize: 11.5 }}>Hari ini</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={fDays}
                  onChangeText={setFDays}
                  keyboardType="number-pad"
                  placeholder={`Umur panen hari (${HARVEST_DAYS_DEFAULTS[fCommodity] ?? 90})`}
                  placeholderTextColor={palette.textMuted}
                  style={[styles.input, { flex: 1, backgroundColor: palette.background, borderColor: palette.border, color: palette.text }]}
                />
                <TextInput
                  value={fYield}
                  onChangeText={setFYield}
                  keyboardType="number-pad"
                  placeholder="kg/ha"
                  placeholderTextColor={palette.textMuted}
                  style={[styles.input, { flex: 1, backgroundColor: palette.background, borderColor: palette.border, color: palette.text }]}
                />
              </View>
              <TextInput
                value={fCost}
                onChangeText={setFCost}
                keyboardType="number-pad"
                placeholder="Total biaya sejauh ini (Rp)"
                placeholderTextColor={palette.textMuted}
                style={[styles.input, { backgroundColor: palette.background, borderColor: palette.border, color: palette.text }]}
              />
              <TouchableOpacity
                onPress={() => setFReminders(!fReminders)}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
              >
                <Ionicons
                  name={fReminders ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={palette.primary}
                />
                <Text style={{ color: palette.text, fontSize: 12.5, marginLeft: 8 }}>
                  Aktifkan pengingat HST (pupuk, semprot, siap panen)
                </Text>
              </TouchableOpacity>
              {!!status && <Text style={{ color: palette.primary, fontSize: 12.5, marginBottom: 8 }}>{status}</Text>}
              <TouchableOpacity
                onPress={submit}
                disabled={sending}
                style={{
                  backgroundColor: palette.primary,
                  borderRadius: 12,
                  paddingVertical: 13,
                  alignItems: 'center',
                  opacity: sending ? 0.6 : 1,
                }}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '900' }}>Simpan</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  progressBg: { height: 7, borderRadius: 6, marginTop: 10, overflow: 'hidden' },
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  presetBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
});

export default PlantingsScreen;
