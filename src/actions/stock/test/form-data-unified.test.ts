import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getBranches,
  getMotosEnProgreso,
  getFormData,
  getFormDataBasic,
  getBrandsWithModels,
  type BranchData,
  type FormDataResult,
  type MotoEnProgresoData,
} from '../form-data-unified';

// Mock the Prisma module
vi.mock('@/lib/prisma', () => ({
  default: {
    $use: vi.fn(),
    organizationBrand: { findMany: vi.fn() },
    motoColor: { findMany: vi.fn() },
    branch: { findMany: vi.fn() },
    supplier: { findMany: vi.fn() },
    motorcycle: { findMany: vi.fn() },
  },
}));

// Mock the util module
vi.mock('../../util', () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  unstable_noStore: vi.fn(),
}));

// Mock suppliers module to avoid validation issues
vi.mock('../../suppliers/suppliers-unified', () => ({
  getSuppliers: vi.fn(),
}));

describe('form-data-unified', () => {
  const mockOrganizationId = 1;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Configure getOrganizationIdFromSession mock
    const { getOrganizationIdFromSession } = await import('../../util');
    (getOrganizationIdFromSession as any).mockResolvedValue(mockOrganizationId);

    // Configure suppliers mock
    const { getSuppliers } = await import('../../suppliers/suppliers-unified');
    (getSuppliers as any).mockResolvedValue({
      success: true,
      suppliers: [
        { id: 1, legalName: 'Proveedor Test' },
      ],
    });

    // Configure prisma mocks
    const prisma = await import('@/lib/prisma');
    const mockPrisma = prisma.default as any;

    mockPrisma.branch.findMany.mockResolvedValue([
      { id: 1, name: 'Sucursal Central' },
    ]);

    mockPrisma.organizationBrand.findMany.mockResolvedValue([
      {
        brand: {
          id: 1,
          name: 'Honda',
          models: [{ id: 1, name: 'CBR150' }],
        },
        color: '#FF0000',
      },
    ]);

    mockPrisma.motoColor.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'Rojo',
        colorOne: '#FF0000',
        colorTwo: null,
        type: 'SOLID',
      },
    ]);

    mockPrisma.motorcycle.findMany.mockResolvedValue([
      {
        id: 1,
        chasis: 'CH12345',
        motor: 'MT12345',
        marca: 'Honda',
        modelo: 'CBR150',
        branch: { name: 'Sucursal Central' },
      },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getBranches', () => {
    it('debería obtener sucursales exitosamente', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const prisma = await import('@/lib/prisma');

      const mockBranches = [
        { id: 1, name: 'Sucursal Central' },
        { id: 2, name: 'Sucursal Norte' },
      ];

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (prisma.default.branch.findMany as any).mockResolvedValue(mockBranches);

      // Act
      const result = await getBranches();

      // Assert
      expect(result).toEqual([
        { id: 1, nombre: 'Sucursal Central' },
        { id: 2, nombre: 'Sucursal Norte' },
      ]);
      expect(prisma.default.branch.findMany).toHaveBeenCalledWith({
        where: { organizationId: mockOrganizationId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
    });

    it('debería retornar array vacío cuando no hay organizationId', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: null });

      // Act
      const result = await getBranches();

      // Assert
      expect(result).toEqual([]);
    });

    it('debería manejar errores de base de datos', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const prisma = await import('@/lib/prisma');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (prisma.default.branch.findMany as any).mockRejectedValue(new Error('Database error'));

      // Spy en console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      const result = await getBranches();

      // Assert
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error en getBranches:', expect.any(Error));

      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe('getMotosEnProgreso', () => {
    it('debería obtener motos en progreso exitosamente', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const prisma = await import('@/lib/prisma');

      const mockMotorcycles = [
        {
          id: 1,
          chassisNumber: 'ABC123',
          brand: { name: 'Honda' },
          model: { name: 'CBR150' },
        },
        {
          id: 2,
          chassisNumber: null,
          brand: null,
          model: null,
        },
      ];

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (prisma.default.motorcycle.findMany as any).mockResolvedValue(mockMotorcycles);

      // Act
      const result = await getMotosEnProgreso();

      // Assert
      expect(result).toEqual([
        {
          id: 1,
          chassisNumber: 'ABC123',
          brandName: 'Honda',
          modelName: 'CBR150',
        },
        {
          id: 2,
          chassisNumber: 'N/A',
          brandName: 'N/A',
          modelName: 'N/A',
        },
      ]);
      expect(prisma.default.motorcycle.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          state: 'PROCESANDO',
        },
        include: {
          brand: { select: { name: true } },
          model: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });

    it('debería retornar array vacío cuando no hay organizationId', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: null });

      // Act
      const result = await getMotosEnProgreso();

      // Assert
      expect(result).toEqual([]);
    });

    it('debería manejar errores de base de datos', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const prisma = await import('@/lib/prisma');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (prisma.default.motorcycle.findMany as any).mockRejectedValue(new Error('Database error'));

      // Spy en console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      const result = await getMotosEnProgreso();

      // Assert
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error en getMotosEnProgreso:', expect.any(Error));

      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe('getFormData', () => {
    it('debería obtener datos del formulario exitosamente', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const prisma = await import('@/lib/prisma');

      const mockBrandsData = [
        {
          brand: {
            id: 1,
            name: 'Honda',
            models: [{ id: 1, name: 'CBR150' }],
          },
          color: '#FF0000',
        },
      ];

      const mockColorsData = [
        {
          id: 1,
          name: 'Rojo',
          colorOne: '#FF0000',
          colorTwo: null,
          type: 'SOLID',
        },
      ];

      const mockBranches = [
        { id: 1, name: 'Sucursal Central' },
      ];

      const mockSuppliers = [
        { id: 1, legalName: 'Proveedor Test' },
      ];

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (prisma.default.organizationBrand.findMany as any).mockResolvedValue(mockBrandsData);
      (prisma.default.motoColor.findMany as any).mockResolvedValue(mockColorsData);
      (prisma.default.branch.findMany as any).mockResolvedValue(mockBranches);
      (prisma.default.supplier.findMany as any).mockResolvedValue(mockSuppliers);

      // Act
      const result = await getFormData();

      // Assert
      expect(result).toEqual({
        availableBrands: [
          {
            id: 1,
            name: 'Honda',
            models: [{ id: 1, name: 'CBR150' }],
            color: '#FF0000',
          },
        ],
        availableColors: [
          {
            id: '1',
            name: 'Rojo',
            type: 'SOLID',
            colorOne: '#FF0000',
            colorTwo: undefined,
          },
        ],
        availableBranches: [
          { id: 1, nombre: 'Sucursal Central' },
        ],
        suppliers: mockSuppliers,
      });
    });

    it('debería fallar cuando no hay organizationId', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: null });

      // Act & Assert
      await expect(getFormData()).rejects.toThrow('Usuario no autenticado o sin organización.');
    });

    it('debería manejar errores de base de datos', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const prisma = await import('@/lib/prisma');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (prisma.default.organizationBrand.findMany as any).mockRejectedValue(new Error('Database error'));

      // Spy en console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act & Assert
      await expect(getFormData()).rejects.toThrow('No se pudieron cargar los datos necesarios para el formulario.');
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching form data:', expect.any(Error));

      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe('getFormDataBasic', () => {
    it('debería obtener datos básicos del formulario exitosamente', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const prisma = await import('@/lib/prisma');

      const mockColorsData = [
        {
          id: 1,
          name: 'Rojo',
          colorOne: '#FF0000',
          colorTwo: null,
          type: 'SOLID',
        },
      ];

      const mockBranches = [
        { id: 1, name: 'Sucursal Central' },
      ];

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (prisma.default.motoColor.findMany as any).mockResolvedValue(mockColorsData);
      (prisma.default.branch.findMany as any).mockResolvedValue(mockBranches);

      // Act
      const result = await getFormDataBasic();

      // Assert
      expect(result).toEqual({
        availableColors: [
          {
            id: '1',
            name: 'Rojo',
            type: 'SOLID',
            colorOne: '#FF0000',
            colorTwo: undefined,
          },
        ],
        availableBranches: [
          { id: 1, nombre: 'Sucursal Central' },
        ],
      });
    });

    it('debería fallar cuando no hay organizationId', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: null });

      // Act & Assert
      await expect(getFormDataBasic()).rejects.toThrow('Usuario no autenticado o sin organización.');
    });
  });

  describe('getBrandsWithModels', () => {
    it('debería obtener marcas con modelos exitosamente', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const prisma = await import('@/lib/prisma');

      const mockBrandsData = [
        {
          brand: {
            id: 1,
            name: 'Honda',
            models: [
              { id: 1, name: 'CBR150' },
              { id: 2, name: 'CBR250' },
            ],
          },
          color: '#FF0000',
        },
      ];

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (prisma.default.organizationBrand.findMany as any).mockResolvedValue(mockBrandsData);

      // Act
      const result = await getBrandsWithModels();

      // Assert
      expect(result).toEqual([
        {
          id: 1,
          name: 'Honda',
          models: [
            { id: 1, name: 'CBR150' },
            { id: 2, name: 'CBR250' },
          ],
          color: '#FF0000',
        },
      ]);
    });

    it('debería retornar array vacío cuando no hay organizationId', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: null });

      // Act
      const result = await getBrandsWithModels();

      // Assert
      expect(result).toEqual([]);
    });

    it('debería manejar errores de base de datos', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const prisma = await import('@/lib/prisma');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (prisma.default.organizationBrand.findMany as any).mockRejectedValue(new Error('Database error'));

      // Spy en console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      const result = await getBrandsWithModels();

      // Assert
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching brands with models:', expect.any(Error));

      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe('Integración de datos', () => {
    it('debería manejar colores con colorTwo definido', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const prisma = await import('@/lib/prisma');

      const mockColorsData = [
        {
          id: 1,
          name: 'Degradado',
          colorOne: '#FF0000',
          colorTwo: '#00FF00',
          type: 'GRADIENT',
        },
      ];

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });
      (prisma.default.motoColor.findMany as any).mockResolvedValue(mockColorsData);
      (prisma.default.branch.findMany as any).mockResolvedValue([]);

      // Act
      const result = await getFormDataBasic();

      // Assert
      expect(result.availableColors[0]).toEqual({
        id: '1',
        name: 'Degradado',
        type: 'GRADIENT',
        colorOne: '#FF0000',
        colorTwo: '#00FF00',
      });
    });

    it('debería ordenar datos correctamente', async () => {
      // Arrange
      const { getOrganizationIdFromSession } = await import('../../util');
      const prisma = await import('@/lib/prisma');

      (getOrganizationIdFromSession as any).mockResolvedValue({ organizationId: mockOrganizationId });

      // Act
      await getBranches();

      // Assert
      expect(prisma.default.branch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        })
      );
    });
  });
}); 
