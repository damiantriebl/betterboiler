import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import {
  togglePaymentMethod,
  associatePaymentMethod,
  removePaymentMethod,
  updatePaymentMethodsOrder,
} from '../manage-payment-methods';
import prisma from '@/lib/prisma';

// Mock de Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    organizationPaymentMethod: {
      update: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock de console para tests silenciosos
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

const mockRevalidatePath = revalidatePath as any;
const mockPrisma = prisma as any;

describe('Manage Payment Methods Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockOrganizationId = 'org-123';

  describe('🔄 togglePaymentMethod', () => {
    describe('✅ Casos Exitosos', () => {
      it('debería habilitar un método de pago correctamente', async () => {
        // Arrange
        const formData = new FormData();
        formData.append('methodId', '1');
        formData.append('isEnabled', 'true');

        mockPrisma.organizationPaymentMethod.update.mockResolvedValue({});

        // Act
        const result = await togglePaymentMethod(mockOrganizationId, formData);

        // Assert
        expect(mockPrisma.organizationPaymentMethod.update).toHaveBeenCalledWith({
          where: {
            organizationId_methodId: {
              organizationId: mockOrganizationId,
              methodId: 1,
            },
          },
          data: { isEnabled: true },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/configuration');
        expect(result.success).toBe(true);
        expect(result.message).toBe('Método de pago habilitado correctamente.');
      });

      it('debería deshabilitar un método de pago correctamente', async () => {
        // Arrange
        const formData = new FormData();
        formData.append('methodId', '2');
        formData.append('isEnabled', 'false');

        mockPrisma.organizationPaymentMethod.update.mockResolvedValue({});

        // Act
        const result = await togglePaymentMethod(mockOrganizationId, formData);

        // Assert
        expect(mockPrisma.organizationPaymentMethod.update).toHaveBeenCalledWith({
          where: {
            organizationId_methodId: {
              organizationId: mockOrganizationId,
              methodId: 2,
            },
          },
          data: { isEnabled: false },
        });
        expect(result.success).toBe(true);
        expect(result.message).toBe('Método de pago deshabilitado correctamente.');
      });

      it('debería manejar valores isEnabled no "true" como false', async () => {
        // Arrange - cualquier valor que no sea "true" se convierte a false
        const formData = new FormData();
        formData.append('methodId', '1');
        formData.append('isEnabled', 'invalid');

        mockPrisma.organizationPaymentMethod.update.mockResolvedValue({});

        // Act
        const result = await togglePaymentMethod(mockOrganizationId, formData);

        // Assert
        expect(mockPrisma.organizationPaymentMethod.update).toHaveBeenCalledWith({
          where: {
            organizationId_methodId: {
              organizationId: mockOrganizationId,
              methodId: 1,
            },
          },
          data: { isEnabled: false }, // "invalid" !== "true" => false
        });
        expect(result.success).toBe(true);
      });

      it('debería manejar methodId faltante (se convierte a 0)', async () => {
        // Arrange - FormData.get() devuelve null cuando la clave no existe, Number(null) = 0
        const formData = new FormData();
        formData.append('isEnabled', 'true');

        mockPrisma.organizationPaymentMethod.update.mockResolvedValue({});

        // Act
        const result = await togglePaymentMethod(mockOrganizationId, formData);

        // Assert
        expect(mockPrisma.organizationPaymentMethod.update).toHaveBeenCalledWith({
          where: {
            organizationId_methodId: {
              organizationId: mockOrganizationId,
              methodId: 0,
            },
          },
          data: { isEnabled: true },
        });
        expect(result.success).toBe(true);
      });
    });

    describe('❌ Manejo de Errores', () => {
      it('debería devolver error para methodId inválido', async () => {
        // Arrange
        const formData = new FormData();
        formData.append('methodId', 'invalid');
        formData.append('isEnabled', 'true');

        // Act
        const result = await togglePaymentMethod(mockOrganizationId, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Error de validación');
        expect(mockPrisma.organizationPaymentMethod.update).not.toHaveBeenCalled();
      });

      it('debería manejar errores de base de datos', async () => {
        // Arrange
        const formData = new FormData();
        formData.append('methodId', '1');
        formData.append('isEnabled', 'true');

        const dbError = new Error('Database connection failed');
        mockPrisma.organizationPaymentMethod.update.mockRejectedValue(dbError);

        // Act
        const result = await togglePaymentMethod(mockOrganizationId, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Database connection failed');
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error updating payment method status:',
          dbError
        );
      });
    });
  });

  describe('🔗 associatePaymentMethod', () => {
    describe('✅ Casos Exitosos', () => {
      it('debería asociar un método de pago cuando no hay métodos existentes', async () => {
        // Arrange
        const methodId = 1;
        mockPrisma.organizationPaymentMethod.findUnique.mockResolvedValue(null);
        mockPrisma.organizationPaymentMethod.findFirst.mockResolvedValue(null);
        mockPrisma.organizationPaymentMethod.create.mockResolvedValue({});

        // Act
        const result = await associatePaymentMethod(mockOrganizationId, methodId);

        // Assert
        expect(mockPrisma.organizationPaymentMethod.create).toHaveBeenCalledWith({
          data: {
            organizationId: mockOrganizationId,
            methodId,
            isEnabled: true,
            order: 0,
          },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/configuration');
        expect(result.success).toBe(true);
        expect(result.message).toBe('Método de pago asociado correctamente.');
      });
    });

    describe('❌ Manejo de Errores', () => {
      it('debería devolver error cuando la asociación ya existe', async () => {
        // Arrange
        const methodId = 1;
        mockPrisma.organizationPaymentMethod.findUnique.mockResolvedValue({
          id: 1,
          organizationId: mockOrganizationId,
          methodId,
        });

        // Act
        const result = await associatePaymentMethod(mockOrganizationId, methodId);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Este método de pago ya está asociado a la organización.');
        expect(mockPrisma.organizationPaymentMethod.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('🗑️ removePaymentMethod', () => {
    describe('✅ Casos Exitosos', () => {
      it('debería eliminar un método de pago correctamente', async () => {
        // Arrange
        const organizationMethodId = 1;
        mockPrisma.organizationPaymentMethod.delete.mockResolvedValue({});

        // Act
        const result = await removePaymentMethod(mockOrganizationId, organizationMethodId);

        // Assert
        expect(mockPrisma.organizationPaymentMethod.delete).toHaveBeenCalledWith({
          where: { id: organizationMethodId },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/configuration');
        expect(result.success).toBe(true);
        expect(result.message).toBe('Método de pago desasociado correctamente.');
      });
    });
  });

  describe('📊 updatePaymentMethodsOrder', () => {
    describe('✅ Casos Exitosos', () => {
      it('debería actualizar el orden de métodos de pago correctamente', async () => {
        // Arrange
        const orderData = [
          { id: 1, order: 0 },
          { id: 2, order: 1 },
        ];
        mockPrisma.$transaction.mockResolvedValue([]);

        // Act
        const result = await updatePaymentMethodsOrder(mockOrganizationId, orderData);

        // Assert
        expect(mockPrisma.$transaction).toHaveBeenCalled();
        expect(mockRevalidatePath).toHaveBeenCalledWith('/configuration');
        expect(result.success).toBe(true);
        expect(result.message).toBe('Orden de métodos de pago actualizado correctamente.');
      });
    });
  });

  describe('🔄 Cache Revalidation', () => {
    it('no debería revalidar cuando hay errores de validación', async () => {
      // Clear previous calls
      vi.clearAllMocks();

      // Test validation error
      const invalidFormData = new FormData();
      invalidFormData.append('methodId', 'invalid');
      invalidFormData.append('isEnabled', 'true');
      await togglePaymentMethod(mockOrganizationId, invalidFormData);

      // Assert
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });
}); 
