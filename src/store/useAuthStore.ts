import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types';
import { uid } from '@/utils/format';

interface StoredAccount extends User {
  password: string;
}

interface AuthState {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const ACCOUNTS_KEY = 'twt-accounts';

async function getAccounts(): Promise<StoredAccount[]> {
  const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      signIn: async (email, password) => {
        const accounts = await getAccounts();
        const found = accounts.find(
          (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password
        );
        if (!found) throw new Error('Email atau password salah');
        set({ user: { id: found.id, name: found.name, email: found.email } });
      },
      signUp: async (name, email, password) => {
        const accounts = await getAccounts();
        if (accounts.some((a) => a.email.toLowerCase() === email.trim().toLowerCase())) {
          throw new Error('Email sudah terdaftar');
        }
        const account: StoredAccount = {
          id: uid(),
          name: name.trim(),
          email: email.trim(),
          password,
        };
        await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
        set({ user: { id: account.id, name: account.name, email: account.email } });
      },
      signOut: () => set({ user: null }),
    }),
    { name: 'twt-auth', storage: createJSONStorage(() => AsyncStorage) }
  )
);
