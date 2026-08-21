import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/Button';
import { Card, SectionHeader } from '@/components/Card';
import { Input } from '@/components/Input';
import { EmptyState, Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { useActivityStore, activityLabel } from '@/store/useActivityStore';
import { useFarmStore } from '@/store/useFarmStore';
import { useProductStore } from '@/store/useProductStore';
import {
  ActivityType,
  FarmActivity,
} from '@/types';
import { todayISO, fmtDateID, combineDateTime, isSameDay } from '@/utils/date';
import { RootProps } from '@/navigation/types';

const ACTIVITY_TYPES: ActivityType[] = [
  'tanam',
  'pemupukan',
  'penyemprotan',
  'penyiraman',
  'penyiangan',
  'panen',
  'lainnya',
];

const TYPE_ICON: Record<ActivityType, keyof typeof Ionicons.glyphMap> = {
  tanam: 'leaf',
  pemupukan: 'nutrition',
  penyemprotan: 'flask',
  penyiraman: 'water',
  penyiangan: 'cut',
  panen: 'basket',
  lainnya: 'calendar',
};

const ActivitiesScreen: React.FC<RootProps<'Activities'>> = ({ navigation }) => {
  const { palette } = useTheme();
  const items = useActivityStore((s) => s.items);
  const add = useActivityStore((s) => s.add);
  const toggleDone = useActivityStore((s) => s.toggleDone);
  const remove = useActivityStore((s) => s.remove);
  const farms = useFarmStore((s) => s.farms);
  const products = useProductStore((s) => s.products);

  const [formOpen, setFormOpen] = useState(false);
  const [activity, setActivity] = useState<ActivityType>('penyemprotan');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [doseText, setDoseText] = useState('');
  const [cropId, setCropId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [withReminder, setWithReminder] = useState(true);
  const [remindHour, setRemindHour] = useState('6');
  const [saving, setSaving] = useState(false);

  const crops = farms.flatMap((f) =>
    f.crops.map((c) => ({ id: c.id, farmId: f.id, label: `${c.cropType}${c.variety ? ` (${c.variety})` : ''}` }))
  );
  const selectedCrop = crops.find((c) => c.id === cropId);

  const grouped = useMemo(() => {
    const today = new Date();
    const pending = items.filter((i) => !i.done);
    const doneItems = items.filter((i) => i.done);
    const todayItems = pending.filter((i) => isSameDay(new Date(`${i.date}T00:00:00`), today));
    const upcoming = pending.filter((i) => new Date(`${i.date}T00:00:00`) > today).sort((a, b) => a.date.localeCompare(b.date));
    return { todayItems, upcoming, doneItems };
  }, [items]);

  const resetForm = () => {
    setActivity('penyemprotan');
    setDate(todayISO());
    setNote('');
    setDoseText('');
    setCropId('');
    setProductId('');
    setWithReminder(true);
    setRemindHour('6');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let remindAt: string | undefined;
      if (withReminder) {
        const h = Math.min(23, Math.max(0, Number(remindHour) || 6));
        remindAt = combineDateTime(date, h, 0).toISOString();
      }
      await add({
        farmId: selectedCrop?.farmId,
        cropId: cropId || undefined,
        cropLabel: selectedCrop?.label,
        activity,
        productId: productId || undefined,
        productName: products.find((p) => p.id === productId)?.name,
        doseText: doseText.trim() || undefined,
        date,
        remindAt,
        note: note.trim() || undefined,
      });
      setFormOpen(false);
      resetForm();
      Alert.alert(
        'Tersimpan',
        withReminder
          ? 'Aktivitas disimpan dengan pengingat notifikasi.'
          : 'Aktivitas disimpan.'
      );
    } finally {
      setSaving(false);
    }
  };

  const renderItem = (item: FarmActivity, showDoneToggle = true) => (
    <Card key={item.id}>
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: palette.primarySoft }]}>
          <Ionicons name={TYPE_ICON[item.activity]} size={20} color={palette.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={{ color: palette.text, fontWeight: '800', fontSize: 14.5, flex: 1 }}>
              {activityLabel(item.activity)}
              {item.cropLabel ? ` • ${item.cropLabel}` : ''}
            </Text>
            {item.source === 'ai' ? (
              <View style={[styles.tag, { backgroundColor: `${palette.accent}22` }]}>
                <Text style={{ color: palette.accent, fontSize: 10, fontWeight: '800' }}>AI</Text>
              </View>
            ) : null}
          </View>
          <Text style={{ color: palette.textMuted, fontSize: 12.5, marginTop: 2 }}>
            📅 {fmtDateID(item.date)}
            {item.productName ? ` • ${item.productName}` : ''}
            {item.doseText ? ` (${item.doseText})` : ''}
          </Text>
          {item.note ? (
            <Text style={{ color: palette.textMuted, fontSize: 11.5, marginTop: 2 }}>{item.note}</Text>
          ) : null}
          {item.remindAt && !item.done ? (
            <Text style={{ color: palette.primary, fontSize: 11.5, marginTop: 3, fontWeight: '700' }}>
              🔔 Pengingat aktif
            </Text>
          ) : null}
        </View>
        {showDoneToggle ? (
          <TouchableOpacity onPress={() => toggleDone(item.id)}>
            <Ionicons
              name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={item.done ? palette.success : palette.textMuted}
            />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={() => remove(item.id)} style={{ marginLeft: 8 }}>
          <Ionicons name="trash-outline" size={17} color={palette.danger} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: palette.text }]}>Aktivitas</Text>
          <Text style={{ color: palette.textMuted, fontSize: 13 }}>
            Jadwal budidaya & pengingat
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('ActivityCalendar')}>
          <Ionicons name="calendar-outline" size={26} color={palette.primary} />
        </TouchableOpacity>
        <Button title="+ Tambah" onPress={() => setFormOpen(true)} />
      </View>

      {items.length === 0 ? (
        <EmptyState
          icon="🗓️"
          title="Belum ada aktivitas"
          subtitle="Tambahkan jadwal tanam, pemupukan, atau penyemprotan dengan pengingat notifikasi."
        />
      ) : (
        <>
          <SectionHeader title="Hari Ini" />
          {grouped.todayItems.length === 0 ? (
            <Text style={{ color: palette.textMuted, fontSize: 13, marginBottom: 8 }}>
              Tidak ada aktivitas hari ini.
            </Text>
          ) : (
            grouped.todayItems.map((i) => renderItem(i))
          )}

          {grouped.upcoming.length > 0 ? (
            <>
              <SectionHeader title="Mendatang" />
              {grouped.upcoming.map((i) => renderItem(i))}
            </>
          ) : null}

          {grouped.doneItems.length > 0 ? (
            <>
              <SectionHeader title="Selesai" />
              {grouped.doneItems.map((i) => renderItem(i))}
            </>
          ) : null}
        </>
      )}

      <Modal visible={formOpen} animationType="slide">
        <Screen>
          <SectionHeader title="Tambah Aktivitas" />
          <Card>
            <Text style={{ color: palette.textMuted, fontSize: 12.5, marginBottom: 8 }}>Jenis</Text>
            <View style={styles.chips}>
              {ACTIVITY_TYPES.map((t) => (
                <Chip key={t} label={activityLabel(t)} active={activity === t} onPress={() => setActivity(t)} />
              ))}
            </View>

            <Input label="Tanggal (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder={todayISO()} autoCapitalize="none" />

            {crops.length > 0 ? (
              <>
                <Text style={{ color: palette.textMuted, fontSize: 12.5, marginBottom: 8 }}>
                  Tanaman (opsional)
                </Text>
                <View style={styles.chips}>
                  <Chip label="-" active={cropId === ''} onPress={() => setCropId('')} />
                  {crops.map((c) => (
                    <Chip key={c.id} label={c.label} active={cropId === c.id} onPress={() => setCropId(c.id)} />
                  ))}
                </View>
              </>
            ) : null}

            <Text style={{ color: palette.textMuted, fontSize: 12.5, marginBottom: 8 }}>
              Produk terkait (opsional)
            </Text>
            <View style={styles.chips}>
              <Chip label="-" active={productId === ''} onPress={() => setProductId('')} />
              {products.slice(0, 6).map((p) => (
                <Chip
                  key={p.id}
                  label={p.name}
                  active={productId === p.id}
                  onPress={() => setProductId(p.id)}
                />
              ))}
            </View>

            <Input
              label="Dosis / Takaran (opsional)"
              placeholder="cth: 200 kg/ha"
              value={doseText}
              onChangeText={setDoseText}
            />
            <Input label="Catatan (opsional)" placeholder="cth: blok utara" value={note} onChangeText={setNote} />

            <View style={[styles.reminderRow, { borderColor: palette.border }]}>
              <Ionicons name="notifications-outline" size={20} color={palette.primary} />
              <Text style={{ color: palette.text, fontWeight: '700', flex: 1, marginLeft: 8 }}>
                Pengingat Notifikasi
              </Text>
              <TouchableOpacity
                onPress={() => setWithReminder((v) => !v)}
                style={[
                  styles.reminderToggle,
                  {
                    backgroundColor: withReminder ? palette.primary : palette.surfaceAlt,
                  },
                ]}
              >
                <Text style={{ color: withReminder ? '#fff' : palette.textMuted, fontSize: 12, fontWeight: '800' }}>
                  {withReminder ? 'AKTIF' : 'MATI'}
                </Text>
              </TouchableOpacity>
            </View>
            {withReminder ? (
              <Input
                label="Jam Pengingat (0–23)"
                placeholder="6"
                keyboardType="number-pad"
                value={remindHour}
                onChangeText={setRemindHour}
              />
            ) : null}

            <Button title="Simpan Aktivitas" onPress={handleSave} loading={saving} />
            <Button title="Batal" variant="ghost" onPress={() => setFormOpen(false)} />
          </Card>
        </Screen>
      </Modal>
    </Screen>
  );
};

function Chip(props: { label: string; active: boolean; onPress: () => void }) {
  const { palette } = useTheme();
  return (
    <TouchableOpacity
      onPress={props.onPress}
      style={[
        styles.chip,
        {
          backgroundColor: props.active ? palette.primary : palette.surfaceAlt,
          borderColor: props.active ? palette.primary : palette.border,
        },
      ]}
    >
      <Text style={{ color: props.active ? '#fff' : palette.textMuted, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
        {props.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tag: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  reminderToggle: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
});

export default ActivitiesScreen;
