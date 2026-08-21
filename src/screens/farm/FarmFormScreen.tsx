import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card, SectionHeader } from '@/components/Card';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { useFarmStore } from '@/store/useFarmStore';
import { AREA_UNITS, AREA_LABEL, parseIdNumber } from '@/utils/format';
import { GROWTH_STAGES, GROWTH_STAGE_LABEL } from '@/features/farm/helpers';
import { AreaUnit, GrowthStage } from '@/types';

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
      <Text style={{ color: props.active ? '#fff' : palette.textMuted, fontSize: 12.5, fontWeight: '700' }}>
        {props.label}
      </Text>
    </TouchableOpacity>
  );
}

const FarmFormScreen: React.FC<{ farmId?: string }> = ({ farmId }) => {
  const { palette } = useTheme();
  const farms = useFarmStore((s) => s.farms);
  const addFarm = useFarmStore((s) => s.addFarm);
  const addCrop = useFarmStore((s) => s.addCrop);
  const existing = farms.find((f) => f.id === farmId);

  const [name, setName] = useState(existing?.name ?? '');
  const [areaValue, setAreaValue] = useState(existing ? String(existing.areaValue) : '');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>(existing?.areaUnit ?? 'ha');
  const [location, setLocation] = useState(existing?.location ?? '');

  const [cropType, setCropType] = useState('');
  const [variety, setVariety] = useState('');
  const [plantingDate, setPlantingDate] = useState('');
  const [stage, setStage] = useState<GrowthStage>('vegetatif');

  const handleSaveFarm = () => {
    const a = parseIdNumber(areaValue);
    if (!name.trim() || a === null) {
      Alert.alert('Data belum lengkap', 'Isi nama lahan dan luas dengan benar.');
      return;
    }
    if (existing) return;
    addFarm({ name: name.trim(), areaValue: a, areaUnit, location: location.trim() || undefined });
    Alert.alert('Berhasil', 'Lahan tersimpan.', [
      { text: 'OK', onPress: () => setJustAdded(true) },
    ]);
  };

  const [justAdded, setJustAdded] = useState(false);

  const currentFarm = justAdded ? farms[farms.length - 1] : existing;

  const handleAddCrop = () => {
    if (!currentFarm || !cropType.trim()) {
      Alert.alert('Data belum lengkap', 'Isi jenis tanaman terlebih dahulu.');
      return;
    }
    addCrop(currentFarm.id, {
      cropType: cropType.trim(),
      variety: variety.trim() || undefined,
      plantingDate: plantingDate.trim() || undefined,
      growthStage: stage,
    });
    setCropType('');
    setVariety('');
    setPlantingDate('');
    Alert.alert('Berhasil', 'Tanaman ditambahkan ke lahan.');
  };

  return (
    <Screen>
      {!existing && !justAdded ? (
        <Card>
          <SectionHeader title="Profil Lahan" />
          <Input label="Nama Lahan" placeholder="cth: Sawah Utara" value={name} onChangeText={setName} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input label="Luas" placeholder="cth: 5000" keyboardType="decimal-pad" value={areaValue} onChangeText={setAreaValue} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Lokasi (opsional)" placeholder="cth: Desa Sukamaju" value={location} onChangeText={setLocation} />
            </View>
          </View>
          <View style={styles.chips}>
            {AREA_UNITS.map((u) => (
              <Chip key={u} label={AREA_LABEL[u]} active={areaUnit === u} onPress={() => setAreaUnit(u)} />
            ))}
          </View>
          <Button title="Simpan Lahan" onPress={handleSaveFarm} />
        </Card>
      ) : (
        <Card>
          <Text style={{ color: palette.primary, fontWeight: '800', fontSize: 15 }}>
            ✅ Lahan "{currentFarm?.name}" siap
          </Text>
          <Text style={{ color: palette.textMuted, fontSize: 13, marginTop: 4 }}>
            Tambahkan tanaman untuk melengkapi konteks AI.
          </Text>
        </Card>
      )}

      <Card>
        <SectionHeader title="Tambah Tanaman" />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input label="Jenis Tanaman" placeholder="cth: Padi" value={cropType} onChangeText={setCropType} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Varietas (opsional)" placeholder="cth: Ciherang" value={variety} onChangeText={setVariety} />
          </View>
        </View>
        <Input
          label="Tanggal Tanam (YYYY-MM-DD, opsional)"
          placeholder="cth: 2026-08-01"
          value={plantingDate}
          onChangeText={setPlantingDate}
          autoCapitalize="none"
        />
        <SectionHeader title="Fase Pertumbuhan" />
        <View style={styles.chips}>
          {GROWTH_STAGES.map((s) => (
            <Chip key={s} label={GROWTH_STAGE_LABEL[s]} active={stage === s} onPress={() => setStage(s)} />
          ))}
        </View>
        <Button title="+ Tambah Tanaman" variant="ghost" onPress={handleAddCrop} disabled={!currentFarm} />
        {!currentFarm ? (
          <Text style={{ color: palette.textMuted, fontSize: 12, textAlign: 'center' }}>
            Simpan lahan terlebih dahulu untuk menambah tanaman.
          </Text>
        ) : null}
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 14,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});

export default FarmFormScreen;
