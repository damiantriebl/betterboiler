import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getModelsByBrandId } from '../get-models-by-brand-id';
import prisma from '@/lib/prisma';

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    model: {
      findMany: vi.fn(),
    },
  },
}));

describe('getModelsByBrandId', () => {
  const mockPrisma = prisma as any;

  const mockModels = [
    {
      id: 1,
      name: 'CBR 600',
      brandId: 1,
      imageUrl: 'https://example.com/cbr600.jpg',
      specSheetUrl: 'https://example.com/cbr600.pdf',
      additionalFilesJson: null,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: 2,
      name: 'CBR 1000',
      brandId: 1,
      imageUrl: null,
      specSheetUrl: null,
      additionalFilesJson: JSON.stringify([
        { url: 'https://example.com/manual.pdf', name: 'Manual', type: 'application/pdf' }
      ]),
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.model.findMany.mockResolvedValue(mockModels);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Casos exitosos', () => {
    it('debería obtener modelos por brand ID exitosamente', async () => {
      const brandId = 1;
      const result = await getModelsByBrandId(brandId);

      expect(result.success).toBe(true);
      expect(result.models).toEqual(mockModels);
      expect(result.models!).toHaveLength(2);
    });

    it('debería llamar a Prisma con parámetros correctos', async () => {
      const brandId = 1;
      await getModelsByBrandId(brandId);

      expect(mockPrisma.model.findMany).toHaveBeenCalledWith({
        where: { brandId: 1 },
        orderBy: { name: 'asc' },
      });
    });

    it('debería manejar brand ID diferente', async () => {
      const brandId = 2;
      const otherBrandModels = [
        {
          id: 3,
          name: 'YZF-R6',
          brandId: 2,
          imageUrl: null,
          specSheetUrl: null,
          additionalFilesJson: null,
          createdAt: new Date('2024-01-25'),
          updatedAt: new Date('2024-01-25'),
        },
      ];

      mockPrisma.model.findMany.mockResolvedValue(otherBrandModels);

      const result = await getModelsByBrandId(brandId);

      expect(result.success).toBe(true);
      expect(result.models).toEqual(otherBrandModels);
      expect(mockPrisma.model.findMany).toHaveBeenCalledWith({
        where: { brandId: 2 },
        orderBy: { name: 'asc' },
      });
    });

    it('debería devolver lista vacía cuando no hay modelos', async () => {
      mockPrisma.model.findMany.mockResolvedValue([]);

      const result = await getModelsByBrandId(1);

      expect(result.success).toBe(true);
      expect(result.models).toEqual([]);
      expect(result.models!).toHaveLength(0);
    });

    it('debería manejar modelos con diferentes configuraciones de archivos', async () => {
      const modelsWithVariousFiles = [
        {
          id: 4,
          name: 'Model A',
          brandId: 1,
          imageUrl: 'https://example.com/image.jpg',
          specSheetUrl: 'https://example.com/spec.pdf',
          additionalFilesJson: null,
        },
        {
          id: 5,
          name: 'Model B',
          brandId: 1,
          imageUrl: null,
          specSheetUrl: null,
          additionalFilesJson: JSON.stringify([
            { url: 'https://example.com/manual1.pdf', name: 'Manual 1', type: 'application/pdf' },
            { url: 'https://example.com/manual2.pdf', name: 'Manual 2', type: 'application/pdf' }
          ]),
        },
      ];

      mockPrisma.model.findMany.mockResolvedValue(modelsWithVariousFiles);

      const result = await getModelsByBrandId(1);

      expect(result.success).toBe(true);
      expect(result.models!).toHaveLength(2);
      expect(result.models![0].imageUrl).toBeTruthy();
      expect(result.models![1].additionalFilesJson).toContain('Manual 1');
    });
  });

  describe('Casos de error', () => {
    it('debería manejar error de base de datos', async () => {
      const errorMessage = 'Database connection failed';
      mockPrisma.model.findMany.mockRejectedValue(new Error(errorMessage));

      const result = await getModelsByBrandId(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
      expect(result.models).toBeUndefined();
    });

    it('debería manejar error genérico', async () => {
      mockPrisma.model.findMany.mockRejectedValue('Unknown error');

      const result = await getModelsByBrandId(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error al obtener modelos.');
      expect(result.models).toBeUndefined();
    });

    it('debería manejar error de tipo TypeError', async () => {
      const typeError = new TypeError('Cannot read property of undefined');
      mockPrisma.model.findMany.mockRejectedValue(typeError);

      const result = await getModelsByBrandId(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot read property of undefined');
    });
  });

  describe('Casos edge', () => {
    it('debería manejar brandId como 0', async () => {
      mockPrisma.model.findMany.mockResolvedValue([]);

      const result = await getModelsByBrandId(0);

      expect(result.success).toBe(true);
      expect(mockPrisma.model.findMany).toHaveBeenCalledWith({
        where: { brandId: 0 },
        orderBy: { name: 'asc' },
      });
    });

    it('debería manejar brandId como número negativo', async () => {
      mockPrisma.model.findMany.mockResolvedValue([]);

      const result = await getModelsByBrandId(-1);

      expect(result.success).toBe(true);
      expect(mockPrisma.model.findMany).toHaveBeenCalledWith({
        where: { brandId: -1 },
        orderBy: { name: 'asc' },
      });
    });

    it('debería manejar brandId como número muy grande', async () => {
      const largeBrandId = 999999999;
      mockPrisma.model.findMany.mockResolvedValue([]);

      const result = await getModelsByBrandId(largeBrandId);

      expect(result.success).toBe(true);
      expect(mockPrisma.model.findMany).toHaveBeenCalledWith({
        where: { brandId: largeBrandId },
        orderBy: { name: 'asc' },
      });
    });

    it('debería verificar que los modelos están ordenados por nombre', async () => {
      const unorderedModels = [
        { id: 1, name: 'Z Model', brandId: 1 },
        { id: 2, name: 'A Model', brandId: 1 },
        { id: 3, name: 'M Model', brandId: 1 },
      ];

      mockPrisma.model.findMany.mockResolvedValue(unorderedModels);

      const result = await getModelsByBrandId(1);

      expect(result.success).toBe(true);
      expect(mockPrisma.model.findMany).toHaveBeenCalledWith({
        where: { brandId: 1 },
        orderBy: { name: 'asc' },
      });
      // La función solicita ordenamiento, aunque los datos mock no lo muestren
      expect(result.models).toEqual(unorderedModels);
    });

    it('debería manejar modelos con valores null y undefined', async () => {
      const modelsWithNulls = [
        {
          id: 1,
          name: 'Model with nulls',
          brandId: 1,
          imageUrl: null,
          specSheetUrl: null,
          additionalFilesJson: null,
          createdAt: null,
          updatedAt: undefined,
        },
      ];

      mockPrisma.model.findMany.mockResolvedValue(modelsWithNulls);

      const result = await getModelsByBrandId(1);

      expect(result.success).toBe(true);
      expect(result.models).toEqual(modelsWithNulls);
    });
  });
}); 
