import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Card, SectionHeader } from '@/components/Card';
import { Input } from '@/components/Input';
import { ResultCard, Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { fmtNum, parseIdNumber, AREA_LABEL, AREA_UNITS } from '@/utils/format';
import { AreaUnit } from '@/types';

const MASS_UNITS = [
  { key: 'g', label: 'gram (g)', factor: 1 },
  { key: 'kg', label: 'kilogram (kg)', factor: 1000 },
  { key: 'ton', label: 'ton', factor: 1000000 },
] as const;

const VOLUME_UNITS = [
  { key: 'ml', label: 'mililiter (mL)', factor: 1 },
  { key: 'l', label: 'liter (L)', factor: 1000 },
] as const;

type Category = 'area' | 'mass' | 'volume';

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

const UnitConverterScreen: React.FC = () => {
  const { palette } = useTheme();
  const [category, setCategory] = useState<Category>('area');
  const [value, setValue] = useState('');
  const [fromIdx, setFromIdx] = useState(0);

  const units =
    category === 'area'
      ? AREA_UNITS.map((u) => ({ key: u, label: AREA_LABEL[u], toBase: (v: number) => v * ({ m2: 1, are: 100, ha: 10000 } as Record<AreaUnit, number>)[u] }))
      : category === 'mass'
        ? MASS_UNITS.map((u) => ({ key: u.key, label: u.label, toBase: (v: number) => v * u.factor }))
        : VOLUME_UNITS.map((u) => ({ key: u.key, label: u.label, toBase: (v: number) => v * u.factor }));

  const n = parseIdNumber(value);
  const base = n !== null ? units[fromIdx].toBase(n) : null;

  return (
    <Screen>
      <View style={styles.chips}>
        <Chip label="Luas" active={category === 'area'} onPress={() => { setCategory('area'); setFromIdx(0); }} />
        <Chip label="Berat" active={category === 'mass'} onPress={() => { setCategory('mass'); setFromIdx(0); }} />
        <Chip label="Volume" active={category === 'volume'} onPress={() => { setCategory('volume'); setFromIdx(0); }} />
      </View>

      <Card>
        <Input
          label="Nilai"
          placeholder="Masukkan angka"
          keyboardType="decimal-pad"
          value={value}
          onChangeText={setValue}
        />
        <SectionHeader title="Dari Satuan" />
        <View style={styles.chips}>
          {units.map((u, i) => (
            <Chip key={String(u.key)} label={u.label} active={fromIdx === i} onPress={() => setFromIdx(i)} />
          ))}
        </View>
      </Card>

      {base !== null ? (
        units.map(
          (u, i) =>
            i !== fromIdx && (
              <ResultCard
                key={String(u.key)}
                label={u.label}
                value={fmtNum(base / u.toBase(1), 4)}
              />
            )
        )
      ) : (
        <Text style={{ color: palette.textMuted, textAlign: 'center', marginTop: 16, fontSize: 13 }}>
          Masukkan nilai untuk melihat konversi ke semua satuan.
        </Text>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});

export default UnitConverterScreen;
