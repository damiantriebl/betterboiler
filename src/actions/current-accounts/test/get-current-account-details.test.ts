import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCurrentAccountDetails } from '../get-current-account-details';
import prisma from '@/lib/prisma';

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    currentAccount: {
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

describe('getCurrentAccountDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockAccountId = 'ca-123';
  const mockCurrentAccount = {
    id: mockAccountId,
    clientId: 'client-456',
    motorcycleId: 1,
    totalAmount: 15000.0,
    downPayment: 3000.0,
    numberOfInstallments: 12,
    installmentAmount: 1000.0,
    paymentFrequency: 'MONTHLY',
    startDate: new Date('2024-01-01'),
    interestRate: 0.15,
    currency: 'ARS',
    remainingBalance: 12000.0,
    nextDueDate: new Date('2024-02-01'),
    finalPaymentDate: new Date('2024-12-01'),
    reminderLeadTimeDays: 7,
    status: 'ACTIVE',
    notes: 'Cuenta corriente de prueba',
    organizationId: 'org-789',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    client: {
      id: 'client-456',
      firstName: 'Juan',
      lastName: 'Pérez',
      email: 'juan.perez@example.com',
      phone: '+541234567890',
    },
    motorcycle: {
      id: 1,
      chassisNumber: 'CH123456',
      engineNumber: 'EN789012',
      year: 2023,
      color: 'Rojo',
      modelId: 10,
      organizationId: 'org-789',
      clientId: 'client-456',
      createdAt: new Date(),
      updatedAt: new Date(),
      model: {
        id: 10,
        name: 'Honda CB600F',
      },
    },
    payments: [
      {
        id: 'payment-1',
        currentAccountId: mockAccountId,
        amountPaid: 1000.0,
        paymentDate: new Date('2024-01-01'),
        paymentMethod: 'CASH',
        transactionReference: 'TXN001',
        installmentNumber: 1,
        notes: 'Primer pago',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'payment-2',
        currentAccountId: mockAccountId,
        amountPaid: 1000.0,
        paymentDate: new Date('2024-02-01'),
        paymentMethod: 'TRANSFER',
        transactionReference: 'TXN002',
        installmentNumber: 2,
        notes: 'Segundo pago',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  describe('✅ Successful Retrieval', () => {
    it('should return current account details with complete data', async () => {
      // Arrange
      mockPrisma.currentAccount.findUnique.mockResolvedValue(mockCurrentAccount);

      // Act
      const result = await getCurrentAccountDetails(mockAccountId);

      // Assert
      expect(mockPrisma.currentAccount.findUnique).toHaveBeenCalledWith({
        where: { id: mockAccountId },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          motorcycle: {
            include: {
              model: {
                select: { id: true, name: true },
              },
            },
          },
          payments: {
            orderBy: {
              paymentDate: 'desc',
            },
          },
        },
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCurrentAccount);
      expect(result.data.client.firstName).toBe('Juan');
      expect(result.data.motorcycle.model.name).toBe('Honda CB600F');
      expect(result.data.payments).toHaveLength(2);
      expect(result.data.payments[0].amountPaid).toBe(1000.0);
    });

    it('should return account with minimal data when optional fields are null', async () => {
      // Arrange
      const minimalAccount = {
        ...mockCurrentAccount,
        notes: null,
        reminderLeadTimeDays: null,
        payments: [],
      };
      mockPrisma.currentAccount.findUnique.mockResolvedValue(minimalAccount);

      // Act
      const result = await getCurrentAccountDetails(mockAccountId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.notes).toBeNull();
      expect(result.data.reminderLeadTimeDays).toBeNull();
      expect(result.data.payments).toHaveLength(0);
    });

    it('should return account with different status values', async () => {
      // Arrange
      const statusCases = ['ACTIVE', 'PAID_OFF', 'OVERDUE', 'DEFAULTED', 'CANCELLED'];
      
      for (const status of statusCases) {
        const accountWithStatus = {
          ...mockCurrentAccount,
          status,
        };
        mockPrisma.currentAccount.findUnique.mockResolvedValue(accountWithStatus);

        // Act
        const result = await getCurrentAccountDetails(mockAccountId);

        // Assert
        expect(result.success).toBe(true);
        expect(result.data.status).toBe(status);
        
        vi.clearAllMocks();
      }
    });

    it('should return account with different payment frequencies', async () => {
      // Arrange
      const frequencies = ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'];
      
      for (const frequency of frequencies) {
        const accountWithFrequency = {
          ...mockCurrentAccount,
          paymentFrequency: frequency,
        };
        mockPrisma.currentAccount.findUnique.mockResolvedValue(accountWithFrequency);

        // Act
        const result = await getCurrentAccountDetails(mockAccountId);

        // Assert
        expect(result.success).toBe(true);
        expect(result.data.paymentFrequency).toBe(frequency);
        
        vi.clearAllMocks();
      }
    });

    it('should return payments ordered by payment date descending', async () => {
      // Arrange
      const accountWithOrderedPayments = {
        ...mockCurrentAccount,
        payments: [
          {
            id: 'payment-3',
            paymentDate: new Date('2024-03-01'),
            amountPaid: 1000.0,
            installmentNumber: 3,
          },
          {
            id: 'payment-1',
            paymentDate: new Date('2024-01-01'),
            amountPaid: 1000.0,
            installmentNumber: 1,
          },
          {
            id: 'payment-2',
            paymentDate: new Date('2024-02-01'),
            amountPaid: 1000.0,
            installmentNumber: 2,
          },
        ],
      };
      mockPrisma.currentAccount.findUnique.mockResolvedValue(accountWithOrderedPayments);

      // Act
      const result = await getCurrentAccountDetails(mockAccountId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrisma.currentAccount.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            payments: {
              orderBy: {
                paymentDate: 'desc',
              },
            },
          }),
        })
      );
    });
  });

  describe('❌ Error Handling', () => {
    it('should return error when accountId is not provided', async () => {
      // Act
      const result = await getCurrentAccountDetails('');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('ID de cuenta corriente no proporcionado.');
      expect(mockPrisma.currentAccount.findUnique).not.toHaveBeenCalled();
    });

    it('should return error when accountId is null', async () => {
      // Act
      const result = await getCurrentAccountDetails(null as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('ID de cuenta corriente no proporcionado.');
      expect(mockPrisma.currentAccount.findUnique).not.toHaveBeenCalled();
    });

    it('should return error when accountId is undefined', async () => {
      // Act
      const result = await getCurrentAccountDetails(undefined as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('ID de cuenta corriente no proporcionado.');
      expect(mockPrisma.currentAccount.findUnique).not.toHaveBeenCalled();
    });

    it('should return error when account is not found', async () => {
      // Arrange
      mockPrisma.currentAccount.findUnique.mockResolvedValue(null);

      // Act
      const result = await getCurrentAccountDetails('non-existent-id');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cuenta corriente no encontrada.');
      expect(mockPrisma.currentAccount.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
        include: expect.any(Object),
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection error');
      mockPrisma.currentAccount.findUnique.mockRejectedValue(dbError);

      // Act
      const result = await getCurrentAccountDetails(mockAccountId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Error desconocido al obtener los detalles de la cuenta corriente.');
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error fetching current account details:',
        dbError
      );
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      mockPrisma.currentAccount.findUnique.mockRejectedValue('String error');

      // Act
      const result = await getCurrentAccountDetails(mockAccountId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Error desconocido al obtener los detalles de la cuenta corriente.');
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error fetching current account details:',
        'String error'
      );
    });
  });

  describe('🎯 Edge Cases', () => {
    it('should handle CUID format accountId', async () => {
      // Arrange
      const cuidAccountId = 'ckpqr7s8u0000gzcp3h8z9w8t';
      mockPrisma.currentAccount.findUnique.mockResolvedValue({
        ...mockCurrentAccount,
        id: cuidAccountId,
      });

      // Act
      const result = await getCurrentAccountDetails(cuidAccountId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(cuidAccountId);
    });

    it('should handle account with zero balance', async () => {
      // Arrange
      const zeroBalanceAccount = {
        ...mockCurrentAccount,
        remainingBalance: 0.0,
        status: 'PAID_OFF',
      };
      mockPrisma.currentAccount.findUnique.mockResolvedValue(zeroBalanceAccount);

      // Act
      const result = await getCurrentAccountDetails(mockAccountId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.remainingBalance).toBe(0.0);
      expect(result.data.status).toBe('PAID_OFF');
    });

    it('should handle account with large number of payments', async () => {
      // Arrange
      const manyPayments = Array.from({ length: 100 }, (_, index) => ({
        id: `payment-${index + 1}`,
        currentAccountId: mockAccountId,
        amountPaid: 1000.0,
        paymentDate: new Date(`2024-${String(index % 12 + 1).padStart(2, '0')}-01`),
        installmentNumber: index + 1,
      }));

      const accountWithManyPayments = {
        ...mockCurrentAccount,
        payments: manyPayments,
      };
      mockPrisma.currentAccount.findUnique.mockResolvedValue(accountWithManyPayments);

      // Act
      const result = await getCurrentAccountDetails(mockAccountId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.payments).toHaveLength(100);
    });

    it('should handle account with special characters in notes', async () => {
      // Arrange
      const specialNotesAccount = {
        ...mockCurrentAccount,
        notes: 'Notas con acentos: ñáéíóú y símbolos: @#$%^&*()',
      };
      mockPrisma.currentAccount.findUnique.mockResolvedValue(specialNotesAccount);

      // Act
      const result = await getCurrentAccountDetails(mockAccountId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.notes).toBe('Notas con acentos: ñáéíóú y símbolos: @#$%^&*()');
    });

    it('should handle very long accountId', async () => {
      // Arrange
      const longId = 'a'.repeat(255);
      mockPrisma.currentAccount.findUnique.mockResolvedValue(null);

      // Act
      const result = await getCurrentAccountDetails(longId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cuenta corriente no encontrada.');
      expect(mockPrisma.currentAccount.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: longId },
        })
      );
    });
  });

  describe('📊 Data Structure Validation', () => {
    it('should return all required client fields', async () => {
      // Arrange
      mockPrisma.currentAccount.findUnique.mockResolvedValue(mockCurrentAccount);

      // Act
      const result = await getCurrentAccountDetails(mockAccountId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.client).toHaveProperty('id');
      expect(result.data.client).toHaveProperty('firstName');
      expect(result.data.client).toHaveProperty('lastName');
      expect(result.data.client).toHaveProperty('email');
      expect(result.data.client).toHaveProperty('phone');
    });

    it('should return all required motorcycle fields', async () => {
      // Arrange
      mockPrisma.currentAccount.findUnique.mockResolvedValue(mockCurrentAccount);

      // Act
      const result = await getCurrentAccountDetails(mockAccountId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.motorcycle).toHaveProperty('model');
      expect(result.data.motorcycle.model).toHaveProperty('id');
      expect(result.data.motorcycle.model).toHaveProperty('name');
    });

    it('should return payments with correct structure', async () => {
      // Arrange
      mockPrisma.currentAccount.findUnique.mockResolvedValue(mockCurrentAccount);

      // Act
      const result = await getCurrentAccountDetails(mockAccountId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.payments).toBeInstanceOf(Array);
      if (result.data.payments.length > 0) {
        const payment = result.data.payments[0];
        expect(payment).toHaveProperty('id');
        expect(payment).toHaveProperty('amountPaid');
        expect(payment).toHaveProperty('paymentDate');
        expect(payment).toHaveProperty('installmentNumber');
      }
    });
  });
}); 