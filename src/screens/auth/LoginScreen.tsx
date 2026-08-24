import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '@/theme/ThemeProvider';
import { RootStackParamList } from '@/navigation/types';

const LoginScreen: React.FC = () => {
  const { palette } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const signIn = useAuthStore((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const e: typeof errors = {};
    if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email tidak valid';
    if (!password) e.password = 'Password wajib diisi';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      Alert.alert('Login Gagal', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.brand}>
          <Image source={require('@/assets/logo.png')} style={styles.brandLogo} resizeMode="contain" />
          <Text style={[styles.brandName, { color: palette.primary }]}>TAWANGTANI</Text>
          <Text style={[styles.tagline, { color: palette.textMuted }]}>
            Asisten Pertanian Digital Anda
          </Text>
        </View>

        <Input
          label="Email"
          placeholder="nama@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
        />
        <Input
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={errors.password}
        />

        <Button title="Masuk" onPress={handleLogin} loading={loading} />

        <View style={styles.footer}>
          <Text style={{ color: palette.textMuted }}>Belum punya akun? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={{ color: palette.primary, fontWeight: '700' }}>Daftar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 36,
  },
  brandLogo: {
    width: 96,
    height: 96,
    borderRadius: 24,
    marginBottom: 4,
  },
  brandName: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 8,
  },
  tagline: {
    fontSize: 14,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
  },
});

export default LoginScreen;
