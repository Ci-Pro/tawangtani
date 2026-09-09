import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from '@/components/Button';
import { Card, SectionHeader } from '@/components/Card';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useFarmStore } from '@/store/useFarmStore';
import { useActivityStore, activityLabel } from '@/store/useActivityStore';
import { fetchSopPlan, SOP_SUPPORTED_CROPS, SOP_STAGES, stageLabel, parseDoseFromText, planBaseDate, planStepSchedule, addDays } from '@/services/ai/sopPlan';
import { todayISO, fmtDateID } from '@/utils/date';
import { AREA_LABEL } from '@/utils/format';
import { RootStackParamList } from '@/navigation/types';
import { useSopPlanStore } from '@/store/useSopPlanStore';
import { AreaUnit, SopPlan, SopPhase } from '@/types';

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

function PhaseCard(props: {
  phase: SopPhase;
  showActions: boolean;
  window?: { start?: string | null; end?: string | null };
  onLog: () => void;
  onCalc?: () => void;
}) {
  const { palette } = useTheme();
  const { phase } = props;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: palette.text, fontWeight: '800', fontSize: 15, flex: 1 }}>
          {phase.label}
        </Text>
        {phase.active ? (
          <View style={[styles.badge, { backgroundColor: `${palette.primary}22` }]}>
            <Text style={{ color: palette.primary, fontSize: 10.5, fontWeight: '800' }}>AKTIF SEKARANG</Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: palette.surfaceAlt }]}>
            <Text style={{ color: palette.textMuted, fontSize: 10.5, fontWeight: '700' }}>
              HST {phase.hstStart}-{phase.hstEnd}
            </Text>
          </View>
        )}
      </View>

{phase.steps.map((s) => (
          <View key={s.id} style={[styles.step, { borderBottomColor: palette.border }]}>
            <Ionicons name="checkmark-circle-outline" size={16} color={palette.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.text, fontWeight: '700', fontSize: 13 }}>
                {activityLabel(s.activity)} — {s.title}
              </Text>
              <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 17 }}>{s.desc}</Text>
            </View>
          </View>
        ))}

        {props.window?.start ? (
          <Text style={{ color: palette.textMuted, fontSize: 11.5, fontWeight: '700', marginTop: 4 }}>
            📅 Jadwal: {fmtDateID(props.window.start)}
            {props.window.end && props.window.end !== props.window.start ? ` — ${fmtDateID(props.window.end)}` : ''}
          </Text>
        ) : null}

      {phase.doseText ? (
        <View style={[styles.doseBox, { backgroundColor: `${palette.primary}12` }]}>
          <Text style={{ color: palette.primary, fontWeight: '800', fontSize: 11.5 }}>RECOMENDASI DOSIS (dari basis pengetahuan)</Text>
          <Text style={{ color: palette.text, fontSize: 12.5, lineHeight: 18, marginTop: 2 }}>{phase.doseText}</Text>
          {props.onCalc ? (
            <TouchableOpacity onPress={props.onCalc} style={styles.doseCta}>
              <Ionicons name="calculator-outline" size={15} color={palette.primary} />
              <Text style={{ color: palette.primary, fontSize: 12.5, fontWeight: '800' }}>
                Gunakan di Kalkulator
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {phase.advice ? (
        <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 17, marginTop: 8 }}>
          💡 {phase.advice}
          {phase.source ? (
            <Text style={{ fontSize: 10.5 }}> — sumber: {phase.source}</Text>
          ) : null}
        </Text>
      ) : null}

      {props.showActions ? (
        <Button title="Catat aktivitas fase ini" variant="ghost" onPress={props.onLog} />
      ) : null}
    </Card>
  );
}

const SopPlanScreen: React.FC = () => {
  const { palette } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, 'SopPlan'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const backendUrl = useSettingsStore((s) => s.backendUrl);
  const farms = useFarmStore((s) => s.farms);
  const activeFarmId = useFarmStore((s) => s.activeFarmId);
  const addActivity = useActivityStore((s) => s.add);

  const activeFarm = farms.find((f) => f.id === activeFarmId) ?? farms[0] ?? null;
  const firstCrop = activeFarm?.crops[0];

  const [cropType, setCropType] = useState<string>(() => {
    if (route.params?.cropType && SOP_SUPPORTED_CROPS.some((c) => c.slug === route.params?.cropType))
      return route.params.cropType as string;
    if (firstCrop) {
      const match = SOP_SUPPORTED_CROPS.find((c) => c.label.toLowerCase() === firstCrop.cropType.toLowerCase());
      if (match) return match.slug;
    }
    return 'padi';
  });
  const [plantingDate, setPlantingDate] = useState(route.params?.plantingDate ?? firstCrop?.plantingDate ?? '');
  const [variety, setVariety] = useState(route.params?.cropLabel && !firstCrop ? '' : firstCrop?.variety ?? '');
  const [growthStage, setGrowthStage] = useState<string>(route.params?.growthStage ?? firstCrop?.growthStage ?? '');
  const [withDate, setWithDate] = useState(Boolean(plantingDate));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<SopPlan | null>(null);
  const setPinned = useSopPlanStore((s) => s.setPinned);

  const isExplicitDate =
    withDate && /^\d{4}-\d{2}-\d{2}$/.test(plantingDate);

  const build = async () => {
    setError(null);
    setPlan(null);
    if (!cropType) {
      setError('Pilih jenis tanaman terlebih dahulu.');
      return;
    }
    setBusy(true);
    try {
      const result = await fetchSopPlan(backendUrl, {
        cropType: SOP_SUPPORTED_CROPS.find((c) => c.slug === cropType)?.label ?? cropType,
        variety: variety || undefined,
        plantingDate: withDate && /^\d{4}-\d{2}-\d{2}$/.test(plantingDate) ? plantingDate : undefined,
        growthStage: (withDate ? undefined : growthStage) as never,
      });
      if (!result.ok) {
        setError(result.reason ?? 'Komoditas tidak dapat diproses.');
        return;
      }
      setPlan(result);
      setPinned(result, isExplicitDate ? plantingDate : null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const resolveBase = (): string | null => planBaseDate(plan, isExplicitDate ? plantingDate : null);

  const windowOf = (phase: SopPhase): { start: string | null; end: string | null } => {
    const base = resolveBase();
    if (!base) return { start: null, end: null };
    return {
      start: addDays(base, phase.hstStart),
      end: phase.hstEnd >= phase.hstStart ? addDays(base, phase.hstEnd) : null,
    };
  };

  const logPhase = async (phase: SopPhase) => {
    if (!plan) return;
    const base = resolveBase();
    const scheduled = planStepSchedule(plan, base).filter((e) => e.phase.id === phase.id);
    const today = todayISO();
    const inputs = scheduled.map((e) => ({
      farmId: activeFarm?.id,
      cropId: firstCrop?.id,
      cropLabel: plan.crop?.label,
      activity: e.step.activity,
      date: e.date,
      remindAt: e.date > today ? `${e.date}T07:00:00` : undefined,
      doseText: phase.doseText ?? undefined,
      note: `Rencana SOP ${plan.crop?.label} — ${phase.label}`,
      source: 'ai' as const,
    }));
    for (const inp of inputs) await addActivity(inp);
    const from = inputs[0]?.date;
    const to = inputs[inputs.length - 1]?.date;
    Alert.alert(
      'Tercatat',
      `${inputs.length} aktivitas "${phase.label}" dijadwalkan ${fmtDateID(from)}${to && to !== from ? ` — ${fmtDateID(to)}` : ''}.\nCek & tandai di menu Kalender Aktivitas.`
    );
  };

  const useDose = (phase: SopPhase) => {
    const d = parseDoseFromText(phase.doseText);
    if (!d) return;
    const prefill = {
      label: plan?.crop?.label,
      dose: d.value,
      doseUnit: d.unit ?? undefined,
      area: activeFarm ? String(activeFarm.areaValue) : undefined,
      areaUnit: activeFarm?.areaUnit,
    };
    const isFertilizer = !d.unit || /kg|g|ton/.test(d.unit);
    navigation.navigate(isFertilizer ? 'FertilizerCalculator' : 'PesticideCalculator', { prefill });
  };

  return (
    <Screen>
      <Text style={[styles.hint, { color: palette.textMuted }]}>
        Rencana SOP menyusun jadwal tanam s/d panen berdasarkan basis pengetahuan TAWANGTANI.
        Dosis hanya disertakan bila tersedia di basis — tidak pernah dikarang.
      </Text>

      <Card>
        <SectionHeader title="Jenis Tanaman" />
        <View style={styles.chips}>
          {SOP_SUPPORTED_CROPS.map((c) => (
            <Chip key={c.slug} label={c.label} active={cropType === c.slug} onPress={() => setCropType(c.slug)} />
          ))}
        </View>

        <Input label="Varitas (opsional)" placeholder="cth: Inpari 32" value={variety} onChangeText={setVariety} />

        <View style={styles.chips}>
          <Chip label="Pakai tanggal tanam" active={withDate} onPress={() => setWithDate(true)} />
          <Chip label="Pakai fase tumbuh" active={!withDate} onPress={() => setWithDate(false)} />
        </View>

        {withDate ? (
          <Input
            label="Tanggal tanam (YYYY-MM-DD)"
            placeholder="cth: 2026-08-10"
            autoCapitalize="none"
            value={plantingDate}
            onChangeText={setPlantingDate}
          />
        ) : (
          <View style={styles.chips}>
            {SOP_STAGES.map((s) => (
              <Chip
                key={s.stage}
                label={s.label}
                active={growthStage === s.stage}
                onPress={() => setGrowthStage(s.stage)}
              />
            ))}
          </View>
        )}

        {error ? <Text style={{ color: palette.danger, marginBottom: 8, fontSize: 12.5 }}>{error}</Text> : null}
        <Button title={busy ? 'Menyusun rencana...' : 'Buat Rencana SOP'} onPress={build} disabled={busy} />
      </Card>

      {plan?.crop ? (
        <View>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="leaf" size={22} color={palette.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.text, fontWeight: '800', fontSize: 16 }}>{plan.crop.label}</Text>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                  {plan.crop.variety ? `${plan.crop.variety} • ` : ''}
                  {plan.crop.ageDays !== null
                    ? `Umur ${plan.crop.ageDays} HST`
                    : stageLabel(plan.crop.growthStage)}
                  {activeFarm ? ` • Lahan: ${activeFarm.name} (${activeFarm.areaValue} ${AREA_LABEL[activeFarm.areaUnit]})` : ''}
                </Text>
              </View>
            </View>
            <View style={[styles.metaRow, { marginTop: 10 }]}>
              <View style={[styles.meta, { backgroundColor: palette.surfaceAlt }]}>
                <Text style={{ color: palette.textMuted, fontSize: 10.5 }}>FASE</Text>
                <Text style={{ color: palette.text, fontWeight: '800', fontSize: 13 }}>
                  {stageLabel(plan.crop.growthStage)}
                </Text>
              </View>
              <View style={[styles.meta, { backgroundColor: palette.surfaceAlt }]}>
                <Text style={{ color: palette.textMuted, fontSize: 10.5 }}>ESTIMASI PANEN</Text>
                <Text style={{ color: palette.text, fontWeight: '800', fontSize: 13 }}>
                  ± {plan.crop.harvestDaysEstimate} HST
                </Text>
              </View>
              <View style={[styles.meta, { backgroundColor: palette.surfaceAlt }]}>
                <Text style={{ color: palette.textMuted, fontSize: 10.5 }}>FASE RENCANA</Text>
                <Text style={{ color: palette.text, fontWeight: '800', fontSize: 13 }}>
                  {plan.phases?.length ?? 0}
                </Text>
              </View>
            </View>
            {plan.disclaimer ? (
              <Text style={{ color: palette.textMuted, fontSize: 10.5, lineHeight: 15, marginTop: 10 }}>
                ⓘ {plan.disclaimer}
              </Text>
            ) : null}
          </Card>

          {plan.phases?.map((p) => (
            <PhaseCard
              key={p.id}
              phase={p}
              showActions={p.active}
              window={windowOf(p)}
              onLog={() => logPhase(p)}
              onCalc={p.doseText ? () => useDose(p) : undefined}
            />
          ))}
</View>
        ) : null}

        {plan?.ok ? (
          <Button
            title="Lihat Kalender Aktivitas"
            variant="ghost"
            onPress={() => navigation.navigate('ActivityCalendar')}
          />
        ) : null}
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
  step: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  doseBox: {
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  doseCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  hint: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  meta: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
});

export default SopPlanScreen;