import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MotorcycleState } from '@prisma/client';
import {
  createMotorcycleBatch,
  updateMotorcycle,
  updateMotorcycleStatus,
  reserveMotorcycle,
  getAvailableStateTransitions,
  type CreateBatchResult,
  type UpdateStatusResult,
  type OperationResult,
  type ReserveMotorcycleParams,
} from '../motorcycle-operations-unified';

// Mock de dependencias
vi.mock('@/lib/prisma', () => ({
  default: {
    motorcycle: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
    $use: vi.fn(),
  },
}));

vi.mock('../../util', () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  unstable_noStore: vi.fn(),
}));

vi.mock('@/zod/MotorcycleBatchSchema', () => ({
  motorcycleBatchSchema: {
    safeParse: vi.fn(),
  },
}));

describe('motorcycle-operations-unified', () => {
  const mockOrganizationId = 'org-123';
  const mockMotorcycleData = {
    brandId: 1,
    modelId: 1,
    year: 2023,
    displacement: 150,
    costPrice: 4000,
    retailPrice: 5000,
    wholesalePrice: 4500,
    currency: 'USD',
    supplierId: 1,
    imageUrl: 'https://example.com/image.jpg',
    units: [
      {
        chassisNumber: 'ABC123',
        engineNumber: 'ENG456',
        colorId: 1,
        mileage: 0,
        branchId: 1,
        state: MotorcycleState.STOCK,
        licensePlate: null,
        observations: null,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createMotorcycleBatch', () => {
    it('debería crear un lote de motocicletas exitosamente', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const { motorcycleBatchSchema } = await import('@/zod/MotorcycleBatchSchema');
      const prisma = await import('@/lib/prisma');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (motorcycleBatchSchema.safeParse as any).mockReturnValue({
        success: true,
        data: mockMotorcycleData,
      });
      (prisma.default.motorcycle.findMany as any).mockResolvedValue([]);
      (prisma.default.$transaction as any).mockResolvedValue([
        { id: 1, chassisNumber: 'ABC123' },
      ]);

      // Act
      const result = await createMotorcycleBatch(null, mockMotorcycleData as any);

      // Assert
      expect(result.success).toBe(true);
      expect(result.createdCount).toBe(1);
      expect(result.message).toContain('Lote creado exitosamente');
    });

    it('debería fallar cuando no hay autenticación', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      
      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: null });

      // Act
      const result = await createMotorcycleBatch(null, mockMotorcycleData as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuario no autenticado o sin organización.');
    });

    it('debería fallar cuando hay errores de validación', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const { motorcycleBatchSchema } = await import('@/zod/MotorcycleBatchSchema');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (motorcycleBatchSchema.safeParse as any).mockReturnValue({
        success: false,
        error: {
          flatten: () => ({
            fieldErrors: {
              brandId: ['Debe seleccionar una marca'],
              year: ['El año es obligatorio'],
            },
          }),
        },
      });

      // Act
      const result = await createMotorcycleBatch(null, mockMotorcycleData as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Datos inválidos');
      expect(result.error).toContain('brandId');
      expect(result.error).toContain('year');
    });

    it('debería detectar números de chasis duplicados en el lote', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const { motorcycleBatchSchema } = await import('@/zod/MotorcycleBatchSchema');

      const duplicateData = {
        ...mockMotorcycleData,
        units: [
          { ...mockMotorcycleData.units[0], chassisNumber: 'ABC123' },
          { ...mockMotorcycleData.units[0], chassisNumber: 'ABC123' },
        ],
      };

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (motorcycleBatchSchema.safeParse as any).mockReturnValue({
        success: true,
        data: duplicateData,
      });

      // Act
      const result = await createMotorcycleBatch(null, duplicateData as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('números de chasis duplicados en el lote');
    });

    it('debería detectar números de chasis existentes en la base de datos', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const { motorcycleBatchSchema } = await import('@/zod/MotorcycleBatchSchema');
      const prisma = await import('@/lib/prisma');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (motorcycleBatchSchema.safeParse as any).mockReturnValue({
        success: true,
        data: mockMotorcycleData,
      });
      (prisma.default.motorcycle.findMany as any).mockResolvedValue([
        { chassisNumber: 'ABC123' },
      ]);

      // Act
      const result = await createMotorcycleBatch(null, mockMotorcycleData as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Ya existen motos con los siguientes números de chasis');
      expect(result.error).toContain('ABC123');
    });
  });

  describe('updateMotorcycleStatus', () => {
    it('debería actualizar el estado de una motocicleta exitosamente', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const prisma = await import('@/lib/prisma');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (prisma.default.motorcycle.findUnique as any).mockResolvedValue({
        state: MotorcycleState.STOCK,
      });
      (prisma.default.motorcycle.update as any).mockResolvedValue({
        id: 1,
        state: MotorcycleState.PAUSADO,
      });

      // Act
      const result = await updateMotorcycleStatus(1, MotorcycleState.PAUSADO);

      // Assert
      expect(result.success).toBe(true);
      expect(result.previousState).toBe(MotorcycleState.STOCK);
      expect(result.newState).toBe(MotorcycleState.PAUSADO);
      expect(result.message).toContain('Estado actualizado');
    });

    it('debería fallar cuando la transición de estado no es válida', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const prisma = await import('@/lib/prisma');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (prisma.default.motorcycle.findUnique as any).mockResolvedValue({
        state: MotorcycleState.VENDIDO,
      });

      // Act
      const result = await updateMotorcycleStatus(1, MotorcycleState.STOCK);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Transición de estado no permitida');
      expect(result.error).toContain('VENDIDO → STOCK');
    });

    it('debería desconectar cliente cuando se cambia a STOCK desde estados específicos', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const prisma = await import('@/lib/prisma');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (prisma.default.motorcycle.findUnique as any).mockResolvedValue({
        state: MotorcycleState.RESERVADO,
      });
      (prisma.default.motorcycle.update as any).mockResolvedValue({
        id: 1,
        state: MotorcycleState.STOCK,
      });

      // Act
      await updateMotorcycleStatus(1, MotorcycleState.STOCK);

      // Assert
      expect(prisma.default.motorcycle.update).toHaveBeenCalledWith({
        where: {
          id: 1,
          organizationId: mockOrganizationId,
        },
        data: {
          state: MotorcycleState.STOCK,
          client: { disconnect: true },
        },
      });
    });

    it('debería fallar cuando la motocicleta no existe', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const prisma = await import('@/lib/prisma');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (prisma.default.motorcycle.findUnique as any).mockResolvedValue(null);

      // Act
      const result = await updateMotorcycleStatus(999, MotorcycleState.PAUSADO);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Motocicleta no encontrada.');
    });
  });

  describe('reserveMotorcycle', () => {
    const reserveParams: ReserveMotorcycleParams = {
      motorcycleId: 1,
      reservationAmount: 500,
      clientId: 'client-123',
    };

    it('debería reservar una motocicleta exitosamente', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const prisma = await import('@/lib/prisma');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (prisma.default.motorcycle.findUnique as any).mockResolvedValue({
        state: MotorcycleState.STOCK,
      });
      (prisma.default.motorcycle.update as any).mockResolvedValue({
        id: 1,
        state: MotorcycleState.RESERVADO,
        clientId: 'client-123',
      });

      // Act
      const result = await reserveMotorcycle(reserveParams);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Motocicleta reservada exitosamente');
      expect(result.data?.motorcycle.state).toBe(MotorcycleState.RESERVADO);
    });

    it('debería fallar cuando la motocicleta no se puede reservar', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const prisma = await import('@/lib/prisma');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (prisma.default.motorcycle.findUnique as any).mockResolvedValue({
        state: MotorcycleState.VENDIDO,
      });

      // Act
      const result = await reserveMotorcycle(reserveParams);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('No se puede reservar una motocicleta en estado VENDIDO');
    });

    it('debería fallar cuando no hay autenticación', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: null });

      // Act
      const result = await reserveMotorcycle(reserveParams);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuario no autenticado.');
    });
  });

  describe('updateMotorcycle', () => {
    it('debería actualizar una motocicleta exitosamente', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const { motorcycleBatchSchema } = await import('@/zod/MotorcycleBatchSchema');
      const prisma = await import('@/lib/prisma');

      const formData = new FormData();
      formData.append('brandId', '1');
      formData.append('modelId', '1');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (motorcycleBatchSchema.safeParse as any).mockReturnValue({
        success: true,
        data: mockMotorcycleData,
      });
      (prisma.default.motorcycle.update as any).mockResolvedValue({
        id: 1,
        brandId: 1,
      });

      // Act
      const result = await updateMotorcycle(1, null, formData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Motocicleta actualizada correctamente.');
    });

    it('debería fallar cuando faltan datos de unidad', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const { motorcycleBatchSchema } = await import('@/zod/MotorcycleBatchSchema');

      const dataWithoutUnits = { ...mockMotorcycleData, units: [] };

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (motorcycleBatchSchema.safeParse as any).mockReturnValue({
        success: true,
        data: dataWithoutUnits,
      });

      // Act
      const result = await updateMotorcycle(1, null, new FormData());

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Faltan datos de identificación de la unidad.');
    });
  });

  describe('getAvailableStateTransitions', () => {
    it('debería retornar transiciones válidas para STOCK', () => {
      // Act
      const transitions = getAvailableStateTransitions(MotorcycleState.STOCK);

      // Assert
      expect(transitions).toEqual([
        MotorcycleState.PAUSADO,
        MotorcycleState.PROCESANDO,
        MotorcycleState.RESERVADO,
      ]);
    });

    it('debería retornar array vacío para VENDIDO', () => {
      // Act
      const transitions = getAvailableStateTransitions(MotorcycleState.VENDIDO);

      // Assert
      expect(transitions).toEqual([]);
    });

    it('debería retornar transiciones válidas para ELIMINADO', () => {
      // Act
      const transitions = getAvailableStateTransitions(MotorcycleState.ELIMINADO);

      // Assert
      expect(transitions).toEqual([MotorcycleState.STOCK]);
    });
  });

  describe('Manejo de errores de Prisma', () => {
    it('debería manejar errores P2002 (duplicidad) en createMotorcycleBatch', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const { motorcycleBatchSchema } = await import('@/zod/MotorcycleBatchSchema');
      const prisma = await import('@/lib/prisma');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (motorcycleBatchSchema.safeParse as any).mockReturnValue({
        success: true,
        data: mockMotorcycleData,
      });
      (prisma.default.motorcycle.findMany as any).mockResolvedValue([]);

      const { Prisma } = await import('@prisma/client');
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: { target: ['chassisNumber'] }
      });
      (prisma.default.$transaction as any).mockRejectedValue(prismaError);

      // Act
      const result = await createMotorcycleBatch(null, mockMotorcycleData as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error de duplicidad');
      expect(result.error).toContain('número de chasis');
    });

    it('debería manejar errores P2003 (referencia) en createMotorcycleBatch', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const { motorcycleBatchSchema } = await import('@/zod/MotorcycleBatchSchema');
      const prisma = await import('@/lib/prisma');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (motorcycleBatchSchema.safeParse as any).mockReturnValue({
        success: true,
        data: mockMotorcycleData,
      });
      (prisma.default.motorcycle.findMany as any).mockResolvedValue([]);

      const { Prisma } = await import('@prisma/client');
      const prismaError = new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
        code: 'P2003',
        clientVersion: '5.0.0'
      });
      (prisma.default.$transaction as any).mockRejectedValue(prismaError);

      // Act
      const result = await createMotorcycleBatch(null, mockMotorcycleData as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error de referencia');
    });
  });
}); 
