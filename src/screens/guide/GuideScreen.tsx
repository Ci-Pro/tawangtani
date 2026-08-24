import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card, SectionHeader } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { GLOSARIUM } from '@/constants/bahasa';

const LANGKAH: { icon: keyof typeof Ionicons.glyphMap; judul: string; isi: string }[] = [
  {
    icon: 'map-outline',
    judul: '1. Catat lahan & tanaman Anda',
    isi: 'Masukkan luas lahan dan tanggal tanam. Dari sini aplikasi tahu umur tanaman Anda dan mengingatkan saat waktunya memupuk, menyemprot, atau panen.',
  },
  {
    icon: 'pricetags-outline',
    judul: '2. Pantau harga pasar setiap hari',
    isi: 'Lihat harga resmi pemerintah untuk kabar kapan harga naik — supaya panen dijual di waktu yang tepat, bukan asal dijual.',
  },
  {
    icon: 'camera-outline',
    judul: '3. Foto tanaman yang sakit',
    isi: 'Daun kuning? Buah busuk? Ambil foto, AI membantu menebak penyakitnya dan menyarankan penanganan awal yang aman.',
  },
  {
    icon: 'calculator-outline',
    judul: '4. Hitung pupuk & obat sebelum beli',
    isi: 'Masukkan luas lahan, aplikasi menghitung takaran yang pas. Hemat biaya karena tidak ada pupuk/obat yang terbuang sia-sia.',
  },
  {
    icon: 'trending-up-outline',
    judul: '5. Terima rekomendasi jual',
    isi: 'Aplikasi menggabungkan data harga + umur tanaman + cuaca untuk menyarankan: jual sekarang, atau tunggu dulu.',
  },
];

const GuideScreen: React.FC = () => {
  const { palette } = useTheme();

  return (
    <Screen>
      <Text style={[styles.title, { color: palette.text }]}>Cara Kerja Aplikasi</Text>
      <Text style={[styles.subtitle, { color: palette.textMuted }]}>
        TAWANGTANI membantu petani mengambil keputusan dari DATA: kapan menanam, berapa takaran,
        dan kapan menjual. Ikuti 5 langkah ini:
      </Text>

      {LANGKAH.map((l) => (
        <Card key={l.judul}>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: palette.primarySoft }]}>
              <Ionicons name={l.icon} size={22} color={palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stepTitle, { color: palette.text }]}>{l.judul}</Text>
              <Text style={[styles.stepBody, { color: palette.textMuted }]}>{l.isi}</Text>
            </View>
          </View>
        </Card>
      ))}

      <SectionHeader title="Kamus Istilah" />
      <Card>
        {GLOSARIUM.map((g, i) => (
          <View key={g.istilah} style={i < GLOSARIUM.length - 1 ? styles.glos : undefined}>
            <Text style={[styles.glosIstilah, { color: palette.primary }]}>{g.istilah}</Text>
            <Text style={[styles.glosArti, { color: palette.textMuted }]}>{g.arti}</Text>
          </View>
        ))}
      </Card>

      <Text style={[styles.note, { color: palette.textMuted }]}>
        💡 Ada istilah lain yang membingungkan? Tanyakan ke Tani AI di menu Asisten — jawabannya
        pakai bahasa sederhana.
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
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontWeight: '800',
    fontSize: 15,
  },
  stepBody: {
    fontSize: 13,
    marginTop: 3,
    lineHeight: 19,
  },
  glos: {
    marginBottom: 12,
  },
  glosIstilah: {
    fontWeight: '800',
    fontSize: 13.5,
  },
  glosArti: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  note: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 17,
  },
});

export default GuideScreen;
