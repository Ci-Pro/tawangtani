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
      <Card>
        <SectionHeader title="Dimensi Lahan" />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input label="Panjang (m)" placeholder="cth: 100" keyboardType="decimal-pad" value={lengthM} onChangeText={setLengthM} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Lebar (m)" placeholder="cth: 50" keyboardType="decimal-pad" value={widthM} onChangeText={setWidthM} />
          </View>
        </View>
        <Input
          label="Jumlah Petak / Grid (opsional)"
          placeholder="cth: 8 — untuk luas per petak"
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
            label="Total Luas"
            value={fmtNum(result.areaM2, 1)}
            unit="m²"
            sub={[
              `= ${fmtNum(result.areaAre)} are`,
              `= ${fmtNum(result.areaHa, 4)} hektare`,
              ...(result.perPlotM2 !== undefined && result.plotCount
                ? [`Per petak (${result.plotCount}): ${fmtNum(result.perPlotM2, 1)} m²`]
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
        Gunakan hasil luas ini di Kalkulator Pupuk untuk menghitung kebutuhan pupuk per petak.
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
  note: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 17,
  },
});

export default GridCalculatorScreen;
