import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { RootStackParamList } from './types';

import HomeScreen from '@/screens/home/HomeScreen';
import AIChatScreen from '@/screens/ai/AIChatScreen';
import CalculatorHomeScreen from '@/screens/calculator/CalculatorHomeScreen';
import FertilizerCalculatorScreen from '@/screens/calculator/FertilizerCalculatorScreen';
import PesticideCalculatorScreen from '@/screens/calculator/PesticideCalculatorScreen';
import GridCalculatorScreen from '@/screens/calculator/GridCalculatorScreen';
import UnitConverterScreen from '@/screens/calculator/UnitConverterScreen';
import WeatherDetailScreen from '@/screens/weather/WeatherDetailScreen';
import FarmListScreen from '@/screens/farm/FarmListScreen';
import FarmFormScreen from '@/screens/farm/FarmFormScreen';
import ActivitiesScreen from '@/screens/farm/ActivitiesScreen';
import ProductListScreen from '@/screens/products/ProductListScreen';
import ProductDetailScreen from '@/screens/products/ProductDetailScreen';
import HistoryScreen from '@/screens/history/HistoryScreen';
import ProfileScreen from '@/screens/profile/ProfileScreen';
import LoginScreen from '@/screens/auth/LoginScreen';
import SignupScreen from '@/screens/auth/SignupScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  HomeActive: 'home',
  AI: 'chatbubble-ellipses-outline',
  AIActive: 'chatbubble-ellipses',
  Kalkulator: 'calculator-outline',
  KalkulatorActive: 'calculator',
  Lahan: 'leaf-outline',
  LahanActive: 'leaf',
  Profil: 'person-circle-outline',
  ProfilActive: 'person-circle',
};

const MainTabs: React.FC = () => {
  const { palette } = useTheme();
  const color = palette.primary;
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused }) => {
          const key = focused ? `${route.name}Active` : route.name;
          const icon = TAB_ICONS[key] ?? TAB_ICONS[route.name];
          return <Ionicons name={icon} size={23} color={focused ? color : palette.textMuted} />;
        },
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="AI" component={AIChatScreen} options={{ title: 'AI Tani' }} />
      <Tabs.Screen name="Kalkulator" component={CalculatorHomeScreen} />
      <Tabs.Screen name="Lahan" component={FarmListScreen} />
      <Tabs.Screen name="Profil" component={ProfileScreen} />
    </Tabs.Navigator>
  );
};

const RootNavigator: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const { navTheme } = useTheme();

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerBackTitle: 'Kembali' }}>
        {!user ? (
          <>
            <Stack.Screen name="Auth" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="Signup"
              component={SignupScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="WeatherDetail"
              component={WeatherDetailScreen}
              options={{ title: 'Cuaca' }}
            />
            <Stack.Screen
              name="ProductList"
              component={ProductListScreen}
              options={{ title: 'Katalog Produk' }}
            />
            <Stack.Screen
              name="ProductDetail"
              component={ProductDetailScreen}
              options={{ title: 'Detail Produk' }}
            />
            <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Riwayat' }} />
            <Stack.Screen
              name="FarmForm"
              component={FarmFormScreen}
              options={{ title: 'Tambah Lahan' }}
            />
            <Stack.Screen
              name="Activities"
              component={ActivitiesScreen}
              options={{ title: 'Aktivitas & Reminder' }}
            />
            <Stack.Screen
              name="FertilizerCalculator"
              component={FertilizerCalculatorScreen}
              options={{ title: 'Kalkulator Pupuk' }}
            />
            <Stack.Screen
              name="PesticideCalculator"
              component={PesticideCalculatorScreen}
              options={{ title: 'Kalkulator Pestisida' }}
            />
            <Stack.Screen
              name="GridCalculator"
              component={GridCalculatorScreen}
              options={{ title: 'Kalkulator Grid' }}
            />
            <Stack.Screen
              name="UnitConverter"
              component={UnitConverterScreen}
              options={{ title: 'Konversi Satuan' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
