import { create } from 'zustand';
import { User } from '@/types';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

interface AuthState {
  user: User | null;
  ready: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

function mapUser(u: { id: string; email?: string; user_metadata?: Record<string, unknown> }): User {
  const meta = u.user_metadata ?? {};
  return {
    id: u.id,
    name: String(meta['full_name'] ?? meta['name'] ?? (u.email ?? '').split('@')[0]),
    email: u.email ?? '',
    locale: 'id-ID',
  };
}

function message(err: unknown): string {
  const msg = (err as Error).message ?? '';
  if (msg.includes('Invalid login credentials')) return 'Email atau password salah';
  if (msg.includes('already registered')) return 'Email sudah terdaftar';
  if (msg.includes('Email not confirmed')) return 'Email belum diverifikasi. Cek kotak masuk Anda.';
  if (msg.includes('at least 6 characters')) return 'Password minimal 6 karakter';
  if (!isSupabaseConfigured) return 'Supabase belum dikonfigurasi (.env aplikasi)';
  return msg || 'Terjadi kesalahan';
}

let listening = false;

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  ready: false,

  init: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      set({ user: data.session?.user ? mapUser(data.session.user) : null, ready: true });
      if (!listening) {
        listening = true;
        supabase.auth.onAuthStateChange((_event, session) => {
          set({ user: session?.user ? mapUser(session.user) : null });
        });
      }
    } catch {
      set({ ready: true });
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw new Error(message(error));
    if (data.user) set({ user: mapUser(data.user) });
  },

  signUp: async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() } },
    });
    if (error) throw new Error(message(error));
    if (data.session?.user) {
      set({ user: mapUser(data.session.user) });
    } else {
      throw new Error(
        'Pendaftaran berhasil. Silakan verifikasi email Anda terlebih dahulu, lalu masuk.'
      );
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
