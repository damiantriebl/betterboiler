import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import {
  associateBankWithCardType,
  toggleBankCardStatus,
  updateBankCardsOrder,
  dissociateBankCard,
  associateMultipleCardTypesToBank,
} from '../manage-bank-cards';
import prisma from '@/lib/prisma';
import { getOrganizationIdFromSession } from '../../get-Organization-Id-From-Session';

// Mock de Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    bankCard: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    bankingPromotion: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock de getOrganizationIdFromSession
vi.mock('../../get-Organization-Id-From-Session', () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

// Mock de console para tests silenciosos
const mockConsole = {
  error: vi.fn(),
};

const mockRevalidatePath = revalidatePath as any;
const mockPrisma = prisma as any;
const mockGetOrganization = getOrganizationIdFromSession as any;

describe('Bank Cards Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockOrganizationId = 'org-123';
  const mockBankCard = {
    id: 1,
    bankId: 1,
    cardTypeId: 1,
    organizationId: mockOrganizationId,
    isEnabled: true,
    order: 0,
  };

  describe('🏦 associateBankWithCardType', () => {
    describe('✅ Successful Association', () => {
      it('should associate bank with card type successfully with organizationId provided', async () => {
        // Arrange
        mockPrisma.bankCard.findFirst.mockResolvedValue(null); // No existing association
        mockPrisma.bankCard.create.mockResolvedValue(mockBankCard);

        // Act
        const result = await associateBankWithCardType(null, {
          bankId: 1,
          cardTypeId: 1,
          organizationId: mockOrganizationId,
        });

        // Assert
        expect(mockPrisma.bankCard.findFirst).toHaveBeenCalledWith({
          where: {
            bankId: 1,
            cardTypeId: 1,
            organizationId: mockOrganizationId,
          },
        });
        expect(mockPrisma.bankCard.create).toHaveBeenCalledWith({
          data: {
            bankId: 1,
            cardTypeId: 1,
            organizationId: mockOrganizationId,
            isEnabled: true,
            order: 0,
          },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/configuration');
        expect(result.success).toBe(true);
        expect(result.message).toBe('Tarjeta asociada al banco correctamente');
      });

      it('should get organizationId from session when not provided', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
        mockPrisma.bankCard.findFirst.mockResolvedValue(null);
        mockPrisma.bankCard.create.mockResolvedValue(mockBankCard);

        // Act
        const result = await associateBankWithCardType(null, {
          bankId: 1,
          cardTypeId: 1,
        });

        // Assert
        expect(mockGetOrganization).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.message).toBe('Tarjeta asociada al banco correctamente');
      });

      it('should use custom isEnabled and order values', async () => {
        // Arrange
        mockPrisma.bankCard.findFirst.mockResolvedValue(null);
        mockPrisma.bankCard.create.mockResolvedValue(mockBankCard);

        // Act
        await associateBankWithCardType(null, {
          bankId: 1,
          cardTypeId: 1,
          organizationId: mockOrganizationId,
          isEnabled: false,
          order: 5,
        });

        // Assert
        expect(mockPrisma.bankCard.create).toHaveBeenCalledWith({
          data: {
            bankId: 1,
            cardTypeId: 1,
            organizationId: mockOrganizationId,
            isEnabled: false,
            order: 5,
          },
        });
      });
    });

    describe('❌ Error Handling', () => {
      it('should return error when organizationId cannot be obtained from session', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({ organizationId: null });

        // Act
        const result = await associateBankWithCardType(null, {
          bankId: 1,
          cardTypeId: 1,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('No se pudo obtener la organización del usuario');
        expect(mockPrisma.bankCard.create).not.toHaveBeenCalled();
      });

      it('should return error when association already exists', async () => {
        // Arrange
        mockPrisma.bankCard.findFirst.mockResolvedValue(mockBankCard);

        // Act
        const result = await associateBankWithCardType(null, {
          bankId: 1,
          cardTypeId: 1,
          organizationId: mockOrganizationId,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Esta asociación banco-tarjeta ya existe');
        expect(mockPrisma.bankCard.create).not.toHaveBeenCalled();
      });

      it('should handle database errors gracefully', async () => {
        // Arrange
        mockPrisma.bankCard.findFirst.mockRejectedValue(new Error('Database error'));

        // Act
        const result = await associateBankWithCardType(null, {
          bankId: 1,
          cardTypeId: 1,
          organizationId: mockOrganizationId,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Database error');
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error associating bank with card type:',
          expect.any(Error)
        );
      });
    });
  });

  describe('🔄 toggleBankCardStatus', () => {
    describe('✅ Successful Toggle', () => {
      it('should enable bank card successfully', async () => {
        // Arrange
        mockPrisma.bankCard.update.mockResolvedValue({ ...mockBankCard, isEnabled: true });

        // Act
        const result = await toggleBankCardStatus(null, {
          bankCardId: 1,
          isEnabled: true,
        });

        // Assert
        expect(mockPrisma.bankCard.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { isEnabled: true },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/configuration');
        expect(result.success).toBe(true);
        expect(result.message).toBe('Tarjeta habilitada correctamente');
      });

      it('should disable bank card successfully', async () => {
        // Arrange
        mockPrisma.bankCard.update.mockResolvedValue({ ...mockBankCard, isEnabled: false });

        // Act
        const result = await toggleBankCardStatus(null, {
          bankCardId: 1,
          isEnabled: false,
        });

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('Tarjeta deshabilitada correctamente');
      });
    });

    describe('❌ Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        // Arrange
        mockPrisma.bankCard.update.mockRejectedValue(new Error('Update failed'));

        // Act
        const result = await toggleBankCardStatus(null, {
          bankCardId: 1,
          isEnabled: true,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Update failed');
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error toggling bank card status:',
          expect.any(Error)
        );
      });

      it('should handle unknown errors', async () => {
        // Arrange
        mockPrisma.bankCard.update.mockRejectedValue('Unknown error');

        // Act
        const result = await toggleBankCardStatus(null, {
          bankCardId: 1,
          isEnabled: true,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Error desconocido al cambiar el estado de la tarjeta');
      });
    });
  });

  describe('📊 updateBankCardsOrder', () => {
    describe('✅ Successful Order Update', () => {
      it('should update order of multiple bank cards in transaction', async () => {
        // Arrange
        const bankCardOrders = [
          { id: 1, order: 0 },
          { id: 2, order: 1 },
          { id: 3, order: 2 },
        ];

        mockPrisma.$transaction.mockResolvedValue([
          { id: 1, order: 0 },
          { id: 2, order: 1 },
          { id: 3, order: 2 },
        ]);

        // Act
        const result = await updateBankCardsOrder(null, { bankCardOrders });

        // Assert
        expect(mockPrisma.$transaction).toHaveBeenCalledWith(
          expect.any(Array)
        );
        
        // Verificar que $transaction fue llamado con un array de 3 operaciones
        const transactionCalls = mockPrisma.$transaction.mock.calls[0][0];
        expect(transactionCalls).toHaveLength(3);
        
        expect(mockRevalidatePath).toHaveBeenCalledWith('/configuration');
        expect(result.success).toBe(true);
        expect(result.message).toBe('Orden de tarjetas actualizado correctamente');
      });

      it('should handle empty order array', async () => {
        // Arrange
        mockPrisma.$transaction.mockResolvedValue([]);

        // Act
        const result = await updateBankCardsOrder(null, { bankCardOrders: [] });

        // Assert
        expect(mockPrisma.$transaction).toHaveBeenCalledWith([]);
        expect(result.success).toBe(true);
      });
    });

    describe('❌ Error Handling', () => {
      it('should handle transaction errors', async () => {
        // Arrange
        mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

        // Act
        const result = await updateBankCardsOrder(null, {
          bankCardOrders: [{ id: 1, order: 0 }],
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Transaction failed');
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error updating bank cards order:',
          expect.any(Error)
        );
      });
    });
  });

  describe('🗑️ dissociateBankCard', () => {
    describe('✅ Successful Dissociation', () => {
      it('should dissociate bank card when no promotions are associated', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findMany.mockResolvedValue([]);
        mockPrisma.bankCard.delete.mockResolvedValue(mockBankCard);

        // Act
        const result = await dissociateBankCard(null, { bankCardId: 1 });

        // Assert
        expect(mockPrisma.bankingPromotion.findMany).toHaveBeenCalledWith({
          where: { bankCardId: 1 },
        });
        expect(mockPrisma.bankCard.delete).toHaveBeenCalledWith({
          where: { id: 1 },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/configuration');
        expect(result.success).toBe(true);
        expect(result.message).toBe('Asociación banco-tarjeta eliminada correctamente');
      });
    });

    describe('❌ Error Handling', () => {
      it('should prevent dissociation when promotions are associated', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findMany.mockResolvedValue([
          { id: 1, bankCardId: 1 },
          { id: 2, bankCardId: 1 },
        ]);

        // Act
        const result = await dissociateBankCard(null, { bankCardId: 1 });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe(
          'No se puede eliminar esta asociación porque está siendo usada en promociones'
        );
        expect(mockPrisma.bankCard.delete).not.toHaveBeenCalled();
      });

      it('should handle database errors gracefully', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findMany.mockRejectedValue(new Error('Database error'));

        // Act
        const result = await dissociateBankCard(null, { bankCardId: 1 });

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Database error');
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error dissociating bank card:',
          expect.any(Error)
        );
      });
    });
  });

  describe('🎯 associateMultipleCardTypesToBank', () => {
    describe('✅ Successful Multiple Association', () => {
      it('should associate multiple card types to bank successfully', async () => {
        // Arrange
        const cardTypeIds = [1, 2, 3];
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
        mockPrisma.bankCard.findMany.mockResolvedValue([]); // No existing associations
        mockPrisma.bankCard.createMany.mockResolvedValue({ count: 3 });

        // Act
        const result = await associateMultipleCardTypesToBank(null, {
          bankId: 1,
          cardTypeIds,
        });

        // Assert
        expect(mockPrisma.bankCard.findMany).toHaveBeenCalledWith({
          where: {
            bankId: 1,
            organizationId: mockOrganizationId,
            cardTypeId: { in: cardTypeIds },
          },
          select: { cardTypeId: true },
        });
        expect(mockPrisma.bankCard.createMany).toHaveBeenCalledWith({
          data: [
            {
              bankId: 1,
              cardTypeId: 1,
              organizationId: mockOrganizationId,
              isEnabled: true,
              order: 0,
            },
            {
              bankId: 1,
              cardTypeId: 2,
              organizationId: mockOrganizationId,
              isEnabled: true,
              order: 1,
            },
            {
              bankId: 1,
              cardTypeId: 3,
              organizationId: mockOrganizationId,
              isEnabled: true,
              order: 2,
            },
          ],
          skipDuplicates: true,
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/configuration');
        expect(result.success).toBe(true);
        expect(result.message).toBe('3 tipo(s) de tarjeta asociados correctamente.');
      });

      it('should filter out existing associations and create only new ones', async () => {
        // Arrange
        const cardTypeIds = [1, 2, 3];
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
        mockPrisma.bankCard.findMany.mockResolvedValue([
          { cardTypeId: 1 }, // Already exists
        ]);
        mockPrisma.bankCard.createMany.mockResolvedValue({ count: 2 });

        // Act
        const result = await associateMultipleCardTypesToBank(null, {
          bankId: 1,
          cardTypeIds,
        });

        // Assert
        expect(mockPrisma.bankCard.createMany).toHaveBeenCalledWith({
          data: [
            {
              bankId: 1,
              cardTypeId: 2,
              organizationId: mockOrganizationId,
              isEnabled: true,
              order: 0,
            },
            {
              bankId: 1,
              cardTypeId: 3,
              organizationId: mockOrganizationId,
              isEnabled: true,
              order: 1,
            },
          ],
          skipDuplicates: true,
        });
        expect(result.message).toBe('2 tipo(s) de tarjeta asociados correctamente.');
      });

      it('should return success message when all types already exist', async () => {
        // Arrange
        const cardTypeIds = [1, 2];
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
        mockPrisma.bankCard.findMany.mockResolvedValue([
          { cardTypeId: 1 },
          { cardTypeId: 2 },
        ]);

        // Act
        const result = await associateMultipleCardTypesToBank(null, {
          bankId: 1,
          cardTypeIds,
        });

        // Assert
        expect(mockPrisma.bankCard.createMany).not.toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.message).toBe('Todos los tipos de tarjeta seleccionados ya estaban asociados.');
      });
    });

    describe('❌ Error Handling', () => {
      it('should return error when organizationId cannot be obtained', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({ organizationId: null });

        // Act
        const result = await associateMultipleCardTypesToBank(null, {
          bankId: 1,
          cardTypeIds: [1, 2],
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('No se pudo obtener la organización del usuario');
      });

      it('should return error when no card types are provided', async () => {
        // Arrange - Empty array
        // Act
        const result = await associateMultipleCardTypesToBank(null, {
          bankId: 1,
          cardTypeIds: [],
          organizationId: mockOrganizationId,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('No se proporcionaron tipos de tarjeta para asociar.');
      });

      it('should return error when cardTypeIds is null', async () => {
        // Act
        const result = await associateMultipleCardTypesToBank(null, {
          bankId: 1,
          cardTypeIds: null as any,
          organizationId: mockOrganizationId,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('No se proporcionaron tipos de tarjeta para asociar.');
      });

      it('should handle database errors gracefully', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
        mockPrisma.bankCard.findMany.mockRejectedValue(new Error('Database error'));

        // Act
        const result = await associateMultipleCardTypesToBank(null, {
          bankId: 1,
          cardTypeIds: [1, 2],
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Database error');
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error associating multiple card types:',
          expect.any(Error)
        );
      });
    });
  });

  describe('🔄 Cache Revalidation', () => {
    it('should revalidate /configuration path in all successful operations', async () => {
      // Test all functions that should revalidate
      const testCases = [
        () => associateBankWithCardType(null, { bankId: 1, cardTypeId: 1, organizationId: mockOrganizationId }),
        () => toggleBankCardStatus(null, { bankCardId: 1, isEnabled: true }),
        () => updateBankCardsOrder(null, { bankCardOrders: [{ id: 1, order: 0 }] }),
        () => dissociateBankCard(null, { bankCardId: 1 }),
        () => associateMultipleCardTypesToBank(null, { bankId: 1, cardTypeIds: [1], organizationId: mockOrganizationId }),
      ];

      // Mock successful responses for all operations
      mockPrisma.bankCard.findFirst.mockResolvedValue(null);
      mockPrisma.bankCard.create.mockResolvedValue(mockBankCard);
      mockPrisma.bankCard.update.mockResolvedValue(mockBankCard);
      mockPrisma.bankCard.delete.mockResolvedValue(mockBankCard);
      mockPrisma.bankCard.findMany.mockResolvedValue([]);
      mockPrisma.bankCard.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.bankingPromotion.findMany.mockResolvedValue([]);
      mockPrisma.$transaction.mockResolvedValue([]);

      for (const testCase of testCases) {
        vi.clearAllMocks();
        await testCase();
        expect(mockRevalidatePath).toHaveBeenCalledWith('/configuration');
      }
    });
  });
}); 