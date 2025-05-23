import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { createPettyCashWithdrawal } from '../create-petty-cash-withdrawal';
import prisma from '@/lib/prisma';
import { getOrganizationIdFromSession } from '../../get-Organization-Id-From-Session';
import type { CreatePettyCashWithdrawalState } from '@/types/action-states';

// Mock de Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    pettyCashDeposit: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    pettyCashWithdrawal: {
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
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
  warn: vi.fn(),
};

const mockRevalidatePath = revalidatePath as any;
const mockPrisma = prisma as any;
const mockGetOrganization = getOrganizationIdFromSession as any;

describe('Create Petty Cash Withdrawal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockOrganizationId = 'org-123';
  const initialState: CreatePettyCashWithdrawalState = {
    status: 'idle',
    message: '',
    errors: {},
  };

  const mockDeposit = {
    id: 'deposit-1',
    organizationId: mockOrganizationId,
    amount: 10000.0,
    status: 'OPEN',
    description: 'Depósito inicial',
    date: new Date('2024-01-15'),
    reference: 'REF-001',
    branchId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreatedWithdrawal = {
    id: 'withdrawal-1',
    organizationId: mockOrganizationId,
    depositId: 'deposit-1',
    userId: 'user-1',
    userName: 'Juan Pérez',
    amountGiven: 1000.0,
    amountJustified: 0.0,
    date: new Date('2024-01-16'),
    status: 'PENDING_JUSTIFICATION',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('✅ Casos Exitosos', () => {
    it('debería crear un retiro de caja chica correctamente', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('userId', 'user-1');
      formData.append('userName', 'Juan Pérez');
      formData.append('amountGiven', '1000.50');
      formData.append('date', '2024-01-16');
      formData.append('description', 'Retiro para gastos operativos');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findFirst.mockResolvedValue(mockDeposit);
      mockPrisma.pettyCashWithdrawal.aggregate.mockResolvedValue({ _sum: { amountGiven: 0 } });

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback({
          pettyCashWithdrawal: {
            create: vi.fn().mockResolvedValue(mockCreatedWithdrawal),
            aggregate: vi.fn().mockResolvedValue({ _sum: { amountGiven: 1000.50 } }),
          },
          pettyCashDeposit: {
            update: vi.fn().mockResolvedValue({}),
          },
        });
      });

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/petty-cash', 'page');
      expect(result.status).toBe('success');
      expect(result.message).toBe('Retiro creado exitosamente.');
    });

    it('debería buscar depósito activo automáticamente cuando no se especifica depositId', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('userId', 'user-2');
      formData.append('userName', 'María García');
      formData.append('amountGiven', '500');
      formData.append('date', '2024-01-17');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findFirst.mockResolvedValue(mockDeposit);
      mockPrisma.pettyCashWithdrawal.aggregate.mockResolvedValue({ _sum: { amountGiven: 0 } });

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback({
          pettyCashWithdrawal: {
            create: vi.fn().mockResolvedValue(mockCreatedWithdrawal),
            aggregate: vi.fn().mockResolvedValue({ _sum: { amountGiven: 500 } }),
          },
          pettyCashDeposit: {
            update: vi.fn().mockResolvedValue({}),
          },
        });
      });

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(mockPrisma.pettyCashDeposit.findFirst).toHaveBeenCalledWith({
        where: { organizationId: mockOrganizationId, status: 'OPEN' },
        orderBy: { date: 'desc' },
      });
      expect(result.status).toBe('success');
    });

    it('debería usar depositId específico cuando se proporciona', async () => {
      // Arrange
      const specificDepositId = 'deposit-specific';
      const formData = new FormData();
      formData.append('depositId', specificDepositId);
      formData.append('userId', 'user-3');
      formData.append('userName', 'Carlos López');
      formData.append('amountGiven', '750');
      formData.append('date', '2024-01-18');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findFirst.mockResolvedValue({ ...mockDeposit, id: specificDepositId });
      mockPrisma.pettyCashWithdrawal.aggregate.mockResolvedValue({ _sum: { amountGiven: 0 } });

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback({
          pettyCashWithdrawal: {
            create: vi.fn().mockResolvedValue(mockCreatedWithdrawal),
            aggregate: vi.fn().mockResolvedValue({ _sum: { amountGiven: 750 } }),
          },
          pettyCashDeposit: {
            update: vi.fn().mockResolvedValue({}),
          },
        });
      });

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(mockPrisma.pettyCashDeposit.findFirst).toHaveBeenCalledWith({
        where: { id: specificDepositId, organizationId: mockOrganizationId },
      });
      expect(result.status).toBe('success');
    });
  });

  describe('❌ Manejo de Errores de Validación', () => {
    it('debería fallar cuando faltan campos requeridos', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('userName', 'Juan Pérez');
      // Sin userId, amountGiven y date

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('Validación fallida. Por favor revisa los campos.');
      expect(result.errors).toBeDefined();
    });

    it('debería fallar con monto negativo', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('userId', 'user-1');
      formData.append('userName', 'Juan Pérez');
      formData.append('amountGiven', '-100');
      formData.append('date', '2024-01-16');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.errors?.amountGiven).toBeDefined();
    });

    it('debería fallar con amountGiven inválido', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('userId', 'user-1');
      formData.append('userName', 'Juan Pérez');
      formData.append('amountGiven', 'no-es-numero');
      formData.append('date', '2024-01-16');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.errors?.amountGiven).toBeDefined();
    });
  });

  describe('❌ Manejo de Errores de Organización', () => {
    it('debería fallar cuando no hay organizationId en sesión ni FormData', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('userId', 'user-1');
      formData.append('userName', 'Juan Pérez');
      formData.append('amountGiven', '1000');
      formData.append('date', '2024-01-16');

      mockGetOrganization.mockResolvedValue({ organizationId: null });

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('ID de Organización no encontrado (ni en formulario ni en sesión).');
      expect(result.errors?._form).toContain('ID de Organización no encontrado.');
    });
  });

  describe('❌ Manejo de Errores de Depósito', () => {
    it('debería fallar cuando no se encuentra depósito activo', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('userId', 'user-1');
      formData.append('userName', 'Juan Pérez');
      formData.append('amountGiven', '1000');
      formData.append('date', '2024-01-16');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findFirst.mockResolvedValue(null);

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('No se encontró un depósito activo o válido para este retiro.');
      expect(result.errors?.depositId).toContain('Depósito no encontrado o no válido.');
    });

    it('debería fallar cuando el depósito no está abierto', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('userId', 'user-1');
      formData.append('userName', 'Juan Pérez');
      formData.append('amountGiven', '1000');
      formData.append('date', '2024-01-16');

      const closedDeposit = { ...mockDeposit, status: 'CLOSED' };
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findFirst.mockResolvedValue(closedDeposit);

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('El depósito seleccionado no está abierto.');
      expect(result.errors?.depositId).toContain('El depósito no está abierto.');
    });

    it('debería fallar cuando no hay fondos suficientes', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('userId', 'user-1');
      formData.append('userName', 'Juan Pérez');
      formData.append('amountGiven', '15000'); // Más del depósito disponible
      formData.append('date', '2024-01-16');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findFirst.mockResolvedValue(mockDeposit);
      mockPrisma.pettyCashWithdrawal.aggregate.mockResolvedValue({ _sum: { amountGiven: 5000 } }); // Ya se retiraron 5000

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toContain('Fondos insuficientes en el depósito');
      expect(result.errors?.amountGiven).toBeDefined();
    });
  });

  describe('❌ Manejo de Errores de Base de Datos', () => {
    it('debería manejar errores de transacción', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('userId', 'user-1');
      formData.append('userName', 'Juan Pérez');
      formData.append('amountGiven', '1000');
      formData.append('date', '2024-01-16');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findFirst.mockResolvedValue(mockDeposit);
      mockPrisma.pettyCashWithdrawal.aggregate.mockResolvedValue({ _sum: { amountGiven: 0 } });

      const dbError = new Error('Transaction failed');
      mockPrisma.$transaction.mockRejectedValue(dbError);

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('Transaction failed');
      expect(result.errors?._form).toContain('Transaction failed');
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error creating petty cash withdrawal:',
        dbError
      );
    });

    it('debería manejar errores desconocidos', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('userId', 'user-1');
      formData.append('userName', 'Juan Pérez');
      formData.append('amountGiven', '1000');
      formData.append('date', '2024-01-16');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findFirst.mockResolvedValue(mockDeposit);
      mockPrisma.pettyCashWithdrawal.aggregate.mockResolvedValue({ _sum: { amountGiven: 0 } });

      mockPrisma.$transaction.mockRejectedValue('Unknown error');

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('Error desconocido al crear el retiro.');
    });
  });

  describe('🔄 Cache Revalidation', () => {
    it('debería revalidar cuando la creación es exitosa', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('userId', 'user-1');
      formData.append('userName', 'Juan Pérez');
      formData.append('amountGiven', '1000');
      formData.append('date', '2024-01-16');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findFirst.mockResolvedValue(mockDeposit);
      mockPrisma.pettyCashWithdrawal.aggregate.mockResolvedValue({ _sum: { amountGiven: 0 } });

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback({
          pettyCashWithdrawal: {
            create: vi.fn().mockResolvedValue(mockCreatedWithdrawal),
            aggregate: vi.fn().mockResolvedValue({ _sum: { amountGiven: 1000 } }),
          },
          pettyCashDeposit: {
            update: vi.fn().mockResolvedValue({}),
          },
        });
      });

      // Act
      await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/petty-cash', 'page');
    });

    it('no debería revalidar cuando hay errores', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('userName', 'Juan Pérez');
      formData.append('amountGiven', '1000');
      // Sin userId y date para forzar error

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('🎯 Edge Cases', () => {
    it('debería manejar montos muy pequeños', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('userId', 'user-1');
      formData.append('userName', 'Juan Pérez');
      formData.append('amountGiven', '0.01'); // Monto muy pequeño
      formData.append('date', '2024-01-16');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findFirst.mockResolvedValue(mockDeposit);
      mockPrisma.pettyCashWithdrawal.aggregate.mockResolvedValue({ _sum: { amountGiven: 0 } });

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback({
          pettyCashWithdrawal: {
            create: vi.fn().mockResolvedValue(mockCreatedWithdrawal),
            aggregate: vi.fn().mockResolvedValue({ _sum: { amountGiven: 0.01 } }),
          },
          pettyCashDeposit: {
            update: vi.fn().mockResolvedValue({}),
          },
        });
      });

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(result.status).toBe('success');
    });

    it('debería manejar _sum.amountGiven null correctamente', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('userId', 'user-1');
      formData.append('userName', 'Juan Pérez');
      formData.append('amountGiven', '1000');
      formData.append('date', '2024-01-16');

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findFirst.mockResolvedValue(mockDeposit);
      mockPrisma.pettyCashWithdrawal.aggregate.mockResolvedValue({ _sum: { amountGiven: null } }); // Sin retiros previos

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return await callback({
          pettyCashWithdrawal: {
            create: vi.fn().mockResolvedValue(mockCreatedWithdrawal),
            aggregate: vi.fn().mockResolvedValue({ _sum: { amountGiven: 1000 } }),
          },
          pettyCashDeposit: {
            update: vi.fn().mockResolvedValue({}),
          },
        });
      });

      // Act
      const result = await createPettyCashWithdrawal(initialState, formData);

      // Assert
      expect(result.status).toBe('success');
    });
  });
}); 