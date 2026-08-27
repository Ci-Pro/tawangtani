export interface ChatMessageIn {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export interface ToolContext {
  userId?: string;
  coords?: { lat: number; lon: number };
  locationName?: string;
  farmContext?: {
    farmName?: string;
    areaText?: string;
    cropsText?: string[];
  };
  products?: Array<{
    id: string;
    brand: string;
    name: string;
    category: string;
    formulation: string;
    activeIngredient: string;
    doses: Array<{
      crop: string;
      target: string;
      dose: number;
      unit: string;
      waterVolumeLPerHa?: number;
      source: string;
    }>;
    source: string;
    verified: boolean;
    updatedAt?: string;
  }>;
}

export interface ToolCallOut {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  summary: string;
  data?: unknown;
}
