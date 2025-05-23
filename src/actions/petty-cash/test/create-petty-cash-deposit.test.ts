import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { createPettyCashDeposit } from '../create-petty-cash-deposit';
import prisma from '@/lib/prisma';
import { getOrganizationIdFromSession } from '../../get-Organization-Id-From-Session';
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
vi.mock('../../get-Organization-Id-From-Session', () => ({
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

  const mockOrganizationId = 'org-123';
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

  describe('✅ Casos Exitosos', () => {
    it('debería crear un depósito de caja chica correctamente', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('description', 'Depósito inicial de enero');
      formData.append('amount', '5000.50');
      formData.append('date', '2024-01-15');
      formData.append('reference', 'REF-001');

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
      const formData = new FormData();
      formData.append('description', 'Depósito sin referencia');
      formData.append('amount', '1000');
      formData.append('date', '2024-01-16');

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
      const formData = new FormData();
      formData.append('description', 'Depósito con sucursal');
      formData.append('amount', '2000');
      formData.append('date', '2024-01-17');
      formData.append('branchId', '5');

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
      const formData = new FormData();
      formData.append('description', 'Depósito general');
      formData.append('amount', '3000');
      formData.append('date', '2024-01-18');
      formData.append('branchId', '__general__');

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
      const formDataOrgId = 'org-456';
      const formData = new FormData();
      formData.append('organizationId', formDataOrgId);
      formData.append('description', 'Depósito con org del form');
      formData.append('amount', '1500');
      formData.append('date', '2024-01-19');

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
      const formData = new FormData();
      formData.append('description', 'Depósito con decimales');
      formData.append('amount', '1234.56');
      formData.append('date', '2024-01-20');

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
  });

  describe('❌ Manejo de Errores de Validación', () => {
    it('debería fallar cuando falta la descripción', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('amount', '1000');
      formData.append('date', '2024-01-15');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('Validación fallida. Por favor revisa los campos.');
      expect(result.errors?.description).toBeDefined();
      expect(mockPrisma.pettyCashDeposit.create).not.toHaveBeenCalled();
    });

    it('debería fallar con descripción vacía', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('description', '');
      formData.append('amount', '1000');
      formData.append('date', '2024-01-15');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.errors?.description).toContain('La descripción es requerida.');
    });

    it('debería fallar cuando falta el monto', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('description', 'Depósito sin monto');
      formData.append('date', '2024-01-15');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.errors?.amount).toBeDefined();
    });

    it('debería fallar con monto negativo', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('description', 'Depósito con monto negativo');
      formData.append('amount', '-100');
      formData.append('date', '2024-01-15');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.errors?.amount).toContain('El monto debe ser positivo.');
    });

    it('debería fallar con monto inválido', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('description', 'Depósito con monto inválido');
      formData.append('amount', 'no-es-numero');
      formData.append('date', '2024-01-15');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.errors?.amount).toBeDefined();
    });

    it('debería fallar cuando falta la fecha', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('description', 'Depósito sin fecha');
      formData.append('amount', '1000');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.errors?.date).toBeDefined();
    });

    it('debería fallar con fecha inválida', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('description', 'Depósito con fecha inválida');
      formData.append('amount', '1000');
      formData.append('date', 'fecha-invalida');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.errors?.date).toBeDefined();
    });

    it('debería fallar con branchId inválido', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('description', 'Depósito con branchId inválido');
      formData.append('amount', '1000');
      formData.append('date', '2024-01-15');
      formData.append('branchId', 'abc');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('ID de sucursal inválido.');
      expect(result.errors?.branchId).toContain('ID de sucursal inválido.');
    });
  });

  describe('❌ Manejo de Errores de Organización', () => {
    it('debería fallar cuando no hay organizationId en sesión ni FormData', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('description', 'Depósito sin organización');
      formData.append('amount', '1000');
      formData.append('date', '2024-01-15');

      mockGetOrganization.mockResolvedValue({ organizationId: null });

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('ID de Organización no encontrado.');
      expect(result.errors?._form).toContain('ID de Organización no encontrado.');
    });

    it('debería fallar cuando hay error en getOrganizationIdFromSession', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('description', 'Depósito con error de sesión');
      formData.append('amount', '1000');
      formData.append('date', '2024-01-15');

      mockGetOrganization.mockResolvedValue({ error: 'Session error' });

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('ID de Organización no encontrado.');
    });
  });

  describe('❌ Manejo de Errores de Base de Datos', () => {
    it('debería manejar errores de base de datos conocidos', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('description', 'Depósito con error de DB');
      formData.append('amount', '1000');
      formData.append('date', '2024-01-15');

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
      const formData = new FormData();
      formData.append('description', 'Depósito con error desconocido');
      formData.append('amount', '1000');
      formData.append('date', '2024-01-15');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.create.mockRejectedValue('Unknown error');

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('Error desconocido al crear el depósito.');
      expect(result.errors?._form).toContain('Error desconocido al crear el depósito.');
    });
  });

  describe('🔄 Cache Revalidation', () => {
    it('debería revalidar cuando la creación es exitosa', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('description', 'Depósito para revalidación');
      formData.append('amount', '1000');
      formData.append('date', '2024-01-15');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.create.mockResolvedValue(mockCreatedDeposit);

      // Act
      await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/petty-cash', 'page');
    });

    it('no debería revalidar cuando hay errores', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('amount', '1000');
      formData.append('date', '2024-01-15');
      // Sin descripción para forzar error

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('🎯 Edge Cases', () => {
    it('debería manejar fechas límite correctamente', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('description', 'Depósito fecha límite');
      formData.append('amount', '1000');
      formData.append('date', '1900-01-01');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.create.mockResolvedValue(mockCreatedDeposit);

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('success');
      expect(mockPrisma.pettyCashDeposit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            date: new Date('1900-01-01'),
          }),
        })
      );
    });

    it('debería manejar montos muy grandes', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('description', 'Depósito monto grande');
      formData.append('amount', '999999999.99');
      formData.append('date', '2024-01-15');

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
      const formData = new FormData();
      formData.append('description', longDescription);
      formData.append('amount', '1000');
      formData.append('date', '2024-01-15');

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
      const formData = new FormData();
      formData.append('description', 'Depósito branchId cero');
      formData.append('amount', '1000');
      formData.append('date', '2024-01-15');
      formData.append('branchId', '0');

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

    it('debería manejar espacios en campos de texto', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('description', '  Depósito con espacios  ');
      formData.append('amount', '  1000.50  ');
      formData.append('date', '2024-01-15');
      formData.append('reference', '  REF-001  ');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.create.mockResolvedValue(mockCreatedDeposit);

      // Act
      const result = await createPettyCashDeposit(initialState, formData);

      // Assert
      expect(result.status).toBe('success');
      // Los espacios deben ser manejados por el schema de validación
      expect(mockPrisma.pettyCashDeposit.create).toHaveBeenCalled();
    });
  });
}); 