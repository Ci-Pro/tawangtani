import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  WeatherDetail: undefined;
  ProductList: { category?: 'pupuk' | 'pestisida' } | undefined;
  ProductDetail: { productId: string };
  History: undefined;
  FarmForm: { farmId?: string } | undefined;
  FertilizerCalculator: undefined;
  PesticideCalculator: undefined;
  UnitConverter: undefined;
};

export type RootProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
