import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { updateCurrentAccount } from '../update-current-account';
import prisma from '@/lib/prisma';
import type { UpdateCurrentAccountInput } from '@/zod/current-account-schemas';

// Mock de Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    currentAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock de console para tests silenciosos
const mockConsole = {
  error: vi.fn(),
  log: vi.fn(),
};

const mockRevalidatePath = revalidatePath as any;
const mockPrisma = prisma as any;

describe('updateCurrentAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockAccountId = 'ckpqr7s8u0000gzcp3h8z9w8t'; // Valid CUID format
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
  };

  describe('✅ Successful Updates', () => {
    it('should update payment frequency successfully', async () => {
      // Arrange
      const updateInput: UpdateCurrentAccountInput = {
        id: mockAccountId,
        paymentFrequency: 'WEEKLY',
      };

      mockPrisma.currentAccount.findUnique.mockResolvedValue(mockCurrentAccount);
      mockPrisma.currentAccount.update.mockResolvedValue({
        ...mockCurrentAccount,
        paymentFrequency: 'WEEKLY',
      });

      // Act
      const result = await updateCurrentAccount(updateInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Cuenta corriente actualizada exitosamente.');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/current-accounts');
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/current-accounts/${mockAccountId}`);
    });

    it('should update notes successfully', async () => {
      // Arrange
      const updateInput: UpdateCurrentAccountInput = {
        id: mockAccountId,
        notes: 'Notas actualizadas',
      };

      mockPrisma.currentAccount.findUnique.mockResolvedValue(mockCurrentAccount);
      mockPrisma.currentAccount.update.mockResolvedValue({
        ...mockCurrentAccount,
        notes: 'Notas actualizadas',
      });

      // Act
      const result = await updateCurrentAccount(updateInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Cuenta corriente actualizada exitosamente.');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
    });

    it('should update reminder lead time days successfully', async () => {
      // Arrange
      const updateInput: UpdateCurrentAccountInput = {
        id: mockAccountId,
        reminderLeadTimeDays: 14,
      };

      mockPrisma.currentAccount.findUnique.mockResolvedValue(mockCurrentAccount);
      mockPrisma.currentAccount.update.mockResolvedValue({
        ...mockCurrentAccount,
        reminderLeadTimeDays: 14,
      });

      // Act
      const result = await updateCurrentAccount(updateInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Cuenta corriente actualizada exitosamente.');
    });
  });

  describe('❌ Error Handling', () => {
    it('should return error for invalid account ID', async () => {
      // Arrange
      const updateInput = {
        id: 'invalid-id',
        notes: 'Test notes',
      } as any; // Bypass TypeScript check for invalid data

      // Act
      const result = await updateCurrentAccount(updateInput);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error de validación');
      expect(result.data).toBeNull();
    });

    it('should return error when account does not exist', async () => {
      // Arrange
      const updateInput: UpdateCurrentAccountInput = {
        id: 'ckpqr7s8u0001gzcp3h8z9w8t', // Valid CUID that doesn't exist
        notes: 'Test notes',
      };

      mockPrisma.currentAccount.findUnique.mockResolvedValue(null);

      // Act
      const result = await updateCurrentAccount(updateInput);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cuenta corriente no encontrada.');
    });

    it('should handle database errors during update', async () => {
      // Arrange
      const updateInput: UpdateCurrentAccountInput = {
        id: mockAccountId,
        notes: 'Test notes',
      };

      mockPrisma.currentAccount.findUnique.mockResolvedValue(mockCurrentAccount);
      const dbError = new Error('Database connection failed');
      mockPrisma.currentAccount.update.mockRejectedValue(dbError);

      // Act
      const result = await updateCurrentAccount(updateInput);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error updating current account:',
        dbError
      );
    });
  });

  describe('🔄 Cache Revalidation', () => {
    it('should revalidate both paths on successful update', async () => {
      // Arrange
      const updateInput: UpdateCurrentAccountInput = {
        id: mockAccountId,
        notes: 'Test notes',
      };

      mockPrisma.currentAccount.findUnique.mockResolvedValue(mockCurrentAccount);
      mockPrisma.currentAccount.update.mockResolvedValue(mockCurrentAccount);

      // Act
      await updateCurrentAccount(updateInput);

      // Assert
      expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/current-accounts');
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/current-accounts/${mockAccountId}`);
    });

    it('should not revalidate on validation error', async () => {
      // Arrange
      const updateInput = {
        id: 'invalid-id',
        notes: 'Test notes',
      } as any;

      // Act
      await updateCurrentAccount(updateInput);

      // Assert
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('🎯 Edge Cases', () => {
    it('should handle null values for optional fields', async () => {
      // Arrange
      const updateInput: UpdateCurrentAccountInput = {
        id: mockAccountId,
        notes: null,
        reminderLeadTimeDays: null,
      };

      mockPrisma.currentAccount.findUnique.mockResolvedValue(mockCurrentAccount);
      mockPrisma.currentAccount.update.mockResolvedValue({
        ...mockCurrentAccount,
        notes: null,
        reminderLeadTimeDays: null,
      });

      // Act
      const result = await updateCurrentAccount(updateInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Cuenta corriente actualizada exitosamente.');
    });

    it('should handle all valid payment frequencies', async () => {
      // Arrange
      const frequencies = ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'];
      
      for (const frequency of frequencies) {
        const updateInput: UpdateCurrentAccountInput = {
          id: mockAccountId,
          paymentFrequency: frequency as any,
        };

        mockPrisma.currentAccount.findUnique.mockResolvedValue(mockCurrentAccount);
        mockPrisma.currentAccount.update.mockResolvedValue({
          ...mockCurrentAccount,
          paymentFrequency: frequency,
        });

        // Act
        const result = await updateCurrentAccount(updateInput);

        // Assert
        expect(result.success).toBe(true);
        
        vi.clearAllMocks();
      }
    });

    it('should handle special characters in notes', async () => {
      // Arrange
      const specialNotes = 'Notas con acentos: ñáéíóú y símbolos: @#$%^&*()';
      const updateInput: UpdateCurrentAccountInput = {
        id: mockAccountId,
        notes: specialNotes,
      };

      mockPrisma.currentAccount.findUnique.mockResolvedValue(mockCurrentAccount);
      mockPrisma.currentAccount.update.mockResolvedValue({
        ...mockCurrentAccount,
        notes: specialNotes,
      });

      // Act
      const result = await updateCurrentAccount(updateInput);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('📊 Data Processing', () => {
    it('should exclude id from update data', async () => {
      // Arrange
      const updateInput: UpdateCurrentAccountInput = {
        id: mockAccountId,
        notes: 'Test notes',
      };

      mockPrisma.currentAccount.findUnique.mockResolvedValue(mockCurrentAccount);
      mockPrisma.currentAccount.update.mockResolvedValue(mockCurrentAccount);

      // Act
      await updateCurrentAccount(updateInput);

      // Assert
      expect(mockPrisma.currentAccount.update).toHaveBeenCalledWith({
        where: { id: mockAccountId },
        data: {
          notes: 'Test notes',
        },
      });
    });

    it('should handle start date conversion', async () => {
      // Arrange
      const dateString = '2024-06-15T10:30:00.000Z';
      const updateInput: UpdateCurrentAccountInput = {
        id: mockAccountId,
        startDate: dateString,
      };

      mockPrisma.currentAccount.findUnique.mockResolvedValue(mockCurrentAccount);
      mockPrisma.currentAccount.update.mockResolvedValue(mockCurrentAccount);

      // Act
      await updateCurrentAccount(updateInput);

      // Assert
      expect(mockPrisma.currentAccount.update).toHaveBeenCalledWith({
        where: { id: mockAccountId },
        data: {
          startDate: new Date(dateString),
        },
      });
    });
  });
}); 
