// Tipos compartidos para el módulo de stock/new
export interface ModelInfo {
  id: number;
  name: string;
}

export interface BrandForCombobox {
  id: number;
  name: string;
  color: string | null;
  models: ModelInfo[];
}
