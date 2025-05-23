import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { undoPayment } from '../undo-payment';
import prisma from '@/lib/prisma';
import { getOrganizationIdFromSession } from '../../get-Organization-Id-From-Session';
import type { UndoPaymentFormState } from '../undo-payment';
import { Prisma } from '@prisma/client';

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: vi.fn(),
  },
}));

// Mock de getOrganizationIdFromSession
vi.mock('../../get-Organization-Id-From-Session', () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

// Mock de console para tests silenciosos
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

const mockPrisma = prisma as any;
const mockGetOrganization = getOrganizationIdFromSession as any;

describe('undoPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockSessionData = {
    organizationId: 'org-123',
    error: null,
  };

  const mockCurrentAccount = {
    id: 'ckpqr7s8u0000gzcp3h8z9w8t',
    clientId: 'client-456',
    motorcycleId: 1,
    totalAmount: 15000.0,
    downPayment: 3000.0,
    remainingAmount: 10000.0, // 2 payments already made
    numberOfInstallments: 12,
    installmentAmount: 1000.0,
    paymentFrequency: 'MONTHLY',
    startDate: new Date('2024-01-01'),
    nextDueDate: new Date('2024-04-01'),
    finalPaymentDate: new Date('2024-12-01'),
    interestRate: 0.15, // 15% annual
    currency: 'ARS',
    reminderLeadTimeDays: 7,
    status: 'ACTIVE',
    notes: 'Cuenta corriente de prueba',
    organizationId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaymentToAnnul = {
    id: 'payment-123',
    currentAccountId: mockCurrentAccount.id,
    amountPaid: 1000.0,
    paymentDate: new Date('2024-02-15'),
    paymentMethod: 'CASH',
    transactionReference: 'TXN002',
    installmentNumber: 2,
    notes: 'Segundo pago',
    installmentVersion: null, // Normal payment
    organizationId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    currentAccount: mockCurrentAccount,
  };

  const mockPrevState: UndoPaymentFormState = {
    message: '',
    success: false,
  };

  describe('✅ Successful Payment Undo', () => {
    it('should successfully undo a payment with D/H accounting entries', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue(mockSessionData);
      
      const mockTx = {
        payment: {
          findUnique: vi.fn().mockResolvedValue(mockPaymentToAnnul),
          update: vi.fn().mockResolvedValue({
            ...mockPaymentToAnnul,
            installmentVersion: 'D',
          }),
          create: vi.fn()
            .mockResolvedValueOnce({
              ...mockPaymentToAnnul,
              id: 'payment-H-456',
              installmentVersion: 'H',
            })
            .mockResolvedValueOnce({
              ...mockPaymentToAnnul,
              id: 'payment-pending-789',
              paymentDate: null,
              paymentMethod: null,
              installmentVersion: null,
            }),
          count: vi.fn().mockResolvedValue(1), // 1 valid payment remaining
        },
        currentAccount: {
          update: vi.fn().mockResolvedValue({
            ...mockCurrentAccount,
            remainingAmount: 11000.0, // Increased by the undone payment
          }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback(mockTx);
      });

      const formData = new FormData();
      formData.append('paymentId', 'payment-123');

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(mockGetOrganization).toHaveBeenCalled();
      expect(mockTx.payment.findUnique).toHaveBeenCalledWith({
        where: { id: 'payment-123', organizationId: 'org-123' },
        include: { currentAccount: true },
      });
      expect(mockTx.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-123' },
        data: {
          installmentVersion: 'D',
          updatedAt: expect.any(Date),
        },
      });
      expect(mockTx.payment.create).toHaveBeenCalledTimes(2); // H entry + pending payment
      expect(mockTx.currentAccount.update).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Anulación procesada para pago payment-123');
    });

    it('should create H (Haber) entry with correct data', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue(mockSessionData);
      
      const mockTx = {
        payment: {
          findUnique: vi.fn().mockResolvedValue(mockPaymentToAnnul),
          update: vi.fn().mockResolvedValue(mockPaymentToAnnul),
          create: vi.fn().mockResolvedValue({}),
          count: vi.fn().mockResolvedValue(1),
        },
        currentAccount: {
          update: vi.fn().mockResolvedValue(mockCurrentAccount),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback(mockTx);
      });

      const formData = new FormData();
      formData.append('paymentId', 'payment-123');

      // Act
      await undoPayment(mockPrevState, formData);

      // Assert - Check H entry creation
      expect(mockTx.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          currentAccountId: mockPaymentToAnnul.currentAccountId,
          organizationId: mockPaymentToAnnul.organizationId,
          amountPaid: mockPaymentToAnnul.amountPaid,
          paymentDate: mockPaymentToAnnul.paymentDate,
          paymentMethod: mockPaymentToAnnul.paymentMethod,
          installmentNumber: mockPaymentToAnnul.installmentNumber,
          installmentVersion: 'H',
          notes: expect.stringContaining('Anulación H'),
        }),
      });
    });

    it('should create pending payment entry for the same installment', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue(mockSessionData);
      
      const mockTx = {
        payment: {
          findUnique: vi.fn().mockResolvedValue(mockPaymentToAnnul),
          update: vi.fn().mockResolvedValue(mockPaymentToAnnul),
          create: vi.fn().mockResolvedValue({}),
          count: vi.fn().mockResolvedValue(1),
        },
        currentAccount: {
          update: vi.fn().mockResolvedValue(mockCurrentAccount),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback(mockTx);
      });

      const formData = new FormData();
      formData.append('paymentId', 'payment-123');

      // Act
      await undoPayment(mockPrevState, formData);

      // Assert - Check pending payment creation (second call to create)
      const createCalls = mockTx.payment.create.mock.calls;
      expect(createCalls).toHaveLength(2);
      
      // Second call should be the pending payment
      const pendingPaymentCall = createCalls[1][0];
      expect(pendingPaymentCall.data).toEqual(expect.objectContaining({
        currentAccountId: mockPaymentToAnnul.currentAccountId,
        organizationId: mockPaymentToAnnul.organizationId,
        amountPaid: mockPaymentToAnnul.amountPaid,
        paymentDate: null, // No payment date since it's pending
        paymentMethod: null, // No payment method yet
        installmentNumber: mockPaymentToAnnul.installmentNumber,
        installmentVersion: null, // Normal payment, no special version
        notes: expect.stringContaining('Cuota pendiente tras anulación'),
      }));
    });

    it('should recalculate remaining amount correctly', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue(mockSessionData);
      
      const mockTx = {
        payment: {
          findUnique: vi.fn().mockResolvedValue(mockPaymentToAnnul),
          update: vi.fn().mockResolvedValue(mockPaymentToAnnul),
          create: vi.fn().mockResolvedValue({}),
          count: vi.fn().mockResolvedValue(1),
        },
        currentAccount: {
          update: vi.fn().mockResolvedValue(mockCurrentAccount),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback(mockTx);
      });

      const formData = new FormData();
      formData.append('paymentId', 'payment-123');

      // Act
      await undoPayment(mockPrevState, formData);

      // Assert - Check account update with increased remaining amount
      expect(mockTx.currentAccount.update).toHaveBeenCalledWith({
        where: { id: mockCurrentAccount.id },
        data: expect.objectContaining({
          remainingAmount: 11000.0, // Original 10000 + undone payment 1000
          installmentAmount: expect.any(Number), // Should be recalculated
          updatedAt: expect.any(Date),
        }),
      });
    });

    it('should handle payment with notes correctly', async () => {
      // Arrange
      const paymentWithNotes = {
        ...mockPaymentToAnnul,
        notes: 'Pago original con notas',
      };

      mockGetOrganization.mockResolvedValue(mockSessionData);
      
      const mockTx = {
        payment: {
          findUnique: vi.fn().mockResolvedValue(paymentWithNotes),
          update: vi.fn().mockResolvedValue(paymentWithNotes),
          create: vi.fn().mockResolvedValue({}),
          count: vi.fn().mockResolvedValue(1),
        },
        currentAccount: {
          update: vi.fn().mockResolvedValue(mockCurrentAccount),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback(mockTx);
      });

      const formData = new FormData();
      formData.append('paymentId', 'payment-123');

      // Act
      await undoPayment(mockPrevState, formData);

      // Assert - Check H entry preserves and extends original notes
      expect(mockTx.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          notes: 'Pago original con notas (Anulación H)',
        }),
      });
    });

    it('should handle payment without notes correctly', async () => {
      // Arrange
      const paymentWithoutNotes = {
        ...mockPaymentToAnnul,
        notes: null,
      };

      mockGetOrganization.mockResolvedValue(mockSessionData);
      
      const mockTx = {
        payment: {
          findUnique: vi.fn().mockResolvedValue(paymentWithoutNotes),
          update: vi.fn().mockResolvedValue(paymentWithoutNotes),
          create: vi.fn().mockResolvedValue({}),
          count: vi.fn().mockResolvedValue(1),
        },
        currentAccount: {
          update: vi.fn().mockResolvedValue(mockCurrentAccount),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback(mockTx);
      });

      const formData = new FormData();
      formData.append('paymentId', 'payment-123');

      // Act
      await undoPayment(mockPrevState, formData);

      // Assert - Check H entry generates default notes
      expect(mockTx.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          notes: 'Asiento H por anulación de pago payment-123',
        }),
      });
    });

    it('should handle zero interest rate correctly in recalculation', async () => {
      // Arrange
      const zeroInterestAccount = {
        ...mockCurrentAccount,
        interestRate: 0,
      };

      const paymentWithZeroInterest = {
        ...mockPaymentToAnnul,
        currentAccount: zeroInterestAccount,
      };

      mockGetOrganization.mockResolvedValue(mockSessionData);
      
      const mockTx = {
        payment: {
          findUnique: vi.fn().mockResolvedValue(paymentWithZeroInterest),
          update: vi.fn().mockResolvedValue(paymentWithZeroInterest),
          create: vi.fn().mockResolvedValue({}),
          count: vi.fn().mockResolvedValue(1),
        },
        currentAccount: {
          update: vi.fn().mockResolvedValue(zeroInterestAccount),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback(mockTx);
      });

      const formData = new FormData();
      formData.append('paymentId', 'payment-123');

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result.success).toBe(true);
      expect(mockTx.currentAccount.update).toHaveBeenCalled();
    });
  });

  describe('❌ Error Handling', () => {
    describe('🔍 Validation Errors', () => {
      it('should return error when paymentId is missing', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        const formData = new FormData();
        // Not adding paymentId

        // Act
        const result = await undoPayment(mockPrevState, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid data for undo operation');
        expect(result.errors?.paymentId).toBeDefined();
      });

      it('should return error when paymentId is empty string', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        const formData = new FormData();
        formData.append('paymentId', '');

        // Act
        const result = await undoPayment(mockPrevState, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid data for undo operation');
        expect(result.errors?.paymentId).toBeDefined();
      });
    });

    describe('🔍 Authentication Errors', () => {
      it('should return error when organization is not found', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({
          organizationId: null,
          error: 'Organization not found',
        });

        const formData = new FormData();
        formData.append('paymentId', 'payment-123');

        // Act
        const result = await undoPayment(mockPrevState, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('Organization not found or user not authenticated');
      });

      it('should return error when user is not authenticated', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(null);

        const formData = new FormData();
        formData.append('paymentId', 'payment-123');

        // Act
        const result = await undoPayment(mockPrevState, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('Organization not found or user not authenticated');
      });
    });

    describe('🔍 Business Logic Errors', () => {
      it('should return error when payment is not found', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        
        const mockTx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue(null),
          },
        };

        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          return await callback(mockTx);
        });

        const formData = new FormData();
        formData.append('paymentId', 'nonexistent-payment');

        // Act
        const result = await undoPayment(mockPrevState, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('Payment with ID nonexistent-payment not found');
      });

      it('should return error when current account data is missing', async () => {
        // Arrange
        const paymentWithoutAccount = {
          ...mockPaymentToAnnul,
          currentAccount: null,
        };

        mockGetOrganization.mockResolvedValue(mockSessionData);
        
        const mockTx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue(paymentWithoutAccount),
          },
        };

        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          return await callback(mockTx);
        });

        const formData = new FormData();
        formData.append('paymentId', 'payment-123');

        // Act
        const result = await undoPayment(mockPrevState, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('Current account data not found for payment payment-123');
      });

      it('should return error when payment is already part of annulment process (D version)', async () => {
        // Arrange
        const alreadyAnnulledPayment = {
          ...mockPaymentToAnnul,
          installmentVersion: 'D',
        };

        mockGetOrganization.mockResolvedValue(mockSessionData);
        
        const mockTx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue(alreadyAnnulledPayment),
          },
        };

        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          return await callback(mockTx);
        });

        const formData = new FormData();
        formData.append('paymentId', 'payment-123');

        // Act
        const result = await undoPayment(mockPrevState, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('appears to be part of an annulment process already');
      });

      it('should return error when payment is already part of annulment process (H version)', async () => {
        // Arrange
        const haberPayment = {
          ...mockPaymentToAnnul,
          installmentVersion: 'H',
        };

        mockGetOrganization.mockResolvedValue(mockSessionData);
        
        const mockTx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue(haberPayment),
          },
        };

        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          return await callback(mockTx);
        });

        const formData = new FormData();
        formData.append('paymentId', 'payment-123');

        // Act
        const result = await undoPayment(mockPrevState, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('appears to be part of an annulment process already');
      });

      it('should return error when currentAccountId is missing on payment', async () => {
        // Arrange
        const paymentWithoutAccountId = {
          ...mockPaymentToAnnul,
          currentAccountId: null,
        };

        mockGetOrganization.mockResolvedValue(mockSessionData);
        
        const mockTx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue(paymentWithoutAccountId),
          },
        };

        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          return await callback(mockTx);
        });

        const formData = new FormData();
        formData.append('paymentId', 'payment-123');

        // Act
        const result = await undoPayment(mockPrevState, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('currentAccountId is missing on payment payment-123');
      });
    });

    describe('🔍 Database Errors', () => {
      it('should handle Prisma known request errors', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        
        const prismaError = new Prisma.PrismaClientKnownRequestError(
          'Foreign key constraint failed',
          { code: 'P2003', clientVersion: '4.0.0' }
        );

        mockPrisma.$transaction.mockRejectedValue(prismaError);

        const formData = new FormData();
        formData.append('paymentId', 'payment-123');

        // Act
        const result = await undoPayment(mockPrevState, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('Error de base de datos al anular el pago (D/H)');
        expect(result.message).toContain('P2003');
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error undoing payment with D/H logic:',
          prismaError
        );
      });

      it('should handle general errors', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        
        const generalError = new Error('Database connection failed');
        mockPrisma.$transaction.mockRejectedValue(generalError);

        const formData = new FormData();
        formData.append('paymentId', 'payment-123');

        // Act
        const result = await undoPayment(mockPrevState, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Database connection failed');
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error undoing payment with D/H logic:',
          generalError
        );
      });

      it('should handle unknown exceptions', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        
        const unknownError = 'Unknown error string';
        mockPrisma.$transaction.mockRejectedValue(unknownError);

        const formData = new FormData();
        formData.append('paymentId', 'payment-123');

        // Act
        const result = await undoPayment(mockPrevState, formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('Ocurrió un error inesperado al procesar la anulación');
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error undoing payment with D/H logic:',
          unknownError
        );
      });
    });
  });

  describe('🎯 Edge Cases and Complex Scenarios', () => {
    it('should handle payment with transaction reference', async () => {
      // Arrange
      const paymentWithReference = {
        ...mockPaymentToAnnul,
        transactionReference: 'TXN-REF-12345',
      };

      mockGetOrganization.mockResolvedValue(mockSessionData);
      
      const mockTx = {
        payment: {
          findUnique: vi.fn().mockResolvedValue(paymentWithReference),
          update: vi.fn().mockResolvedValue(paymentWithReference),
          create: vi.fn().mockResolvedValue({}),
          count: vi.fn().mockResolvedValue(1),
        },
        currentAccount: {
          update: vi.fn().mockResolvedValue(mockCurrentAccount),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback(mockTx);
      });

      const formData = new FormData();
      formData.append('paymentId', 'payment-123');

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result.success).toBe(true);
      expect(mockTx.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          transactionReference: 'TXN-REF-12345',
        }),
      });
    });

    it('should handle payment with different payment methods', async () => {
      // Arrange
      const paymentMethods = ['CASH', 'TRANSFER', 'CHECK', 'CARD'];
      
      for (const method of paymentMethods) {
        const paymentWithMethod = {
          ...mockPaymentToAnnul,
          paymentMethod: method,
        };

        mockGetOrganization.mockResolvedValue(mockSessionData);
        
        const mockTx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue(paymentWithMethod),
            update: vi.fn().mockResolvedValue(paymentWithMethod),
            create: vi.fn().mockResolvedValue({}),
            count: vi.fn().mockResolvedValue(1),
          },
          currentAccount: {
            update: vi.fn().mockResolvedValue(mockCurrentAccount),
          },
        };

        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          return await callback(mockTx);
        });

        const formData = new FormData();
        formData.append('paymentId', 'payment-123');

        // Act
        const result = await undoPayment(mockPrevState, formData);

        // Assert
        expect(result.success).toBe(true);
        expect(mockTx.payment.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            paymentMethod: method,
          }),
        });

        vi.clearAllMocks();
      }
    });

    it('should handle last installment correctly', async () => {
      // Arrange
      const lastInstallmentPayment = {
        ...mockPaymentToAnnul,
        installmentNumber: 12, // Last installment
      };

      const accountNearEnd = {
        ...mockCurrentAccount,
        remainingAmount: 1000.0, // Only this payment left
      };

      const paymentWithLastInstallment = {
        ...lastInstallmentPayment,
        currentAccount: accountNearEnd,
      };

      mockGetOrganization.mockResolvedValue(mockSessionData);
      
      const mockTx = {
        payment: {
          findUnique: vi.fn().mockResolvedValue(paymentWithLastInstallment),
          update: vi.fn().mockResolvedValue(paymentWithLastInstallment),
          create: vi.fn().mockResolvedValue({}),
          count: vi.fn().mockResolvedValue(0), // No valid payments remaining
        },
        currentAccount: {
          update: vi.fn().mockResolvedValue(accountNearEnd),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback(mockTx);
      });

      const formData = new FormData();
      formData.append('paymentId', 'payment-123');

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result.success).toBe(true);
      expect(mockTx.currentAccount.update).toHaveBeenCalled();
    });

    it('should handle very large payment amounts', async () => {
      // Arrange
      const largePayment = {
        ...mockPaymentToAnnul,
        amountPaid: 50000.0,
      };

      mockGetOrganization.mockResolvedValue(mockSessionData);
      
      const mockTx = {
        payment: {
          findUnique: vi.fn().mockResolvedValue(largePayment),
          update: vi.fn().mockResolvedValue(largePayment),
          create: vi.fn().mockResolvedValue({}),
          count: vi.fn().mockResolvedValue(1),
        },
        currentAccount: {
          update: vi.fn().mockResolvedValue(mockCurrentAccount),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback(mockTx);
      });

      const formData = new FormData();
      formData.append('paymentId', 'payment-123');

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result.success).toBe(true);
      expect(mockTx.currentAccount.update).toHaveBeenCalledWith({
        where: { id: mockCurrentAccount.id },
        data: expect.objectContaining({
          remainingAmount: 60000.0, // Original 10000 + large payment 50000
        }),
      });
    });

    it('should handle different payment frequencies in recalculation', async () => {
      // Arrange
      const frequencies = ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'];
      
      for (const frequency of frequencies) {
        const accountWithFrequency = {
          ...mockCurrentAccount,
          paymentFrequency: frequency as any,
        };

        const paymentWithFrequency = {
          ...mockPaymentToAnnul,
          currentAccount: accountWithFrequency,
        };

        mockGetOrganization.mockResolvedValue(mockSessionData);
        
        const mockTx = {
          payment: {
            findUnique: vi.fn().mockResolvedValue(paymentWithFrequency),
            update: vi.fn().mockResolvedValue(paymentWithFrequency),
            create: vi.fn().mockResolvedValue({}),
            count: vi.fn().mockResolvedValue(1),
          },
          currentAccount: {
            update: vi.fn().mockResolvedValue(accountWithFrequency),
          },
        };

        mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
          return await callback(mockTx);
        });

        const formData = new FormData();
        formData.append('paymentId', 'payment-123');

        // Act
        const result = await undoPayment(mockPrevState, formData);

        // Assert
        expect(result.success).toBe(true);
        expect(mockTx.currentAccount.update).toHaveBeenCalled();

        vi.clearAllMocks();
      }
    });

    it('should log operation details correctly', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue(mockSessionData);
      
      const mockTx = {
        payment: {
          findUnique: vi.fn().mockResolvedValue(mockPaymentToAnnul),
          update: vi.fn().mockResolvedValue({
            ...mockPaymentToAnnul,
            id: 'payment-D-123',
          }),
          create: vi.fn().mockResolvedValue({
            ...mockPaymentToAnnul,
            id: 'payment-H-456',
          }),
          count: vi.fn().mockResolvedValue(1),
        },
        currentAccount: {
          update: vi.fn().mockResolvedValue(mockCurrentAccount),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback(mockTx);
      });

      const formData = new FormData();
      formData.append('paymentId', 'payment-123');

      // Act
      await undoPayment(mockPrevState, formData);

      // Assert
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Payment payment-123 processed for D/H annulment')
      );
    });
  });

  describe('📊 Financial Calculations', () => {
    it('should correctly calculate remaining installments when some payments exist', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue(mockSessionData);
      
      const mockTx = {
        payment: {
          findUnique: vi.fn().mockResolvedValue(mockPaymentToAnnul),
          update: vi.fn().mockResolvedValue(mockPaymentToAnnul),
          create: vi.fn().mockResolvedValue({}),
          count: vi.fn().mockResolvedValue(5), // 5 valid payments remaining
        },
        currentAccount: {
          update: vi.fn().mockResolvedValue(mockCurrentAccount),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback(mockTx);
      });

      const formData = new FormData();
      formData.append('paymentId', 'payment-123');

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result.success).toBe(true);
      expect(mockTx.payment.count).toHaveBeenCalledWith({
        where: {
          currentAccountId: mockCurrentAccount.id,
          installmentVersion: null, // Only normal payments
        },
      });
      // Should recalculate for remaining installments: 12 - 5 = 7
      expect(mockTx.currentAccount.update).toHaveBeenCalledWith({
        where: { id: mockCurrentAccount.id },
        data: expect.objectContaining({
          installmentAmount: expect.any(Number),
        }),
      });
    });

    it('should handle case when no remaining installments', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue(mockSessionData);
      
      const mockTx = {
        payment: {
          findUnique: vi.fn().mockResolvedValue(mockPaymentToAnnul),
          update: vi.fn().mockResolvedValue(mockPaymentToAnnul),
          create: vi.fn().mockResolvedValue({}),
          count: vi.fn().mockResolvedValue(12), // All installments paid (including the one being undone)
        },
        currentAccount: {
          update: vi.fn().mockResolvedValue(mockCurrentAccount),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback(mockTx);
      });

      const formData = new FormData();
      formData.append('paymentId', 'payment-123');

      // Act
      const result = await undoPayment(mockPrevState, formData);

      // Assert
      expect(result.success).toBe(true);
      // Should not try to update installmentAmount when no remaining installments
      expect(mockTx.currentAccount.update).toHaveBeenCalledWith({
        where: { id: mockCurrentAccount.id },
        data: expect.objectContaining({
          remainingAmount: expect.any(Number),
          updatedAt: expect.any(Date),
          // Should not include installmentAmount when remaining installments is 0
        }),
      });
    });
  });
}); 