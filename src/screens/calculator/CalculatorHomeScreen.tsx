import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { RootStackParamList } from '@/navigation/types';

const ITEMS: {
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: keyof RootStackParamList;
}[] = [
  {
    title: 'Hitung Pupuk',
    desc: 'Tahu persis butuh berapa kilo pupuk untuk lahan Anda — tidak kurang, tidak terbuang sia-sia',
    icon: 'nutrition-outline',
    route: 'FertilizerCalculator',
  },
  {
    title: 'Hitung Takaran Obat',
    desc: 'Takaran semprot per satu tangki sprayer — tinggal ikuti angkanya, aman dan pas',
    icon: 'flask-outline',
    route: 'PesticideCalculator',
  },
  {
    title: 'Ukur Luas Lahan',
    desc: 'Dari panjang × lebar jadi tahu luas sawah (m², are, hektare) & luas tiap petak',
    icon: 'grid-outline',
    route: 'GridCalculator',
  },
  {
    title: 'Ubah Satuan',
    desc: 'Ganti-ganti satuan dengan mudah: are ↔ m², ton ↔ kg, liter ↔ mililiter',
    icon: 'swap-horizontal-outline',
    route: 'UnitConverter',
  },
];

const CalculatorHomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { palette } = useTheme();

  return (
    <Screen>
      <Text style={[styles.title, { color: palette.text }]}>Kalkulator</Text>
      <Text style={[styles.subtitle, { color: palette.textMuted }]}>
        Isi angka yang Anda tahu (luas lahan, takaran di label) — aplikasi menghitung sisanya.
        Rumus selalu ditampilkan agar bisa diperiksa.
      </Text>

      {ITEMS.map((item) => (
        <Card key={item.route as string} onPress={() => navigation.navigate(item.route as never)}>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: palette.primarySoft }]}>
              <Ionicons name={item.icon} size={24} color={palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.text, fontWeight: '800', fontSize: 15.5 }}>
                {item.title}
              </Text>
              <Text style={{ color: palette.textMuted, fontSize: 13, marginTop: 2 }}>
                {item.desc}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
          </View>
        </Card>
      ))}

      <Text style={[styles.note, { color: palette.textMuted }]}>
        ⚠️ Kalkulator adalah alat bantu — bukan pengganti label resmi, penyuluh, atau regulasi.
      </Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13.5,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 19,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 17,
  },
});

export default CalculatorHomeScreen;
