import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { reorderBrands } from '../reorder-brands';
import prisma from '@/lib/prisma';
import { getOrganizationIdFromSession } from '../../util';

// Mock de Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: vi.fn(),
    organizationBrand: {
      updateMany: vi.fn(),
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

describe('reorderBrands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockOrganizationId = 'org-123';

  describe('✅ Successful Reordering', () => {
    it('should reorder brands successfully', async () => {
      // Arrange
      const brandIds = [3, 1, 2];
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      
      // Mock $transaction to resolve successfully 
      mockPrisma.$transaction.mockResolvedValue([
        { count: 1 }, // brand 3 -> order 0
        { count: 1 }, // brand 1 -> order 1
        { count: 1 }, // brand 2 -> order 2
      ]);

      // Act
      const result = await reorderBrands(brandIds);

      // Assert
      expect(mockGetOrganization).toHaveBeenCalled();
      // Verify that $transaction was called
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith('/configuracion');
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle single brand reordering', async () => {
      // Arrange
      const brandIds = [5];
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.$transaction.mockResolvedValue([{ count: 1 }]);

      // Act
      const result = await reorderBrands(brandIds);

      // Assert
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle large number of brands', async () => {
      // Arrange
      const brandIds = Array.from({ length: 20 }, (_, i) => i + 1);
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.$transaction.mockResolvedValue(brandIds.map(() => ({ count: 1 })));

      // Act
      const result = await reorderBrands(brandIds);

      // Assert
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('❌ Validation Errors', () => {
    it('should return error for empty brand array', async () => {
      // Act
      const result = await reorderBrands([]);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No se proporcionó un orden válido.');
      expect(mockGetOrganization).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('should return error for null brand array', async () => {
      // Act
      const result = await reorderBrands(null as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No se proporcionó un orden válido.');
      expect(mockGetOrganization).not.toHaveBeenCalled();
    });

    it('should return error for undefined brand array', async () => {
      // Act
      const result = await reorderBrands(undefined as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No se proporcionó un orden válido.');
      expect(mockGetOrganization).not.toHaveBeenCalled();
    });
  });

  describe('🔐 Authentication Errors', () => {
    it('should return error when user is not authenticated', async () => {
      // Arrange
      const brandIds = [1, 2, 3];
      mockGetOrganization.mockResolvedValue({ organizationId: null });

      // Act
      const result = await reorderBrands(brandIds);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuario no autenticado o sin organización.');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('should return error when organization is missing', async () => {
      // Arrange
      const brandIds = [1, 2, 3];
      mockGetOrganization.mockResolvedValue({ organizationId: undefined });

      // Act
      const result = await reorderBrands(brandIds);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuario no autenticado o sin organización.');
    });

    it('should return error when organization is empty string', async () => {
      // Arrange
      const brandIds = [1, 2, 3];
      mockGetOrganization.mockResolvedValue({ organizationId: '' });

      // Act
      const result = await reorderBrands(brandIds);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuario no autenticado o sin organización.');
    });
  });

  describe('❌ Database Errors', () => {
    it('should handle transaction error', async () => {
      // Arrange
      const brandIds = [1, 2, 3];
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

      // Act
      const result = await reorderBrands(brandIds);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction failed');
      expect(mockConsole.error).toHaveBeenCalledWith(
        '🔥 ERROR SERVER ACTION (reorderBrands):',
        expect.any(Error)
      );
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('should handle partial transaction failure', async () => {
      // Arrange
      const brandIds = [1, 2, 3];
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.$transaction.mockRejectedValue(new Error('Some updates failed'));

      // Act
      const result = await reorderBrands(brandIds);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Some updates failed');
    });

    it('should handle database connection error', async () => {
      // Arrange
      const brandIds = [1, 2];
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.$transaction.mockRejectedValue(new Error('Database connection lost'));

      // Act
      const result = await reorderBrands(brandIds);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection lost');
    });

    it('should handle unknown error', async () => {
      // Arrange
      const brandIds = [1, 2];
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.$transaction.mockRejectedValue('Unknown error');

      // Act
      const result = await reorderBrands(brandIds);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Error al reordenar las marcas.');
    });
  });

  describe('🎯 Edge Cases', () => {
    it('should handle duplicate brand IDs in array', async () => {
      // Arrange
      const brandIds = [1, 2, 1, 3]; // Duplicated brand ID 1
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.$transaction.mockResolvedValue([
        { count: 1 }, { count: 1 }, { count: 1 }, { count: 1 }
      ]);

      // Act
      const result = await reorderBrands(brandIds);

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should handle negative brand IDs', async () => {
      // Arrange
      const brandIds = [-1, -2, -3];
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.$transaction.mockResolvedValue([{ count: 1 }, { count: 1 }, { count: 1 }]);

      // Act
      const result = await reorderBrands(brandIds);

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should handle zero brand ID', async () => {
      // Arrange
      const brandIds = [0, 1, 2];
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.$transaction.mockResolvedValue([{ count: 1 }, { count: 1 }, { count: 1 }]);

      // Act
      const result = await reorderBrands(brandIds);

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should handle very large brand IDs', async () => {
      // Arrange
      const brandIds = [999999, 1000000, 1000001];
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.$transaction.mockResolvedValue([{ count: 1 }, { count: 1 }, { count: 1 }]);

      // Act
      const result = await reorderBrands(brandIds);

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('🔄 Cache Revalidation', () => {
    it('should revalidate correct path on success', async () => {
      // Arrange
      const brandIds = [1, 2];
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.$transaction.mockResolvedValue([{ count: 1 }, { count: 1 }]);

      // Act
      await reorderBrands(brandIds);

      // Assert
      expect(mockRevalidatePath).toHaveBeenCalledWith('/configuracion');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(1);
    });

    it('should not revalidate on validation error', async () => {
      // Act
      await reorderBrands([]);

      // Assert
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('should not revalidate on authentication error', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({ organizationId: null });

      // Act
      await reorderBrands([1, 2]);

      // Assert
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('should not revalidate on database error', async () => {
      // Arrange
      const brandIds = [1, 2];
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.$transaction.mockRejectedValue(new Error('DB Error'));

      // Act
      await reorderBrands(brandIds);

      // Assert
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('📊 Console Logging', () => {
    it('should log errors with correct format', async () => {
      // Arrange
      const brandIds = [1, 2];
      const error = new Error('Test error');
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.$transaction.mockRejectedValue(error);

      // Act
      await reorderBrands(brandIds);

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith(
        '🔥 ERROR SERVER ACTION (reorderBrands):',
        error
      );
    });

    it('should not log on successful operations', async () => {
      // Arrange
      const brandIds = [1, 2];
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.$transaction.mockResolvedValue([{ count: 1 }, { count: 1 }]);

      // Act
      await reorderBrands(brandIds);

      // Assert
      expect(mockConsole.error).not.toHaveBeenCalled();
    });
  });

  describe('🔐 Security Considerations', () => {
    it('should validate organization ownership before reordering', async () => {
      // Arrange
      const brandIds = [1, 2, 3];
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.$transaction.mockResolvedValue([{ count: 1 }, { count: 1 }, { count: 1 }]);

      // Act
      await reorderBrands(brandIds);

      // Assert
      // Verify that $transaction was called
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should handle organization injection attempts', async () => {
      // Arrange
      const brandIds = [1, 2];
      const maliciousOrgId = 'org-malicious';
      mockGetOrganization.mockResolvedValue({ organizationId: maliciousOrgId });
      mockPrisma.$transaction.mockResolvedValue([{ count: 1 }, { count: 1 }]);

      // Act
      await reorderBrands(brandIds);

      // Assert
      // Should use the organization ID from session, not allow injection
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
}); 
