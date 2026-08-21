import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '@/theme/ThemeProvider';
import { RootProps } from '@/navigation/types';

const SignupScreen: React.FC<RootProps<'Signup'>> = ({ navigation }) => {
  const { palette } = useTheme();
  const signUp = useAuthStore((s) => s.signUp);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Nama wajib diisi';
    if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email tidak valid';
    if (password.length < 6) e.password = 'Minimal 6 karakter';
    if (password !== confirm) e.confirm = 'Konfirmasi tidak cocok';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await signUp(name, email, password);
    } catch (err) {
      Alert.alert('Pendaftaran Gagal', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.background }]}>
        <Text style={[styles.title, { color: palette.text }]}>Buat Akun</Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          Mulai kelola lahan Anda dengan TAWANGTANI
        </Text>

        <Input label="Nama Lengkap" placeholder="Nama Anda" value={name} onChangeText={setName} error={errors.name} />
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
          placeholder="Minimal 6 karakter"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={errors.password}
        />
        <Input
          label="Konfirmasi Password"
          placeholder="Ulangi password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          error={errors.confirm}
        />

        <Button title="Daftar" onPress={handleSignup} loading={loading} />

        <View style={styles.footer}>
          <Text style={{ color: palette.textMuted }}>Sudah punya akun? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ color: palette.primary, fontWeight: '700' }}>Masuk</Text>
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
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 6,
    marginBottom: 28,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
  },
});

export default SignupScreen;
