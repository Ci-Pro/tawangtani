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
  FERTILIZER_METHODS,
  FERTILIZER_METHOD_LABEL,
  METHOD_HINT,
  FertilizerDoseUnit,
  FertilizerMethod,
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
  const [method, setMethod] = useState<FertilizerMethod>('tabur');
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
      method: FERTILIZER_METHOD_LABEL[method],
    });
    Alert.alert('Tersimpan', 'Hasil kalkulasi disimpan ke Riwayat.');
  };

  return (
    <Screen>
      <Text style={[styles.hint, { color: palette.textMuted }]}>
        Masukkan luas lahan Anda dan dosis pupuk (dari rekomendasi penyuluh atau label). Hasilnya:
        berapa kilo yang harus dibeli — dan setara berapa karung.
      </Text>
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
          label={`Dosis (kg per ${areaUnit === 'ha' ? 'hektare' : AREA_LABEL[areaUnit]})`}
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

        <SectionHeader title="Metode Aplikasi" />
        <View style={styles.chips}>
          {FERTILIZER_METHODS.map((m) => (
            <Chip key={m} label={FERTILIZER_METHOD_LABEL[m]} active={method === m} onPress={() => setMethod(m)} />
          ))}
        </View>
        <Text style={[styles.methodHint, { color: palette.textMuted }]}>
          💡 {METHOD_HINT[method]}
        </Text>

        {error ? <Text style={{ color: palette.danger, marginBottom: 8 }}>{error}</Text> : null}
        <Button title="Hitung" onPress={handleCalc} />
      </Card>

      {result ? (
        <>
          <ResultCard
            label="Total Kebutuhan Pupuk"
            value={fmtNum(result.totalKg)}
            unit="kg"
            sub={[
              `= ${fmtNum(result.totalG, 0)} g`,
              ...(result.totalKg >= 5
                ? [`≈ ${Math.ceil(result.totalKg / 25)} karung @25 kg — beli agak lebih untuk cadangan`]
                : []),
              ...(result.perGridKg !== undefined && result.gridCount
                ? [`Tiap petak (${result.gridCount} petak): ${fmtNum(result.perGridKg)} kg`]
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
        Cara baca: dosis 200 kg/ha artinya setiap hektare (10.000 m²) diberi pupuk 200 kg. Dosis
        terbaik ikuti rekomendasi tanah/penyuluh di daerah Anda.
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
  methodHint: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
    marginTop: -6,
  },
  hint: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 12,
  },
  note: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 17,
  },
});

export default FertilizerCalculatorScreen;
