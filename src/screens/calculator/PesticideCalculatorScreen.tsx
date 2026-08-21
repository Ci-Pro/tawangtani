import React, { useMemo, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/Button';
import { Card, SectionHeader } from '@/components/Card';
import { Input } from '@/components/Input';
import { ResultCard, Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { useHistoryStore } from '@/store/useHistoryStore';
import { useProductStore } from '@/store/useProductStore';
import { useFarmStore } from '@/store/useFarmStore';
import {
  calcPesticide,
  PESTICIDE_DOSE_UNITS,
  PesticideDoseUnit,
  PesticideResult,
} from '@/features/pesticide/calculator';
import { AREA_UNITS, AREA_LABEL, fmtNum, parseIdNumber } from '@/utils/format';
import { AreaUnit, Product, ProductDose } from '@/types';

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

const PesticideCalculatorScreen: React.FC = () => {
  const { palette } = useTheme();
  const addHistory = useHistoryStore((s) => s.add);
  const products = useProductStore((s) => s.products);
  const farms = useFarmStore((s) => s.farms);

  const pesticides = useMemo(() => {
    const q = pickerQuery.toLowerCase().trim();
    return products.filter((p) => {
      if (p.category !== 'pestisida') return false;
      if (!q) return true;
      return (
        p.brand.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.activeIngredient.toLowerCase().includes(q) ||
        p.doses.some(
          (d) =>
            d.crop.toLowerCase().includes(q) || d.target.toLowerCase().includes(q)
        )
      );
    });
  }, [products, pickerQuery]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedDose, setSelectedDose] = useState<ProductDose | null>(null);

  const [dose, setDose] = useState('');
  const [doseUnit, setDoseUnit] = useState<PesticideDoseUnit>('mL/L');
  const [tankVolume, setTankVolume] = useState('14');
  const [waterRate, setWaterRate] = useState('600');
  const [areaValue, setAreaValue] = useState(farms[0] ? String(farms[0].areaValue) : '');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>(farms[0]?.areaUnit ?? 'ha');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PesticideResult | null>(null);

  const pickProduct = (p: Product) => {
    setSelected(p);
    setSelectedDose(p.doses[0] ?? null);
    setPickerOpen(false);
    if (p.doses[0]) {
      setDose(String(p.doses[0].dose));
      setDoseUnit(p.doses[0].unit as PesticideDoseUnit);
      if (p.doses[0].waterVolumeLPerHa) setWaterRate(String(p.doses[0].waterVolumeLPerHa));
    }
    setResult(null);
  };

  const handleCalc = () => {
    setError(null);
    setResult(null);
    const d = parseIdNumber(dose);
    const t = parseIdNumber(tankVolume);
    const a = parseIdNumber(areaValue);
    const w = parseIdNumber(waterRate);
    if (d === null || t === null || a === null || w === null) {
      setError('Lengkapi semua input dengan angka valid.');
      return;
    }
    try {
      setResult(
        calcPesticide({
          dose: d,
          doseUnit,
          tankVolumeL: t,
          areaValue: a,
          areaUnit,
          waterRateLPerHa: w,
        })
      );
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSave = () => {
    if (!result) return;
    addHistory({
      type: 'pesticide',
      title: selected ? `${selected.brand} — ${selected.name}` : 'Kalkulasi Pestisida',
      inputsText: `${dose} ${doseUnit} • tangki ${tankVolume} L • ${areaValue} ${AREA_LABEL[areaUnit]} • air ${waterRate} L/ha`,
      resultText: `${result.tanksNeeded} tangki × ${fmtNum(result.productPerTankValue, 1)} ${result.productPerTankUnit}`,
    });
    Alert.alert('Tersimpan', 'Hasil kalkulasi disimpan ke Riwayat.');
  };

  return (
    <Screen>
      <Card>
        <SectionHeader title="Produk" />
        <TouchableOpacity
          onPress={() => setPickerOpen(true)}
          style={[styles.picker, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}
        >
          <Ionicons name="cube-outline" size={20} color={palette.primary} />
          <Text style={{ flex: 1, color: selected ? palette.text : palette.textMuted, fontSize: 14 }}>
            {selected ? `${selected.brand} — ${selected.name}` : 'Pilih produk dari katalog...'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={palette.textMuted} />
        </TouchableOpacity>

        {selected && selected.doses.length > 0 ? (
          <View style={styles.chips}>
            {selected.doses.map((d) => (
              <Chip
                key={d.id}
                label={`${d.crop}: ${d.dose} ${d.unit}`}
                active={selectedDose?.id === d.id}
                onPress={() => {
                  setSelectedDose(d);
                  setDose(String(d.dose));
                  setDoseUnit(d.unit as PesticideDoseUnit);
                  if (d.waterVolumeLPerHa) setWaterRate(String(d.waterVolumeLPerHa));
                  setResult(null);
                }}
              />
            ))}
          </View>
        ) : null}

        {selected && selectedDose ? (
          <Text style={[styles.doseSource, { color: palette.textMuted }]}>
            Sumber dosis: {selectedDose.source}
            {selected.updatedAt ? ` • Diperbarui: ${selected.updatedAt}` : ''}
          </Text>
        ) : null}

        <SectionHeader title="Dosis & Tangki" />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input label="Dosis" placeholder="cth: 2" keyboardType="decimal-pad" value={dose} onChangeText={setDose} />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Volume Tangki (L)"
              placeholder="cth: 14"
              keyboardType="decimal-pad"
              value={tankVolume}
              onChangeText={setTankVolume}
            />
          </View>
        </View>
        <View style={styles.chips}>
          {PESTICIDE_DOSE_UNITS.map((u) => (
            <Chip key={u} label={u} active={doseUnit === u} onPress={() => setDoseUnit(u)} />
          ))}
        </View>

        <SectionHeader title="Luas & Volume Air" />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input label="Luas Lahan" placeholder="cth: 1" keyboardType="decimal-pad" value={areaValue} onChangeText={setAreaValue} />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Volume Air (L/ha)"
              placeholder="cth: 600"
              keyboardType="decimal-pad"
              value={waterRate}
              onChangeText={setWaterRate}
            />
          </View>
        </View>
        <View style={styles.chips}>
          {AREA_UNITS.map((u) => (
            <Chip key={u} label={AREA_LABEL[u]} active={areaUnit === u} onPress={() => setAreaUnit(u)} />
          ))}
        </View>

        {error ? <Text style={{ color: palette.danger, marginBottom: 8 }}>{error}</Text> : null}
        <Button title="Hitung" onPress={handleCalc} />
      </Card>

      {result ? (
        <>
          <ResultCard
            label={`Kebutuhan per Tangki (${result.tanksNeeded} tangki)`}
            value={fmtNum(result.productPerTankValue, 1)}
            unit={result.productPerTankUnit}
            sub={[
              `Total produk: ${fmtNum(result.productTotalValue, 1)} ${result.productTotalUnit}`,
              `Total air: ${fmtNum(result.totalWaterL, 0)} L`,
            ]}
          />

          {selected?.warnings ? (
            <Card style={{ borderLeftWidth: 4, borderLeftColor: palette.warning }}>
              <Text style={{ color: palette.warning, fontWeight: '800', marginBottom: 6 }}>
                ⚠️ Peringatan Keselamatan
              </Text>
              {selected.warnings.apd ? (
                <Text style={[styles.warnText, { color: palette.text }]}>• APD: {selected.warnings.apd}</Text>
              ) : null}
              {selected.warnings.reEntryHours ? (
                <Text style={[styles.warnText, { color: palette.text }]}>
                  • Interval masuk kembali: {selected.warnings.reEntryHours} jam
                </Text>
              ) : null}
              {selected.warnings.preHarvestDays ? (
                <Text style={[styles.warnText, { color: palette.text }]}>
                  • Interval pra-panen: {selected.warnings.preHarvestDays} hari
                </Text>
              ) : null}
              {selected.warnings.notes?.map((n, i) => (
                <Text key={i} style={[styles.warnText, { color: palette.text }]}>• {n}</Text>
              ))}
            </Card>
          ) : null}

          <Card>
            <SectionHeader title="Rumus & Perhitungan" />
            {result.formula.map((f, i) => (
              <Text key={i} style={[styles.formulaLine, { color: palette.textMuted }]}>
                {f}
              </Text>
            ))}
          </Card>
          <Button title="Simpan ke Riwayat" variant="ghost" onPress={handleSave} />
        </>
      ) : null}

      <Modal visible={pickerOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: palette.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={{ color: palette.text, fontWeight: '800', fontSize: 16 }}>
                  Pilih Produk Pestisida
                </Text>
                <TouchableOpacity onPress={() => setPickerOpen(false)}>
                  <Ionicons name="close" size={24} color={palette.textMuted} />
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.pickerSearch,
                  { backgroundColor: palette.surfaceAlt, borderColor: palette.border },
                ]}
              >
                <Ionicons name="search" size={16} color={palette.textMuted} />
                <TextInput
                  value={pickerQuery}
                  onChangeText={setPickerQuery}
                  placeholder="Cari merek / bahan aktif / komoditas / target..."
                  placeholderTextColor={palette.textMuted}
                  style={{ flex: 1, color: palette.text, fontSize: 13.5 }}
                />
              </View>
            <FlatList
              data={pesticides}
              keyExtractor={(p) => p.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => pickProduct(item)}
                  style={[styles.modalItem, { borderColor: palette.border }]}
                >
                  <Text style={{ color: palette.text, fontWeight: '700' }}>
                    {item.brand} — {item.name}
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                    {item.activeIngredient} • {item.formulation}
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                    Untuk: {item.doses.map((d) => d.target).join('; ')}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  doseSource: {
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: -6,
    marginBottom: 12,
  },
  warnText: {
    fontSize: 13,
    lineHeight: 20,
  },
  formulaLine: {
    fontSize: 13,
    lineHeight: 22,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  modalItem: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
});

export default PesticideCalculatorScreen;
