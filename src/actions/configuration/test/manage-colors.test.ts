import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import {
  createMotoColor,
  updateMotoColor,
  deleteMotoColor,
  updateMotoColorsOrder,
} from '../manage-colors';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { ColorType } from '@/types/ColorType';

// Mock de Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    motoColor: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock de console para tests silenciosos
const mockConsole = {
  error: vi.fn(),
  log: vi.fn(),
};

const mockRevalidatePath = revalidatePath as any;
const mockPrisma = prisma as any;

describe('Manage Colors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockOrganizationId = 'org-123';
  const mockMotoColor = {
    id: 1,
    name: 'Rojo Ferrari',
    type: 'SOLIDO' as ColorType,
    colorOne: '#FF0000',
    colorTwo: null,
    order: 0,
    organizationId: mockOrganizationId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('✨ createMotoColor', () => {
    const mockFormData = new FormData();
    
    beforeEach(() => {
      mockFormData.set('name', 'Azul Bitono');
      mockFormData.set('type', 'BITONO');
      mockFormData.set('colorOne', '#0066CC');
      mockFormData.set('colorTwo', '#003366');
      mockFormData.set('organizationId', mockOrganizationId);
    });

    describe('✅ Successful Creation', () => {
      it('should create solid color successfully', async () => {
        // Arrange
        const solidFormData = new FormData();
        solidFormData.set('name', 'Blanco Puro');
        solidFormData.set('type', 'SOLIDO');
        solidFormData.set('colorOne', '#FFFFFF');
        solidFormData.set('organizationId', mockOrganizationId);

        mockPrisma.motoColor.findUnique.mockResolvedValue(null);
        mockPrisma.motoColor.aggregate.mockResolvedValue({ _max: { order: 2 } });
        mockPrisma.motoColor.create.mockResolvedValue({
          ...mockMotoColor,
          name: 'Blanco Puro',
          type: 'SOLIDO',
          colorOne: '#FFFFFF',
          colorTwo: null,
          order: 3,
        });

        // Act
        const result = await createMotoColor(undefined, solidFormData);

        // Assert
        expect(mockPrisma.motoColor.create).toHaveBeenCalledWith({
          data: {
            name: 'Blanco Puro',
            type: 'SOLIDO',
            colorOne: '#FFFFFF',
            colorTwo: null,
            order: 3,
            organizationId: mockOrganizationId,
          },
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.newColor?.name).toBe('Blanco Puro');
          expect(result.newColor?.type).toBe('SOLIDO');
          expect(result.newColor?.colorTwo).toBeNull();
        }
      });

      it('should create bitono color with two colors successfully', async () => {
        // Arrange
        mockPrisma.motoColor.findUnique.mockResolvedValue(null);
        mockPrisma.motoColor.aggregate.mockResolvedValue({ _max: { order: 1 } });
        mockPrisma.motoColor.create.mockResolvedValue({
          ...mockMotoColor,
          name: 'Azul Bitono',
          type: 'BITONO',
          colorOne: '#0066CC',
          colorTwo: '#003366',
          order: 2,
        });

        // Act
        const result = await createMotoColor(undefined, mockFormData);

        // Assert
        expect(mockPrisma.motoColor.create).toHaveBeenCalledWith({
          data: {
            name: 'Azul Bitono',
            type: 'BITONO',
            colorOne: '#0066CC',
            colorTwo: '#003366',
            order: 2,
            organizationId: mockOrganizationId,
          },
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.newColor?.colorTwo).toBe('#003366');
        }
      });

      it('should handle first color creation (no existing colors)', async () => {
        // Arrange
        mockPrisma.motoColor.findUnique.mockResolvedValue(null);
        mockPrisma.motoColor.aggregate.mockResolvedValue({ _max: { order: null } });
        mockPrisma.motoColor.create.mockResolvedValue({
          ...mockMotoColor,
          order: 0,
        });

        // Act
        const result = await createMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.newColor?.order).toBe(0);
        }
      });

      it('should automatically set colorTwo to null for solid colors', async () => {
        // Arrange
        const solidWithColorTwo = new FormData();
        solidWithColorTwo.set('name', 'Verde Sólido');
        solidWithColorTwo.set('type', 'SOLIDO');
        solidWithColorTwo.set('colorOne', '#00FF00');
        solidWithColorTwo.set('organizationId', mockOrganizationId);

        mockPrisma.motoColor.findUnique.mockResolvedValue(null);
        mockPrisma.motoColor.aggregate.mockResolvedValue({ _max: { order: 0 } });
        mockPrisma.motoColor.create.mockResolvedValue({
          ...mockMotoColor,
          name: 'Verde Sólido',
          type: 'SOLIDO',
          colorTwo: null,
        });

        // Act
        const result = await createMotoColor(undefined, solidWithColorTwo);

        // Assert
        expect(mockPrisma.motoColor.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: 'Verde Sólido',
            type: 'SOLIDO',
            colorOne: '#00FF00',
            colorTwo: null,
          }),
        });
        expect(result.success).toBe(true);
      });
    });

    describe('❌ Validation Errors', () => {
      it('should return error for missing organizationId', async () => {
        // Arrange
        const noOrgFormData = new FormData();
        noOrgFormData.set('name', 'Test Color');
        noOrgFormData.set('type', 'SOLIDO');
        noOrgFormData.set('colorOne', '#FF0000');

        // Act
        const result = await createMotoColor(undefined, noOrgFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('ID de organización faltante en la solicitud.');
        expect(mockPrisma.motoColor.create).not.toHaveBeenCalled();
      });

      it('should return error for empty name', async () => {
        // Arrange
        mockFormData.set('name', '');

        // Act
        const result = await createMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Datos inválidos');
        expect(mockPrisma.motoColor.create).not.toHaveBeenCalled();
      });

      it('should return error for invalid color type', async () => {
        // Arrange
        mockFormData.set('type', 'INVALID_TYPE');

        // Act
        const result = await createMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Datos inválidos');
      });

      it('should return error for invalid color format', async () => {
        // Arrange
        mockFormData.set('colorOne', 'not-a-color');

        // Act
        const result = await createMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Datos inválidos');
      });

      it('should return error for missing required colorOne', async () => {
        // Arrange
        mockFormData.delete('colorOne');

        // Act
        const result = await createMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Datos inválidos');
      });
    });

    describe('❌ Business Logic Errors', () => {
      it('should return error for duplicate color name in organization', async () => {
        // Arrange
        mockPrisma.motoColor.findUnique.mockResolvedValue(mockMotoColor);

        // Act
        const result = await createMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('ya existe en esta organización');
        expect(mockPrisma.motoColor.create).not.toHaveBeenCalled();
      });
    });

    describe('❌ Database Errors', () => {
      it('should handle foreign key constraint error', async () => {
        // Arrange
        mockPrisma.motoColor.findUnique.mockResolvedValue(null);
        mockPrisma.motoColor.aggregate.mockResolvedValue({ _max: { order: 0 } });
        const fkError = new Prisma.PrismaClientKnownRequestError(
          'Foreign key constraint failed',
          { code: 'P2003', clientVersion: '5.0.0' }
        );
        mockPrisma.motoColor.create.mockRejectedValue(fkError);

        // Act
        const result = await createMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Error de referencia: La organización especificada no existe.');
        expect(mockConsole.error).toHaveBeenCalledWith(
          '🔥 ERROR SERVER ACTION (createMotoColor):',
          fkError
        );
      });

      it('should handle general database errors', async () => {
        // Arrange
        mockPrisma.motoColor.findUnique.mockResolvedValue(null);
        mockPrisma.motoColor.aggregate.mockResolvedValue({ _max: { order: 0 } });
        const dbError = new Error('Database connection failed');
        mockPrisma.motoColor.create.mockRejectedValue(dbError);

        // Act
        const result = await createMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Error al crear el color.');
      });
    });
  });

  describe('✏️ updateMotoColor', () => {
    const mockFormData = new FormData();
    
    beforeEach(() => {
      mockFormData.set('id', '1');
      mockFormData.set('name', 'Rojo Actualizado');
      mockFormData.set('type', 'BITONO');
      mockFormData.set('colorOne', '#CC0000');
      mockFormData.set('colorTwo', '#660000');
      mockFormData.set('organizationId', mockOrganizationId);
    });

    describe('✅ Successful Update', () => {
      it('should update color successfully', async () => {
        // Arrange
        mockPrisma.motoColor.findUnique
          .mockResolvedValueOnce(mockMotoColor) // For ownership check
          .mockResolvedValueOnce(null); // For name uniqueness check
        mockPrisma.motoColor.update.mockResolvedValue({
          ...mockMotoColor,
          name: 'Rojo Actualizado',
          type: 'BITONO',
          colorTwo: '#660000',
        });

        // Act
        const result = await updateMotoColor(undefined, mockFormData);

        // Assert
        expect(mockPrisma.motoColor.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: {
            name: 'Rojo Actualizado',
            type: 'BITONO',
            colorOne: '#CC0000',
            colorTwo: '#660000',
          },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/configuration');
        expect(result.success).toBe(true);
      });

      it('should update solid color and set colorTwo to null', async () => {
        // Arrange
        const solidFormData = new FormData();
        solidFormData.set('id', '1');
        solidFormData.set('name', 'Rojo Sólido');
        solidFormData.set('type', 'SOLIDO');
        solidFormData.set('colorOne', '#CC0000');
        // No incluimos colorTwo para tipo SOLIDO según las reglas de validación
        solidFormData.set('organizationId', mockOrganizationId);

        mockPrisma.motoColor.findUnique
          .mockResolvedValueOnce(mockMotoColor)
          .mockResolvedValueOnce(null);
        mockPrisma.motoColor.update.mockResolvedValue({
          ...mockMotoColor,
          name: 'Rojo Sólido',
          type: 'SOLIDO',
          colorTwo: null,
        });

        // Act
        const result = await updateMotoColor(undefined, solidFormData);

        // Assert
        expect(mockPrisma.motoColor.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: expect.objectContaining({
            name: 'Rojo Sólido',
            type: 'SOLIDO',
            colorOne: '#CC0000',
            colorTwo: null,
          }),
        });
        expect(result.success).toBe(true);
      });

      it('should allow same name for same color', async () => {
        // Arrange
        mockFormData.set('name', mockMotoColor.name); // Same name as existing

        mockPrisma.motoColor.findUnique
          .mockResolvedValueOnce(mockMotoColor)
          .mockResolvedValueOnce(mockMotoColor); // Same color found with same ID
        mockPrisma.motoColor.update.mockResolvedValue(mockMotoColor);

        // Act
        const result = await updateMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(true);
      });
    });

    describe('❌ Validation Errors', () => {
      it('should return error for missing organizationId', async () => {
        // Arrange
        const noOrgFormData = new FormData();
        noOrgFormData.set('id', '1');
        noOrgFormData.set('name', 'Test');

        // Act
        const result = await updateMotoColor(undefined, noOrgFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('ID de organización faltante en la solicitud (update).');
      });

      it('should return error for invalid ID', async () => {
        // Arrange
        mockFormData.set('id', 'invalid-id');

        // Act
        const result = await updateMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Datos inválidos');
      });

      it('should return error for missing ID', async () => {
        // Arrange
        mockFormData.delete('id');

        // Act
        const result = await updateMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Datos inválidos');
      });
    });

    describe('🔒 Authorization Errors', () => {
      it('should return error when color does not exist', async () => {
        // Arrange
        mockPrisma.motoColor.findUnique.mockResolvedValue(null);

        // Act
        const result = await updateMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('El color a actualizar no se encontró.');
        expect(mockPrisma.motoColor.update).not.toHaveBeenCalled();
      });

      it('should return error when color belongs to different organization', async () => {
        // Arrange
        mockPrisma.motoColor.findUnique.mockResolvedValue({
          ...mockMotoColor,
          organizationId: 'different-org',
        });

        // Act
        const result = await updateMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('No tienes permiso para editar este color.');
        expect(mockPrisma.motoColor.update).not.toHaveBeenCalled();
      });

      it('should return error for duplicate name in organization', async () => {
        // Arrange
        mockPrisma.motoColor.findUnique
          .mockResolvedValueOnce(mockMotoColor)
          .mockResolvedValueOnce({ ...mockMotoColor, id: 2 }); // Different color with same name

        // Act
        const result = await updateMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('ya existe en esta organización');
        expect(mockPrisma.motoColor.update).not.toHaveBeenCalled();
      });
    });

    describe('❌ Database Errors', () => {
      it('should handle record not found error', async () => {
        // Arrange
        mockPrisma.motoColor.findUnique
          .mockResolvedValueOnce(mockMotoColor)
          .mockResolvedValueOnce(null);
        const notFoundError = new Prisma.PrismaClientKnownRequestError(
          'Record not found',
          { code: 'P2025', clientVersion: '5.0.0' }
        );
        mockPrisma.motoColor.update.mockRejectedValue(notFoundError);

        // Act
        const result = await updateMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('El color a actualizar no se encontró.');
      });

      it('should handle general database errors', async () => {
        // Arrange
        mockPrisma.motoColor.findUnique
          .mockResolvedValueOnce(mockMotoColor)
          .mockResolvedValueOnce(null);
        const dbError = new Error('Update failed');
        mockPrisma.motoColor.update.mockRejectedValue(dbError);

        // Act
        const result = await updateMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Error al actualizar el color.');
      });
    });
  });

  describe('🗑️ deleteMotoColor', () => {
    const mockFormData = new FormData();
    
    beforeEach(() => {
      mockFormData.set('id', '1');
      mockFormData.set('organizationId', mockOrganizationId);
    });

    describe('✅ Successful Deletion', () => {
      it('should delete color successfully', async () => {
        // Arrange
        mockPrisma.motoColor.findUnique.mockResolvedValue(mockMotoColor);
        mockPrisma.motoColor.delete.mockResolvedValue(mockMotoColor);

        // Act
        const result = await deleteMotoColor(undefined, mockFormData);

        // Assert
        expect(mockPrisma.motoColor.findUnique).toHaveBeenCalledWith({
          where: { id: 1 },
        });
        expect(mockPrisma.motoColor.delete).toHaveBeenCalledWith({
          where: { id: 1 },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/configuration');
        expect(result.success).toBe(true);
      });
    });

    describe('❌ Validation Errors', () => {
      it('should return error for missing organizationId', async () => {
        // Arrange
        const noOrgFormData = new FormData();
        noOrgFormData.set('id', '1');

        // Act
        const result = await deleteMotoColor(undefined, noOrgFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('ID de organización faltante en la solicitud (delete).');
      });

      it('should return error for invalid ID', async () => {
        // Arrange
        mockFormData.set('id', 'invalid-id');

        // Act
        const result = await deleteMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('ID inválido.');
        expect(mockPrisma.motoColor.findUnique).not.toHaveBeenCalled();
      });
    });

    describe('🔒 Authorization Errors', () => {
      it('should return error when color does not exist', async () => {
        // Arrange
        mockPrisma.motoColor.findUnique.mockResolvedValue(null);

        // Act
        const result = await deleteMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('El color a eliminar no se encontró.');
        expect(mockPrisma.motoColor.delete).not.toHaveBeenCalled();
      });

      it('should return error when color belongs to different organization', async () => {
        // Arrange
        mockPrisma.motoColor.findUnique.mockResolvedValue({
          ...mockMotoColor,
          organizationId: 'different-org',
        });

        // Act
        const result = await deleteMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('No tienes permiso para eliminar este color.');
        expect(mockPrisma.motoColor.delete).not.toHaveBeenCalled();
      });
    });

    describe('❌ Database Errors', () => {
      it('should handle record not found during deletion', async () => {
        // Arrange
        mockPrisma.motoColor.findUnique.mockResolvedValue(mockMotoColor);
        const notFoundError = new Prisma.PrismaClientKnownRequestError(
          'Record not found',
          { code: 'P2025', clientVersion: '5.0.0' }
        );
        mockPrisma.motoColor.delete.mockRejectedValue(notFoundError);

        // Act
        const result = await deleteMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('El color a eliminar no se encontró.');
      });

      it('should handle general database errors', async () => {
        // Arrange
        mockPrisma.motoColor.findUnique.mockResolvedValue(mockMotoColor);
        const dbError = new Error('Delete failed');
        mockPrisma.motoColor.delete.mockRejectedValue(dbError);

        // Act
        const result = await deleteMotoColor(undefined, mockFormData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Error al eliminar el color.');
      });
    });
  });

  describe('🔄 updateMotoColorsOrder', () => {
    describe('✅ Successful Reordering', () => {
      it('should update colors order successfully', async () => {
        // Arrange
        const payload = {
          colors: [
            { id: 1, order: 2 },
            { id: 2, order: 0 },
            { id: 3, order: 1 },
          ],
          organizationId: mockOrganizationId,
        };

        const existingColors = [
          { id: 1 },
          { id: 2 },
          { id: 3 },
        ];

        mockPrisma.motoColor.findMany.mockResolvedValue(existingColors);
        mockPrisma.$transaction.mockResolvedValue([{}, {}, {}]);

        // Act
        const result = await updateMotoColorsOrder(undefined, payload);

        // Assert
        expect(mockPrisma.motoColor.findMany).toHaveBeenCalledWith({
          where: {
            id: { in: [1, 2, 3] },
            organizationId: mockOrganizationId,
          },
          select: { id: true },
        });
        expect(mockPrisma.$transaction).toHaveBeenCalled();
        expect(mockRevalidatePath).toHaveBeenCalledWith('/configuration');
        expect(result.success).toBe(true);
      });

      it('should handle single color reordering', async () => {
        // Arrange
        const payload = {
          colors: [{ id: 1, order: 5 }],
          organizationId: mockOrganizationId,
        };

        mockPrisma.motoColor.findMany.mockResolvedValue([{ id: 1 }]);
        mockPrisma.$transaction.mockResolvedValue([{}]);

        // Act
        const result = await updateMotoColorsOrder(undefined, payload);

        // Assert
        expect(result.success).toBe(true);
      });

      it('should handle empty colors array', async () => {
        // Arrange
        const payload = {
          colors: [],
          organizationId: mockOrganizationId,
        };

        mockPrisma.motoColor.findMany.mockResolvedValue([]);
        mockPrisma.$transaction.mockResolvedValue([]);

        // Act
        const result = await updateMotoColorsOrder(undefined, payload);

        // Assert
        expect(result.success).toBe(true);
      });
    });

    describe('❌ Validation Errors', () => {
      it('should return error for missing organizationId', async () => {
        // Arrange
        const payload = {
          colors: [{ id: 1, order: 0 }],
          organizationId: '',
        };

        // Act
        const result = await updateMotoColorsOrder(undefined, payload);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('ID de organización faltante en el payload.');
        expect(mockPrisma.motoColor.findMany).not.toHaveBeenCalled();
      });

      it('should return error for invalid data structure', async () => {
        // Arrange
        const payload = {
          colors: [
            { id: 'invalid', order: 0 }, // Invalid ID
          ],
          organizationId: mockOrganizationId,
        } as any;

        // Act
        const result = await updateMotoColorsOrder(undefined, payload);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Datos de orden inválidos');
      });

      it('should return error for negative order values', async () => {
        // Arrange
        const payload = {
          colors: [{ id: 1, order: -1 }],
          organizationId: mockOrganizationId,
        };

        // Act
        const result = await updateMotoColorsOrder(undefined, payload);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Datos de orden inválidos');
      });
    });

    describe('🔒 Authorization Errors', () => {
      it('should return error when colors do not belong to organization', async () => {
        // Arrange
        const payload = {
          colors: [
            { id: 1, order: 0 },
            { id: 2, order: 1 },
            { id: 3, order: 2 },
          ],
          organizationId: mockOrganizationId,
        };

        // Only 2 colors found instead of 3
        mockPrisma.motoColor.findMany.mockResolvedValue([
          { id: 1 },
          { id: 2 },
        ]);

        // Act
        const result = await updateMotoColorsOrder(undefined, payload);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Error: Uno o más colores no pertenecen a tu organización.');
        expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      });
    });

    describe('❌ Database Errors', () => {
      it('should handle transaction errors', async () => {
        // Arrange
        const payload = {
          colors: [{ id: 1, order: 0 }],
          organizationId: mockOrganizationId,
        };

        mockPrisma.motoColor.findMany.mockResolvedValue([{ id: 1 }]);
        mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

        // Act
        const result = await updateMotoColorsOrder(undefined, payload);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Error al actualizar el orden de los colores.');
        expect(mockConsole.error).toHaveBeenCalledWith(
          '🔥 ERROR SERVER ACTION (updateMotoColorsOrder):',
          expect.any(Error)
        );
      });
    });
  });

  describe('🔄 Cache Revalidation', () => {
    it('should revalidate correct path on all successful operations', async () => {
      const testCases = [
        // Test createMotoColor - no revalidation because it doesn't call revalidatePath
        // Test updateMotoColor
        async () => {
          const formData = new FormData();
          formData.set('id', '1');
          formData.set('name', 'Updated Color');
          formData.set('type', 'SOLIDO');
          formData.set('colorOne', '#FF0000');
          formData.set('organizationId', mockOrganizationId);

          mockPrisma.motoColor.findUnique
            .mockResolvedValueOnce(mockMotoColor)
            .mockResolvedValueOnce(null);
          mockPrisma.motoColor.update.mockResolvedValue(mockMotoColor);
          
          return updateMotoColor(undefined, formData);
        },
        // Test deleteMotoColor
        async () => {
          const formData = new FormData();
          formData.set('id', '1');
          formData.set('organizationId', mockOrganizationId);

          mockPrisma.motoColor.findUnique.mockResolvedValue(mockMotoColor);
          mockPrisma.motoColor.delete.mockResolvedValue(mockMotoColor);
          
          return deleteMotoColor(undefined, formData);
        },
        // Test updateMotoColorsOrder
        async () => {
          const payload = {
            colors: [{ id: 1, order: 0 }],
            organizationId: mockOrganizationId,
          };

          mockPrisma.motoColor.findMany.mockResolvedValue([{ id: 1 }]);
          mockPrisma.$transaction.mockResolvedValue([{}]);
          
          return updateMotoColorsOrder(undefined, payload);
        },
      ];

      // Act & Assert
      for (const testCase of testCases) {
        vi.clearAllMocks();
        await testCase();
        expect(mockRevalidatePath).toHaveBeenCalledWith('/configuration');
      }
    });

    it('should not revalidate on errors', async () => {
      // Test validation error
      const invalidFormData = new FormData();
      invalidFormData.set('name', '');
      invalidFormData.set('organizationId', mockOrganizationId);
      
      await createMotoColor(undefined, invalidFormData);
      expect(mockRevalidatePath).not.toHaveBeenCalled();

      // Test database error
      vi.clearAllMocks();
      const validFormData = new FormData();
      validFormData.set('name', 'Valid Color');
      validFormData.set('type', 'SOLIDO');
      validFormData.set('colorOne', '#FF0000');
      validFormData.set('organizationId', mockOrganizationId);
      
      mockPrisma.motoColor.findUnique.mockResolvedValue(null);
      mockPrisma.motoColor.aggregate.mockResolvedValue({ _max: { order: 0 } });
      mockPrisma.motoColor.create.mockRejectedValue(new Error('DB Error'));
      
      await createMotoColor(undefined, validFormData);
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('🎯 Edge Cases', () => {
    it('should handle very long color names within limits', async () => {
      // Arrange
      const longName = 'A'.repeat(50); // Within reasonable limits
      const formData = new FormData();
      formData.set('name', longName);
      formData.set('type', 'SOLIDO');
      formData.set('colorOne', '#FF0000');
      formData.set('organizationId', mockOrganizationId);

      mockPrisma.motoColor.findUnique.mockResolvedValue(null);
      mockPrisma.motoColor.aggregate.mockResolvedValue({ _max: { order: 0 } });
      mockPrisma.motoColor.create.mockResolvedValue({
        ...mockMotoColor,
        name: longName,
      });

      // Act
      const result = await createMotoColor(undefined, formData);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newColor?.name).toBe(longName);
      }
    });

    it('should handle unicode characters in color names', async () => {
      // Arrange
      const unicodeName = 'Rojo 红色 🔴 España';
      const formData = new FormData();
      formData.set('name', unicodeName);
      formData.set('type', 'SOLIDO');
      formData.set('colorOne', '#FF0000');
      formData.set('organizationId', mockOrganizationId);

      mockPrisma.motoColor.findUnique.mockResolvedValue(null);
      mockPrisma.motoColor.aggregate.mockResolvedValue({ _max: { order: 0 } });
      mockPrisma.motoColor.create.mockResolvedValue({
        ...mockMotoColor,
        name: unicodeName,
      });

      // Act
      const result = await createMotoColor(undefined, formData);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newColor?.name).toBe(unicodeName);
      }
    });

    it('should handle large order numbers in reordering', async () => {
      // Arrange
      const payload = {
        colors: [
          { id: 1, order: 999999 },
          { id: 2, order: 1000000 },
        ],
        organizationId: mockOrganizationId,
      };

      mockPrisma.motoColor.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      // Act
      const result = await updateMotoColorsOrder(undefined, payload);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('📊 Console Logging', () => {
    it('should log data in createMotoColor for debugging', async () => {
      // Arrange
      const formData = new FormData();
      formData.set('name', 'Debug Color');
      formData.set('type', 'SOLIDO');
      formData.set('colorOne', '#FF0000');
      formData.set('organizationId', mockOrganizationId);

      // Act
      await createMotoColor(undefined, formData);

      // Assert
      expect(mockConsole.log).toHaveBeenCalledWith(
        'createMotoColor (in action) formData:',
        expect.objectContaining({
          name: 'Debug Color',
          type: 'SOLIDO',
          colorOne: '#FF0000',
          organizationId: mockOrganizationId,
        })
      );
    });

    it('should log validation errors with details', async () => {
      // Arrange
      const invalidFormData = new FormData();
      invalidFormData.set('name', ''); // Invalid
      invalidFormData.set('organizationId', mockOrganizationId);

      // Act
      await createMotoColor(undefined, invalidFormData);

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[createMotoColor] Validation Error:',
        expect.stringContaining('name:')
      );
    });

    it('should log errors during database operations', async () => {
      // Arrange
      const formData = new FormData();
      formData.set('id', '1');
      formData.set('name', 'Test');
      formData.set('type', 'SOLIDO');
      formData.set('colorOne', '#FF0000');
      formData.set('organizationId', mockOrganizationId);

      mockPrisma.motoColor.findUnique
        .mockResolvedValueOnce(mockMotoColor)
        .mockResolvedValueOnce(null);
      const error = new Error('Test error');
      mockPrisma.motoColor.update.mockRejectedValue(error);

      // Act
      await updateMotoColor(undefined, formData);

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith(
        '🔥 ERROR SERVER ACTION (updateMotoColor):',
        error
      );
    });
  });
}); 
