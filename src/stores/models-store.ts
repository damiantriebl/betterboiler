import { createModel } from "@/actions/root/create-model";
import { getModelsByBrandId } from "@/actions/root/get-models-by-brand-id";
import { create } from "zustand";

export interface ModelData {
  id: number;
  name: string;
  brandId: number;
  imageUrl?: string;
  specSheetUrl?: string;
  additionalFiles?: { url: string; name: string; type: string }[];
}

interface ModelsStore {
  // State
  models: Record<number, ModelData[]>; // Models indexed by brandId
  loadingBrandIds: number[];
  error: string | null;

  // Actions
  fetchModelsByBrandId: (brandId: number) => Promise<ModelData[]>;
  addModel: (
    name: string,
    brandId: number,
    formData?: FormData,
  ) => Promise<{ success: boolean; model?: ModelData; error?: string }>;
  reset: () => void;
}

export const useModelsStore = create<ModelsStore>((set, get) => ({
  models: {},
  loadingBrandIds: [],
  error: null,

  fetchModelsByBrandId: async (brandId: number) => {
    // Skip if already loaded
    if (get().models[brandId] && get().models[brandId].length > 0) {
      return get().models[brandId];
    }

    set((state) => ({
      loadingBrandIds: [...state.loadingBrandIds, brandId],
      error: null,
    }));

    try {
      const result = await getModelsByBrandId(brandId);

      if (result.success && result.data) {
        const brandModels = result.data;
        set((state) => ({
          models: {
            ...state.models,
            [brandId]: brandModels,
          },
          loadingBrandIds: state.loadingBrandIds.filter((id) => id !== brandId),
          error: null,
        }));
        return brandModels;
      }
      set((state) => ({
        error: result.error || "Error al obtener modelos",
        models: [],
        loadingBrandIds: state.loadingBrandIds.filter((id) => id !== brandId),
      }));
      return [];
    } catch (error) {
      set((state) => ({
        error: error instanceof Error ? error.message : "Error al obtener modelos",
        loadingBrandIds: state.loadingBrandIds.filter((id) => id !== brandId),
      }));
      return [];
    }
  },

  addModel: async (name: string, brandId: number, formData?: FormData) => {
    try {
      let result: ApiResult | null = null;

      if (formData) {
        formData.append("name", name);
        formData.append("brandId", brandId.toString());
        result = await fetch("/api/models", {
          method: "POST",
          body: formData,
        }).then((res) => res.json());
      } else {
        result = await fetch("/api/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, brandId }),
        }).then((res) => res.json());
      }

      if (result?.success?.models?.[0]) {
        const newModel = result.success.models[0];
        set((state) => ({
          models: {
            ...state.models,
            [brandId]: [...(state.models[brandId] || []), newModel],
          },
          error: null,
        }));
        return { success: true, model: newModel };
      }
      
      return { success: false, error: result?.error || "Error al crear modelo" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error al crear modelo",
      };
    }
  },

  reset: () => {
    set({
      models: {},
      loadingBrandIds: [],
      error: null,
    });
  },
}));
