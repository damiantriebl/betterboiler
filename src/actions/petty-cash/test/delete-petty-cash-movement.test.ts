import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { deletePettyCashMovement } from '../delete-petty-cash-movement';
import prisma from '@/lib/prisma';
import { getOrganizationIdFromSession } from '../../util';

// Mock de Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    organization: {
      findUnique: vi.fn(),
    },
    pettyCashSpend: {
      findUnique: vi.fn(),
      delete: vi.fn(),
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

describe('Delete Petty Cash Movement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockOrganizationId = 'org-123';
  const mockUserRole = 'admin';
  const mockUserEmail = 'admin@test.com';

  const mockMovement = {
    id: 'movement-1',
    withdrawalId: 'withdrawal-1',
    organizationId: mockOrganizationId,
    description: 'Gasto de oficina',
    amount: 500.0,
    date: new Date('2024-01-15'),
    reference: 'REF-001',
    receiptUrl: 'https://s3.bucket.com/receipt.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrganizationSettings = {
    secureModeEnabled: false,
    otpSecret: null,
    otpVerified: false,
  };

  describe('✅ Casos Exitosos', () => {
    it('debería eliminar un movimiento de caja chica correctamente', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(mockMovement);
      mockPrisma.pettyCashSpend.delete.mockResolvedValue(mockMovement);

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(mockPrisma.pettyCashSpend.delete).toHaveBeenCalledWith({
        where: { id: 'movement-1' },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/petty-cash', 'page');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Gasto eliminado correctamente.');
    });

    it('debería manejar movimiento sin recibo', async () => {
      // Arrange
      const movementWithoutReceipt = { ...mockMovement, receiptUrl: null };
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(movementWithoutReceipt);
      mockPrisma.pettyCashSpend.delete.mockResolvedValue(movementWithoutReceipt);

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Gasto eliminado correctamente.');
    });

    it('debería verificar que el movimiento pertenece a la organización', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(mockMovement);
      mockPrisma.pettyCashSpend.delete.mockResolvedValue(mockMovement);

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(mockPrisma.pettyCashSpend.findUnique).toHaveBeenCalledWith({
        where: { id: 'movement-1', organizationId: mockOrganizationId },
      });
      expect(result.success).toBe(true);
    });

    it('debería manejar diferentes roles permitidos', async () => {
      // Arrange
      const roles = ['admin', 'root', 'cash-manager'];
      
      for (const role of roles) {
        mockGetOrganization.mockResolvedValue({
          organizationId: mockOrganizationId,
          userRole: role,
          userEmail: mockUserEmail,
        });
        mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
        mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(mockMovement);
        mockPrisma.pettyCashSpend.delete.mockResolvedValue(mockMovement);

        // Act
        const result = await deletePettyCashMovement({ movementId: 'movement-1' });

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('Gasto eliminado correctamente.');
      }
    });

    it('debería manejar movimiento con diferentes tipos de referencia', async () => {
      // Arrange
      const movementWithReference = { ...mockMovement, reference: 'REF-2024-001' };

      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(movementWithReference);
      mockPrisma.pettyCashSpend.delete.mockResolvedValue(movementWithReference);

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrisma.pettyCashSpend.delete).toHaveBeenCalledWith({
        where: { id: 'movement-1' },
      });
    });
  });

  describe('❌ Manejo de Errores de Validación', () => {
    it('debería fallar cuando falta movementId', async () => {
      // Act
      const result = await deletePettyCashMovement({ movementId: '' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('ID de movimiento no proporcionado.');
      expect(mockPrisma.pettyCashSpend.delete).not.toHaveBeenCalled();
    });

    it('debería fallar con movementId undefined', async () => {
      // Act
      const result = await deletePettyCashMovement({ movementId: undefined as any });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('ID de movimiento no proporcionado.');
    });

    it('debería fallar con movementId null', async () => {
      // Act
      const result = await deletePettyCashMovement({ movementId: null as any });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('ID de movimiento no proporcionado.');
    });
  });

  describe('❌ Manejo de Errores de Sesión', () => {
    it('debería fallar cuando no hay organizationId en sesión', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({ error: 'Session not found' });

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('debería fallar cuando falta información esencial de sesión', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: null,
        userEmail: null,
      });

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('No se pudo obtener la información de la sesión');
    });

    it('debería fallar con rol no permitido', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: 'viewer',
        userEmail: mockUserEmail,
      });

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Acceso denegado. No tienes permiso para realizar esta acción.');
    });

    it('debería fallar con rol employee', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: 'employee',
        userEmail: mockUserEmail,
      });

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Acceso denegado. No tienes permiso para realizar esta acción.');
    });
  });

  describe('❌ Manejo de Errores de Organización', () => {
    it('debería fallar cuando no se encuentra la configuración de organización', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Configuración de la organización no encontrada.');
    });
  });

  describe('❌ Manejo de Errores de Movimiento', () => {
    it('debería fallar cuando el movimiento no existe', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(null);

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-inexistente' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Gasto no encontrado o no pertenece a tu organización.');
    });

    it('debería fallar cuando el movimiento pertenece a otra organización', async () => {
      // Arrange
      const movementFromOtherOrg = { ...mockMovement, organizationId: 'other-org' };

      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(null); // No se encuentra porque filtra por organizationId

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Gasto no encontrado o no pertenece a tu organización.');
    });
  });

  describe('🔒 Modo Seguro con OTP', () => {
    const secureOrganizationSettings = {
      secureModeEnabled: true,
      otpSecret: 'JBSWY3DPEHPK3PXP',
      otpVerified: true,
    };

    it('debería fallar cuando modo seguro está activado pero falta token OTP', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(secureOrganizationSettings);

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Modo seguro activado. Se requiere un token OTP para esta acción.');
    });

    it('debería fallar cuando modo seguro está activado pero OTP no está configurado', async () => {
      // Arrange
      const invalidSecureSettings = {
        secureModeEnabled: true,
        otpSecret: null,
        otpVerified: false,
      };

      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(invalidSecureSettings);

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1', otpToken: '123456' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('El modo seguro está activado, pero la configuración OTP no está completa');
    });

    it('debería fallar con token OTP de formato inválido', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(secureOrganizationSettings);

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1', otpToken: 'abc123' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('El token OTP debe ser de');
    });

    it('debería fallar con token OTP muy corto', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(secureOrganizationSettings);

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1', otpToken: '123' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('El token OTP debe ser de');
    });
  });

  describe('❌ Manejo de Errores de Base de Datos', () => {
    it('debería manejar errores de base de datos conocidos', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(mockMovement);

      const dbError = new Error('Database connection failed');
      mockPrisma.pettyCashSpend.delete.mockRejectedValue(dbError);

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error al eliminar el gasto: Database connection failed');
      expect(mockConsole.error).toHaveBeenCalledWith(
        '💥 CRITICAL ERROR in deletePettyCashMovement:',
        dbError
      );
    });

    it('debería manejar errores desconocidos', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(mockMovement);

      mockPrisma.pettyCashSpend.delete.mockRejectedValue('Unknown error');

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error al eliminar el gasto: Ocurrió un error desconocido');
    });

    it('debería manejar error al obtener configuración de organización', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });

      const dbError = new Error('Failed to fetch organization');
      mockPrisma.organization.findUnique.mockRejectedValue(dbError);

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error al eliminar el gasto: Failed to fetch organization');
    });

    it('debería manejar error de constraint violation', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(mockMovement);

      const constraintError = new Error('Foreign key constraint failed');
      mockPrisma.pettyCashSpend.delete.mockRejectedValue(constraintError);

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error al eliminar el gasto: Foreign key constraint failed');
    });
  });

  describe('🔄 Cache Revalidation', () => {
    it('debería revalidar cuando la eliminación es exitosa', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(mockMovement);
      mockPrisma.pettyCashSpend.delete.mockResolvedValue(mockMovement);

      // Act
      await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/petty-cash', 'page');
    });

    it('no debería revalidar cuando hay errores de validación', async () => {
      // Act
      await deletePettyCashMovement({ movementId: '' });

      // Assert
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('no debería revalidar cuando hay errores de base de datos', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(mockMovement);
      mockPrisma.pettyCashSpend.delete.mockRejectedValue(new Error('DB Error'));

      // Act
      await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('🎯 Edge Cases', () => {
    it('debería manejar IDs con caracteres especiales', async () => {
      // Arrange
      const specialId = 'movement-特殊-123';
      const specialMovement = { ...mockMovement, id: specialId };

      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(specialMovement);
      mockPrisma.pettyCashSpend.delete.mockResolvedValue(specialMovement);

      // Act
      const result = await deletePettyCashMovement({ movementId: specialId });

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrisma.pettyCashSpend.findUnique).toHaveBeenCalledWith({
        where: { id: specialId, organizationId: mockOrganizationId },
      });
    });

    it('debería manejar IDs muy largos', async () => {
      // Arrange
      const longId = 'movement-' + 'a'.repeat(100);
      const longIdMovement = { ...mockMovement, id: longId };

      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(longIdMovement);
      mockPrisma.pettyCashSpend.delete.mockResolvedValue(longIdMovement);

      // Act
      const result = await deletePettyCashMovement({ movementId: longId });

      // Assert
      expect(result.success).toBe(true);
    });

    it('debería manejar organizationId con formato no estándar', async () => {
      // Arrange
      const specialOrgId = 'org_123-abc.xyz';
      
      mockGetOrganization.mockResolvedValue({
        organizationId: specialOrgId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue({ ...mockMovement, organizationId: specialOrgId });
      mockPrisma.pettyCashSpend.delete.mockResolvedValue(mockMovement);

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrisma.pettyCashSpend.findUnique).toHaveBeenCalledWith({
        where: { id: 'movement-1', organizationId: specialOrgId },
      });
    });

    it('debería manejar movimiento con timestamp muy antiguo', async () => {
      // Arrange
      const oldMovement = {
        ...mockMovement,
        date: new Date('1900-01-01'),
        createdAt: new Date('1900-01-01'),
        updatedAt: new Date('1900-01-01'),
      };

      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(oldMovement);
      mockPrisma.pettyCashSpend.delete.mockResolvedValue(oldMovement);

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(result.success).toBe(true);
    });

    it('debería manejar movimiento con URL de recibo muy larga', async () => {
      // Arrange
      const longUrl = 'https://s3.amazonaws.com/bucket/' + 'a'.repeat(200) + '.jpg';
      const movementWithLongUrl = { ...mockMovement, receiptUrl: longUrl };

      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(movementWithLongUrl);
      mockPrisma.pettyCashSpend.delete.mockResolvedValue(movementWithLongUrl);

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(result.success).toBe(true);
    });

    it('debería manejar movimiento con descripción con caracteres especiales', async () => {
      // Arrange
      const specialDescription = 'Gasto de 测试-𝓮𝓼𝓹𝓮𝓬𝓲𝓪𝓵 #123 & más';
      const movementWithSpecialDesc = { ...mockMovement, description: specialDescription };

      mockGetOrganization.mockResolvedValue({
        organizationId: mockOrganizationId,
        userRole: mockUserRole,
        userEmail: mockUserEmail,
      });
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganizationSettings);
      mockPrisma.pettyCashSpend.findUnique.mockResolvedValue(movementWithSpecialDesc);
      mockPrisma.pettyCashSpend.delete.mockResolvedValue(movementWithSpecialDesc);

      // Act
      const result = await deletePettyCashMovement({ movementId: 'movement-1' });

      // Assert
      expect(result.success).toBe(true);
    });
  });
}); 
