import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card, SectionHeader } from '@/components/Card';
import { Input } from '@/components/Input';
import { ResultCard, Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { useHistoryStore } from '@/store/useHistoryStore';
import { useFarmStore } from '@/store/useFarmStore';
import {
  calcFertilizer,
  FERTILIZER_DOSE_UNITS,
  FertilizerDoseUnit,
  FertilizerResult,
} from '@/features/fertilizer/calculator';
import { AREA_UNITS, AREA_LABEL, fmtNum, parseIdNumber } from '@/utils/format';
import { AreaUnit } from '@/types';

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
      <Text
        style={{ color: props.active ? '#fff' : palette.textMuted, fontSize: 12.5, fontWeight: '700' }}
      >
        {props.label}
      </Text>
    </TouchableOpacity>
  );
}

const FertilizerCalculatorScreen: React.FC = () => {
  const { palette } = useTheme();
  const addHistory = useHistoryStore((s) => s.add);
  const farms = useFarmStore((s) => s.farms);

  const [areaValue, setAreaValue] = useState(farms[0] ? String(farms[0].areaValue) : '');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>(farms[0]?.areaUnit ?? 'ha');
  const [dose, setDose] = useState('');
  const [doseUnit, setDoseUnit] = useState<FertilizerDoseUnit>('kg/ha');
  const [gridCount, setGridCount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FertilizerResult | null>(null);

  const handleCalc = () => {
    setError(null);
    setResult(null);
    const a = parseIdNumber(areaValue);
    const d = parseIdNumber(dose);
    if (a === null || d === null) {
      setError('Isi luas lahan dan dosis dengan angka yang valid.');
      return;
    }
    try {
      setResult(
        calcFertilizer({
          areaValue: a,
          areaUnit,
          dose: d,
          doseUnit,
          gridCount: gridCount ? parseIdNumber(gridCount) ?? undefined : undefined,
        })
      );
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSave = () => {
    if (!result) return;
    addHistory({
      type: 'fertilizer',
      title: 'Kalkulasi Pupuk',
      inputsText: `${areaValue} ${AREA_LABEL[areaUnit]} • dosis ${dose} ${doseUnit}${gridCount ? ` • ${gridCount} petak` : ''}`,
      resultText: `Total ${fmtNum(result.totalKg)} kg${result.perGridKg !== undefined ? ` • per petak ${fmtNum(result.perGridKg)} kg` : ''}`,
    });
    Alert.alert('Tersimpan', 'Hasil kalkulasi disimpan ke Riwayat.');
  };

  return (
    <Screen>
      <Card>
        <SectionHeader title="Luas Lahan" />
        <Input
          label="Luas"
          placeholder="cth: 2"
          keyboardType="decimal-pad"
          value={areaValue}
          onChangeText={setAreaValue}
        />
        <View style={styles.chips}>
          {AREA_UNITS.map((u) => (
            <Chip key={u} label={AREA_LABEL[u]} active={areaUnit === u} onPress={() => setAreaUnit(u)} />
          ))}
        </View>

        <SectionHeader title="Dosis Pemupukan" />
        <Input
          label="Dosis"
          placeholder="cth: 200"
          keyboardType="decimal-pad"
          value={dose}
          onChangeText={setDose}
        />
        <View style={styles.chips}>
          {FERTILIZER_DOSE_UNITS.map((u) => (
            <Chip key={u} label={u} active={doseUnit === u} onPress={() => setDoseUnit(u)} />
          ))}
        </View>

        <Input
          label="Jumlah Petak / Grid (opsional)"
          placeholder="cth: 4 — untuk pembagian kebutuhan"
          keyboardType="number-pad"
          value={gridCount}
          onChangeText={setGridCount}
        />

        {error ? <Text style={{ color: palette.danger, marginBottom: 8 }}>{error}</Text> : null}
        <Button title="Hitung" onPress={handleCalc} />
      </Card>

      {result ? (
        <>
          <ResultCard
            label="Total Kebutuhan"
            value={fmtNum(result.totalKg)}
            unit="kg"
            sub={[
              `= ${fmtNum(result.totalG, 0)} g`,
              ...(result.perGridKg !== undefined && result.gridCount
                ? [`Per petak (${result.gridCount}): ${fmtNum(result.perGridKg)} kg`]
                : []),
            ]}
          />
          <Card>
            <SectionHeader title="Rumus & Perhitungan" />
            <Text style={[styles.formula, { color: palette.textMuted }]}>{result.formula}</Text>
          </Card>
          <Button title="Simpan ke Riwayat" variant="ghost" onPress={handleSave} />
        </>
      ) : null}

      <Text style={[styles.note, { color: palette.textMuted }]}>
        Rumus dasar: kebutuhan produk = luas lahan (ha) × dosis produk (kg/ha). Sesuaikan dosis
        dengan rekomendasi tanah/daerah Anda.
      </Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
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
  formula: {
    fontSize: 13,
    lineHeight: 21,
  },
  note: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 17,
  },
});

export default FertilizerCalculatorScreen;
