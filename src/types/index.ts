export type AreaUnit = 'm2' | 'are' | 'ha';

export interface User {
  id: string;
  name: string;
  email: string;
}

export type GrowthStage = 'semai' | 'vegetatif' | 'generatif' | 'pematangan' | 'panen';

export interface Crop {
  id: string;
  cropType: string;
  variety?: string;
  plantingDate?: string;
  growthStage: GrowthStage;
}

export interface Farm {
  id: string;
  name: string;
  areaValue: number;
  areaUnit: AreaUnit;
  location?: string;
  crops: Crop[];
  createdAt: string;
}

export type ProductCategory = 'pupuk' | 'pestisida';

export interface ProductDose {
  id: string;
  crop: string;
  target: string;
  dose: number;
  unit: string;
  waterVolumeLPerHa?: number;
  source: string;
}

export interface ProductWarnings {
  apd?: string;
  reEntryHours?: number;
  preHarvestDays?: number;
  notes?: string[];
}

export interface Product {
  id: string;
  brand: string;
  name: string;
  category: ProductCategory;
  formulation: string;
  activeIngredient: string;
  doses: ProductDose[];
  source: string;
  verified: boolean;
  verifiedAt?: string;
  warnings?: ProductWarnings;
}

export type HistoryType = 'fertilizer' | 'pesticide' | 'conversion';

export interface HistoryItem {
  id: string;
  type: HistoryType;
  title: string;
  inputsText: string;
  resultText: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolName?: string;
  createdAt: string;
}

export interface WeatherCurrent {
  temperature: number;
  humidity: number;
  precipitation: number;
  weatherCode: number;
  windSpeed: number;
  isDay: boolean;
  time: string;
}

export interface WeatherHourlyItem {
  time: string;
  temperature: number;
  precipitationProbability: number;
  weatherCode: number;
}

export interface WeatherDailyItem {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
  windMax: number;
}

export interface WeatherData {
  current: WeatherCurrent;
  hourly: WeatherHourlyItem[];
  daily: WeatherDailyItem[];
}

export type SprayLevel = 'ideal' | 'hati-hati' | 'hindari';

export interface SprayCondition {
  level: SprayLevel;
  reasons: string[];
}
