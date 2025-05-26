import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { updatePettyCashMovement } from '../update-petty-cash-movement';
import prisma from '@/lib/prisma';
import { getOrganizationIdFromSession } from '../../util';
import type { UpdatePettyCashMovementInput } from '@/zod/PettyCashZod';

// Mock de Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    pettyCashSpend: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
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

describe('Update Petty Cash Movement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockOrganizationId = 'clfx1234567890abcdefghijk'; // Valid CUID format
  const mockUserId = 'user123';
  const mockUserRole = 'ADMIN';

  const mockSpend = {
    id: 'spend-1',
    organizationId: mockOrganizationId,
    withdrawalId: 'withdrawal-1',
    motive: 'oficina',
    description: 'Gasto de oficina',
    amount: 500.0,
    date: new Date('2024-01-15'),
    ticketUrl: 'https://s3.bucket.com/receipt.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
    withdrawal: {
      organizationId: mockOrganizationId,
    },
  };

  const mockUpdatedSpend = {
    ...mockSpend,
    description: 'Gasto actualizado',
    amount: 750.0,
    motive: 'viaje',
    updatedAt: new Date(),
  };

  describe('✅ Casos Exitosos', () => {
    it('debería actualizar un gasto de caja chica correctamente', async () => {
      // Arrange
      const updateData: UpdatePettyCashMovementInput = {
        movementId: 'spend-1',
        amount: 750.50,
        description: 'Gasto de oficina actualizado',
        ticketNumber: 'viaje',
        receiptUrl: 'https://s3.bucket.com/new-receipt.jpg',
      };

      mockGetOrganization.mockResolvedValue({ 
        organizationId: mockOrganizationId, 
        userId: mockUserId,
        userRole: mockUserRole,
      });
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(mockSpend);
      mockPrisma.pettyCashSpend.update.mockResolvedValue(mockUpdatedSpend);

      // Act
      const result = await updatePettyCashMovement(updateData);

      // Assert
      expect(mockPrisma.pettyCashSpend.findUnique).toHaveBeenCalledWith({
        where: { id: 'spend-1' },
        include: { withdrawal: { select: { organizationId: true } } },
      });
      expect(mockPrisma.pettyCashSpend.update).toHaveBeenCalledWith({
        where: { id: 'spend-1' },
        data: {
          amount: 750.50,
          description: 'Gasto de oficina actualizado',
          motive: 'viaje',
          ticketUrl: 'https://s3.bucket.com/new-receipt.jpg',
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/petty-cash', 'page');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Gasto actualizado correctamente.');
    });

    it('debería actualizar gasto solo con campos obligatorios', async () => {
      // Arrange
      const updateData: UpdatePettyCashMovementInput = {
        movementId: 'spend-1',
        amount: 600,
      };

      mockGetOrganization.mockResolvedValue({ 
        organizationId: mockOrganizationId, 
        userId: mockUserId,
        userRole: mockUserRole,
      });
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(mockSpend);
      mockPrisma.pettyCashSpend.update.mockResolvedValue(mockUpdatedSpend);

      // Act
      const result = await updatePettyCashMovement(updateData);

      // Assert
      expect(mockPrisma.pettyCashSpend.update).toHaveBeenCalledWith({
        where: { id: 'spend-1' },
        data: {
          amount: 600,
        },
      });
      expect(result.success).toBe(true);
    });

    it('debería procesar números decimales correctamente', async () => {
      // Arrange
      const updateData: UpdatePettyCashMovementInput = {
        movementId: 'spend-1',
        amount: 1234.56,
        description: 'Gasto con decimales',
      };

      mockGetOrganization.mockResolvedValue({ 
        organizationId: mockOrganizationId, 
        userId: mockUserId,
        userRole: mockUserRole,
      });
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(mockSpend);
      mockPrisma.pettyCashSpend.update.mockResolvedValue(mockUpdatedSpend);

      // Act
      const result = await updatePettyCashMovement(updateData);

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrisma.pettyCashSpend.update).toHaveBeenCalledWith({
        where: { id: 'spend-1' },
        data: {
          amount: 1234.56,
          description: 'Gasto con decimales',
        },
      });
    });

    it('debería actualizar con campos nulos/vacíos cuando sea válido', async () => {
      // Arrange
      const updateData: UpdatePettyCashMovementInput = {
        movementId: 'spend-1',
        amount: 500,
        description: null,
        ticketNumber: '',
        receiptUrl: null,
      };

      mockGetOrganization.mockResolvedValue({ 
        organizationId: mockOrganizationId, 
        userId: mockUserId,
        userRole: mockUserRole,
      });
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(mockSpend);
      mockPrisma.pettyCashSpend.update.mockResolvedValue(mockUpdatedSpend);

      // Act
      const result = await updatePettyCashMovement(updateData);

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrisma.pettyCashSpend.update).toHaveBeenCalledWith({
        where: { id: 'spend-1' },
        data: {
          amount: 500,
        },
      });
    });
  });

  describe('❌ Casos de Error', () => {
    describe('Validación de Session/Organización', () => {
      it('debería fallar cuando no se puede obtener la sesión', async () => {
        // Arrange
        const updateData: UpdatePettyCashMovementInput = {
          movementId: 'spend-1',
          amount: 500,
        };
        
        mockGetOrganization.mockResolvedValue({ 
          error: 'Sesión inválida',
          organizationId: null,
          userId: null,
          userRole: null,
        });

        // Act
        const result = await updatePettyCashMovement(updateData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Sesión inválida');
        expect(mockPrisma.pettyCashSpend.findUnique).not.toHaveBeenCalled();
      });

      it('debería fallar cuando faltan datos esenciales de la sesión', async () => {
        // Arrange
        const updateData: UpdatePettyCashMovementInput = {
          movementId: 'spend-1',
          amount: 500,
        };
        
        mockGetOrganization.mockResolvedValue({ 
          organizationId: mockOrganizationId,
          userId: null, // Falta userId
          userRole: mockUserRole,
        });

        // Act
        const result = await updatePettyCashMovement(updateData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('No se pudo obtener la información de la sesión o falta información esencial.');
      });

      it('debería fallar cuando el usuario no tiene permisos', async () => {
        // Arrange
        const updateData: UpdatePettyCashMovementInput = {
          movementId: 'spend-1',
          amount: 500,
        };
        
        mockGetOrganization.mockResolvedValue({ 
          organizationId: mockOrganizationId,
          userId: mockUserId,
          userRole: 'USER', // Sin permisos
        });

        // Act
        const result = await updatePettyCashMovement(updateData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Acceso denegado. No tienes permiso para realizar esta acción.');
        expect(mockPrisma.pettyCashSpend.findUnique).not.toHaveBeenCalled();
      });
    });

    describe('Validación de Datos', () => {
      it('debería fallar con movementId inválido', async () => {
        // Arrange
        const updateData = {
          movementId: '', // Vacío
          amount: 500,
        } as UpdatePettyCashMovementInput;

        mockGetOrganization.mockResolvedValue({ 
          organizationId: mockOrganizationId, 
          userId: mockUserId,
          userRole: mockUserRole,
        });

        // Act
        const result = await updatePettyCashMovement(updateData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Datos de entrada inválidos.');
        expect(result.fieldErrors?.movementId).toBeDefined();
        expect(mockPrisma.pettyCashSpend.findUnique).not.toHaveBeenCalled();
      });

      it('debería fallar con monto negativo', async () => {
        // Arrange
        const updateData = {
          movementId: 'spend-1',
          amount: -500, // Negativo
        } as UpdatePettyCashMovementInput;

        mockGetOrganization.mockResolvedValue({ 
          organizationId: mockOrganizationId, 
          userId: mockUserId,
          userRole: mockUserRole,
        });

        // Act
        const result = await updatePettyCashMovement(updateData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Datos de entrada inválidos.');
        expect(result.fieldErrors?.amount).toBeDefined();
        expect(mockPrisma.pettyCashSpend.findUnique).not.toHaveBeenCalled();
      });

      it('debería fallar con monto cero', async () => {
        // Arrange
        const updateData = {
          movementId: 'spend-1',
          amount: 0, // Cero no es positivo
        } as UpdatePettyCashMovementInput;

        mockGetOrganization.mockResolvedValue({ 
          organizationId: mockOrganizationId, 
          userId: mockUserId,
          userRole: mockUserRole,
        });

        // Act
        const result = await updatePettyCashMovement(updateData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Datos de entrada inválidos.');
        expect(result.fieldErrors?.amount).toBeDefined();
      });

      it('debería fallar con descripción demasiado larga', async () => {
        // Arrange
        const longDescription = 'a'.repeat(300); // Más de 255 caracteres
        const updateData = {
          movementId: 'spend-1',
          amount: 500,
          description: longDescription,
        } as UpdatePettyCashMovementInput;

        mockGetOrganization.mockResolvedValue({ 
          organizationId: mockOrganizationId, 
          userId: mockUserId,
          userRole: mockUserRole,
        });

        // Act
        const result = await updatePettyCashMovement(updateData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Datos de entrada inválidos.');
        expect(result.fieldErrors?.description).toBeDefined();
      });

      it('debería fallar con URL de recibo inválida', async () => {
        // Arrange
        const updateData = {
          movementId: 'spend-1',
          amount: 500,
          receiptUrl: 'not-a-valid-url',
        } as UpdatePettyCashMovementInput;

        mockGetOrganization.mockResolvedValue({ 
          organizationId: mockOrganizationId, 
          userId: mockUserId,
          userRole: mockUserRole,
        });

        // Act
        const result = await updatePettyCashMovement(updateData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Datos de entrada inválidos.');
        expect(result.fieldErrors?.receiptUrl).toBeDefined();
      });
    });

    describe('Validación de Negocio', () => {
      it('debería fallar cuando el gasto no existe', async () => {
        // Arrange
        const updateData: UpdatePettyCashMovementInput = {
          movementId: 'spend-inexistente',
          amount: 500,
        };

        mockGetOrganization.mockResolvedValue({ 
          organizationId: mockOrganizationId, 
          userId: mockUserId,
          userRole: mockUserRole,
        });
        mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(null);

        // Act
        const result = await updatePettyCashMovement(updateData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Gasto no encontrado.');
        expect(mockPrisma.pettyCashSpend.update).not.toHaveBeenCalled();
      });

      it('debería fallar cuando el gasto no pertenece a la organización', async () => {
        // Arrange
        const spendFromOtherOrg = {
          ...mockSpend,
          withdrawal: {
            organizationId: 'otra-organizacion-id',
          },
        };
        
        const updateData: UpdatePettyCashMovementInput = {
          movementId: 'spend-1',
          amount: 500,
        };

        mockGetOrganization.mockResolvedValue({ 
          organizationId: mockOrganizationId, 
          userId: mockUserId,
          userRole: mockUserRole,
        });
        mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(spendFromOtherOrg);

        // Act
        const result = await updatePettyCashMovement(updateData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Acceso denegado. Este gasto no pertenece a tu organización.');
        expect(mockPrisma.pettyCashSpend.update).not.toHaveBeenCalled();
      });
    });

    describe('Errores de Base de Datos', () => {
      it('debería manejar errores de conexión a la base de datos', async () => {
        // Arrange
        const updateData: UpdatePettyCashMovementInput = {
          movementId: 'spend-1',
          amount: 500,
        };

        mockGetOrganization.mockResolvedValue({ 
          organizationId: mockOrganizationId, 
          userId: mockUserId,
          userRole: mockUserRole,
        });
        mockPrisma.pettyCashSpend.findUnique.mockRejectedValue(new Error('Connection timeout'));

        // Act
        const result = await updatePettyCashMovement(updateData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Error al actualizar el gasto: Connection timeout');
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error updating petty cash spend:',
          expect.any(Error)
        );
      });

      it('debería manejar errores durante la actualización', async () => {
        // Arrange
        const updateData: UpdatePettyCashMovementInput = {
          movementId: 'spend-1',
          amount: 500,
        };

        mockGetOrganization.mockResolvedValue({ 
          organizationId: mockOrganizationId, 
          userId: mockUserId,
          userRole: mockUserRole,
        });
        mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(mockSpend);
        mockPrisma.pettyCashSpend.update.mockRejectedValue(new Error('Update failed'));

        // Act
        const result = await updatePettyCashMovement(updateData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Error al actualizar el gasto: Update failed');
        expect(mockRevalidatePath).not.toHaveBeenCalled();
      });

      it('debería manejar errores desconocidos', async () => {
        // Arrange
        const updateData: UpdatePettyCashMovementInput = {
          movementId: 'spend-1',
          amount: 500,
        };

        mockGetOrganization.mockResolvedValue({ 
          organizationId: mockOrganizationId, 
          userId: mockUserId,
          userRole: mockUserRole,
        });
        mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(mockSpend);
        mockPrisma.pettyCashSpend.update.mockRejectedValue('Unknown error'); // No es Error

        // Act
        const result = await updatePettyCashMovement(updateData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Error al actualizar el gasto: Ocurrió un error desconocido');
      });
    });
  });

  describe('🔄 Cache Revalidation', () => {
    it('debería revalidar cuando la actualización es exitosa', async () => {
      // Arrange
      const updateData: UpdatePettyCashMovementInput = {
        movementId: 'spend-1',
        amount: 750,
      };

      mockGetOrganization.mockResolvedValue({ 
        organizationId: mockOrganizationId, 
        userId: mockUserId,
        userRole: mockUserRole,
      });
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(mockSpend);
      mockPrisma.pettyCashSpend.update.mockResolvedValue(mockUpdatedSpend);

      // Act
      await updatePettyCashMovement(updateData);

      // Assert
      expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/petty-cash', 'page');
    });

    it('no debería revalidar cuando hay errores de validación', async () => {
      // Arrange
      const updateData = {
        movementId: 'spend-1',
        amount: -500, // Monto inválido
      } as UpdatePettyCashMovementInput;

      mockGetOrganization.mockResolvedValue({ 
        organizationId: mockOrganizationId, 
        userId: mockUserId,
        userRole: mockUserRole,
      });

      // Act
      await updatePettyCashMovement(updateData);

      // Assert
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('no debería revalidar cuando hay errores de base de datos', async () => {
      // Arrange
      const updateData: UpdatePettyCashMovementInput = {
        movementId: 'spend-1',
        amount: 500,
      };

      mockGetOrganization.mockResolvedValue({ 
        organizationId: mockOrganizationId, 
        userId: mockUserId,
        userRole: mockUserRole,
      });
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(mockSpend);
      mockPrisma.pettyCashSpend.update.mockRejectedValue(new Error('DB Error'));

      // Act
      await updatePettyCashMovement(updateData);

      // Assert
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('🎯 Edge Cases', () => {
    it('debería actualizar con valores límite válidos', async () => {
      // Arrange
      const updateData: UpdatePettyCashMovementInput = {
        movementId: 'spend-1',
        amount: 0.01, // Monto mínimo válido
        description: 'a'.repeat(255), // Descripción de longitud máxima
        ticketNumber: 'T'.repeat(50), // Ticket número de longitud máxima
        receiptUrl: 'https://example.com/receipt.jpg',
      };

      mockGetOrganization.mockResolvedValue({ 
        organizationId: mockOrganizationId, 
        userId: mockUserId,
        userRole: mockUserRole,
      });
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(mockSpend);
      mockPrisma.pettyCashSpend.update.mockResolvedValue(mockUpdatedSpend);

      // Act
      const result = await updatePettyCashMovement(updateData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('debería manejar diferentes roles con permisos', async () => {
      const permittedRoles = ['ADMIN', 'ROOT', 'CASH_MANAGER'];
      
      for (const role of permittedRoles) {
        // Arrange
        const updateData: UpdatePettyCashMovementInput = {
          movementId: 'spend-1',
          amount: 500,
        };

        mockGetOrganization.mockResolvedValue({ 
          organizationId: mockOrganizationId, 
          userId: mockUserId,
          userRole: role,
        });
        mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(mockSpend);
        mockPrisma.pettyCashSpend.update.mockResolvedValue(mockUpdatedSpend);

        // Act
        const result = await updatePettyCashMovement(updateData);

        // Assert
        expect(result.success).toBe(true);
        
        // Reset mocks para la siguiente iteración
        vi.clearAllMocks();
      }
    });

    it('debería manejar string vacío en receiptUrl como válido', async () => {
      // Arrange
      const updateData: UpdatePettyCashMovementInput = {
        movementId: 'spend-1',
        amount: 500,
        receiptUrl: '', // String vacío es válido
      };

      mockGetOrganization.mockResolvedValue({ 
        organizationId: mockOrganizationId, 
        userId: mockUserId,
        userRole: mockUserRole,
      });
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(mockSpend);
      mockPrisma.pettyCashSpend.update.mockResolvedValue(mockUpdatedSpend);

      // Act
      const result = await updatePettyCashMovement(updateData);

      // Assert
      expect(result.success).toBe(true);
    });
  });
}); 
