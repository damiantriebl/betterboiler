import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSuppliersReport } from '../get-suppliers-report';
import prisma from '@/lib/prisma';
import { getOrganizationIdFromSession } from '../../util';

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    supplier: {
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

describe('getSuppliersReport', () => {
  const mockOrganizationId = 'clfx1234567890abcdefghijk';
  
  const mockSupplier = {
    id: 1,
    legalName: 'Proveedor Legal S.A.',
    commercialName: 'Proveedor Comercial',
    status: 'activo',
    motorcycles: [
      {
        id: 'clfxmoto1234567890abcd',
        costPrice: 40000,
        retailPrice: 50000,
        currency: 'USD',
        state: 'STOCK',
        createdAt: new Date('2024-01-15'),
      },
      {
        id: 'clfxmoto2234567890abcd',
        costPrice: 35000,
        retailPrice: 45000,
        currency: 'USD',
        state: 'VENDIDO',
        createdAt: new Date('2024-01-20'),
      },
    ],
  };

  const mockPrisma = prisma as any;
  const mockGetOrganization = getOrganizationIdFromSession as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
    mockPrisma.supplier.findMany.mockResolvedValue([mockSupplier]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Casos exitosos', () => {
    it('debería generar reporte de proveedores exitosamente', async () => {
      const result = await getSuppliersReport();

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.totalSuppliers).toBe(1);
      expect(result.summary.activeSuppliers).toBe(1);
      expect(result.summary.inactiveSuppliers).toBe(0);
      expect(result.summary.totalPurchases).toEqual({ USD: 75000 });
    });

    it('debería generar reporte con rango de fechas', async () => {
      const dateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
      };

      await getSuppliersReport(dateRange);

      expect(mockPrisma.supplier.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
        },
        select: {
          id: true,
          legalName: true,
          commercialName: true,
          status: true,
          motorcycles: {
            where: {
              createdAt: {
                gte: dateRange.from,
                lte: dateRange.to,
              },
            },
            select: {
              id: true,
              costPrice: true,
              retailPrice: true,
              currency: true,
              state: true,
              createdAt: true,
            },
          },
        },
      });
    });

    it('debería generar reporte con ID de proveedor específico', async () => {
      const supplierId = '123';

      await getSuppliersReport(undefined, supplierId);

      expect(mockPrisma.supplier.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          id: 123,
        },
        select: expect.any(Object),
      });
    });

    it('debería agrupar compras por proveedor correctamente', async () => {
      const mockSuppliers = [
        {
          ...mockSupplier,
          commercialName: 'Proveedor A',
          motorcycles: [
            { ...mockSupplier.motorcycles[0], costPrice: 30000 },
          ],
        },
        {
          ...mockSupplier,
          id: 2,
          commercialName: 'Proveedor B',
          motorcycles: [
            { ...mockSupplier.motorcycles[0], costPrice: 25000 },
          ],
        },
      ];

      mockPrisma.supplier.findMany.mockResolvedValue(mockSuppliers);

      const result = await getSuppliersReport();

      expect(result.purchasesBySupplier['Proveedor A']).toEqual({
        motorcyclesCount: 1,
        purchases: { USD: 30000 },
      });
      expect(result.purchasesBySupplier['Proveedor B']).toEqual({
        motorcyclesCount: 1,
        purchases: { USD: 25000 },
      });
    });

    it('debería agrupar compras por mes correctamente', async () => {
      const mockSupplierWithVariedDates = {
        ...mockSupplier,
        motorcycles: [
          {
            ...mockSupplier.motorcycles[0],
            createdAt: new Date('2024-01-15'),
            costPrice: 30000,
            retailPrice: 40000,
            state: 'VENDIDO',
          },
          {
            ...mockSupplier.motorcycles[1],
            createdAt: new Date('2024-02-15'),
            costPrice: 25000,
            retailPrice: 35000,
            state: 'STOCK',
          },
        ],
      };

      mockPrisma.supplier.findMany.mockResolvedValue([mockSupplierWithVariedDates]);

      const result = await getSuppliersReport();

      expect(result.purchasesByMonth['2024-01']).toEqual({
        count: 1,
        totalInvestment: 30000,
        totalSales: 40000,
        soldCount: 1,
      });
      expect(result.purchasesByMonth['2024-02']).toEqual({
        count: 1,
        totalInvestment: 25000,
        totalSales: 0,
        soldCount: 0,
      });
    });

    it('debería manejar múltiples monedas correctamente', async () => {
      const mockSupplierMultiCurrency = {
        ...mockSupplier,
        motorcycles: [
          {
            ...mockSupplier.motorcycles[0],
            currency: 'USD',
            costPrice: 30000,
          },
          {
            ...mockSupplier.motorcycles[1],
            currency: 'COP',
            costPrice: 2500000,
          },
        ],
      };

      mockPrisma.supplier.findMany.mockResolvedValue([mockSupplierMultiCurrency]);

      const result = await getSuppliersReport();

      expect(result.summary.totalPurchases).toEqual({
        USD: 30000,
        COP: 2500000,
      });
      expect(result.purchasesBySupplier['Proveedor Comercial'].purchases).toEqual({
        USD: 30000,
        COP: 2500000,
      });
    });

    it('debería contar proveedores activos e inactivos correctamente', async () => {
      const mockSuppliers = [
        { ...mockSupplier, status: 'activo' },
        { ...mockSupplier, id: 2, status: 'inactivo' },
        { ...mockSupplier, id: 3, status: 'activo' },
      ];

      mockPrisma.supplier.findMany.mockResolvedValue(mockSuppliers);

      const result = await getSuppliersReport();

      expect(result.summary.totalSuppliers).toBe(3);
      expect(result.summary.activeSuppliers).toBe(2);
      expect(result.summary.inactiveSuppliers).toBe(1);
    });

    it('debería usar nombre legal cuando no hay nombre comercial', async () => {
      const mockSupplierWithoutCommercialName = {
        ...mockSupplier,
        commercialName: null,
        legalName: 'Solo Nombre Legal S.A.',
      };

      mockPrisma.supplier.findMany.mockResolvedValue([mockSupplierWithoutCommercialName]);

      const result = await getSuppliersReport();

      expect(result.purchasesBySupplier['Solo Nombre Legal S.A.']).toBeDefined();
      expect(result.supplierDetails[0].name).toBe('Solo Nombre Legal S.A.');
    });

    it('debería generar detalles de proveedores correctamente', async () => {
      const result = await getSuppliersReport();

      expect(result.supplierDetails).toHaveLength(1);
      expect(result.supplierDetails[0]).toEqual({
        id: 1,
        name: 'Proveedor Comercial',
        status: 'activo',
        motorcyclesCount: 2,
        totalPurchases: { USD: 75000 },
      });
    });

    it('debería manejar motos sin precio de costo', async () => {
      const mockSupplierWithNullCostPrice = {
        ...mockSupplier,
        motorcycles: [
          {
            ...mockSupplier.motorcycles[0],
            costPrice: null,
          },
          {
            ...mockSupplier.motorcycles[1],
            costPrice: 30000,
          },
        ],
      };

      mockPrisma.supplier.findMany.mockResolvedValue([mockSupplierWithNullCostPrice]);

      const result = await getSuppliersReport();

      expect(result.summary.totalPurchases).toEqual({ USD: 30000 });
      expect(result.purchasesBySupplier['Proveedor Comercial'].purchases).toEqual({ USD: 30000 });
    });
  });

  describe('Casos de error', () => {
    it('debería devolver reporte vacío cuando no se puede obtener la organización', async () => {
      mockGetOrganization.mockResolvedValue({ 
        organizationId: null, 
        error: 'Sesión no válida' 
      });

      const result = await getSuppliersReport();

      expect(result).toEqual({
        summary: {
          totalSuppliers: 0,
          activeSuppliers: 0,
          inactiveSuppliers: 0,
          totalPurchases: {},
        },
        purchasesBySupplier: {},
        purchasesByMonth: {},
        supplierDetails: [],
      });
    });

    it('debería manejar error de base de datos', async () => {
      mockPrisma.supplier.findMany.mockRejectedValue(new Error('Database connection failed'));

      await expect(getSuppliersReport()).rejects.toThrow('Database connection failed');
    });

        it('debería manejar proveedores sin motos', async () => {      const mockSupplierWithoutMotorcycles = {        ...mockSupplier,        motorcycles: [],      };      mockPrisma.supplier.findMany.mockResolvedValue([mockSupplierWithoutMotorcycles]);      const result = await getSuppliersReport();      expect(result.summary.totalSuppliers).toBe(1);      expect(result.summary.totalPurchases).toEqual({});      expect(result.purchasesBySupplier['Proveedor Comercial']).toEqual({        motorcyclesCount: 0,        purchases: {},      });      expect(result.supplierDetails[0].motorcyclesCount).toBe(0);    });

    it('debería manejar motos sin fecha de creación', async () => {
      const mockSupplierWithNullCreatedAt = {
        ...mockSupplier,
        motorcycles: [
          {
            ...mockSupplier.motorcycles[0],
            createdAt: null,
          },
        ],
      };

      mockPrisma.supplier.findMany.mockResolvedValue([mockSupplierWithNullCreatedAt]);

      const result = await getSuppliersReport();

      expect(result.purchasesByMonth).toEqual({});
    });
  });

  describe('Casos edge', () => {
    it('debería manejar lista vacía de proveedores', async () => {
      mockPrisma.supplier.findMany.mockResolvedValue([]);

      const result = await getSuppliersReport();

      expect(result.summary.totalSuppliers).toBe(0);
      expect(result.summary.activeSuppliers).toBe(0);
      expect(result.summary.inactiveSuppliers).toBe(0);
      expect(result.summary.totalPurchases).toEqual({});
      expect(result.purchasesBySupplier).toEqual({});
      expect(result.purchasesByMonth).toEqual({});
      expect(result.supplierDetails).toEqual([]);
    });

    it('debería verificar que se llame a Prisma con parámetros correctos sin filtros', async () => {
      await getSuppliersReport();

      expect(mockPrisma.supplier.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
        },
        select: {
          id: true,
          legalName: true,
          commercialName: true,
          status: true,
          motorcycles: {
            where: undefined,
            select: {
              id: true,
              costPrice: true,
              retailPrice: true,
              currency: true,
              state: true,
              createdAt: true,
            },
          },
        },
      });
    });

    it('debería manejar filtro por fechas y proveedor al mismo tiempo', async () => {
      const dateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
      };
      const supplierId = '123';

      await getSuppliersReport(dateRange, supplierId);

      expect(mockPrisma.supplier.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          id: 123,
        },
        select: {
          id: true,
          legalName: true,
          commercialName: true,
          status: true,
          motorcycles: {
            where: {
              createdAt: {
                gte: dateRange.from,
                lte: dateRange.to,
              },
            },
            select: {
              id: true,
              costPrice: true,
              retailPrice: true,
              currency: true,
              state: true,
              createdAt: true,
            },
          },
        },
      });
    });

    it('debería manejar varios proveedores con el mismo nombre comercial', async () => {
      const mockSuppliersWithSameName = [
        { ...mockSupplier, id: 1 },
        { ...mockSupplier, id: 2 },
      ];

      mockPrisma.supplier.findMany.mockResolvedValue(mockSuppliersWithSameName);

      const result = await getSuppliersReport();

      expect(result.purchasesBySupplier['Proveedor Comercial'].motorcyclesCount).toBe(4); // 2 + 2
      expect(result.purchasesBySupplier['Proveedor Comercial'].purchases.USD).toBe(150000); // 75000 + 75000
    });

    it('debería calcular correctamente ventas y stock por mes', async () => {
      const mockSupplierMixedStates = {
        ...mockSupplier,
        motorcycles: [
          {
            ...mockSupplier.motorcycles[0],
            state: 'VENDIDO',
            retailPrice: 50000,
            costPrice: 40000,
            createdAt: new Date('2024-01-15'),
          },
          {
            ...mockSupplier.motorcycles[1],
            state: 'STOCK',
            retailPrice: 45000,
            costPrice: 35000,
            createdAt: new Date('2024-01-15'),
          },
        ],
      };

      mockPrisma.supplier.findMany.mockResolvedValue([mockSupplierMixedStates]);

      const result = await getSuppliersReport();

      expect(result.purchasesByMonth['2024-01']).toEqual({
        count: 2,
        totalInvestment: 75000,
        totalSales: 50000, // Solo las vendidas
        soldCount: 1,
      });
    });
  });
}); 
