import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { createPettyCashDeposit } from '../create-petty-cash-deposit';
import prisma from '@/lib/prisma';
import { getOrganizationIdFromSession } from '../../util';
import type { CreatePettyCashDepositState } from '@/types/action-states';

// Mock de Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    pettyCashDeposit: {
      create: vi.fn(),
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

describe('Create Petty Cash Deposit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockOrganizationId = 'clfx1234567890abcdefghijk'; // Valid CUID format
  const initialState: CreatePettyCashDepositState = {
    status: 'idle',
    message: '',
    errors: {},
  };

  const mockCreatedDeposit = {
    id: 'deposit-1',
    organizationId: mockOrganizationId,
    description: 'Depósito inicial',
    amount: 5000.0,
    date: new Date(),
    reference: 'REF-001',
    status: 'OPEN',
    branchId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Helper function para crear FormData válido básico
    const createValidFormData = (overrides: Record<string, string> = {}) => {    const formData = new FormData();    formData.append('description', overrides.description ?? 'Depósito de prueba');    formData.append('amount', overrides.amount ?? '1000');    formData.append('date', overrides.date ?? '2024-01-15');
    
    // Solo agregar campos opcionales si se especifican
    if (overrides.reference !== undefined) {
      formData.append('reference', overrides.reference);
    }
    if (overrides.branchId !== undefined) {
      formData.append('branchId', overrides.branchId);
    }
    if (overrides.organizationId !== undefined) {
      formData.append('organizationId', overrides.organizationId);
    }
    
    return formData;
  };

  describe('✅ Casos Exitosos', () => {
    it('debería crear un depósito de caja chica correctamente', async () => {
      // Arrange
      const formData = createValidFormData({
        description: 'Depósito inicial de enero',
        amount: '5000.50',
        date: '2024-01-15',
        reference: 'REF-001'
      });

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.create.mockResolvedValue(mockCreatedDeposit);

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(mockPrisma.pettyCashDeposit.create).toHaveBeenCalledWith({
        data: {
          organizationId: mockOrganizationId,
          description: 'Depósito inicial de enero',
          amount: 5000.50,
          date: new Date('2024-01-15'),
          reference: 'REF-001',
          status: 'OPEN',
          branchId: null,
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/petty-cash', 'page');
      expect(result.status).toBe('success');
      expect(result.message).toBe('Depósito creado exitosamente.');
    });

    it('debería crear depósito sin referencia', async () => {
      // Arrange
      const formData = createValidFormData({
        description: 'Depósito sin referencia',
        amount: '1000',
        date: '2024-01-16'
        // Sin reference
      });

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.create.mockResolvedValue(mockCreatedDeposit);

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(mockPrisma.pettyCashDeposit.create).toHaveBeenCalledWith({
        data: {
          organizationId: mockOrganizationId,
          description: 'Depósito sin referencia',
          amount: 1000,
          date: new Date('2024-01-16'),
          reference: undefined,
          status: 'OPEN',
          branchId: null,
        },
      });
      expect(result.status).toBe('success');
    });

    it('debería manejar branchId numérico correctamente', async () => {
      // Arrange
      const formData = createValidFormData({
        description: 'Depósito con sucursal',
        amount: '2000',
        date: '2024-01-17',
        branchId: '5'
      });

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.create.mockResolvedValue(mockCreatedDeposit);

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(mockPrisma.pettyCashDeposit.create).toHaveBeenCalledWith({
        data: {
          organizationId: mockOrganizationId,
          description: 'Depósito con sucursal',
          amount: 2000,
          date: new Date('2024-01-17'),
          reference: undefined,
          status: 'OPEN',
          branchId: 5,
        },
      });
      expect(result.status).toBe('success');
    });

    it('debería manejar valor __general__ para branchId', async () => {
      // Arrange
      const formData = createValidFormData({
        description: 'Depósito general',
        amount: '3000',
        date: '2024-01-18',
        branchId: '__general__'
      });

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.create.mockResolvedValue(mockCreatedDeposit);

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(mockPrisma.pettyCashDeposit.create).toHaveBeenCalledWith({
        data: {
          organizationId: mockOrganizationId,
          description: 'Depósito general',
          amount: 3000,
          date: new Date('2024-01-18'),
          reference: undefined,
          status: 'OPEN',
          branchId: null,
        },
      });
      expect(result.status).toBe('success');
    });

    it('debería usar organizationId del FormData cuando esté presente', async () => {
      // Arrange
      const formDataOrgId = 'clfx9876543210abcdefghijk'; // Another valid CUID
      const formData = createValidFormData({
        organizationId: formDataOrgId,
        description: 'Depósito con org del form',
        amount: '1500',
        date: '2024-01-19'
      });

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.create.mockResolvedValue(mockCreatedDeposit);

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(mockPrisma.pettyCashDeposit.create).toHaveBeenCalledWith({
        data: {
          organizationId: formDataOrgId,
          description: 'Depósito con org del form',
          amount: 1500,
          date: new Date('2024-01-19'),
          reference: undefined,
          status: 'OPEN',
          branchId: null,
        },
      });
      expect(result.status).toBe('success');
    });

    it('debería procesar números decimales correctamente', async () => {
      // Arrange
      const formData = createValidFormData({
        description: 'Depósito con decimales',
        amount: '1234.56',
        date: '2024-01-20'
      });

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.create.mockResolvedValue(mockCreatedDeposit);

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(mockPrisma.pettyCashDeposit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 1234.56,
          }),
        })
      );
      expect(result.status).toBe('success');
    });

    it('debería manejar espacios y trimear campos correctamente', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('description', '  Depósito con espacios  ');
      formData.append('amount', '  1000.50  ');
      formData.append('date', '  2024-01-15  ');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.create.mockResolvedValue(mockCreatedDeposit);

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('success');
      expect(mockPrisma.pettyCashDeposit.create).toHaveBeenCalled();
    });
  });

  describe('❌ Manejo de Errores de Validación', () => {
    it('debería fallar con descripción completamente vacía', async () => {
      // Arrange
      const formData = createValidFormData({ description: '' }); // Completamente vacío
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      // Act
      const result = await createPettyCashDeposit(initialState, formData);
      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('Validación fallida. Por favor revisa los campos.');
      expect(result.errors?.description).toBeDefined();
      expect(mockPrisma.pettyCashDeposit.create).not.toHaveBeenCalled();
    });

    it('debería fallar con monto negativo', async () => {
      // Arrange
      const formData = createValidFormData({ amount: '-500' });

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('Validación fallida. Por favor revisa los campos.');
      expect(result.errors?.amount).toBeDefined();
      expect(mockPrisma.pettyCashDeposit.create).not.toHaveBeenCalled();
    });

    it('debería fallar con monto inválido', async () => {
      // Arrange
      const formData = createValidFormData({ amount: 'no-es-numero' });

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('Validación fallida. Por favor revisa los campos.');
      expect(result.errors?.amount).toBeDefined();
      expect(mockPrisma.pettyCashDeposit.create).not.toHaveBeenCalled();
    });

    it('debería fallar con branchId inválido', async () => {
      // Arrange
      const formData = createValidFormData({ branchId: 'invalid-branch' });

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('ID de sucursal inválido.');
      expect(result.errors?.branchId).toContain('ID de sucursal inválido.');
      expect(mockPrisma.pettyCashDeposit.create).not.toHaveBeenCalled();
    });

    it('debería fallar con organizationId inválido (no CUID)', async () => {
      // Arrange
      const formData = createValidFormData({ organizationId: 'invalid-org-id' });

      mockGetOrganization.mockResolvedValue({ organizationId: null });

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('Validación fallida. Por favor revisa los campos.');
      expect(result.errors?.organizationId).toBeDefined();
      expect(mockPrisma.pettyCashDeposit.create).not.toHaveBeenCalled();
    });

    it('debería fallar con monto cero', async () => {
      // Arrange
      const formData = createValidFormData({ amount: '0' });

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('Validación fallida. Por favor revisa los campos.');
      expect(result.errors?.amount).toBeDefined();
      expect(mockPrisma.pettyCashDeposit.create).not.toHaveBeenCalled();
    });
  });

  describe('❌ Manejo de Errores de Organización', () => {
    it('debería fallar cuando no hay organizationId en sesión ni FormData', async () => {
      // Arrange
      const formData = createValidFormData(); // Sin organizationId en FormData

      mockGetOrganization.mockResolvedValue({ organizationId: null });

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('ID de Organización no encontrado.');
      expect(result.errors?._form).toContain('ID de Organización no encontrado.');
      expect(mockPrisma.pettyCashDeposit.create).not.toHaveBeenCalled();
    });

    it('debería fallar cuando getOrganizationIdFromSession devuelve null', async () => {
      // Arrange
      const formData = createValidFormData();

      mockGetOrganization.mockResolvedValue({ organizationId: null });

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('ID de Organización no encontrado.');
      expect(mockPrisma.pettyCashDeposit.create).not.toHaveBeenCalled();
    });
  });

  describe('❌ Manejo de Errores de Base de Datos', () => {
    it('debería manejar errores de base de datos conocidos', async () => {
      // Arrange
      const formData = createValidFormData();

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      const dbError = new Error('Database connection failed');
      mockPrisma.pettyCashDeposit.create.mockRejectedValue(dbError);

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('Database connection failed');
      expect(result.errors?._form).toContain('Database connection failed');
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error creating petty cash deposit:',
        dbError
      );
    });

    it('debería manejar errores desconocidos', async () => {
      // Arrange
      const formData = createValidFormData();

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.create.mockRejectedValue('Unknown error');

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('Error desconocido al crear el depósito.');
      expect(result.errors?._form).toContain('Error desconocido al crear el depósito.');
    });

    it('debería manejar errores de violación de constraints', async () => {
      // Arrange
      const formData = createValidFormData();

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      const constraintError = new Error('Unique constraint failed');
      mockPrisma.pettyCashDeposit.create.mockRejectedValue(constraintError);

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('Unique constraint failed');
      expect(result.errors?._form).toContain('Unique constraint failed');
    });
  });

  describe('🔄 Cache Revalidation', () => {
    it('debería revalidar cuando la creación es exitosa', async () => {
      // Arrange
      const formData = createValidFormData();

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.create.mockResolvedValue(mockCreatedDeposit);

      // Act
      await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/petty-cash', 'page');
    });

    it('no debería revalidar cuando hay errores de validación', async () => {
      // Arrange
      const formData = createValidFormData({ amount: '-500' }); // Monto negativo para forzar error

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('no debería revalidar cuando hay errores de base de datos', async () => {
      // Arrange
      const formData = createValidFormData();

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.create.mockRejectedValue(new Error('DB Error'));

      // Act
      await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('🎯 Edge Cases', () => {
    it('debería manejar fechas límite correctamente', async () => {
      // Arrange
      const formData = createValidFormData({
        description: 'Depósito límite',
        amount: '999999.99',
        date: '2099-12-31'
      });

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.create.mockResolvedValue(mockCreatedDeposit);

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('success');
      expect(mockPrisma.pettyCashDeposit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            date: new Date('2099-12-31'),
          }),
        })
      );
    });

    it('debería manejar montos muy grandes', async () => {
      // Arrange
      const formData = createValidFormData({
        description: 'Depósito grande',
        amount: '999999999.99',
        date: '2024-01-15'
      });

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.create.mockResolvedValue(mockCreatedDeposit);

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('success');
      expect(mockPrisma.pettyCashDeposit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 999999999.99,
          }),
        })
      );
    });

    it('debería manejar descripción muy larga', async () => {
      // Arrange
      const longDescription = 'a'.repeat(500);
      const formData = createValidFormData({
        description: longDescription,
        amount: '1000',
        date: '2024-01-15'
      });

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.create.mockResolvedValue(mockCreatedDeposit);

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('success');
      expect(mockPrisma.pettyCashDeposit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: longDescription,
          }),
        })
      );
    });

    it('debería manejar branchId cero correctamente', async () => {
      // Arrange
      const formData = createValidFormData({
        description: 'Depósito sucursal 0',
        amount: '1000',
        date: '2024-01-15',
        branchId: '0'
      });

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.create.mockResolvedValue(mockCreatedDeposit);

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('success');
      expect(mockPrisma.pettyCashDeposit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            branchId: 0,
          }),
        })
      );
    });

    it('debería manejar referencia con caracteres especiales', async () => {
      // Arrange
      const formData = createValidFormData({
        description: 'Depósito con referencia especial',
        amount: '1000',
        date: '2024-01-15',
        reference: 'REF-001/2024#$%'
      });

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.create.mockResolvedValue(mockCreatedDeposit);

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('success');
      expect(mockPrisma.pettyCashDeposit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reference: 'REF-001/2024#$%',
          }),
        })
      );
    });

    it('debería manejar fecha en formato ISO correctamente', async () => {
      // Arrange
      const formData = createValidFormData({
        description: 'Depósito con fecha ISO',
        amount: '1000',
        date: '2024-01-15T00:00:00.000Z'
      });

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.create.mockResolvedValue(mockCreatedDeposit);

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('success');
      expect(mockPrisma.pettyCashDeposit.create).toHaveBeenCalled();
    });
  });
}); 
