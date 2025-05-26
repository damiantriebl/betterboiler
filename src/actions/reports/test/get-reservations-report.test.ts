import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getReservationsReport } from '../get-reservations-report';
import prisma from '@/lib/prisma';
import { getOrganizationIdFromSession } from '../../util';
import { MotorcycleState } from '@prisma/client';

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    motorcycle: {
      findMany: vi.fn(),
    },
  },
}));

// Mock de getOrganizationIdFromSession
vi.mock('../../util', () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

// Silenciar console durante los tests
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('getReservationsReport', () => {
  const mockOrganizationId = 'clfx1234567890abcdefghijk';
  
  const mockMotorcycleReserved = {
    id: 'clfxmoto1234567890abcd',
    state: MotorcycleState.RESERVADO,
    client: {
      id: 'clfxclient123456789abc',
      firstName: 'Juan',
      lastName: 'Pérez',
      email: 'juan@example.com',
      phone: '123456789',
    },
    seller: {
      id: 'clfxseller12345678901',
      name: 'Carlos Vendedor',
      email: 'carlos@company.com',
    },
    brand: {
      name: 'Honda',
    },
    model: {
      name: 'CBR 600',
    },
    branch: {
      id: 'clfxbranch123456789ab',
      name: 'Sucursal Centro',
    },
    reservations: [
      {
        amount: 50000,
        currency: 'USD',
        createdAt: new Date('2024-01-15'),
        status: 'active',
      },
    ],
  };

  const mockPrisma = prisma as any;
  const mockGetOrganization = getOrganizationIdFromSession as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
    mockPrisma.motorcycle.findMany.mockResolvedValue([mockMotorcycleReserved]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Casos exitosos', () => {
    it('debería generar reporte de reservaciones exitosamente', async () => {
      const result = await getReservationsReport();

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.totalReservations).toBe(1);
      expect(result.summary.totalAmount).toEqual({ USD: 50000 });
      expect(result.summary.activeReservations).toBe(1);
      expect(result.summary.completedReservations).toBe(0);
      expect(result.summary.cancelledReservations).toBe(0);
      expect(result.summary.expiredReservations).toBe(0);
      expect(result.summary.conversionRate).toBe(0);
    });

    it('debería generar reporte con rango de fechas', async () => {
      const dateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
      };

      await getReservationsReport(dateRange);

      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          state: MotorcycleState.RESERVADO,
          updatedAt: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        },
        include: expect.any(Object),
      });
    });

    it('debería generar reporte solo con fecha desde', async () => {
      const dateRange = {
        from: new Date('2024-01-01'),
      };

      await getReservationsReport(dateRange);

      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          state: MotorcycleState.RESERVADO,
          updatedAt: {
            gte: dateRange.from,
          },
        },
        include: expect.any(Object),
      });
    });

    it('debería agrupar reservaciones por estado correctamente', async () => {
      const mockMotorcycles = [
        {
          ...mockMotorcycleReserved,
          reservations: [
            { amount: 30000, currency: 'USD', createdAt: new Date(), status: 'active' },
          ],
        },
        {
          ...mockMotorcycleReserved,
          id: 'clfxmoto2234567890abcd',
          reservations: [
            { amount: 20000, currency: 'USD', createdAt: new Date(), status: 'completed' },
          ],
        },
      ];

      mockPrisma.motorcycle.findMany.mockResolvedValue(mockMotorcycles);

      const result = await getReservationsReport();

      expect(result.reservationsByStatus.active.count).toBe(1);
      expect(result.reservationsByStatus.active.amount.USD).toBe(30000);
      expect(result.reservationsByStatus.completed.count).toBe(1);
      expect(result.reservationsByStatus.completed.amount.USD).toBe(20000);
    });

    it('debería agrupar reservaciones por sucursal correctamente', async () => {
      const mockMotorcycles = [
        {
          ...mockMotorcycleReserved,
          reservations: [
            { amount: 30000, currency: 'USD', createdAt: new Date(), status: 'active' },
          ],
        },
        {
          ...mockMotorcycleReserved,
          id: 'clfxmoto2234567890abcd',
          branch: {
            id: 'clfxbranch223456789ab',
            name: 'Sucursal Norte',
          },
          reservations: [
            { amount: 25000, currency: 'USD', createdAt: new Date(), status: 'completed' },
          ],
        },
      ];

      mockPrisma.motorcycle.findMany.mockResolvedValue(mockMotorcycles);

      const result = await getReservationsReport();

      expect(result.reservationsByBranch['clfxbranch123456789ab'].total).toBe(1);
      expect(result.reservationsByBranch['clfxbranch123456789ab'].active).toBe(1);
      expect(result.reservationsByBranch['clfxbranch223456789ab'].total).toBe(1);
      expect(result.reservationsByBranch['clfxbranch223456789ab'].completed).toBe(1);
    });

    it('debería manejar múltiples monedas correctamente', async () => {
      const mockMotorcycles = [
        {
          ...mockMotorcycleReserved,
          reservations: [
            { amount: 30000, currency: 'USD', createdAt: new Date(), status: 'active' },
          ],
        },
        {
          ...mockMotorcycleReserved,
          id: 'clfxmoto2234567890abcd',
          reservations: [
            { amount: 2500000, currency: 'COP', createdAt: new Date(), status: 'active' },
          ],
        },
      ];

      mockPrisma.motorcycle.findMany.mockResolvedValue(mockMotorcycles);

      const result = await getReservationsReport();

      expect(result.summary.totalAmount).toEqual({
        USD: 30000,
        COP: 2500000,
      });
    });

    it('debería calcular tasa de conversión correctamente', async () => {
      const mockMotorcycles = [
        {
          ...mockMotorcycleReserved,
          reservations: [
            { amount: 30000, currency: 'USD', createdAt: new Date(), status: 'completed' },
          ],
        },
        {
          ...mockMotorcycleReserved,
          id: 'moto2',
          reservations: [
            { amount: 25000, currency: 'USD', createdAt: new Date(), status: 'active' },
          ],
        },
        {
          ...mockMotorcycleReserved,
          id: 'moto3',
          reservations: [
            { amount: 20000, currency: 'USD', createdAt: new Date(), status: 'completed' },
          ],
        },
        {
          ...mockMotorcycleReserved,
          id: 'moto4',
          reservations: [
            { amount: 15000, currency: 'USD', createdAt: new Date(), status: 'cancelled' },
          ],
        },
      ];

      mockPrisma.motorcycle.findMany.mockResolvedValue(mockMotorcycles);

      const result = await getReservationsReport();

      expect(result.summary.totalReservations).toBe(4);
      expect(result.summary.completedReservations).toBe(2);
      expect(result.summary.conversionRate).toBe(50); // 2/4 * 100
    });
  });

  describe('Casos de error', () => {
    it('debería devolver reporte vacío cuando no se puede obtener la organización', async () => {
      mockGetOrganization.mockResolvedValue({ 
        organizationId: null, 
        error: 'Sesión no válida' 
      });

      const result = await getReservationsReport();

      expect(result).toEqual({
        summary: {
          totalReservations: 0,
          activeReservations: 0,
          completedReservations: 0,
          cancelledReservations: 0,
          expiredReservations: 0,
          totalAmount: {},
          conversionRate: 0,
        },
        reservationsByStatus: {},
        reservationsByBranch: {},
        reservationsByMonth: {},
      });
    });

    it('debería manejar error de base de datos', async () => {
      mockPrisma.motorcycle.findMany.mockRejectedValue(new Error('Database connection failed'));

      await expect(getReservationsReport()).rejects.toThrow('Database connection failed');
    });

    it('debería manejar motos sin reservaciones', async () => {
      const mockMotorcycleWithoutReservations = {
        ...mockMotorcycleReserved,
        reservations: [],
      };

      mockPrisma.motorcycle.findMany.mockResolvedValue([mockMotorcycleWithoutReservations]);

      const result = await getReservationsReport();

      expect(result.summary.totalReservations).toBe(1);
      expect(result.summary.totalAmount).toEqual({});
      expect(result.summary.activeReservations).toBe(0);
    });

    it('debería manejar motos sin sucursal', async () => {
      const mockMotorcycleWithoutBranch = {
        ...mockMotorcycleReserved,
        branch: null,
        reservations: [
          { amount: 30000, currency: 'USD', createdAt: new Date(), status: 'active' },
        ],
      };

      mockPrisma.motorcycle.findMany.mockResolvedValue([mockMotorcycleWithoutBranch]);

      const result = await getReservationsReport();

      expect(result.summary.totalReservations).toBe(1);
      expect(result.reservationsByBranch).toEqual({});
    });
  });

  describe('Casos edge', () => {
    it('debería manejar lista vacía de motos', async () => {
      mockPrisma.motorcycle.findMany.mockResolvedValue([]);

      const result = await getReservationsReport();

      expect(result.summary.totalReservations).toBe(0);
      expect(result.summary.conversionRate).toBe(0);
      expect(result.reservationsByStatus).toEqual({
        active: { count: 0, amount: {} },
        completed: { count: 0, amount: {} },
        cancelled: { count: 0, amount: {} },
        expired: { count: 0, amount: {} },
      });
    });

    it('debería manejar estados de reservación no esperados', async () => {
      const mockMotorcycleWithUnknownStatus = {
        ...mockMotorcycleReserved,
        reservations: [
          { amount: 30000, currency: 'USD', createdAt: new Date(), status: 'unknown' },
        ],
      };

      mockPrisma.motorcycle.findMany.mockResolvedValue([mockMotorcycleWithUnknownStatus]);

      const result = await getReservationsReport();

      expect(result.reservationsByStatus.unknown).toBeDefined();
      expect(result.reservationsByStatus.unknown.count).toBe(1);
    });

    it('debería verificar que se llame a Prisma con parámetros correctos', async () => {
      await getReservationsReport();

      expect(mockPrisma.motorcycle.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          state: MotorcycleState.RESERVADO,
        },
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
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          brand: {
            select: {
              name: true,
            },
          },
          model: {
            select: {
              name: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
          reservations: {
            select: {
              amount: true,
              currency: true,
              createdAt: true,
              status: true,
            },
          },
        },
      });
    });
  });
}); 
