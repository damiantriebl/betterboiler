import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient, updateClient, deleteClient, getClients, getClientById } from '@/actions/clients/manage-clients';
import { ClientFormData } from '@/zod/ClientsZod';

// Definir el tipo completo que incluye propiedades adicionales de Prisma
type ClientWithId = ClientFormData & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Convertir opcionales a null para coincidir con el modelo Prisma
  lastName: string | null;
  companyName: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  vatStatus: string | null;
  notes: string | null;
};

// Mock del módulo completo de Prisma
vi.mock('@/lib/prisma', () => {
  const mockCreate = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockFindMany = vi.fn();
  const mockFindUnique = vi.fn();
  
  return {
    default: {
      client: {
        create: mockCreate,
        update: mockUpdate,
        delete: mockDelete,
        findMany: mockFindMany,
        findUnique: mockFindUnique,
      },
    },
  };
});

// Mock de la función revalidatePath de Next.js
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Importar el mock para poder configurarlo en las pruebas
import prisma from '@/lib/prisma';

describe('Client Management Actions', () => {
  // Date estable para pruebas
  const testDate = new Date('2023-01-01');
  
  // Datos completos para el cliente mock
  const mockClientData: ClientFormData = {
    type: 'Individual',
    firstName: 'Juan',
    lastName: 'Pérez',
    taxId: '12345678901',
    email: 'juan@example.com',
    phone: '123456789',
    status: 'active',
  };

  // Cliente con datos completos incluyendo campos de Prisma
  const mockClientComplete: ClientWithId = {
    id: 'client123',
    ...mockClientData,
    // Convertir opcionales a null para coincidir con el modelo Prisma
    lastName: mockClientData.lastName || null,
    companyName: null,
    mobile: null,
    address: null,
    vatStatus: null,
    notes: null,
    // Añadir campos de Prisma
    createdAt: testDate,
    updatedAt: testDate,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createClient', () => {
    it('should create a new client successfully', async () => {
      // Configurar el mock para simular una creación exitosa
      vi.mocked(prisma.client.create).mockResolvedValue(mockClientComplete);

      // Ejecutar la función
      const result = await createClient(mockClientData);

      // Verificar que se llamó a prisma.client.create con los datos correctos
      expect(prisma.client.create).toHaveBeenCalledWith({
        data: mockClientData,
      });

      // Verificar que el resultado es el esperado
      expect(result).toEqual(mockClientComplete);
    });

    it('should throw an error if the client data is invalid', async () => {
      // Datos inválidos: falta el email
      const invalidClient = {
        type: 'Individual',
        firstName: 'Juan',
        taxId: '12345678901',
      } as ClientFormData;

      // Verificar que la función arroja un error
      await expect(createClient(invalidClient)).rejects.toThrow();
      
      // Verificar que no se llamó a prisma.client.create
      expect(prisma.client.create).not.toHaveBeenCalled();
    });
  });

  describe('updateClient', () => {
    it('should update an existing client successfully', async () => {
      const updateData = { firstName: 'Juan Carlos' };
      const updatedClient: ClientWithId = {
        ...mockClientComplete,
        firstName: 'Juan Carlos',
      };
      
      // Configurar el mock para simular una actualización exitosa
      vi.mocked(prisma.client.update).mockResolvedValue(updatedClient);

      // Ejecutar la función
      const result = await updateClient(mockClientComplete.id, updateData);

      // Verificar que se llamó a prisma.client.update con los datos correctos
      expect(prisma.client.update).toHaveBeenCalledWith({
        where: { id: mockClientComplete.id },
        data: updateData,
      });

      // Verificar que el resultado es el esperado
      expect(result).toEqual(updatedClient);
    });
  });

  describe('deleteClient', () => {
    it('should delete a client successfully', async () => {
      // Configurar el mock para simular una eliminación exitosa
      vi.mocked(prisma.client.delete).mockResolvedValue(mockClientComplete);

      // Ejecutar la función
      const result = await deleteClient(mockClientComplete.id);

      // Verificar que se llamó a prisma.client.delete con los datos correctos
      expect(prisma.client.delete).toHaveBeenCalledWith({
        where: { id: mockClientComplete.id },
      });

      // Verificar que el resultado es el esperado
      expect(result).toEqual(mockClientComplete);
    });
  });

  describe('getClients', () => {
    it('should fetch all clients successfully', async () => {
      const mockClients: ClientWithId[] = [
        mockClientComplete,
        {
          ...mockClientComplete,
          id: 'client2',
          firstName: 'María',
        },
      ];

      // Configurar el mock para simular una búsqueda exitosa
      vi.mocked(prisma.client.findMany).mockResolvedValue(mockClients);

      // Ejecutar la función
      const result = await getClients();

      // Verificar que se llamó a prisma.client.findMany con los parámetros correctos
      expect(prisma.client.findMany).toHaveBeenCalledWith({
        orderBy: { firstName: 'asc' },
      });

      // Verificar que el resultado es el esperado
      expect(result).toEqual(mockClients);
    });
  });

  describe('getClientById', () => {
    it('should fetch a specific client successfully', async () => {
      // Configurar el mock para simular una búsqueda exitosa
      vi.mocked(prisma.client.findUnique).mockResolvedValue(mockClientComplete);

      // Ejecutar la función
      const result = await getClientById(mockClientComplete.id);

      // Verificar que se llamó a prisma.client.findUnique con los parámetros correctos
      expect(prisma.client.findUnique).toHaveBeenCalledWith({
        where: { id: mockClientComplete.id },
      });

      // Verificar que el resultado es el esperado
      expect(result).toEqual(mockClientComplete);
    });

    it('should return null if client does not exist', async () => {
      // Configurar el mock para simular un cliente no encontrado
      vi.mocked(prisma.client.findUnique).mockResolvedValue(null);

      // Ejecutar la función
      const result = await getClientById('nonexistent-id');

      // Verificar que se llamó a prisma.client.findUnique con los parámetros correctos
      expect(prisma.client.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent-id' },
      });

      // Verificar que el resultado es null
      expect(result).toBeNull();
    });
  });
}); 