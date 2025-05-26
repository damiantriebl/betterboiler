import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getMotorcycleById } from '../get-motorcycle-by-id';

// Mock de dependencias
vi.mock('@/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    motorcycle: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

describe('getMotorcycleById', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      organizationId: 'org-123',
      email: 'user@test.com',
    },
  };

  const mockMotorcycle: any = {
    id: 1,
    brandId: 1,
    modelId: 1,
    colorId: 1,
    branchId: 1,
    year: 2023,
    displacement: 150,
    mileage: 1000,
    retailPrice: 5000,
    wholesalePrice: 4500,
    costPrice: 4000,
    currency: 'USD',
    state: 'STOCK',
    chassisNumber: 'ABC123',
    engineNumber: 'ENG456',
    organizationId: 'org-123',
    sellerId: null,
    clientId: null,
    soldAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    brand: {
      id: 1,
      name: 'Honda',
      organizationId: 'org-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    model: {
      id: 1,
      name: 'CBR150',
      brandId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      imageUrl: null,
      specSheetUrl: null,
      additionalFilesJson: null,
      files: [
        {
          id: 'file-1',
          name: 'manual.pdf',
          url: 'https://example.com/manual.pdf',
          type: 'spec',
          s3Key: 'models/honda/cbr150/manual.pdf',
          s3KeySmall: null,
          size: 1024,
          modelId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ],
    },
    branch: {
      id: 1,
      name: 'Sucursal Central',
      organizationId: 'org-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    color: {
      id: 1,
      name: 'Rojo',
      colorOne: '#FF0000',
      colorTwo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    client: null,
    reservations: [
      {
        id: 1,
        amount: 500,
        currency: 'USD',
        expirationDate: new Date('2024-12-31'),
        notes: 'Reserva de prueba',
        paymentMethod: 'CASH',
        status: 'active',
        motorcycleId: 1,
        clientId: 'client-123',
        organizationId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        client: {
          id: 'client-123',
          firstName: 'Juan',
          lastName: 'Pérez',
          email: 'juan@test.com',
          phone: '123456789',
          address: 'Dirección 123',
          organizationId: 'org-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }
    ],
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock headers function
    const { headers } = await import('next/headers');
    (headers as any).mockResolvedValue(new Headers());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Casos exitosos', () => {
    it('debería obtener una motocicleta por ID correctamente', async () => {
      // Arrange
      const { auth } = await import('@/auth');
      const prisma = await import('@/lib/prisma');
      
      (auth.api.getSession as any).mockResolvedValue(mockSession);
      (prisma.default.motorcycle.findUnique as any).mockResolvedValue(mockMotorcycle);

      // Act
      const result = await getMotorcycleById('1');

      // Assert
      expect(result).toEqual(mockMotorcycle);
      expect(auth.api.getSession).toHaveBeenCalledWith({ headers: expect.any(Headers) });
      expect(prisma.default.motorcycle.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1,
          organizationId: 'org-123',
        },
        include: {
          brand: true,
          model: {
            include: {
              files: true,
            },
          },
          branch: true,
          color: true,
          client: true,
          reservations: {
            include: { client: true },
          },
        },
      });
    });

    it('debería manejar motocicleta sin relaciones opcionales', async () => {
      // Arrange
      const { auth } = await import('@/auth');
      const prisma = await import('@/lib/prisma');
      
      const minimumMotorcycle = {
        ...mockMotorcycle,
        brand: null,
        model: null,
        branch: null,
        color: null,
        client: null,
        reservations: [],
      };

      (auth.api.getSession as any).mockResolvedValue(mockSession);
      (prisma.default.motorcycle.findUnique as any).mockResolvedValue(minimumMotorcycle);

      // Act
      const result = await getMotorcycleById('1');

      // Assert
      expect(result).toEqual(minimumMotorcycle);
      expect(result?.brand).toBeNull();
      expect(result?.model).toBeNull();
    });

    it('debería convertir ID string a número correctamente', async () => {
      // Arrange
      const { auth } = await import('@/auth');
      const prisma = await import('@/lib/prisma');
      
      (auth.api.getSession as any).mockResolvedValue(mockSession);
      (prisma.default.motorcycle.findUnique as any).mockResolvedValue(mockMotorcycle);

      // Act
      await getMotorcycleById('999');

      // Assert
      expect(prisma.default.motorcycle.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 999,
          }),
        })
      );
    });
  });

  describe('Casos de error de autenticación', () => {
    it('debería retornar null cuando no hay sesión', async () => {
      // Arrange
      const { auth } = await import('@/auth');
      const prisma = await import('@/lib/prisma');
      
      (auth.api.getSession as any).mockResolvedValue(null);

      // Act
      const result = await getMotorcycleById('1');

      // Assert
      expect(result).toBeNull();
      expect(prisma.default.motorcycle.findUnique).not.toHaveBeenCalled();
    });

    it('debería retornar null cuando no hay organizationId', async () => {
      // Arrange
      const { auth } = await import('@/auth');
      const prisma = await import('@/lib/prisma');
      
      const sessionWithoutOrg = {
        user: {
          id: 'user-123',
          organizationId: null,
        },
      };
      (auth.api.getSession as any).mockResolvedValue(sessionWithoutOrg);

      // Act
      const result = await getMotorcycleById('1');

      // Assert
      expect(result).toBeNull();
      expect(prisma.default.motorcycle.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('Casos de no encontrado', () => {
    it('debería retornar null cuando la motocicleta no existe', async () => {
      // Arrange
      const { auth } = await import('@/auth');
      const prisma = await import('@/lib/prisma');
      
      (auth.api.getSession as any).mockResolvedValue(mockSession);
      (prisma.default.motorcycle.findUnique as any).mockResolvedValue(null);

      // Act
      const result = await getMotorcycleById('999');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('Manejo de errores de base de datos', () => {
    it('debería manejar errores de Prisma y retornar null', async () => {
      // Arrange
      const { auth } = await import('@/auth');
      const prisma = await import('@/lib/prisma');
      
      (auth.api.getSession as any).mockResolvedValue(mockSession);
      (prisma.default.motorcycle.findUnique as any).mockRejectedValue(new Error('Database connection failed'));

      // Spy en console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      const result = await getMotorcycleById('1');

      // Assert
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error al obtener la moto:', expect.any(Error));

      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe('Estructura de datos', () => {
    it('debería incluir todas las relaciones especificadas', async () => {
      // Arrange
      const { auth } = await import('@/auth');
      const prisma = await import('@/lib/prisma');
      
      (auth.api.getSession as any).mockResolvedValue(mockSession);
      (prisma.default.motorcycle.findUnique as any).mockResolvedValue(mockMotorcycle);

      // Act
      const result = await getMotorcycleById('1');

      // Assert
      expect(result).toHaveProperty('brand');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('branch');
      expect(result).toHaveProperty('color');
      expect(result).toHaveProperty('client');
      expect(result).toHaveProperty('reservations');
      
      // Verificar que model incluye files
      expect(result?.model).toHaveProperty('files');
      expect(Array.isArray(result?.model?.files)).toBe(true);
      
      // Verificar que reservations incluye client
      expect(result?.reservations?.[0]).toHaveProperty('client');
    });
  });
}); 
