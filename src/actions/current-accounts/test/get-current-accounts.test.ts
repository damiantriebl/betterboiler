import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCurrentAccounts } from '../get-current-accounts';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    currentAccount: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Mock de console para tests silenciosos
const mockConsole = {
  error: vi.fn(),
  log: vi.fn(),
};

const mockPrisma = prisma as any;

describe('getCurrentAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockCurrentAccount = {
    id: 'ckpqr7s8u0000gzcp3h8z9w8t',
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
        currentAccountId: 'ckpqr7s8u0000gzcp3h8z9w8t',
        amountPaid: 1000.0,
        paymentDate: new Date('2024-01-01'),
        paymentMethod: 'CASH',
        transactionReference: 'TXN001',
        installmentNumber: 1,
        notes: 'Primer pago',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  describe('✅ Successful Retrieval', () => {
    it('should return current accounts with default pagination', async () => {
      // Arrange
      mockPrisma.currentAccount.count.mockResolvedValue(5);
      mockPrisma.currentAccount.findMany.mockResolvedValue([mockCurrentAccount]);

      // Act
      const result = await getCurrentAccounts();

      // Assert
      expect(mockPrisma.currentAccount.count).toHaveBeenCalledWith({
        where: {},
      });
      expect(mockPrisma.currentAccount.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          client: {
            select: { id: true, firstName: true, lastName: true },
          },
          motorcycle: {
            include: {
              model: {
                select: { id: true, name: true },
              },
            },
          },
          payments: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockCurrentAccount]);
      expect(result.totalCount).toBe(5);
    });

    it('should return accounts with custom pagination', async () => {
      // Arrange
      mockPrisma.currentAccount.count.mockResolvedValue(25);
      mockPrisma.currentAccount.findMany.mockResolvedValue([mockCurrentAccount]);

      // Act
      const result = await getCurrentAccounts({ page: 2, pageSize: 5 });

      // Assert
      expect(mockPrisma.currentAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5, // (page 2 - 1) * pageSize 5
          take: 5,
        })
      );
      expect(result.success).toBe(true);
      expect(result.totalCount).toBe(25);
    });

    it('should filter by status', async () => {
      // Arrange
      mockPrisma.currentAccount.count.mockResolvedValue(3);
      mockPrisma.currentAccount.findMany.mockResolvedValue([
        { ...mockCurrentAccount, status: 'ACTIVE' },
      ]);

      // Act
      const result = await getCurrentAccounts({ status: 'ACTIVE' });

      // Assert
      expect(mockPrisma.currentAccount.count).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
      });
      expect(mockPrisma.currentAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE' },
        })
      );
      expect(result.success).toBe(true);
      expect(result.data?.[0]?.status).toBe('ACTIVE');
    });

    it('should filter by clientId', async () => {
      // Arrange
      const clientId = 'client-specific-id';
      mockPrisma.currentAccount.count.mockResolvedValue(2);
      mockPrisma.currentAccount.findMany.mockResolvedValue([
        { ...mockCurrentAccount, clientId },
      ]);

      // Act
      const result = await getCurrentAccounts({ clientId });

      // Assert
      expect(mockPrisma.currentAccount.count).toHaveBeenCalledWith({
        where: { clientId },
      });
      expect(mockPrisma.currentAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId },
        })
      );
      expect(result.success).toBe(true);
      expect(result.data?.[0]?.clientId).toBe(clientId);
    });

    it('should filter by both status and clientId', async () => {
      // Arrange
      const clientId = 'client-123';
      const status = 'OVERDUE';
      mockPrisma.currentAccount.count.mockResolvedValue(1);
      mockPrisma.currentAccount.findMany.mockResolvedValue([
        { ...mockCurrentAccount, clientId, status },
      ]);

      // Act
      const result = await getCurrentAccounts({ status, clientId });

      // Assert
      expect(mockPrisma.currentAccount.count).toHaveBeenCalledWith({
        where: { status, clientId },
      });
      expect(result.success).toBe(true);
    });

    it('should handle empty results', async () => {
      // Arrange
      mockPrisma.currentAccount.count.mockResolvedValue(0);
      mockPrisma.currentAccount.findMany.mockResolvedValue([]);

      // Act
      const result = await getCurrentAccounts();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should order by createdAt desc', async () => {
      // Arrange
      mockPrisma.currentAccount.count.mockResolvedValue(1);
      mockPrisma.currentAccount.findMany.mockResolvedValue([mockCurrentAccount]);

      // Act
      await getCurrentAccounts();

      // Assert
      expect(mockPrisma.currentAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            createdAt: 'desc',
          },
        })
      );
    });

    it('should handle all valid status values', async () => {
      // Arrange
      const statuses = ['ACTIVE', 'PAID_OFF', 'OVERDUE', 'DEFAULTED', 'CANCELLED'];
      
      for (const status of statuses) {
        mockPrisma.currentAccount.count.mockResolvedValue(1);
        mockPrisma.currentAccount.findMany.mockResolvedValue([
          { ...mockCurrentAccount, status },
        ]);

        // Act
        const result = await getCurrentAccounts({ status: status as any });

        // Assert
        expect(result.success).toBe(true);
        expect(result.data?.[0]?.status).toBe(status);
        
        vi.clearAllMocks();
      }
    });
  });

  describe('❌ Error Handling', () => {
    it('should handle database errors during count', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockPrisma.currentAccount.count.mockRejectedValue(dbError);

      // Act
      const result = await getCurrentAccounts();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error fetching current accounts:',
        dbError
      );
    });

    it('should handle database errors during findMany', async () => {
      // Arrange
      mockPrisma.currentAccount.count.mockResolvedValue(5);
      const dbError = new Error('Query execution failed');
      mockPrisma.currentAccount.findMany.mockRejectedValue(dbError);

      // Act
      const result = await getCurrentAccounts();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Query execution failed');
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error fetching current accounts:',
        dbError
      );
    });

    it('should handle Prisma validation errors', async () => {
      // Arrange
      const validationError = new Prisma.PrismaClientValidationError(
        'Invalid query parameters',
        { clientVersion: '4.0.0' }
      );
      mockPrisma.currentAccount.count.mockRejectedValue(validationError);

      // Act
      const result = await getCurrentAccounts();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error de validación de Prisma');
      expect(result.error).toContain('Invalid query parameters');
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      mockPrisma.currentAccount.count.mockRejectedValue('String error');

      // Act
      const result = await getCurrentAccounts();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Error desconocido al obtener las cuentas corrientes.');
    });
  });

  describe('🎯 Edge Cases', () => {
    it('should handle page 1 with zero skip', async () => {
      // Arrange
      mockPrisma.currentAccount.count.mockResolvedValue(10);
      mockPrisma.currentAccount.findMany.mockResolvedValue([mockCurrentAccount]);

      // Act
      await getCurrentAccounts({ page: 1, pageSize: 10 });

      // Assert
      expect(mockPrisma.currentAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        })
      );
    });

    it('should handle large page numbers', async () => {
      // Arrange
      const page = 100;
      const pageSize = 20;
      mockPrisma.currentAccount.count.mockResolvedValue(2000);
      mockPrisma.currentAccount.findMany.mockResolvedValue([]);

      // Act
      await getCurrentAccounts({ page, pageSize });

      // Assert
      expect(mockPrisma.currentAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: (page - 1) * pageSize, // 99 * 20 = 1980
          take: pageSize,
        })
      );
    });

    it('should handle very large page size', async () => {
      // Arrange
      mockPrisma.currentAccount.count.mockResolvedValue(1000);
      mockPrisma.currentAccount.findMany.mockResolvedValue([mockCurrentAccount]);

      // Act
      await getCurrentAccounts({ pageSize: 1000 });

      // Assert
      expect(mockPrisma.currentAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1000,
        })
      );
    });

    it('should handle CUID clientId format', async () => {
      // Arrange
      const cuidClientId = 'ckpqr7s8u0000gzcp3h8z9w8t';
      mockPrisma.currentAccount.count.mockResolvedValue(1);
      mockPrisma.currentAccount.findMany.mockResolvedValue([
        { ...mockCurrentAccount, clientId: cuidClientId },
      ]);

      // Act
      const result = await getCurrentAccounts({ clientId: cuidClientId });

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrisma.currentAccount.count).toHaveBeenCalledWith({
        where: { clientId: cuidClientId },
      });
    });

    it('should handle empty string filters', async () => {
      // Arrange
      mockPrisma.currentAccount.count.mockResolvedValue(1);
      mockPrisma.currentAccount.findMany.mockResolvedValue([mockCurrentAccount]);

      // Act
      await getCurrentAccounts({ clientId: '' });

      // Assert
      // Empty string is falsy, so it's not included in the where clause
      expect(mockPrisma.currentAccount.count).toHaveBeenCalledWith({
        where: {},
      });
    });

    it('should handle negative page numbers gracefully', async () => {
      // Arrange
      mockPrisma.currentAccount.count.mockResolvedValue(10);
      mockPrisma.currentAccount.findMany.mockResolvedValue([mockCurrentAccount]);

      // Act
      await getCurrentAccounts({ page: -1, pageSize: 10 });

      // Assert
      expect(mockPrisma.currentAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: -20, // (-1 - 1) * 10 = -20
          take: 10,
        })
      );
    });

    it('should handle zero page size', async () => {
      // Arrange
      mockPrisma.currentAccount.count.mockResolvedValue(10);
      mockPrisma.currentAccount.findMany.mockResolvedValue([]);

      // Act
      await getCurrentAccounts({ pageSize: 0 });

      // Assert
      expect(mockPrisma.currentAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 0,
        })
      );
    });
  });

  describe('📊 Data Structure Validation', () => {
    it('should return correct data structure', async () => {
      // Arrange
      mockPrisma.currentAccount.count.mockResolvedValue(1);
      mockPrisma.currentAccount.findMany.mockResolvedValue([mockCurrentAccount]);

      // Act
      const result = await getCurrentAccounts();

      // Assert
      expect(result.success).toBe(true);
      expect(result.totalCount).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      if (result.data && result.data.length > 0) {
        const account = result.data[0];
        expect(account).toHaveProperty('client');
        expect(account.client).toHaveProperty('id');
        expect(account.client).toHaveProperty('firstName');
        expect(account.client).toHaveProperty('lastName');
        expect(account).toHaveProperty('motorcycle');
        expect(account.motorcycle).toHaveProperty('model');
        expect(account.motorcycle?.model).toHaveProperty('id');
        expect(account.motorcycle?.model).toHaveProperty('name');
        expect(account).toHaveProperty('payments');
        expect(account.payments).toBeInstanceOf(Array);
      }
    });

    it('should handle account without motorcycle', async () => {
      // Arrange
      const accountWithoutMotorcycle = {
        ...mockCurrentAccount,
        motorcycle: null,
      };
      mockPrisma.currentAccount.count.mockResolvedValue(1);
      mockPrisma.currentAccount.findMany.mockResolvedValue([accountWithoutMotorcycle]);

      // Act
      const result = await getCurrentAccounts();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.[0]?.motorcycle).toBeNull();
    });

    it('should handle account without payments', async () => {
      // Arrange
      const accountWithoutPayments = {
        ...mockCurrentAccount,
        payments: [],
      };
      mockPrisma.currentAccount.count.mockResolvedValue(1);
      mockPrisma.currentAccount.findMany.mockResolvedValue([accountWithoutPayments]);

      // Act
      const result = await getCurrentAccounts();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.[0]?.payments).toEqual([]);
    });

    it('should include all required current account fields', async () => {
      // Arrange
      mockPrisma.currentAccount.count.mockResolvedValue(1);
      mockPrisma.currentAccount.findMany.mockResolvedValue([mockCurrentAccount]);

      // Act
      const result = await getCurrentAccounts();

      // Assert
      expect(result.success).toBe(true);
      if (result.data && result.data.length > 0) {
        const account = result.data[0];
        expect(account).toHaveProperty('id');
        expect(account).toHaveProperty('totalAmount');
        expect(account).toHaveProperty('remainingBalance');
        expect(account).toHaveProperty('status');
        expect(account).toHaveProperty('paymentFrequency');
        expect(account).toHaveProperty('startDate');
        expect(account).toHaveProperty('nextDueDate');
        expect(account).toHaveProperty('finalPaymentDate');
      }
    });
  });

  describe('🔍 Filtering and Pagination Combinations', () => {
    it('should combine status filter with custom pagination', async () => {
      // Arrange
      mockPrisma.currentAccount.count.mockResolvedValue(15);
      mockPrisma.currentAccount.findMany.mockResolvedValue([
        { ...mockCurrentAccount, status: 'ACTIVE' },
      ]);

      // Act
      const result = await getCurrentAccounts({
        status: 'ACTIVE',
        page: 2,
        pageSize: 5,
      });

      // Assert
      expect(mockPrisma.currentAccount.count).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
      });
      expect(mockPrisma.currentAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE' },
          skip: 5,
          take: 5,
        })
      );
      expect(result.success).toBe(true);
      expect(result.totalCount).toBe(15);
    });

    it('should combine clientId filter with custom pagination', async () => {
      // Arrange
      const clientId = 'client-test-123';
      mockPrisma.currentAccount.count.mockResolvedValue(8);
      mockPrisma.currentAccount.findMany.mockResolvedValue([
        { ...mockCurrentAccount, clientId },
      ]);

      // Act
      const result = await getCurrentAccounts({
        clientId,
        page: 3,
        pageSize: 2,
      });

      // Assert
      expect(mockPrisma.currentAccount.count).toHaveBeenCalledWith({
        where: { clientId },
      });
      expect(mockPrisma.currentAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId },
          skip: 4, // (3 - 1) * 2
          take: 2,
        })
      );
      expect(result.success).toBe(true);
    });

    it('should combine all filters with pagination', async () => {
      // Arrange
      const options = {
        status: 'OVERDUE' as any,
        clientId: 'client-overdue',
        page: 2,
        pageSize: 3,
      };
      mockPrisma.currentAccount.count.mockResolvedValue(12);
      mockPrisma.currentAccount.findMany.mockResolvedValue([
        { ...mockCurrentAccount, status: 'OVERDUE', clientId: 'client-overdue' },
      ]);

      // Act
      const result = await getCurrentAccounts(options);

      // Assert
      expect(mockPrisma.currentAccount.count).toHaveBeenCalledWith({
        where: { status: 'OVERDUE', clientId: 'client-overdue' },
      });
      expect(mockPrisma.currentAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'OVERDUE', clientId: 'client-overdue' },
          skip: 3, // (2 - 1) * 3
          take: 3,
        })
      );
      expect(result.success).toBe(true);
      expect(result.totalCount).toBe(12);
    });
  });

  describe('📝 Console Logging', () => {
    it('should log errors when database operations fail', async () => {
      // Arrange
      const dbError = new Error('Connection timeout');
      mockPrisma.currentAccount.count.mockRejectedValue(dbError);

      // Act
      await getCurrentAccounts();

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error fetching current accounts:',
        dbError
      );
    });

    it('should log Prisma validation errors', async () => {
      // Arrange
      const validationError = new Prisma.PrismaClientValidationError(
        'Invalid where clause',
        { clientVersion: '4.0.0' }
      );
      mockPrisma.currentAccount.findMany.mockRejectedValue(validationError);

      // Act
      await getCurrentAccounts();

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error fetching current accounts:',
        validationError
      );
    });
  });

  describe('🔧 Performance Considerations', () => {
    it('should handle large result sets efficiently', async () => {
      // Arrange
      const largeDataSet = Array.from({ length: 1000 }, (_, index) => ({
        ...mockCurrentAccount,
        id: `account-${index}`,
        clientId: `client-${index}`,
      }));

      mockPrisma.currentAccount.count.mockResolvedValue(10000);
      mockPrisma.currentAccount.findMany.mockResolvedValue(largeDataSet);

      // Act
      const result = await getCurrentAccounts({ pageSize: 1000 });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1000);
      expect(result.totalCount).toBe(10000);
    });

    it('should handle complex include queries without performance issues', async () => {
      // Arrange
      const complexAccount = {
        ...mockCurrentAccount,
        motorcycle: {
          ...mockCurrentAccount.motorcycle,
          model: {
            id: 10,
            name: 'Honda CB600F Hornet',
          },
        },
        payments: Array.from({ length: 24 }, (_, index) => ({
          id: `payment-${index + 1}`,
          currentAccountId: mockCurrentAccount.id,
          amountPaid: 1000.0,
          paymentDate: new Date(`2024-${String((index % 12) + 1).padStart(2, '0')}-01`),
          installmentNumber: index + 1,
        })),
      };

      mockPrisma.currentAccount.count.mockResolvedValue(1);
      mockPrisma.currentAccount.findMany.mockResolvedValue([complexAccount]);

      // Act
      const result = await getCurrentAccounts();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.[0]?.payments).toHaveLength(24);
      expect(result.data?.[0]?.motorcycle?.model?.name).toBe('Honda CB600F Hornet');
    });
  });
}); 
