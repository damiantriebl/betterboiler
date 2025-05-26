import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import {
  associateOrganizationBrand,
  dissociateOrganizationBrand,
} from '../associate-organization-brand';
import prisma from '@/lib/prisma';
import { getOrganizationIdFromSession } from '../../util';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';

// Mock de Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    brand: {
      findUnique: vi.fn(),
    },
    organizationBrand: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    organizationModelConfig: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock de getOrganizationIdFromSession
vi.mock('../../util', () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

// Mock de console para tests silenciosos
const mockConsole = {
  error: vi.fn(),
  log: vi.fn(),
};

const mockRevalidatePath = revalidatePath as any;
const mockPrisma = prisma as any;
const mockGetOrganization = getOrganizationIdFromSession as any;

describe('Associate Organization Brand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockOrganizationId = 'org-123';
  const mockBrandId = '1';

  const mockBrandWithModels = {
    id: 1,
    name: 'Toyota',
    color: '#ff0000',
    models: [
      { id: 1, name: 'Corolla', brandId: 1 },
      { id: 2, name: 'Camry', brandId: 1 },
      { id: 3, name: 'Prius', brandId: 1 },
    ],
  };

  describe('✨ associateOrganizationBrand', () => {
    describe('✅ Successful Association', () => {
      it('should associate brand with models successfully', async () => {
        // Arrange
        mockPrisma.brand.findUnique.mockResolvedValue(mockBrandWithModels);
        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          const mockTx = {
            organizationBrand: {
              create: vi.fn().mockResolvedValue({
                id: 1,
                organizationId: mockOrganizationId,
                brandId: Number(mockBrandId),
                color: mockBrandWithModels.color,
              }),
            },
            organizationModelConfig: {
              createMany: vi.fn().mockResolvedValue({ count: 3 }),
            },
          };
          return await callback(mockTx);
        });

        // Act
        const result = await associateOrganizationBrand({
          organizationId: mockOrganizationId,
          brandId: mockBrandId,
        });

        // Assert
        expect(mockPrisma.brand.findUnique).toHaveBeenCalledWith({
          where: { id: Number(mockBrandId) },
          include: {
            models: {
              orderBy: { name: 'asc' },
            },
          },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/configuration');
        expect(result.success).toBe(true);
        expect(result.message).toBe('Marca asociada y modelos configurados correctamente.');
      });

      it('should associate brand without models', async () => {
        // Arrange
        const brandWithoutModels = {
          ...mockBrandWithModels,
          models: [],
        };
        mockPrisma.brand.findUnique.mockResolvedValue(brandWithoutModels);
        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          const mockTx = {
            organizationBrand: {
              create: vi.fn().mockResolvedValue({
                id: 1,
                organizationId: mockOrganizationId,
                brandId: Number(mockBrandId),
              }),
            },
            organizationModelConfig: {
              createMany: vi.fn(),
            },
          };
          return await callback(mockTx);
        });

        // Act
        const result = await associateOrganizationBrand({
          organizationId: mockOrganizationId,
          brandId: mockBrandId,
        });

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('Marca asociada y modelos configurados correctamente.');
      });

      it('should associate brand with null color', async () => {
        // Arrange
        const brandWithNullColor = {
          ...mockBrandWithModels,
          color: null,
        };
        mockPrisma.brand.findUnique.mockResolvedValue(brandWithNullColor);
        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          const mockTx = {
            organizationBrand: {
              create: vi.fn().mockResolvedValue({
                id: 1,
                organizationId: mockOrganizationId,
                brandId: Number(mockBrandId),
                color: null,
              }),
            },
            organizationModelConfig: {
              createMany: vi.fn().mockResolvedValue({ count: 3 }),
            },
          };
          return await callback(mockTx);
        });

        // Act
        const result = await associateOrganizationBrand({
          organizationId: mockOrganizationId,
          brandId: mockBrandId,
        });

        // Assert
        expect(result.success).toBe(true);
      });

      it('should use custom revalidation path', async () => {
        // Arrange
        const customPath = '/custom-path';
        mockPrisma.brand.findUnique.mockResolvedValue(mockBrandWithModels);
        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          const mockTx = {
            organizationBrand: { create: vi.fn().mockResolvedValue({}) },
            organizationModelConfig: { createMany: vi.fn().mockResolvedValue({ count: 3 }) },
          };
          return await callback(mockTx);
        });

        // Act
        const result = await associateOrganizationBrand({
          organizationId: mockOrganizationId,
          brandId: mockBrandId,
          pathToRevalidate: customPath,
        });

        // Assert
        expect(mockRevalidatePath).toHaveBeenCalledWith(customPath);
        expect(result.success).toBe(true);
      });

      it('should skip revalidation when pathToRevalidate is null', async () => {
        // Arrange
        mockPrisma.brand.findUnique.mockResolvedValue(mockBrandWithModels);
        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          const mockTx = {
            organizationBrand: { create: vi.fn().mockResolvedValue({}) },
            organizationModelConfig: { createMany: vi.fn().mockResolvedValue({ count: 3 }) },
          };
          return await callback(mockTx);
        });

        // Act
        const result = await associateOrganizationBrand({
          organizationId: mockOrganizationId,
          brandId: mockBrandId,
          pathToRevalidate: null as any,
        });

        // Assert
        expect(mockRevalidatePath).not.toHaveBeenCalled();
        expect(result.success).toBe(true);
      });

      it('should create correct model configurations', async () => {
        // Arrange
        mockPrisma.brand.findUnique.mockResolvedValue(mockBrandWithModels);
        let capturedModelConfigs: any[] = [];
        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          const mockTx = {
            organizationBrand: { create: vi.fn().mockResolvedValue({}) },
            organizationModelConfig: {
              createMany: vi.fn().mockImplementation(({ data }) => {
                capturedModelConfigs = data;
                return { count: data.length };
              }),
            },
          };
          return await callback(mockTx);
        });

        // Act
        await associateOrganizationBrand({
          organizationId: mockOrganizationId,
          brandId: mockBrandId,
        });

        // Assert
        expect(capturedModelConfigs).toEqual([
          {
            organizationId: mockOrganizationId,
            modelId: 1,
            isVisible: true,
            order: 0,
          },
          {
            organizationId: mockOrganizationId,
            modelId: 2,
            isVisible: true,
            order: 1,
          },
          {
            organizationId: mockOrganizationId,
            modelId: 3,
            isVisible: true,
            order: 2,
          },
        ]);
      });
    });

    describe('❌ Error Handling', () => {
      it('should handle brand not found', async () => {
        // Arrange
        mockPrisma.brand.findUnique.mockResolvedValue(null);

        // Act
        const result = await associateOrganizationBrand({
          organizationId: mockOrganizationId,
          brandId: mockBrandId,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('La marca global no fue encontrada.');
        expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        expect(mockRevalidatePath).not.toHaveBeenCalled();
      });

      it('should handle duplicate association error', async () => {
        // Arrange
        mockPrisma.brand.findUnique.mockResolvedValue(mockBrandWithModels);
        const duplicateError = new PrismaClientKnownRequestError(
          'Unique constraint failed',
          { code: 'P2002', clientVersion: '5.0.0' }
        );
        mockPrisma.$transaction.mockRejectedValue(duplicateError);

        // Act
        const result = await associateOrganizationBrand({
          organizationId: mockOrganizationId,
          brandId: mockBrandId,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('La marca ya está asociada a esta organización.');
        expect(mockRevalidatePath).not.toHaveBeenCalled();
      });

      it('should handle generic unique constraint error', async () => {
        // Arrange
        mockPrisma.brand.findUnique.mockResolvedValue(mockBrandWithModels);
        const uniqueError = new Error('Unique constraint failed');
        mockPrisma.$transaction.mockRejectedValue(uniqueError);

        // Act
        const result = await associateOrganizationBrand({
          organizationId: mockOrganizationId,
          brandId: mockBrandId,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('La marca ya está asociada a esta organización.');
      });

      it('should handle general database errors', async () => {
        // Arrange
        mockPrisma.brand.findUnique.mockResolvedValue(mockBrandWithModels);
        const dbError = new Error('Database connection failed');
        mockPrisma.$transaction.mockRejectedValue(dbError);

        // Act
        const result = await associateOrganizationBrand({
          organizationId: mockOrganizationId,
          brandId: mockBrandId,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Database connection failed');
        expect(mockConsole.error).toHaveBeenCalledWith('Error associating brand:', dbError);
      });

      it('should handle unknown errors', async () => {
        // Arrange
        mockPrisma.brand.findUnique.mockResolvedValue(mockBrandWithModels);
        mockPrisma.$transaction.mockRejectedValue('Unknown error');

        // Act
        const result = await associateOrganizationBrand({
          organizationId: mockOrganizationId,
          brandId: mockBrandId,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Error al asociar la marca y configurar sus modelos.');
      });
    });

    describe('🎯 Edge Cases', () => {
      it('should handle brand with undefined models', async () => {
        // Arrange
        const brandWithUndefinedModels = {
          ...mockBrandWithModels,
          models: undefined,
        };
        mockPrisma.brand.findUnique.mockResolvedValue(brandWithUndefinedModels);
        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          const mockTx = {
            organizationBrand: { create: vi.fn().mockResolvedValue({}) },
            organizationModelConfig: { createMany: vi.fn() },
          };
          return await callback(mockTx);
        });

        // Act
        const result = await associateOrganizationBrand({
          organizationId: mockOrganizationId,
          brandId: mockBrandId,
        });

        // Assert
        expect(result.success).toBe(true);
      });

      it('should handle numeric brand ID as string', async () => {
        // Arrange
        const numericBrandId = '999';
        mockPrisma.brand.findUnique.mockResolvedValue(mockBrandWithModels);
        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          const mockTx = {
            organizationBrand: { create: vi.fn().mockResolvedValue({}) },
            organizationModelConfig: { createMany: vi.fn().mockResolvedValue({ count: 3 }) },
          };
          return await callback(mockTx);
        });

        // Act
        const result = await associateOrganizationBrand({
          organizationId: mockOrganizationId,
          brandId: numericBrandId,
        });

        // Assert
        expect(mockPrisma.brand.findUnique).toHaveBeenCalledWith({
          where: { id: Number(numericBrandId) },
          include: { models: { orderBy: { name: 'asc' } } },
        });
        expect(result.success).toBe(true);
      });

      it('should handle very large brand ID', async () => {
        // Arrange
        const largeBrandId = '999999999';
        mockPrisma.brand.findUnique.mockResolvedValue(mockBrandWithModels);
        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          const mockTx = {
            organizationBrand: { create: vi.fn().mockResolvedValue({}) },
            organizationModelConfig: { createMany: vi.fn().mockResolvedValue({ count: 3 }) },
          };
          return await callback(mockTx);
        });

        // Act
        const result = await associateOrganizationBrand({
          organizationId: mockOrganizationId,
          brandId: largeBrandId,
        });

        // Assert
        expect(result.success).toBe(true);
      });
    });
  });

  describe('🗑️ dissociateOrganizationBrand', () => {
    const mockFormData = new FormData();
    
    beforeEach(() => {
      mockFormData.set('organizationBrandId', '1');
    });

    describe('✅ Successful Dissociation', () => {
      it('should dissociate brand successfully', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
        mockPrisma.organizationBrand.findUnique.mockResolvedValue({
          id: 1,
          organizationId: mockOrganizationId,
          brandId: 1,
        });
        mockPrisma.organizationBrand.delete.mockResolvedValue({
          id: 1,
          organizationId: mockOrganizationId,
          brandId: 1,
        });

        // Act
        const result = await dissociateOrganizationBrand(null, mockFormData);

        // Assert
        expect(mockPrisma.organizationBrand.findUnique).toHaveBeenCalledWith({
          where: { id: 1 },
        });
        expect(mockPrisma.organizationBrand.delete).toHaveBeenCalledWith({
          where: { id: 1 },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/configuracion');
        expect(result.success).toBe(true);
      });

      it('should handle large organization brand ID', async () => {
        // Arrange
        const largeFormData = new FormData();
        largeFormData.set('organizationBrandId', '999999');
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
        mockPrisma.organizationBrand.findUnique.mockResolvedValue({
          id: 999999,
          organizationId: mockOrganizationId,
          brandId: 1,
        });
        mockPrisma.organizationBrand.delete.mockResolvedValue({});

        // Act
        const result = await dissociateOrganizationBrand(null, largeFormData);

        // Assert
        expect(mockPrisma.organizationBrand.findUnique).toHaveBeenCalledWith({
          where: { id: 999999 },
        });
        expect(result.success).toBe(true);
      });
    });

    describe('❌ Validation Errors', () => {
      it('should return error for missing organizationBrandId', async () => {
        // Arrange
        const emptyFormData = new FormData();
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

        // Act
        const result = await dissociateOrganizationBrand(null, emptyFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('ID de asociación inválido.');
        expect(mockPrisma.organizationBrand.findUnique).not.toHaveBeenCalled();
      });

      it('should return error for non-numeric organizationBrandId', async () => {
        // Arrange
        const invalidFormData = new FormData();
        invalidFormData.set('organizationBrandId', 'invalid-id');
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

        // Act
        const result = await dissociateOrganizationBrand(null, invalidFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('ID de asociación inválido.');
        expect(mockPrisma.organizationBrand.findUnique).not.toHaveBeenCalled();
      });

      it('should return error for empty organizationBrandId', async () => {
        // Arrange
        const emptyIdFormData = new FormData();
        emptyIdFormData.set('organizationBrandId', '');
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

        // Act
        const result = await dissociateOrganizationBrand(null, emptyIdFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('ID de asociación inválido.');
      });
    });

    describe('🔐 Authentication Errors', () => {
      it('should return error when user is not authenticated', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({ organizationId: null });

        // Act
        const result = await dissociateOrganizationBrand(null, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Usuario no autenticado o sin organización.');
        expect(mockPrisma.organizationBrand.findUnique).not.toHaveBeenCalled();
      });

      it('should return error when organization is undefined', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({ organizationId: undefined });

        // Act
        const result = await dissociateOrganizationBrand(null, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Usuario no autenticado o sin organización.');
      });
    });

    describe('🔒 Authorization Errors', () => {
      it('should return error when association does not exist', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
        mockPrisma.organizationBrand.findUnique.mockResolvedValue(null);

        // Act
        const result = await dissociateOrganizationBrand(null, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Asociación no encontrada o no pertenece a tu organización.');
        expect(mockPrisma.organizationBrand.delete).not.toHaveBeenCalled();
      });

      it('should return error when association belongs to different organization', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
        mockPrisma.organizationBrand.findUnique.mockResolvedValue({
          id: 1,
          organizationId: 'different-org-id',
          brandId: 1,
        });

        // Act
        const result = await dissociateOrganizationBrand(null, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Asociación no encontrada o no pertenece a tu organización.');
        expect(mockPrisma.organizationBrand.delete).not.toHaveBeenCalled();
      });
    });

    describe('❌ Database Errors', () => {
      it('should handle record not found error during deletion', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
        mockPrisma.organizationBrand.findUnique.mockResolvedValue({
          id: 1,
          organizationId: mockOrganizationId,
          brandId: 1,
        });
        const notFoundError = new Prisma.PrismaClientKnownRequestError(
          'Record not found',
          { code: 'P2025', clientVersion: '5.0.0' }
        );
        mockPrisma.organizationBrand.delete.mockRejectedValue(notFoundError);

        // Act
        const result = await dissociateOrganizationBrand(null, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('La asociación a eliminar no se encontró.');
        expect(mockConsole.error).toHaveBeenCalledWith(
          '🔥 ERROR SERVER ACTION (dissociateOrganizationBrand):',
          notFoundError
        );
      });

      it('should handle general database errors', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
        mockPrisma.organizationBrand.findUnique.mockResolvedValue({
          id: 1,
          organizationId: mockOrganizationId,
          brandId: 1,
        });
        const dbError = new Error('Database connection failed');
        mockPrisma.organizationBrand.delete.mockRejectedValue(dbError);

        // Act
        const result = await dissociateOrganizationBrand(null, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Error al desasociar la marca.');
        expect(mockConsole.error).toHaveBeenCalledWith(
          '🔥 ERROR SERVER ACTION (dissociateOrganizationBrand):',
          dbError
        );
      });

      it('should handle unknown errors during deletion', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
        mockPrisma.organizationBrand.findUnique.mockResolvedValue({
          id: 1,
          organizationId: mockOrganizationId,
          brandId: 1,
        });
        mockPrisma.organizationBrand.delete.mockRejectedValue('Unknown error');

        // Act
        const result = await dissociateOrganizationBrand(null, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Error al desasociar la marca.');
      });
    });

    describe('🎯 Edge Cases', () => {
      it('should handle zero as organizationBrandId', async () => {
        // Arrange
        const zeroFormData = new FormData();
        zeroFormData.set('organizationBrandId', '0');
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
        mockPrisma.organizationBrand.findUnique.mockResolvedValue({
          id: 0,
          organizationId: mockOrganizationId,
          brandId: 1,
        });
        mockPrisma.organizationBrand.delete.mockResolvedValue({});

        // Act
        const result = await dissociateOrganizationBrand(null, zeroFormData);

        // Assert
        expect(mockPrisma.organizationBrand.findUnique).toHaveBeenCalledWith({
          where: { id: 0 },
        });
        expect(result.success).toBe(true);
      });

      it('should handle negative organizationBrandId', async () => {
        // Arrange
        const negativeFormData = new FormData();
        negativeFormData.set('organizationBrandId', '-1');
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
        mockPrisma.organizationBrand.findUnique.mockResolvedValue(null);

        // Act
        const result = await dissociateOrganizationBrand(null, negativeFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Asociación no encontrada o no pertenece a tu organización.');
      });

      it('should handle decimal organizationBrandId', async () => {
        // Arrange
        const decimalFormData = new FormData();
        decimalFormData.set('organizationBrandId', '1.5');
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
        mockPrisma.organizationBrand.findUnique.mockResolvedValue(null);

        // Act
        const result = await dissociateOrganizationBrand(null, decimalFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Asociación no encontrada o no pertenece a tu organización.');
      });
    });

    describe('🔄 Cache Revalidation', () => {
      it('should revalidate correct path on successful dissociation', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
        mockPrisma.organizationBrand.findUnique.mockResolvedValue({
          id: 1,
          organizationId: mockOrganizationId,
          brandId: 1,
        });
        mockPrisma.organizationBrand.delete.mockResolvedValue({});

        // Act
        await dissociateOrganizationBrand(null, mockFormData);

        // Assert
        expect(mockRevalidatePath).toHaveBeenCalledWith('/configuracion');
        expect(mockRevalidatePath).toHaveBeenCalledTimes(1);
      });

      it('should not revalidate on validation errors', async () => {
        // Arrange
        const emptyFormData = new FormData();
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

        // Act
        await dissociateOrganizationBrand(null, emptyFormData);

        // Assert
        expect(mockRevalidatePath).not.toHaveBeenCalled();
      });

      it('should not revalidate on database errors', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
        mockPrisma.organizationBrand.findUnique.mockResolvedValue({
          id: 1,
          organizationId: mockOrganizationId,
          brandId: 1,
        });
        mockPrisma.organizationBrand.delete.mockRejectedValue(new Error('DB Error'));

        // Act
        await dissociateOrganizationBrand(null, mockFormData);

        // Assert
        expect(mockRevalidatePath).not.toHaveBeenCalled();
      });
    });
  });

  describe('📊 Console Logging', () => {
    it('should log brand information during association', async () => {
      // Arrange
      mockPrisma.brand.findUnique.mockResolvedValue(mockBrandWithModels);
      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        const mockTx = {
          organizationBrand: { create: vi.fn().mockResolvedValue({}) },
          organizationModelConfig: { createMany: vi.fn().mockResolvedValue({ count: 3 }) },
        };
        return await callback(mockTx);
      });

      // Act
      await associateOrganizationBrand({
        organizationId: mockOrganizationId,
        brandId: mockBrandId,
      });

      // Assert
      expect(mockConsole.log).toHaveBeenCalledWith(
        'associateOrganizationBrand: globalBrandWithModels encontrado:',
        JSON.stringify(mockBrandWithModels, null, 2)
      );
    });

    it('should log model configs during association', async () => {
      // Arrange
      mockPrisma.brand.findUnique.mockResolvedValue(mockBrandWithModels);
      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        const mockTx = {
          organizationBrand: { create: vi.fn().mockResolvedValue({}) },
          organizationModelConfig: {
            createMany: vi.fn().mockImplementation(({ data }) => {
              // This will trigger the console.log in the actual function
              return { count: data.length };
            }),
          },
        };
        return await callback(mockTx);
      });

      // Act
      await associateOrganizationBrand({
        organizationId: mockOrganizationId,
        brandId: mockBrandId,
      });

      // Assert
      expect(mockConsole.log).toHaveBeenCalledWith(
        'associateOrganizationBrand: modelConfigs a crear:',
        expect.any(String)
      );
    });
  });
}); 
