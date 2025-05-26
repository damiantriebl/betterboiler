import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getAllBanks,
  getOrganizationBankingPromotions,
  getBankingPromotionById,
  calculatePromotionAmount,
  getEnabledBankingPromotions,
} from '../get-banking-promotions';
import prisma from '@/lib/prisma';

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    bank: {
      findMany: vi.fn(),
    },
    bankingPromotion: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// Mock de console para tests silenciosos
const mockConsole = {
  error: vi.fn(),
  log: vi.fn(),
};

const mockPrisma = prisma as any;

describe('Banking Promotions Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockBanks = [
    {
      id: 1,
      name: 'Banco Provincia',
      logoUrl: 'https://example.com/banco-provincia.png',
    },
    {
      id: 2,
      name: 'Banco Nación',
      logoUrl: null,
    },
    {
      id: 3,
      name: 'Banco Santander',
      logoUrl: 'https://example.com/santander.png',
    },
  ];

  const mockBankingPromotions = [
    {
      id: 1,
      name: 'Descuento Visa',
      description: 'Descuento del 10% con Visa',
      organizationId: 'org-123',
      isEnabled: true,
      discountRate: 10.0,
      surchargeRate: null,
      activeDays: ['lunes', 'martes'],
      createdAt: new Date('2024-01-01'),
      paymentMethod: { id: 1, name: 'Tarjeta de crédito' },
      bankCard: { id: 1, bankId: 1, cardTypeId: 1 },
      bank: { id: 1, name: 'Banco Provincia' },
      installmentPlans: [
        { id: 1, installments: 3, interestRate: 0, isEnabled: true },
        { id: 2, installments: 6, interestRate: 5.0, isEnabled: true },
      ],
    },
    {
      id: 2,
      name: 'Recargo Mastercard',
      description: 'Recargo del 5% con Mastercard',
      organizationId: 'org-123',
      isEnabled: false,
      discountRate: null,
      surchargeRate: 5.0,
      activeDays: [],
      createdAt: new Date('2024-01-02'),
      paymentMethod: { id: 2, name: 'Tarjeta de débito' },
      bankCard: { id: 2, bankId: 2, cardTypeId: 2 },
      bank: { id: 2, name: 'Banco Nación' },
      installmentPlans: [],
    },
  ];

  describe('🏦 getAllBanks', () => {
    describe('✅ Successful Retrieval', () => {
      it('should return all banks ordered by name', async () => {
        // Arrange
        mockPrisma.bank.findMany.mockResolvedValue(mockBanks);

        // Act
        const result = await getAllBanks();

        // Assert
        expect(mockPrisma.bank.findMany).toHaveBeenCalledWith({
          orderBy: { name: 'asc' },
        });
        expect(result).toEqual(mockBanks);
        expect(result).toHaveLength(3);
      });

      it('should return empty array when no banks exist', async () => {
        // Arrange
        mockPrisma.bank.findMany.mockResolvedValue([]);

        // Act
        const result = await getAllBanks();

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });

      it('should handle banks with null logoUrl', async () => {
        // Arrange
        const banksWithNullLogo = [
          { id: 1, name: 'Banco Sin Logo', logoUrl: null },
        ];
        mockPrisma.bank.findMany.mockResolvedValue(banksWithNullLogo);

        // Act
        const result = await getAllBanks();

        // Assert
        expect(result).toEqual(banksWithNullLogo);
        expect(result[0].logoUrl).toBeNull();
      });
    });

    describe('❌ Error Handling', () => {
      it('should return empty array and log error on database failure', async () => {
        // Arrange
        mockPrisma.bank.findMany.mockRejectedValue(new Error('Database connection failed'));

        // Act
        const result = await getAllBanks();

        // Assert
        expect(result).toEqual([]);
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error fetching banks:',
          expect.any(Error)
        );
      });

      it('should handle unknown errors gracefully', async () => {
        // Arrange
        mockPrisma.bank.findMany.mockRejectedValue('Unknown error');

        // Act
        const result = await getAllBanks();

        // Assert
        expect(result).toEqual([]);
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error fetching banks:',
          'Unknown error'
        );
      });
    });
  });

  describe('🎯 getOrganizationBankingPromotions', () => {
    const organizationId = 'org-123';

    describe('✅ Successful Retrieval', () => {
      it('should return banking promotions for organization with includes and ordering', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findMany.mockResolvedValue(mockBankingPromotions);

        // Act
        const result = await getOrganizationBankingPromotions(organizationId);

        // Assert
        expect(mockPrisma.bankingPromotion.findMany).toHaveBeenCalledWith({
          where: { organizationId },
          include: {
            paymentMethod: true,
            bankCard: true,
            bank: true,
            installmentPlans: {
              orderBy: { installments: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        expect(result).toEqual(mockBankingPromotions);
        expect(result).toHaveLength(2);
      });

      it('should include all related data in response', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findMany.mockResolvedValue(mockBankingPromotions);

        // Act
        const result = await getOrganizationBankingPromotions(organizationId);

        // Assert
        expect(result[0]).toHaveProperty('paymentMethod');
        expect(result[0]).toHaveProperty('bankCard');
        expect(result[0]).toHaveProperty('bank');
        expect(result[0]).toHaveProperty('installmentPlans');
        expect(result[0].installmentPlans).toHaveLength(2);
      });

      it('should handle promotions with different rate types', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findMany.mockResolvedValue(mockBankingPromotions);

        // Act
        const result = await getOrganizationBankingPromotions(organizationId);

        // Assert
        expect(result[0].discountRate).toBe(10.0);
        expect(result[0].surchargeRate).toBeNull();
        expect(result[1].discountRate).toBeNull();
        expect(result[1].surchargeRate).toBe(5.0);
      });

      it('should handle empty result for organization with no promotions', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findMany.mockResolvedValue([]);

        // Act
        const result = await getOrganizationBankingPromotions(organizationId);

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });
    });

    describe('❌ Error Handling', () => {
      it('should return empty array and log error on database failure', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findMany.mockRejectedValue(new Error('Database error'));

        // Act
        const result = await getOrganizationBankingPromotions(organizationId);

        // Assert
        expect(result).toEqual([]);
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error fetching banking promotions:',
          expect.any(Error)
        );
      });
    });
  });

  describe('🔍 getBankingPromotionById', () => {
    const promotionId = 1;

    describe('✅ Successful Retrieval', () => {
      it('should return promotion by ID with all includes', async () => {
        // Arrange
        const mockPromotion = mockBankingPromotions[0];
        mockPrisma.bankingPromotion.findUnique.mockResolvedValue(mockPromotion);

        // Act
        const result = await getBankingPromotionById(promotionId);

        // Assert
        expect(mockPrisma.bankingPromotion.findUnique).toHaveBeenCalledWith({
          where: { id: promotionId },
          include: {
            paymentMethod: true,
            bankCard: true,
            bank: true,
            installmentPlans: {
              orderBy: { installments: 'asc' },
            },
          },
        });
        expect(result).toEqual(mockPromotion);
      });

      it('should return null when promotion not found', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findUnique.mockResolvedValue(null);

        // Act
        const result = await getBankingPromotionById(999);

        // Assert
        expect(result).toBeNull();
      });

      it('should include installment plans ordered by installments', async () => {
        // Arrange
        const mockPromotion = mockBankingPromotions[0];
        mockPrisma.bankingPromotion.findUnique.mockResolvedValue(mockPromotion);

        // Act
        const result = await getBankingPromotionById(promotionId);

        // Assert
        expect(result?.installmentPlans).toHaveLength(2);
        expect(result?.installmentPlans[0].installments).toBe(3);
        expect(result?.installmentPlans[1].installments).toBe(6);
      });
    });

    describe('❌ Error Handling', () => {
      it('should return null and log error on database failure', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findUnique.mockRejectedValue(new Error('Database error'));

        // Act
        const result = await getBankingPromotionById(promotionId);

        // Assert
        expect(result).toBeNull();
        expect(mockConsole.error).toHaveBeenCalledWith(
          `Error fetching banking promotion with id ${promotionId}:`,
          expect.any(Error)
        );
      });
    });
  });

  describe('💰 calculatePromotionAmount', () => {
    const mockPromotionWithPlans = {
      id: 1,
      discountRate: 10.0,
      surchargeRate: null,
      installmentPlans: [
        { id: 1, installments: 3, interestRate: 0, isEnabled: true },
        { id: 2, installments: 6, interestRate: 5.0, isEnabled: true },
        { id: 3, installments: 12, interestRate: 10.0, isEnabled: false },
      ],
    };

    describe('✅ Successful Calculations', () => {
      it('should calculate discount correctly without installments', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findUnique.mockResolvedValue(mockPromotionWithPlans);

        // Act
        const result = await calculatePromotionAmount({
          amount: 1000,
          promotionId: 1,
        });

        // Assert
        expect(result.originalAmount).toBe(1000);
        expect(result.finalAmount).toBe(900); // 1000 - 10%
        expect(result.discountAmount).toBe(100);
        expect(result.surchargeAmount).toBeUndefined();
      });

      it('should calculate surcharge correctly', async () => {
        // Arrange
        const surchargePromotion = {
          ...mockPromotionWithPlans,
          discountRate: null,
          surchargeRate: 5.0,
        };
        mockPrisma.bankingPromotion.findUnique.mockResolvedValue(surchargePromotion);

        // Act
        const result = await calculatePromotionAmount({
          amount: 1000,
          promotionId: 1,
        });

        // Assert
        expect(result.originalAmount).toBe(1000);
        expect(result.finalAmount).toBe(1050); // 1000 + 5%
        expect(result.surchargeAmount).toBe(50);
        expect(result.discountAmount).toBeUndefined();
      });

      it('should calculate installments without interest', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findUnique.mockResolvedValue(mockPromotionWithPlans);

        // Act
        const result = await calculatePromotionAmount({
          amount: 1000,
          promotionId: 1,
          installments: 3,
        });

        // Assert
        expect(result.originalAmount).toBe(1000);
        expect(result.finalAmount).toBe(900); // Discount applied first
        expect(result.installmentAmount).toBe(300); // 900 / 3
        expect(result.installments).toBe(3);
        expect(result.totalInterest).toBeUndefined();
      });

      it('should calculate installments with interest', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findUnique.mockResolvedValue(mockPromotionWithPlans);

        // Act
        const result = await calculatePromotionAmount({
          amount: 1000,
          promotionId: 1,
          installments: 6,
        });

        // Assert
        expect(result.originalAmount).toBe(1000);
        expect(result.finalAmount).toBe(945); // 900 + 5% interest
        expect(result.installmentAmount).toBe(157.5); // 945 / 6
        expect(result.totalInterest).toBe(45); // 900 * 5%
        expect(result.installments).toBe(6);
      });

      it('should ignore disabled installment plans', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findUnique.mockResolvedValue(mockPromotionWithPlans);

        // Act
        const result = await calculatePromotionAmount({
          amount: 1000,
          promotionId: 1,
          installments: 12, // This plan is disabled
        });

        // Assert
        expect(result.installmentAmount).toBeUndefined();
        expect(result.totalInterest).toBeUndefined();
        expect(result.installments).toBeUndefined();
      });

      it('should handle promotion without rates (no discount/surcharge)', async () => {
        // Arrange
        const neutralPromotion = {
          ...mockPromotionWithPlans,
          discountRate: null,
          surchargeRate: null,
        };
        mockPrisma.bankingPromotion.findUnique.mockResolvedValue(neutralPromotion);

        // Act
        const result = await calculatePromotionAmount({
          amount: 1000,
          promotionId: 1,
        });

        // Assert
        expect(result.originalAmount).toBe(1000);
        expect(result.finalAmount).toBe(1000);
        expect(result.discountAmount).toBeUndefined();
        expect(result.surchargeAmount).toBeUndefined();
      });

      it('should handle single installment (no installment calculation)', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findUnique.mockResolvedValue(mockPromotionWithPlans);

        // Act
        const result = await calculatePromotionAmount({
          amount: 1000,
          promotionId: 1,
          installments: 1,
        });

        // Assert
        expect(result.installmentAmount).toBeUndefined();
        expect(result.installments).toBeUndefined();
      });
    });

    describe('❌ Error Handling', () => {
      it('should return original amount when promotion not found', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findUnique.mockResolvedValue(null);

        // Act
        const result = await calculatePromotionAmount({
          amount: 1000,
          promotionId: 999,
        });

        // Assert
        expect(result.originalAmount).toBe(1000);
        expect(result.finalAmount).toBe(1000);
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error calculating promotion amount:',
          expect.any(Error)
        );
      });

      it('should return original amount on database error', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findUnique.mockRejectedValue(new Error('Database error'));

        // Act
        const result = await calculatePromotionAmount({
          amount: 1000,
          promotionId: 1,
        });

        // Assert
        expect(result.originalAmount).toBe(1000);
        expect(result.finalAmount).toBe(1000);
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error calculating promotion amount:',
          expect.any(Error)
        );
      });

      it('should handle invalid installment plan gracefully', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findUnique.mockResolvedValue(mockPromotionWithPlans);

        // Act
        const result = await calculatePromotionAmount({
          amount: 1000,
          promotionId: 1,
          installments: 24, // Non-existent plan
        });

        // Assert
        expect(result.originalAmount).toBe(1000);
        expect(result.finalAmount).toBe(900); // Discount still applies
        expect(result.installmentAmount).toBeUndefined();
      });
    });
  });

  describe('🎯 getEnabledBankingPromotions', () => {
    const organizationId = 'org-123';

    describe('✅ Successful Retrieval', () => {
      it('should return only enabled banking promotions', async () => {
        // Arrange
        const enabledPromotions = mockBankingPromotions.filter(p => p.isEnabled);
        mockPrisma.bankingPromotion.findMany.mockResolvedValue(enabledPromotions);

        // Act
        const result = await getEnabledBankingPromotions(organizationId);

        // Assert
        expect(mockPrisma.bankingPromotion.findMany).toHaveBeenCalledWith({
          where: {
            organizationId: organizationId,
            isEnabled: true,
          },
          include: {
            paymentMethod: true,
            bank: true,
            bankCard: true,
            installmentPlans: true,
          },
          orderBy: {
            name: 'asc',
          },
        });
        expect(result).toEqual(enabledPromotions);
        expect(result.every(p => p.isEnabled)).toBe(true);
      });

      it('should log promotion count correctly', async () => {
        // Arrange
        const enabledPromotions = [mockBankingPromotions[0]];
        mockPrisma.bankingPromotion.findMany.mockResolvedValue(enabledPromotions);

        // Act
        await getEnabledBankingPromotions(organizationId);

        // Assert
        expect(mockConsole.log).toHaveBeenCalledWith(
          `Obteniendo promociones bancarias habilitadas para organización ${organizationId}`
        );
        expect(mockConsole.log).toHaveBeenCalledWith(
          'Se encontraron 1 promociones bancarias habilitadas'
        );
      });

      it('should return empty array when no enabled promotions exist', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findMany.mockResolvedValue([]);

        // Act
        const result = await getEnabledBankingPromotions(organizationId);

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });

      it('should include all related data for enabled promotions', async () => {
        // Arrange
        const enabledPromotions = [mockBankingPromotions[0]];
        mockPrisma.bankingPromotion.findMany.mockResolvedValue(enabledPromotions);

        // Act
        const result = await getEnabledBankingPromotions(organizationId);

        // Assert
        expect(result[0]).toHaveProperty('paymentMethod');
        expect(result[0]).toHaveProperty('bank');
        expect(result[0]).toHaveProperty('bankCard');
        expect(result[0]).toHaveProperty('installmentPlans');
      });
    });

    describe('❌ Error Handling', () => {
      it('should return empty array and log error on database failure', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findMany.mockRejectedValue(new Error('Database error'));

        // Act
        const result = await getEnabledBankingPromotions(organizationId);

        // Assert
        expect(result).toEqual([]);
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error fetching enabled banking promotions:',
          expect.any(Error)
        );
      });
    });
  });

  describe('🔍 Integration and Edge Cases', () => {
    const organizationId = 'org-123';

    describe('🎯 Data Consistency', () => {
      it('should maintain consistent data structure across query functions', async () => {
        // Arrange
        mockPrisma.bankingPromotion.findMany.mockResolvedValue(mockBankingPromotions);
        mockPrisma.bankingPromotion.findUnique.mockResolvedValue(mockBankingPromotions[0]);

        // Act
        const organizationPromotions = await getOrganizationBankingPromotions(organizationId);
        const enabledPromotions = await getEnabledBankingPromotions(organizationId);
        const promotionById = await getBankingPromotionById(1);

        // Assert
        if (organizationPromotions.length > 0) {
          expect(organizationPromotions[0]).toHaveProperty('paymentMethod');
          expect(organizationPromotions[0]).toHaveProperty('bank');
          expect(organizationPromotions[0]).toHaveProperty('installmentPlans');
        }

        if (enabledPromotions.length > 0) {
          expect(enabledPromotions[0]).toHaveProperty('paymentMethod');
          expect(enabledPromotions[0]).toHaveProperty('bank');
          expect(enabledPromotions[0]).toHaveProperty('installmentPlans');
        }

        if (promotionById) {
          expect(promotionById).toHaveProperty('paymentMethod');
          expect(promotionById).toHaveProperty('bank');
          expect(promotionById).toHaveProperty('installmentPlans');
        }
      });

      it('should handle organization with mixed enabled/disabled promotions', async () => {
        // Arrange
        const mixedPromotions = [
          { ...mockBankingPromotions[0], isEnabled: true },
          { ...mockBankingPromotions[1], isEnabled: false },
        ];
        
        mockPrisma.bankingPromotion.findMany.mockResolvedValueOnce(mixedPromotions);
        const enabledOnly = mixedPromotions.filter(p => p.isEnabled);
        mockPrisma.bankingPromotion.findMany.mockResolvedValueOnce(enabledOnly);

        // Act
        const allPromotions = await getOrganizationBankingPromotions(organizationId);
        const enabledPromotions = await getEnabledBankingPromotions(organizationId);

        // Assert
        expect(allPromotions).toHaveLength(2);
        expect(enabledPromotions).toHaveLength(1);
        expect(enabledPromotions.every(p => p.isEnabled)).toBe(true);
      });
    });

    describe('🚀 Performance and Large Data', () => {
      it('should handle large number of banks efficiently', async () => {
        // Arrange
        const largeBanksArray = Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          name: `Banco ${i + 1}`,
          logoUrl: `https://example.com/banco-${i + 1}.png`,
        }));
        mockPrisma.bank.findMany.mockResolvedValue(largeBanksArray);

        // Act
        const result = await getAllBanks();

        // Assert
        expect(result).toHaveLength(50);
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('name');
      });

      it('should handle organization with many promotions efficiently', async () => {
        // Arrange
        const largePromotionsArray = Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          name: `Promoción ${i + 1}`,
          description: `Descripción ${i + 1}`,
          organizationId,
          isEnabled: i % 2 === 0,
          discountRate: i % 3 === 0 ? 10.0 : null,
          surchargeRate: i % 5 === 0 ? 5.0 : null,
          activeDays: [],
          createdAt: new Date(),
          paymentMethod: { id: 1, name: 'Método' },
          bank: { id: 1, name: 'Banco' },
          bankCard: { id: 1, bankId: 1, cardTypeId: 1 },
          installmentPlans: [],
        }));
        
        mockPrisma.bankingPromotion.findMany.mockResolvedValue(largePromotionsArray);

        // Act
        const result = await getOrganizationBankingPromotions(organizationId);

        // Assert
        expect(result).toHaveLength(100);
        expect(result.every(p => p.organizationId === organizationId)).toBe(true);
      });
    });
  });
}); 
