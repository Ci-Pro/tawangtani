import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AreaUnit, GrowthStage } from '@/types';

export interface CalculatorPrefill {
  label?: string;
  area?: string;
  areaUnit?: AreaUnit;
  dose?: string;
  doseUnit?: string;
}

export type RootStackParamList = {
  Auth: undefined;
  Signup: undefined;
  Main: undefined;
  WeatherDetail: undefined;
  ProductList: { category?: 'pupuk' | 'pestisida' } | undefined;
  ProductDetail: { productId: string };
  History: undefined;
  FarmForm: { farmId?: string } | undefined;
  Plantings: undefined;
  Activities: undefined;
  ActivityCalendar: undefined;
  Market: undefined;
  SopPlan: { cropType?: string; cropLabel?: string; plantingDate?: string; growthStage?: GrowthStage } | undefined;
  FertilizerCalculator: { prefill?: CalculatorPrefill } | undefined;
  PesticideCalculator: { prefill?: CalculatorPrefill } | undefined;
  GridCalculator: undefined;
  UnitConverter: undefined;
  Guide: undefined;
};

export type RootProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
