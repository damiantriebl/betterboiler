import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCurrentAccountForReport } from '../get-current-account-for-report';
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
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

const mockPrisma = prisma as any;

describe('getCurrentAccountForReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockAccountData = {
    id: 'ckpqr7s8u0000gzcp3h8z9w8t',
    clientId: 'client-456',
    motorcycleId: 1,
    totalAmount: 15000.0,
    downPayment: 3000.0,
    remainingAmount: 12000.0,
    numberOfInstallments: 12,
    installmentAmount: 1000.0,
    paymentFrequency: 'MONTHLY',
    startDate: new Date('2024-01-01'),
    nextDueDate: new Date('2024-02-01'),
    interestRate: 0.15,
    currency: 'ARS',
    reminderLeadTimeDays: 7,
    status: 'ACTIVE',
    notes: 'Cuenta corriente de prueba',
    organizationId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    client: {
      id: 'client-456',
      firstName: 'Juan',
      lastName: 'Pérez',
      email: 'juan.perez@email.com',
      phone: '+54 11 1234-5678',
      address: 'Av. Corrientes 1234',
      city: 'Buenos Aires',
      province: 'CABA',
      postalCode: '1043',
      birthDate: new Date('1985-05-15'),
      organizationId: 'org-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    motorcycle: {
      id: 1,
      chassisNumber: 'ABC123456789',
      engineNumber: 'ENG987654321',
      licensePlate: 'ABC123',
      year: 2023,
      kilometers: 5000,
      price: 15000.0,
      modelId: 1,
      brandId: 1,
      colorId: 1,
      branchId: 1,
      sellerId: 1,
      organizationId: 'org-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      model: {
        id: 1,
        name: 'CB600F Hornet',
        brandId: 1,
        organizationId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      brand: {
        id: 1,
        name: 'Honda',
        organizationId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      color: {
        id: 1,
        name: 'Rojo',
        organizationId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      branch: {
        id: 1,
        name: 'Sucursal Centro',
        address: 'Av. Santa Fe 1000',
        city: 'Buenos Aires',
        province: 'CABA',
        phone: '+54 11 5555-0001',
        organizationId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      seller: {
        id: 1,
        firstName: 'Carlos',
        lastName: 'Vendedor',
        email: 'carlos.vendedor@empresa.com',
        phone: '+54 11 9999-0001',
        branchId: 1,
        organizationId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    payments: [
      {
        id: 'payment-1',
        currentAccountId: 'ckpqr7s8u0000gzcp3h8z9w8t',
        amountPaid: 1000.0,
        paymentDate: new Date('2024-01-15'),
        paymentMethod: 'CASH',
        transactionReference: 'TXN001',
        installmentNumber: 1,
        notes: 'Primer pago',
        organizationId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'payment-2',
        currentAccountId: 'ckpqr7s8u0000gzcp3h8z9w8t',
        amountPaid: 1000.0,
        paymentDate: new Date('2024-02-15'),
        paymentMethod: 'TRANSFER',
        transactionReference: 'TXN002',
        installmentNumber: 2,
        notes: 'Segundo pago',
        organizationId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    organization: {
      id: 'org-123',
      name: 'Mi Empresa',
      slug: 'mi-empresa',
      email: 'contacto@miempresa.com',
      phone: '+54 11 1234-0000',
      address: 'Av. Rivadavia 1000',
      city: 'Buenos Aires',
      province: 'CABA',
      country: 'Argentina',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  describe('✅ Successful Retrieval', () => {
    it('should retrieve current account with all related data', async () => {
      // Arrange
      mockPrisma.currentAccount.findUnique.mockResolvedValue(mockAccountData);

      // Act
      const result = await getCurrentAccountForReport('ckpqr7s8u0000gzcp3h8z9w8t');

      // Assert
      expect(mockPrisma.currentAccount.findUnique).toHaveBeenCalledWith({
        where: { id: 'ckpqr7s8u0000gzcp3h8z9w8t' },
        include: {
          client: true,
          motorcycle: {
            include: {
              model: true,
              brand: true,
              color: true,
              branch: true,
              seller: true,
            },
          },
          payments: {
            orderBy: {
              paymentDate: 'asc',
            },
          },
          organization: true,
        },
      });
      expect(result).toEqual(mockAccountData);
      expect(result?.client).toBeDefined();
      expect(result?.motorcycle).toBeDefined();
      expect(result?.motorcycle.model).toBeDefined();
      expect(result?.motorcycle.brand).toBeDefined();
      expect(result?.motorcycle.color).toBeDefined();
      expect(result?.motorcycle.branch).toBeDefined();
      expect(result?.motorcycle.seller).toBeDefined();
      expect(result?.payments).toHaveLength(2);
      expect(result?.organization).toBeDefined();
    });

    it('should handle account with minimal data when some relations are null', async () => {
      // Arrange
      const minimalAccountData = {
        ...mockAccountData,
        motorcycle: {
          ...mockAccountData.motorcycle,
          seller: null,
        },
        payments: [],
      };

      mockPrisma.currentAccount.findUnique.mockResolvedValue(minimalAccountData);

      // Act
      const result = await getCurrentAccountForReport('ckpqr7s8u0000gzcp3h8z9w8t');

      // Assert
      expect(result).toEqual(minimalAccountData);
      expect(result?.motorcycle.seller).toBeNull();
      expect(result?.payments).toHaveLength(0);
    });

    it('should verify payments are ordered by paymentDate ascending', async () => {
      // Arrange
      mockPrisma.currentAccount.findUnique.mockResolvedValue(mockAccountData);

      // Act
      await getCurrentAccountForReport('ckpqr7s8u0000gzcp3h8z9w8t');

      // Assert
      expect(mockPrisma.currentAccount.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            payments: {
              orderBy: {
                paymentDate: 'asc',
              },
            },
          }),
        })
      );
    });

    it('should handle accounts with different statuses', async () => {
      // Arrange
      const statuses = ['ACTIVE', 'OVERDUE', 'DEFAULTED', 'CANCELLED', 'PAID_OFF'];
      
      for (const status of statuses) {
        const accountWithStatus = {
          ...mockAccountData,
          status: status as any,
        };

        mockPrisma.currentAccount.findUnique.mockResolvedValue(accountWithStatus);

        // Act
        const result = await getCurrentAccountForReport('ckpqr7s8u0000gzcp3h8z9w8t');

        // Assert
        expect(result?.status).toBe(status);
        expect(result).toBeDefined();
        
        vi.clearAllMocks();
      }
    });

    it('should handle accounts with different payment frequencies', async () => {
      // Arrange
      const frequencies = ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'];
      
      for (const frequency of frequencies) {
        const accountWithFrequency = {
          ...mockAccountData,
          paymentFrequency: frequency as any,
        };

        mockPrisma.currentAccount.findUnique.mockResolvedValue(accountWithFrequency);

        // Act
        const result = await getCurrentAccountForReport('ckpqr7s8u0000gzcp3h8z9w8t');

        // Assert
        expect(result?.paymentFrequency).toBe(frequency);
        expect(result).toBeDefined();
        
        vi.clearAllMocks();
      }
    });
  });

  describe('❌ Error Handling', () => {
    describe('🔍 Validation Errors', () => {
      it('should return null when accountId is empty string', async () => {
        // Act
        const result = await getCurrentAccountForReport('');

        // Assert
        expect(result).toBeNull();
        expect(mockConsole.error).toHaveBeenCalledWith(
          '[getCurrentAccountForReport] Account ID is required.'
        );
        expect(mockPrisma.currentAccount.findUnique).not.toHaveBeenCalled();
      });

      it('should return null when accountId is undefined', async () => {
        // Act
        const result = await getCurrentAccountForReport(undefined as any);

        // Assert
        expect(result).toBeNull();
        expect(mockConsole.error).toHaveBeenCalledWith(
          '[getCurrentAccountForReport] Account ID is required.'
        );
        expect(mockPrisma.currentAccount.findUnique).not.toHaveBeenCalled();
      });

      it('should return null when accountId is null', async () => {
        // Act
        const result = await getCurrentAccountForReport(null as any);

        // Assert
        expect(result).toBeNull();
        expect(mockConsole.error).toHaveBeenCalledWith(
          '[getCurrentAccountForReport] Account ID is required.'
        );
        expect(mockPrisma.currentAccount.findUnique).not.toHaveBeenCalled();
      });
    });

    describe('🔍 Business Logic Errors', () => {
      it('should return null and log warning when account is not found', async () => {
        // Arrange
        mockPrisma.currentAccount.findUnique.mockResolvedValue(null);

        // Act
        const result = await getCurrentAccountForReport('nonexistent-account-id');

        // Assert
        expect(result).toBeNull();
        expect(mockConsole.warn).toHaveBeenCalledWith(
          '[getCurrentAccountForReport] Account not found for ID: nonexistent-account-id'
        );
        expect(mockPrisma.currentAccount.findUnique).toHaveBeenCalledWith({
          where: { id: 'nonexistent-account-id' },
          include: expect.any(Object),
        });
      });
    });

    describe('🔍 Database Errors', () => {
      it('should handle database connection errors', async () => {
        // Arrange
        const dbError = new Error('Database connection failed');
        mockPrisma.currentAccount.findUnique.mockRejectedValue(dbError);

        // Act
        const result = await getCurrentAccountForReport('ckpqr7s8u0000gzcp3h8z9w8t');

        // Assert
        expect(result).toBeNull();
        expect(mockConsole.error).toHaveBeenCalledWith(
          '[getCurrentAccountForReport] Error fetching account for ID ckpqr7s8u0000gzcp3h8z9w8t:',
          dbError
        );
      });

      it('should handle Prisma client errors', async () => {
        // Arrange
        const prismaError = new Error('P2002: Unique constraint failed');
        mockPrisma.currentAccount.findUnique.mockRejectedValue(prismaError);

        // Act
        const result = await getCurrentAccountForReport('invalid-format-id');

        // Assert
        expect(result).toBeNull();
        expect(mockConsole.error).toHaveBeenCalledWith(
          '[getCurrentAccountForReport] Error fetching account for ID invalid-format-id:',
          prismaError
        );
      });

      it('should handle unknown exceptions', async () => {
        // Arrange
        const unknownError = 'Unknown error string';
        mockPrisma.currentAccount.findUnique.mockRejectedValue(unknownError);

        // Act
        const result = await getCurrentAccountForReport('ckpqr7s8u0000gzcp3h8z9w8t');

        // Assert
        expect(result).toBeNull();
        expect(mockConsole.error).toHaveBeenCalledWith(
          '[getCurrentAccountForReport] Error fetching account for ID ckpqr7s8u0000gzcp3h8z9w8t:',
          unknownError
        );
      });
    });
  });

  describe('🎯 Edge Cases and Data Integrity', () => {
    it('should handle accounts with special characters in data', async () => {
      // Arrange
      const accountWithSpecialChars = {
        ...mockAccountData,
        notes: 'Cuenta con acentos: ñáéíóú y símbolos: @#$%^&*()',
        client: {
          ...mockAccountData.client,
          firstName: 'José María',
          lastName: 'González-Pérez',
          address: 'Av. San Martín 1234, 1° "A"',
        },
        motorcycle: {
          ...mockAccountData.motorcycle,
          chassisNumber: 'ABC-123_456/789',
          model: {
            ...mockAccountData.motorcycle.model,
            name: 'CBR600RR "Super Sport"',
          },
        },
      };

      mockPrisma.currentAccount.findUnique.mockResolvedValue(accountWithSpecialChars);

      // Act
      const result = await getCurrentAccountForReport('ckpqr7s8u0000gzcp3h8z9w8t');

      // Assert
      expect(result?.notes).toBe('Cuenta con acentos: ñáéíóú y símbolos: @#$%^&*()');
      expect(result?.client.firstName).toBe('José María');
      expect(result?.client.lastName).toBe('González-Pérez');
      expect(result?.motorcycle.chassisNumber).toBe('ABC-123_456/789');
      expect(result?.motorcycle.model.name).toBe('CBR600RR "Super Sport"');
    });

    it('should handle accounts with null optional fields', async () => {
      // Arrange
      const accountWithNulls = {
        ...mockAccountData,
        notes: null,
        nextDueDate: null,
        interestRate: null,
        client: {
          ...mockAccountData.client,
          phone: null,
          address: null,
          birthDate: null,
        },
        payments: [
          {
            ...mockAccountData.payments[0],
            transactionReference: null,
            notes: null,
          },
        ],
      };

      mockPrisma.currentAccount.findUnique.mockResolvedValue(accountWithNulls);

      // Act
      const result = await getCurrentAccountForReport('ckpqr7s8u0000gzcp3h8z9w8t');

      // Assert
      expect(result?.notes).toBeNull();
      expect(result?.nextDueDate).toBeNull();
      expect(result?.interestRate).toBeNull();
      expect(result?.client.phone).toBeNull();
      expect(result?.payments[0].transactionReference).toBeNull();
    });

    it('should handle accounts with large payment history', async () => {
      // Arrange
      const accountWithManyPayments = {
        ...mockAccountData,
        payments: Array.from({ length: 50 }, (_, index) => ({
          id: `payment-${index + 1}`,
          currentAccountId: 'ckpqr7s8u0000gzcp3h8z9w8t',
          amountPaid: 1000.0,
          paymentDate: new Date(`2024-${String(index % 12 + 1).padStart(2, '0')}-15`),
          paymentMethod: 'CASH',
          transactionReference: `TXN${String(index + 1).padStart(3, '0')}`,
          installmentNumber: index + 1,
          notes: `Pago número ${index + 1}`,
          organizationId: 'org-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      };

      mockPrisma.currentAccount.findUnique.mockResolvedValue(accountWithManyPayments);

      // Act
      const result = await getCurrentAccountForReport('ckpqr7s8u0000gzcp3h8z9w8t');

      // Assert
      expect(result?.payments).toHaveLength(50);
      expect(result?.payments[0].installmentNumber).toBe(1);
      expect(result?.payments[49].installmentNumber).toBe(50);
    });

    it('should handle accounts missing optional seller', async () => {
      // Arrange
      const accountWithoutSeller = {
        ...mockAccountData,
        motorcycle: {
          ...mockAccountData.motorcycle,
          seller: null,
          sellerId: null,
        },
      };

      mockPrisma.currentAccount.findUnique.mockResolvedValue(accountWithoutSeller);

      // Act
      const result = await getCurrentAccountForReport('ckpqr7s8u0000gzcp3h8z9w8t');

      // Assert
      expect(result?.motorcycle.seller).toBeNull();
      expect(result?.motorcycle.model).toBeDefined();
      expect(result?.motorcycle.brand).toBeDefined();
      expect(result?.motorcycle.color).toBeDefined();
      expect(result?.motorcycle.branch).toBeDefined();
    });
  });

  describe('🔍 Logging Behavior', () => {
    it('should not log anything on successful retrieval', async () => {
      // Arrange
      mockPrisma.currentAccount.findUnique.mockResolvedValue(mockAccountData);

      // Act
      await getCurrentAccountForReport('ckpqr7s8u0000gzcp3h8z9w8t');

      // Assert
      expect(mockConsole.error).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    it('should log appropriate messages for different error scenarios', async () => {
      // Test empty ID
      await getCurrentAccountForReport('');
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[getCurrentAccountForReport] Account ID is required.'
      );

      vi.clearAllMocks();

      // Test not found
      mockPrisma.currentAccount.findUnique.mockResolvedValue(null);
      await getCurrentAccountForReport('not-found-id');
      expect(mockConsole.warn).toHaveBeenCalledWith(
        '[getCurrentAccountForReport] Account not found for ID: not-found-id'
      );

      vi.clearAllMocks();

      // Test database error
      const dbError = new Error('Database error');
      mockPrisma.currentAccount.findUnique.mockRejectedValue(dbError);
      await getCurrentAccountForReport('error-id');
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[getCurrentAccountForReport] Error fetching account for ID error-id:',
        dbError
      );
    });
  });

  describe('📊 Data Structure Validation', () => {
    it('should include all required nested relations', async () => {
      // Arrange
      mockPrisma.currentAccount.findUnique.mockResolvedValue(mockAccountData);

      // Act
      const result = await getCurrentAccountForReport('ckpqr7s8u0000gzcp3h8z9w8t');

      // Assert
      expect(result?.client).toBeDefined();
      expect(result?.client.firstName).toBe('Juan');
      expect(result?.motorcycle).toBeDefined();
      expect(result?.motorcycle.model).toBeDefined();
      expect(result?.motorcycle.brand).toBeDefined();
      expect(result?.motorcycle.color).toBeDefined();
      expect(result?.motorcycle.branch).toBeDefined();
      expect(result?.motorcycle.seller).toBeDefined();
      expect(result?.payments).toBeDefined();
      expect(Array.isArray(result?.payments)).toBe(true);
      expect(result?.organization).toBeDefined();
      expect(result?.organization.name).toBe('Mi Empresa');
    });

    it('should verify Prisma query structure', async () => {
      // Arrange
      mockPrisma.currentAccount.findUnique.mockResolvedValue(mockAccountData);

      // Act
      await getCurrentAccountForReport('ckpqr7s8u0000gzcp3h8z9w8t');

      // Assert
      expect(mockPrisma.currentAccount.findUnique).toHaveBeenCalledWith({
        where: { id: 'ckpqr7s8u0000gzcp3h8z9w8t' },
        include: {
          client: true,
          motorcycle: {
            include: {
              model: true,
              brand: true,
              color: true,
              branch: true,
              seller: true,
            },
          },
          payments: {
            orderBy: {
              paymentDate: 'asc',
            },
          },
          organization: true,
        },
      });
    });
  });
}); 
