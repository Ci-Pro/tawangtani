import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card, SectionHeader } from '@/components/Card';
import { Input } from '@/components/Input';
import { ResultCard, Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { useHistoryStore } from '@/store/useHistoryStore';
import { calcGrid, GridResult } from '@/features/fertilizer/grid';
import { fmtNum, parseIdNumber } from '@/utils/format';

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

const GridCalculatorScreen: React.FC = () => {
  const { palette } = useTheme();
  const addHistory = useHistoryStore((s) => s.add);

  const [lengthM, setLengthM] = useState('');
  const [widthM, setWidthM] = useState('');
  const [plotCount, setPlotCount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GridResult | null>(null);

  const handleCalc = () => {
    setError(null);
    setResult(null);
    const l = parseIdNumber(lengthM);
    const w = parseIdNumber(widthM);
    if (l === null || w === null) {
      setError('Isi panjang dan lebar dengan angka valid.');
      return;
    }
    try {
      setResult(
        calcGrid({
          lengthM: l,
          widthM: w,
          plotCount: plotCount ? parseIdNumber(plotCount) ?? undefined : undefined,
        })
      );
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSave = () => {
    if (!result) return;
    addHistory({
      type: 'grid',
      title: 'Kalkulasi Grid Lahan',
      inputsText: `${lengthM} m × ${widthM} m${result.plotCount ? ` • ${result.plotCount} petak` : ''}`,
      resultText: `${fmtNum(result.areaM2, 1)} m² = ${fmtNum(result.areaAre)} are = ${fmtNum(result.areaHa, 4)} ha`,
    });
    Alert.alert('Tersimpan', 'Hasil kalkulasi disimpan ke Riwayat.');
  };

  return (
    <Screen>
      <Text style={[styles.hint, { color: palette.textMuted }]}>
        Ukur lahan dengan cara berjalan atau dari peta: masukkan panjang dan lebar dalam meter.
        Aplikasi menghitung luasnya dalam m², are, dan hektare — plus luas tiap petak bila lahan
        dibagi-bagi.
      </Text>
      <Card>
        <SectionHeader title="Ukuran Lahan" />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input label="Panjang (meter)" placeholder="cth: 100" keyboardType="decimal-pad" value={lengthM} onChangeText={setLengthM} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Lebar (meter)" placeholder="cth: 50" keyboardType="decimal-pad" value={widthM} onChangeText={setWidthM} />
          </View>
        </View>
        <Input
          label="Dibagi jadi berapa petak? (kosongkan jika tidak dibagi)"
          placeholder="cth: 8 — untuk tahu luas tiap petak"
          keyboardType="number-pad"
          value={plotCount}
          onChangeText={setPlotCount}
        />
        {error ? <Text style={{ color: palette.danger, marginBottom: 8 }}>{error}</Text> : null}
        <Button title="Hitung Luas" onPress={handleCalc} />
      </Card>

      {result ? (
        <>
          <ResultCard
            label="Total Luas Lahan"
            value={fmtNum(result.areaM2, 1)}
            unit="m²"
            sub={[
              `= ${fmtNum(result.areaAre)} are (1 are = 10 × 10 meter)`,
              `= ${fmtNum(result.areaHa, 4)} hektare`,
              ...(result.perPlotM2 !== undefined && result.plotCount
                ? [`Tiap petak (${result.plotCount} petak): ${fmtNum(result.perPlotM2, 1)} m²`]
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
        💡 Petak = pembagian lahan Anda. Tahu luas per petak memudahkan hitung pupuk & obat di
        Kalkulator Pupuk.
      </Text>
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

export default GridCalculatorScreen;
