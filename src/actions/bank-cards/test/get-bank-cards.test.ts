import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getAllCardTypes,
  getOrganizationBankCards,
  getBanksWithCards,
  getEnabledBankCards,
} from '../get-bank-cards';
import prisma from '@/lib/prisma';

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    cardType: {
      findMany: vi.fn(),
    },
    bankCard: {
      findMany: vi.fn(),
    },
  },
}));

// Mock de console para tests silenciosos
const mockConsole = {
  error: vi.fn(),
};

const mockPrisma = prisma as any;

describe('Bank Cards Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockCardTypes = [
    {
      id: 1,
      name: 'Visa',
      type: 'credit' as const,
      logoUrl: 'https://example.com/visa.png',
    },
    {
      id: 2,
      name: 'Mastercard',
      type: 'credit' as const,
      logoUrl: 'https://example.com/mastercard.png',
    },
    {
      id: 3,
      name: 'Visa Debit',
      type: 'debit' as const,
      logoUrl: null,
    },
  ];

  const mockBankCards = [
    {
      id: 1,
      bankId: 1,
      cardTypeId: 1,
      organizationId: 'org-123',
      isEnabled: true,
      order: 0,
      bank: {
        id: 1,
        name: 'Banco Provincia',
        logoUrl: 'https://example.com/banco-provincia.png',
      },
      cardType: {
        id: 1,
        name: 'Visa',
        type: 'credit' as const,
        logoUrl: 'https://example.com/visa.png',
      },
    },
    {
      id: 2,
      bankId: 1,
      cardTypeId: 2,
      organizationId: 'org-123',
      isEnabled: false,
      order: 1,
      bank: {
        id: 1,
        name: 'Banco Provincia',
        logoUrl: 'https://example.com/banco-provincia.png',
      },
      cardType: {
        id: 2,
        name: 'Mastercard',
        type: 'credit' as const,
        logoUrl: 'https://example.com/mastercard.png',
      },
    },
    {
      id: 3,
      bankId: 2,
      cardTypeId: 1,
      organizationId: 'org-123',
      isEnabled: true,
      order: 0,
      bank: {
        id: 2,
        name: 'Banco Nación',
        logoUrl: null,
      },
      cardType: {
        id: 1,
        name: 'Visa',
        type: 'credit' as const,
        logoUrl: 'https://example.com/visa.png',
      },
    },
  ];

  describe('🎴 getAllCardTypes', () => {
    describe('✅ Successful Retrieval', () => {
      it('should return all card types ordered by name', async () => {
        // Arrange
        mockPrisma.cardType.findMany.mockResolvedValue(mockCardTypes);

        // Act
        const result = await getAllCardTypes();

        // Assert
        expect(mockPrisma.cardType.findMany).toHaveBeenCalledWith({
          orderBy: { name: 'asc' },
        });
        expect(result).toEqual(mockCardTypes);
        expect(result).toHaveLength(3);
      });

      it('should return empty array when no card types exist', async () => {
        // Arrange
        mockPrisma.cardType.findMany.mockResolvedValue([]);

        // Act
        const result = await getAllCardTypes();

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });

      it('should include card types with different types (credit/debit)', async () => {
        // Arrange
        const mixedCardTypes = [
          { id: 1, name: 'Visa Credit', type: 'credit', logoUrl: 'url1' },
          { id: 2, name: 'Visa Debit', type: 'debit', logoUrl: 'url2' },
        ];
        mockPrisma.cardType.findMany.mockResolvedValue(mixedCardTypes);

        // Act
        const result = await getAllCardTypes();

        // Assert
        expect(result).toEqual(mixedCardTypes);
        expect(result.some(ct => ct.type === 'credit')).toBe(true);
        expect(result.some(ct => ct.type === 'debit')).toBe(true);
      });

      it('should handle card types with null logoUrl', async () => {
        // Arrange
        const cardTypesWithNullLogo = [
          { id: 1, name: 'Generic Card', type: 'credit', logoUrl: null },
        ];
        mockPrisma.cardType.findMany.mockResolvedValue(cardTypesWithNullLogo);

        // Act
        const result = await getAllCardTypes();

        // Assert
        expect(result).toEqual(cardTypesWithNullLogo);
        expect(result[0].logoUrl).toBeNull();
      });
    });

    describe('❌ Error Handling', () => {
      it('should return empty array and log error on database failure', async () => {
        // Arrange
        mockPrisma.cardType.findMany.mockRejectedValue(new Error('Database connection failed'));

        // Act
        const result = await getAllCardTypes();

        // Assert
        expect(result).toEqual([]);
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error fetching card types:',
          expect.any(Error)
        );
      });

      it('should handle unknown errors gracefully', async () => {
        // Arrange
        mockPrisma.cardType.findMany.mockRejectedValue('Unknown error');

        // Act
        const result = await getAllCardTypes();

        // Assert
        expect(result).toEqual([]);
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error fetching card types:',
          'Unknown error'
        );
      });
    });
  });

  describe('🏦 getOrganizationBankCards', () => {
    const organizationId = 'org-123';

    describe('✅ Successful Retrieval', () => {
      it('should return bank cards for organization with includes and ordering', async () => {
        // Arrange
        mockPrisma.bankCard.findMany.mockResolvedValue(mockBankCards);

        // Act
        const result = await getOrganizationBankCards(organizationId);

        // Assert
        expect(mockPrisma.bankCard.findMany).toHaveBeenCalledWith({
          where: { organizationId },
          include: {
            bank: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
              },
            },
            cardType: true,
          },
          orderBy: [{ bankId: 'asc' }, { order: 'asc' }],
        });
        expect(result).toEqual(mockBankCards);
        expect(result).toHaveLength(3);
      });

      it('should return bank cards ordered by bankId then by order', async () => {
        // Arrange
        const unorderedBankCards = [
          { ...mockBankCards[2], bankId: 2, order: 0 }, // Bank 2, order 0
          { ...mockBankCards[0], bankId: 1, order: 0 }, // Bank 1, order 0  
          { ...mockBankCards[1], bankId: 1, order: 1 }, // Bank 1, order 1
        ];
        mockPrisma.bankCard.findMany.mockResolvedValue(unorderedBankCards);

        // Act
        const result = await getOrganizationBankCards(organizationId);

        // Assert
        expect(result).toEqual(unorderedBankCards);
        // Verificar que se llamó con el orden correcto
        expect(mockPrisma.bankCard.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: [{ bankId: 'asc' }, { order: 'asc' }],
          })
        );
      });

      it('should include bank and cardType details in response', async () => {
        // Arrange
        mockPrisma.bankCard.findMany.mockResolvedValue(mockBankCards);

        // Act
        const result = await getOrganizationBankCards(organizationId);

        // Assert
        expect(result[0]).toHaveProperty('bank');
        expect(result[0]).toHaveProperty('cardType');
        expect(result[0].bank).toHaveProperty('id');
        expect(result[0].bank).toHaveProperty('name');
        expect(result[0].bank).toHaveProperty('logoUrl');
        expect(result[0].cardType).toHaveProperty('id');
        expect(result[0].cardType).toHaveProperty('name');
        expect(result[0].cardType).toHaveProperty('type');
      });

      it('should handle empty result for organization with no bank cards', async () => {
        // Arrange
        mockPrisma.bankCard.findMany.mockResolvedValue([]);

        // Act
        const result = await getOrganizationBankCards(organizationId);

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });
    });

    describe('❌ Error Handling', () => {
      it('should return empty array and log error on database failure', async () => {
        // Arrange
        mockPrisma.bankCard.findMany.mockRejectedValue(new Error('Database error'));

        // Act
        const result = await getOrganizationBankCards(organizationId);

        // Assert
        expect(result).toEqual([]);
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error fetching organization bank cards:',
          expect.any(Error)
        );
      });
    });
  });

  describe('🏪 getBanksWithCards', () => {
    const organizationId = 'org-123';

    describe('✅ Successful Grouping', () => {
      it('should group bank cards by bank correctly', async () => {
        // Arrange
        mockPrisma.bankCard.findMany.mockResolvedValue(mockBankCards);

        // Act
        const result = await getBanksWithCards(organizationId);

        // Assert
        expect(result).toHaveLength(2); // 2 different banks
        
        // Verificar el primer banco (Banco Provincia)
        const bancoProvinciaGroup = result.find(b => b.bank.id === 1);
        expect(bancoProvinciaGroup).toBeDefined();
        expect(bancoProvinciaGroup?.bank.name).toBe('Banco Provincia');
        expect(bancoProvinciaGroup?.cards).toHaveLength(2); // 2 cards for this bank
        
        // Verificar el segundo banco (Banco Nación)
        const bancoNacionGroup = result.find(b => b.bank.id === 2);
        expect(bancoNacionGroup).toBeDefined();
        expect(bancoNacionGroup?.bank.name).toBe('Banco Nación');
        expect(bancoNacionGroup?.cards).toHaveLength(1); // 1 card for this bank
      });

      it('should structure card data correctly in groups', async () => {
        // Arrange
        mockPrisma.bankCard.findMany.mockResolvedValue(mockBankCards);

        // Act
        const result = await getBanksWithCards(organizationId);

        // Assert
        const bancoProvinciaGroup = result.find(b => b.bank.id === 1);
        const firstCard = bancoProvinciaGroup?.cards[0];
        
        expect(firstCard).toHaveProperty('id');
        expect(firstCard).toHaveProperty('cardType');
        expect(firstCard).toHaveProperty('isEnabled');
        expect(firstCard).toHaveProperty('order');
        expect(firstCard?.cardType).toHaveProperty('name');
        expect(firstCard?.cardType).toHaveProperty('type');
      });

      it('should handle single bank with multiple cards', async () => {
        // Arrange
        const singleBankCards = [
          mockBankCards[0], // Bank 1, Card 1
          mockBankCards[1], // Bank 1, Card 2
        ];
        mockPrisma.bankCard.findMany.mockResolvedValue(singleBankCards);

        // Act
        const result = await getBanksWithCards(organizationId);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].cards).toHaveLength(2);
        expect(result[0].bank.id).toBe(1);
      });

      it('should handle multiple banks with single cards', async () => {
        // Arrange
        const multipleBanksSingleCards = [
          mockBankCards[0], // Bank 1, Card 1
          mockBankCards[2], // Bank 2, Card 1
        ];
        mockPrisma.bankCard.findMany.mockResolvedValue(multipleBanksSingleCards);

        // Act
        const result = await getBanksWithCards(organizationId);

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].cards).toHaveLength(1);
        expect(result[1].cards).toHaveLength(1);
      });

      it('should return empty array when no bank cards exist', async () => {
        // Arrange
        mockPrisma.bankCard.findMany.mockResolvedValue([]);

        // Act
        const result = await getBanksWithCards(organizationId);

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });
    });

    describe('❌ Error Handling', () => {
      it('should return empty array and log error when getOrganizationBankCards fails', async () => {
        // Arrange
        mockPrisma.bankCard.findMany.mockRejectedValue(new Error('Database error'));

        // Act
        const result = await getBanksWithCards(organizationId);

        // Assert
        expect(result).toEqual([]);
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error fetching organization bank cards:',
          expect.any(Error)
        );
      });

      it('should handle errors during grouping process', async () => {
        // Arrange - Mock invalid data that might cause grouping to fail
        const invalidBankCards = [
          { ...mockBankCards[0], bank: null }, // Invalid bank data
        ];
        mockPrisma.bankCard.findMany.mockResolvedValue(invalidBankCards);

        // Act & Assert - Should not throw, should handle gracefully
        await expect(getBanksWithCards(organizationId)).resolves.not.toThrow();
      });
    });
  });

  describe('🎯 getEnabledBankCards', () => {
    const organizationId = 'org-123';

    describe('✅ Successful Retrieval', () => {
      it('should return only enabled bank cards', async () => {
        // Arrange
        const enabledBankCards = mockBankCards.filter(card => card.isEnabled);
        mockPrisma.bankCard.findMany.mockResolvedValue(enabledBankCards);

        // Act
        const result = await getEnabledBankCards(organizationId);

        // Assert
        expect(mockPrisma.bankCard.findMany).toHaveBeenCalledWith({
          where: {
            organizationId,
            isEnabled: true,
          },
          include: {
            bank: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
              },
            },
            cardType: true,
          },
          orderBy: [{ bankId: 'asc' }, { order: 'asc' }],
        });
        expect(result).toEqual(enabledBankCards);
        expect(result.every(card => card.isEnabled)).toBe(true);
      });

      it('should exclude disabled bank cards', async () => {
        // Arrange
        const allCards = [...mockBankCards];
        const enabledCards = allCards.filter(card => card.isEnabled);
        mockPrisma.bankCard.findMany.mockResolvedValue(enabledCards);

        // Act
        const result = await getEnabledBankCards(organizationId);

        // Assert
        expect(result).toHaveLength(2); // Only 2 enabled cards from mockBankCards
        expect(result.some(card => !card.isEnabled)).toBe(false);
      });

      it('should return empty array when no enabled cards exist', async () => {
        // Arrange
        mockPrisma.bankCard.findMany.mockResolvedValue([]);

        // Act
        const result = await getEnabledBankCards(organizationId);

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });

      it('should maintain proper ordering for enabled cards', async () => {
        // Arrange
        const enabledOrderedCards = [
          { ...mockBankCards[0], bankId: 1, order: 0, isEnabled: true },
          { ...mockBankCards[2], bankId: 2, order: 0, isEnabled: true },
        ];
        mockPrisma.bankCard.findMany.mockResolvedValue(enabledOrderedCards);

        // Act
        const result = await getEnabledBankCards(organizationId);

        // Assert
        expect(mockPrisma.bankCard.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: [{ bankId: 'asc' }, { order: 'asc' }],
          })
        );
        expect(result).toEqual(enabledOrderedCards);
      });

      it('should include all necessary bank and cardType details', async () => {
        // Arrange
        const enabledCards = [mockBankCards[0]]; // Only the first enabled card
        mockPrisma.bankCard.findMany.mockResolvedValue(enabledCards);

        // Act
        const result = await getEnabledBankCards(organizationId);

        // Assert
        expect(result[0]).toHaveProperty('bank');
        expect(result[0]).toHaveProperty('cardType');
        expect(result[0].bank).toHaveProperty('id');
        expect(result[0].bank).toHaveProperty('name');
        expect(result[0].bank).toHaveProperty('logoUrl');
        expect(result[0].cardType).toHaveProperty('id');
        expect(result[0].cardType).toHaveProperty('name');
        expect(result[0].cardType).toHaveProperty('type');
      });
    });

    describe('❌ Error Handling', () => {
      it('should return empty array and log error on database failure', async () => {
        // Arrange
        mockPrisma.bankCard.findMany.mockRejectedValue(new Error('Database connection failed'));

        // Act
        const result = await getEnabledBankCards(organizationId);

        // Assert
        expect(result).toEqual([]);
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error fetching enabled bank cards:',
          expect.any(Error)
        );
      });

      it('should handle network timeout errors', async () => {
        // Arrange
        mockPrisma.bankCard.findMany.mockRejectedValue(new Error('Request timeout'));

        // Act
        const result = await getEnabledBankCards(organizationId);

        // Assert
        expect(result).toEqual([]);
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error fetching enabled bank cards:',
          expect.any(Error)
        );
      });
    });
  });

  describe('🔍 Integration and Edge Cases', () => {
    const organizationId = 'org-123';

    describe('🎯 Data Consistency', () => {
      it('should maintain consistent data structure across all query functions', async () => {
        // Arrange
        mockPrisma.bankCard.findMany.mockResolvedValue(mockBankCards);

        // Act
        const organizationCards = await getOrganizationBankCards(organizationId);
        const enabledCards = await getEnabledBankCards(organizationId);
        const banksWithCards = await getBanksWithCards(organizationId);

        // Assert
        // Verificar que todas las funciones manejen la misma estructura de datos
        if (organizationCards.length > 0) {
          expect(organizationCards[0]).toHaveProperty('bank');
          expect(organizationCards[0]).toHaveProperty('cardType');
        }
        
        if (enabledCards.length > 0) {
          expect(enabledCards[0]).toHaveProperty('bank');
          expect(enabledCards[0]).toHaveProperty('cardType');
        }

        if (banksWithCards.length > 0) {
          expect(banksWithCards[0]).toHaveProperty('bank');
          expect(banksWithCards[0]).toHaveProperty('cards');
          if (banksWithCards[0].cards.length > 0) {
            expect(banksWithCards[0].cards[0]).toHaveProperty('cardType');
          }
        }
      });

      it('should handle organization with mixed enabled/disabled cards correctly', async () => {
        // Arrange
        const mixedCards = [
          { ...mockBankCards[0], isEnabled: true },
          { ...mockBankCards[1], isEnabled: false },
          { ...mockBankCards[2], isEnabled: true },
        ];
        
        // Mock for getOrganizationBankCards (all cards)
        mockPrisma.bankCard.findMany.mockResolvedValueOnce(mixedCards);
        
        // Mock for getEnabledBankCards (only enabled)
        const enabledOnly = mixedCards.filter(card => card.isEnabled);
        mockPrisma.bankCard.findMany.mockResolvedValueOnce(enabledOnly);

        // Act
        const allCards = await getOrganizationBankCards(organizationId);
        const enabledCards = await getEnabledBankCards(organizationId);

        // Assert
        expect(allCards).toHaveLength(3);
        expect(enabledCards).toHaveLength(2);
        expect(enabledCards.every(card => card.isEnabled)).toBe(true);
      });
    });

    describe('🚀 Performance and Large Data', () => {
      it('should handle large number of card types efficiently', async () => {
        // Arrange
        const largeCardTypesArray = Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          name: `Card Type ${i + 1}`,
          type: i % 2 === 0 ? 'credit' : 'debit' as const,
          logoUrl: `https://example.com/card-${i + 1}.png`,
        }));
        mockPrisma.cardType.findMany.mockResolvedValue(largeCardTypesArray);

        // Act
        const result = await getAllCardTypes();

        // Assert
        expect(result).toHaveLength(100);
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('type');
      });

      it('should handle organization with many bank cards efficiently', async () => {
        // Arrange
        const largeBankCardsArray = Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          bankId: Math.floor(i / 5) + 1, // 10 banks with 5 cards each
          cardTypeId: (i % 5) + 1,
          organizationId,
          isEnabled: i % 3 !== 0, // 2/3 enabled, 1/3 disabled
          order: i % 5,
          bank: {
            id: Math.floor(i / 5) + 1,
            name: `Bank ${Math.floor(i / 5) + 1}`,
            logoUrl: `https://example.com/bank-${Math.floor(i / 5) + 1}.png`,
          },
          cardType: {
            id: (i % 5) + 1,
            name: `Card ${(i % 5) + 1}`,
            type: 'credit' as const,
            logoUrl: `https://example.com/card-${(i % 5) + 1}.png`,
          },
        }));
        
        mockPrisma.bankCard.findMany.mockResolvedValue(largeBankCardsArray);

        // Act
        const banksWithCards = await getBanksWithCards(organizationId);

        // Assert
        expect(banksWithCards).toHaveLength(10); // 10 banks
        expect(banksWithCards.every(bank => bank.cards.length === 5)).toBe(true); // 5 cards each
      });
    });
  });
}); 
