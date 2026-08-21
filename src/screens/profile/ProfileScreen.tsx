import React, { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from '@/components/Button';
import { Card, SectionHeader } from '@/components/Card';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useLocation } from '@/hooks/useWeather';
import { RootStackParamList } from '@/navigation/types';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { palette, isDark, toggle } = useTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const backendUrl = useSettingsStore((s) => s.backendUrl);
  const setBackendUrl = useSettingsStore((s) => s.setBackendUrl);
  const locationName = useSettingsStore((s) => s.locationName);
  const { request } = useLocation();

  const [urlDraft, setUrlDraft] = useState(backendUrl);

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <Screen>
      <Card>
        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: palette.primarySoft }]}>
            <Text style={{ fontSize: 26, fontWeight: '900', color: palette.primary }}>
              {(user?.name ?? 'T').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontWeight: '800', fontSize: 17 }}>{user?.name}</Text>
            <Text style={{ color: palette.textMuted, fontSize: 13 }}>{user?.email}</Text>
          </View>
        </View>
      </Card>

      <SectionHeader title="Preferensi" />
      <Card>
        <View style={styles.settingRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Ionicons name="moon-outline" size={20} color={palette.textMuted} />
            <Text style={{ color: palette.text, fontWeight: '600', flex: 1 }}>Mode Gelap</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggle}
            trackColor={{ true: palette.primary, false: palette.border }}
          />
        </View>

        <TouchableOpacity style={styles.settingRow} onPress={request}>
          <Ionicons name="location-outline" size={20} color={palette.textMuted} />
          <Text style={{ color: palette.text, fontWeight: '600', flex: 1, marginLeft: 10 }}>
            Lokasi
          </Text>
          <Text style={{ color: palette.textMuted, fontSize: 12.5 }}>
            {locationName || 'Atur lokasi'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('History')}>
          <Ionicons name="time-outline" size={20} color={palette.textMuted} />
          <Text style={{ color: palette.text, fontWeight: '600', flex: 1, marginLeft: 10 }}>
            Riwayat Kalkulasi
          </Text>
          <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
        </TouchableOpacity>
      </Card>

      <SectionHeader title="Server AI (Opsional)" />
      <Card>
        <Input
          label="URL Backend"
          placeholder="https://api.contoh.com"
          value={urlDraft}
          onChangeText={setUrlDraft}
          autoCapitalize="none"
          keyboardType="url"
          hint="API key AI/cuaca diproses di backend — tidak pernah disimpan di APK."
        />
        <Button
          title="Simpan URL"
          variant="ghost"
          onPress={() => {
            setBackendUrl(urlDraft.trim());
            Alert.alert('Tersimpan', urlDraft.trim() ? 'Backend AI diatur.' : 'Mode lokal aktif.');
          }}
        />
      </Card>

      <SectionHeader title="Tentang" />
      <Card>
        <Text style={{ color: palette.text, fontWeight: '800' }}>TAWANGTANI v1.0.0</Text>
        <Text style={{ color: palette.textMuted, fontSize: 12.5, lineHeight: 19, marginTop: 6 }}>
          Asisten pertanian digital. Aplikasi ini alat bantu — bukan pengganti label resmi produk,
          penyuluh, atau regulasi. Data dosis harus diverifikasi ke sumber resmi.
        </Text>
      </Card>

      <Button title="Keluar" variant="danger" onPress={handleLogout} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
  },
});

export default ProfileScreen;
