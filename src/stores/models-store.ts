import { create } from 'zustand';
import { getModelsByBrandId } from '@/actions/root/get-models-by-brand-id';
import { createModel } from '@/actions/root/create-model';

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
  addModel: (name: string, brandId: number, formData?: FormData) => Promise<{ success: boolean; model?: ModelData; error?: string }>;
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

      if (result.success && Array.isArray(result.models)) {
        const brandModels = result.models.map(model => ({
          id: model.id,
          name: model.name,
          brandId: model.brandId,
          imageUrl: model.imageUrl,
          specSheetUrl: model.specSheetUrl,
          additionalFiles: model.additionalFiles,
        }));

        set((state) => ({
          models: {
            ...state.models,
            [brandId]: brandModels,
          },
          loadingBrandIds: state.loadingBrandIds.filter(id => id !== brandId),
        }));

        return brandModels;
      } else {
        set((state) => ({
          error: result.error || 'Error al obtener modelos',
          loadingBrandIds: state.loadingBrandIds.filter(id => id !== brandId),
        }));
        return [];
      }
    } catch (error) {
      set((state) => ({
        error: error instanceof Error ? error.message : 'Error al obtener modelos',
        loadingBrandIds: state.loadingBrandIds.filter(id => id !== brandId),
      }));
      return [];
    }
  },

  addModel: async (name: string, brandId: number, formData?: FormData) => {
    try {
      let result;
      
      if (formData) {
        // Use FormData if provided (for file uploads)
        result = await createModel(formData);
      } else {
        // Use regular object if no FormData
        result = await createModel({
          name,
          brandId,
          pathToRevalidate: '/configuration',
        });
      }

      if (result.success && result.model) {
        const newModel: ModelData = {
          id: result.model.id,
          name: result.model.name,
          brandId: result.model.brandId,
          imageUrl: result.model.imageUrl,
          specSheetUrl: result.model.specSheetUrl,
          additionalFiles: result.model.additionalFiles,
        };

        set((state) => ({
          models: {
            ...state.models,
            [brandId]: [...(state.models[brandId] || []), newModel],
          },
        }));

        return { success: true, model: newModel };
      } else {
        return { success: false, error: result.error || 'Error al crear modelo' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error al crear modelo' 
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