import { Model } from "@prisma/client";
import { OrganizationModelConfig } from "@prisma/client";

export interface OrganizationBrandData {
  id: number;
  name: string;
  color: string | null;
  order: number;
  models: OrganizationModelData[];
}

export interface OrganizationModelData {
  id: number;
  name: string;
  order: number;
}

// --- Tipos para el Modelo N:M ---
// (Mover a un archivo types.ts centralizado sería ideal)
export interface ModelData {
  id: number;
  name: string;
  order: number;
}

export interface BrandWithModelsData {
  id: number;
  name: string;
  models: ModelData[];
}

// --- Tipos para el Modelo N:M + Configuración de Modelo ---
// Modelo de datos tal como viene de la BD
interface ModelWithOrgConfig extends Model {
  organizationModelConfigs: OrganizationModelConfig[];
}
// Tipo para pasar al Frontend (combinado)
export interface DisplayModelData {
  id: number;
  name: string;
  orgOrder: number;
  isVisible?: boolean;
}

export interface BrandWithDisplayModelsData {
  id: number;
  name: string;
  models: DisplayModelData[];
}

export interface OrganizationBrandDisplayData {
  id: number;
  order: number;
  color: string | null;
  brand: BrandWithDisplayModelsData;
}
