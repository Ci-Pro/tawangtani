import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from '@/components/Button';
import { Card, SectionHeader } from '@/components/Card';
import { EmptyState, Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { useFarmStore } from '@/store/useFarmStore';
import { AREA_LABEL, fmtNum } from '@/utils/format';
import { describeCrop, suggestNextStage } from '@/features/farm/helpers';
import { RootStackParamList } from '@/navigation/types';

const FarmListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { palette } = useTheme();
  const farms = useFarmStore((s) => s.farms);
  const activeFarmId = useFarmStore((s) => s.activeFarmId);
  const setActiveFarm = useFarmStore((s) => s.setActiveFarm);
  const removeFarm = useFarmStore((s) => s.removeFarm);
  const removeCrop = useFarmStore((s) => s.removeCrop);

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: palette.text }]}>Lahan Saya</Text>
          <Text style={{ color: palette.textMuted, fontSize: 13 }}>
            {farms.length} lahan terdaftar
          </Text>
        </View>
        <Ionicons name="leaf" size={30} color={palette.primary} />
      </View>

      <Button title="🌱 Tanamanku & Untung" variant="ghost" onPress={() => navigation.navigate('Plantings')} />

      {farms.length === 0 ? (
        <>
          <EmptyState
            icon="🌾"
            title="Belum ada lahan"
            subtitle="Tambahkan lahan & tanaman agar AI memberi konteks yang lebih akurat."
          />
          <Button title="+ Tambah Lahan" onPress={() => navigation.navigate('FarmForm')} />
        </>
      ) : (
        <>
          <SectionHeader title="Daftar Lahan" />
          {farms.map((farm) => {
            const isActive = farm.id === (activeFarmId ?? farms[0]?.id);
            return (
            <Card key={farm.id}>
              <View style={styles.farmHead}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => setActiveFarm(farm.id)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: palette.text, fontWeight: '800', fontSize: 16 }}>
                      {farm.name}
                    </Text>
                    {isActive && (
                      <View
                        style={[
                          styles.activeBadge,
                          { backgroundColor: palette.primarySoft },
                        ]}
                      >
                        <Text style={{ color: palette.primary, fontSize: 10.5, fontWeight: '900' }}>
                          AKTIF
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: palette.textMuted, fontSize: 12.5, marginTop: 2 }}>
                    {fmtNum(farm.areaValue)} {AREA_LABEL[farm.areaUnit]}
                    {farm.location ? ` • ${farm.location}` : ''}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert('Hapus Lahan', `Hapus "${farm.name}"?`, [
                      { text: 'Batal', style: 'cancel' },
                      { text: 'Hapus', style: 'destructive', onPress: () => removeFarm(farm.id) },
                    ])
                  }
                >
                  <Ionicons name="trash-outline" size={19} color={palette.danger} />
                </TouchableOpacity>
              </View>

              {farm.crops.length === 0 ? (
                <Text style={{ color: palette.textMuted, fontSize: 13, marginTop: 8 }}>
                  Belum ada tanaman.
                </Text>
              ) : (
                farm.crops.map((c) => (
                  <View
                    key={c.id}
                    style={[styles.cropRow, { backgroundColor: palette.surfaceAlt }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: palette.text, fontWeight: '700', fontSize: 13.5 }}>
                        🌱 {describeCrop(c)}
                      </Text>
                      <Text style={{ color: palette.textMuted, fontSize: 11.5, marginTop: 2 }}>
                        💡 {suggestNextStage(c.growthStage)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeCrop(farm.id, c.id)}>
                      <Ionicons name="close-circle-outline" size={18} color={palette.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))
              )}

              <View style={styles.farmActions}>
                {!isActive && (
                  <TouchableOpacity
                    onPress={() => setActiveFarm(farm.id)}
                    style={[styles.smallBtn, { borderColor: palette.textMuted }]}
                  >
                    <Text style={{ color: palette.textMuted, fontWeight: '700', fontSize: 12.5 }}>
                      Jadikan Aktif
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => navigation.navigate('FarmForm', { farmId: farm.id })}
                  style={[styles.smallBtn, { borderColor: palette.primary }]}
                >
                  <Text style={{ color: palette.primary, fontWeight: '700', fontSize: 12.5 }}>
                    + Tambah Tanaman
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
            );
          })}
          <Button title="+ Tambah Lahan Baru" variant="ghost" onPress={() => navigation.navigate('FarmForm')} />
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
  },
  farmHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  farmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  smallBtn: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  activeBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});

export default FarmListScreen;
