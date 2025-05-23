import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import {
  createClient,
  updateClient,
  deleteClient,
  getClients,
  getClientById,
} from '../manage-clients';
import prisma from '@/lib/prisma';
import { clientSchema } from '@/zod/ClientsZod';
import type { ClientFormData } from '@/zod/ClientsZod';

// Mock de Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// Mock de console para tests silenciosos
const mockConsole = {
  error: vi.fn(),
  log: vi.fn(),
};

const mockRevalidatePath = revalidatePath as any;
const mockPrisma = prisma as any;

describe('Clients Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockClient = {
    id: 'client-123',
    type: 'Individual',
    firstName: 'Juan',
    lastName: 'Pérez',
    companyName: null,
    taxId: '20-12345678-9',
    email: 'juan.perez@example.com',
    phone: '+5491123456789',
    mobile: '+5491198765432',
    address: 'Av. Corrientes 1234, CABA',
    status: 'active',
    notes: 'Cliente regular',
    vatStatus: 'Responsable Inscripto',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  const validClientData: ClientFormData = {
    type: 'Individual',
    firstName: 'Juan',
    lastName: 'Pérez',
    companyName: undefined,
    taxId: '20-12345678-9',
    email: 'juan.perez@example.com',
    phone: '+5491123456789',
    mobile: '+5491198765432',
    address: 'Av. Corrientes 1234, CABA',
    status: 'active',
    notes: 'Cliente regular',
    vatStatus: 'Responsable Inscripto',
  };

  describe('✨ createClient', () => {
    describe('✅ Successful Creation', () => {
      it('should create individual client successfully', async () => {
        // Arrange
        mockPrisma.client.create.mockResolvedValue(mockClient);

        // Act
        const result = await createClient(validClientData);

        // Assert
        expect(mockPrisma.client.create).toHaveBeenCalledWith({
          data: validClientData,
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/clients');
        expect(result).toEqual(mockClient);
      });

      it('should create legal entity client successfully', async () => {
        // Arrange
        const legalEntityData: ClientFormData = {
          type: 'LegalEntity',
          firstName: 'ACME Corporation',
          lastName: undefined,
          companyName: 'ACME Corporation S.A.',
          taxId: '30-12345678-9',
          email: 'info@acme.com',
          phone: '+5411-4567-8900',
          mobile: undefined,
          address: 'Av. 9 de Julio 1000, CABA',
          status: 'active',
          notes: 'Empresa de tecnología',
          vatStatus: 'Responsable Inscripto',
        };

        const legalEntityClient = {
          ...mockClient,
          type: 'LegalEntity',
          firstName: 'ACME Corporation',
          lastName: null,
          companyName: 'ACME Corporation S.A.',
          taxId: '30-12345678-9',
          email: 'info@acme.com',
        };

        mockPrisma.client.create.mockResolvedValue(legalEntityClient);

        // Act
        const result = await createClient(legalEntityData);

        // Assert
        expect(result.type).toBe('LegalEntity');
        expect(result.companyName).toBe('ACME Corporation S.A.');
        expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/clients');
      });

      it('should create client with minimal required data', async () => {
        // Arrange
        const minimalData: ClientFormData = {
          type: 'Individual',
          firstName: 'María',
          taxId: '27-87654321-0',
          email: 'maria@example.com',
          status: 'active',
        };

        const minimalClient = {
          ...mockClient,
          firstName: 'María',
          lastName: null,
          companyName: null,
          taxId: '27-87654321-0',
          email: 'maria@example.com',
          phone: null,
          mobile: null,
          address: null,
          notes: null,
          vatStatus: null,
        };

        mockPrisma.client.create.mockResolvedValue(minimalClient);

        // Act
        const result = await createClient(minimalData);

        // Assert
        expect(result).toEqual(minimalClient);
        expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/clients');
      });

      it('should create inactive client successfully', async () => {
        // Arrange
        const inactiveClientData = { ...validClientData, status: 'inactive' as const };
        const inactiveClient = { ...mockClient, status: 'inactive' };

        mockPrisma.client.create.mockResolvedValue(inactiveClient);

        // Act
        const result = await createClient(inactiveClientData);

        // Assert
        expect(result.status).toBe('inactive');
        expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/clients');
      });
    });

    describe('❌ Validation Errors', () => {
      it('should throw error for missing firstName', async () => {
        // Arrange
        const invalidData = { ...validClientData, firstName: '' };

        // Act & Assert
        await expect(createClient(invalidData)).rejects.toThrow();
        expect(mockPrisma.client.create).not.toHaveBeenCalled();
        expect(mockRevalidatePath).not.toHaveBeenCalled();
      });

      it('should throw error for invalid email', async () => {
        // Arrange
        const invalidData = { ...validClientData, email: 'invalid-email' };

        // Act & Assert
        await expect(createClient(invalidData)).rejects.toThrow();
        expect(mockPrisma.client.create).not.toHaveBeenCalled();
      });

      it('should throw error for short taxId', async () => {
        // Arrange
        const invalidData = { ...validClientData, taxId: '123' };

        // Act & Assert
        await expect(createClient(invalidData)).rejects.toThrow();
        expect(mockPrisma.client.create).not.toHaveBeenCalled();
      });

      it('should throw error for invalid type', async () => {
        // Arrange
        const invalidData = { ...validClientData, type: 'InvalidType' as any };

        // Act & Assert
        await expect(createClient(invalidData)).rejects.toThrow();
        expect(mockPrisma.client.create).not.toHaveBeenCalled();
      });

      it('should throw error for invalid status', async () => {
        // Arrange
        const invalidData = { ...validClientData, status: 'invalid-status' as any };

        // Act & Assert
        await expect(createClient(invalidData)).rejects.toThrow();
        expect(mockPrisma.client.create).not.toHaveBeenCalled();
      });
    });

    describe('❌ Database Errors', () => {
      it('should handle database creation error', async () => {
        // Arrange
        mockPrisma.client.create.mockRejectedValue(new Error('Database error'));

        // Act & Assert
        await expect(createClient(validClientData)).rejects.toThrow('Database error');
        expect(mockRevalidatePath).not.toHaveBeenCalled();
      });

      it('should handle unique constraint violation', async () => {
        // Arrange
        const uniqueError = new Error('Unique constraint violation');
        mockPrisma.client.create.mockRejectedValue(uniqueError);

        // Act & Assert
        await expect(createClient(validClientData)).rejects.toThrow(uniqueError);
        expect(mockRevalidatePath).not.toHaveBeenCalled();
      });
    });
  });

  describe('✏️ updateClient', () => {
    const clientId = 'client-123';

    describe('✅ Successful Update', () => {
      it('should update client with partial data', async () => {
        // Arrange
        const updateData = {
          firstName: 'Juan Carlos',
          email: 'juancarlos@example.com',
        };

        const updatedClient = { ...mockClient, ...updateData };
        mockPrisma.client.update.mockResolvedValue(updatedClient);

        // Act
        const result = await updateClient(clientId, updateData);

        // Assert
        expect(mockPrisma.client.update).toHaveBeenCalledWith({
          where: { id: clientId },
          data: updateData,
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/clients');
        expect(result.firstName).toBe('Juan Carlos');
        expect(result.email).toBe('juancarlos@example.com');
      });

      it('should update single field', async () => {
        // Arrange
        const updateData = { phone: '+5491199887766' };
        const updatedClient = { ...mockClient, phone: '+5491199887766' };

        mockPrisma.client.update.mockResolvedValue(updatedClient);

        // Act
        const result = await updateClient(clientId, updateData);

        // Assert
        expect(mockPrisma.client.update).toHaveBeenCalledWith({
          where: { id: clientId },
          data: updateData,
        });
        expect(result.phone).toBe('+5491199887766');
        expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/clients');
      });

      it('should update client status', async () => {
        // Arrange
        const updateData = { status: 'inactive' as const };
        const updatedClient = { ...mockClient, status: 'inactive' };

        mockPrisma.client.update.mockResolvedValue(updatedClient);

        // Act
        const result = await updateClient(clientId, updateData);

        // Assert
        expect(result.status).toBe('inactive');
        expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/clients');
      });

      it('should update multiple fields', async () => {
        // Arrange
        const updateData = {
          firstName: 'Pedro',
          lastName: 'González',
          email: 'pedro.gonzalez@example.com',
          address: 'Nueva Dirección 456',
          notes: 'Cliente actualizado',
        };

        const updatedClient = { ...mockClient, ...updateData };
        mockPrisma.client.update.mockResolvedValue(updatedClient);

        // Act
        const result = await updateClient(clientId, updateData);

        // Assert
        expect(result).toEqual(updatedClient);
        expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/clients');
      });

      it('should handle empty update data', async () => {
        // Arrange
        const updateData = {};
        mockPrisma.client.update.mockResolvedValue(mockClient);

        // Act
        const result = await updateClient(clientId, updateData);

        // Assert
        expect(mockPrisma.client.update).toHaveBeenCalledWith({
          where: { id: clientId },
          data: {},
        });
        expect(result).toEqual(mockClient);
      });
    });

    describe('❌ Validation Errors', () => {
      it('should throw error for invalid email in update', async () => {
        // Arrange
        const invalidUpdateData = { email: 'invalid-email' };

        // Act & Assert
        await expect(updateClient(clientId, invalidUpdateData)).rejects.toThrow();
        expect(mockPrisma.client.update).not.toHaveBeenCalled();
        expect(mockRevalidatePath).not.toHaveBeenCalled();
      });

      it('should throw error for invalid taxId in update', async () => {
        // Arrange
        const invalidUpdateData = { taxId: '123' };

        // Act & Assert
        await expect(updateClient(clientId, invalidUpdateData)).rejects.toThrow();
        expect(mockPrisma.client.update).not.toHaveBeenCalled();
      });

      it('should throw error for empty firstName in update', async () => {
        // Arrange
        const invalidUpdateData = { firstName: '' };

        // Act & Assert
        await expect(updateClient(clientId, invalidUpdateData)).rejects.toThrow();
        expect(mockPrisma.client.update).not.toHaveBeenCalled();
      });
    });

    describe('❌ Database Errors', () => {
      it('should handle update error for non-existent client', async () => {
        // Arrange
        const updateData = { firstName: 'Updated Name' };
        mockPrisma.client.update.mockRejectedValue(new Error('Record not found'));

        // Act & Assert
        await expect(updateClient(clientId, updateData)).rejects.toThrow('Record not found');
        expect(mockRevalidatePath).not.toHaveBeenCalled();
      });

      it('should handle database connection error', async () => {
        // Arrange
        const updateData = { firstName: 'Test' };
        mockPrisma.client.update.mockRejectedValue(new Error('Connection failed'));

        // Act & Assert
        await expect(updateClient(clientId, updateData)).rejects.toThrow('Connection failed');
        expect(mockRevalidatePath).not.toHaveBeenCalled();
      });
    });
  });

  describe('🗑️ deleteClient', () => {
    const clientId = 'client-123';

    describe('✅ Successful Deletion', () => {
      it('should delete client successfully', async () => {
        // Arrange
        mockPrisma.client.delete.mockResolvedValue(mockClient);

        // Act
        const result = await deleteClient(clientId);

        // Assert
        expect(mockPrisma.client.delete).toHaveBeenCalledWith({
          where: { id: clientId },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/clients');
        expect(result).toEqual(mockClient);
      });

      it('should handle deletion of different client types', async () => {
        // Arrange
        const legalEntityClient = { ...mockClient, type: 'LegalEntity' };
        mockPrisma.client.delete.mockResolvedValue(legalEntityClient);

        // Act
        const result = await deleteClient(clientId);

        // Assert
        expect(result.type).toBe('LegalEntity');
        expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/clients');
      });
    });

    describe('❌ Database Errors', () => {
      it('should handle deletion error for non-existent client', async () => {
        // Arrange
        mockPrisma.client.delete.mockRejectedValue(new Error('Record not found'));

        // Act & Assert
        await expect(deleteClient(clientId)).rejects.toThrow('Record not found');
        expect(mockRevalidatePath).not.toHaveBeenCalled();
      });

      it('should handle foreign key constraint error', async () => {
        // Arrange
        const constraintError = new Error('Foreign key constraint violation');
        mockPrisma.client.delete.mockRejectedValue(constraintError);

        // Act & Assert
        await expect(deleteClient(clientId)).rejects.toThrow(constraintError);
        expect(mockRevalidatePath).not.toHaveBeenCalled();
      });

      it('should handle database connection error', async () => {
        // Arrange
        mockPrisma.client.delete.mockRejectedValue(new Error('Database unavailable'));

        // Act & Assert
        await expect(deleteClient(clientId)).rejects.toThrow('Database unavailable');
        expect(mockRevalidatePath).not.toHaveBeenCalled();
      });
    });
  });

  describe('📋 getClients', () => {
    describe('✅ Successful Retrieval', () => {
      it('should return all clients ordered by firstName', async () => {
        // Arrange
        const clients = [
          { ...mockClient, firstName: 'Ana', id: 'client-1' },
          { ...mockClient, firstName: 'Carlos', id: 'client-2' },
          { ...mockClient, firstName: 'Beatriz', id: 'client-3' },
        ];

        mockPrisma.client.findMany.mockResolvedValue(clients);

        // Act
        const result = await getClients();

        // Assert
        expect(mockPrisma.client.findMany).toHaveBeenCalledWith({
          orderBy: { firstName: 'asc' },
        });
        expect(result).toEqual(clients);
        expect(result).toHaveLength(3);
      });

      it('should return empty array when no clients exist', async () => {
        // Arrange
        mockPrisma.client.findMany.mockResolvedValue([]);

        // Act
        const result = await getClients();

        // Assert
        expect(result).toEqual([]);
        expect(mockPrisma.client.findMany).toHaveBeenCalledWith({
          orderBy: { firstName: 'asc' },
        });
      });

      it('should handle mix of individual and legal entity clients', async () => {
        // Arrange
        const clients = [
          { ...mockClient, type: 'Individual', firstName: 'Ana' },
          { ...mockClient, type: 'LegalEntity', firstName: 'ACME Corp', companyName: 'ACME Corporation' },
        ];

        mockPrisma.client.findMany.mockResolvedValue(clients);

        // Act
        const result = await getClients();

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].type).toBe('Individual');
        expect(result[1].type).toBe('LegalEntity');
        expect(result[1].companyName).toBe('ACME Corporation');
      });

      it('should handle clients with different statuses', async () => {
        // Arrange
        const clients = [
          { ...mockClient, status: 'active', firstName: 'Active Client' },
          { ...mockClient, status: 'inactive', firstName: 'Inactive Client' },
        ];

        mockPrisma.client.findMany.mockResolvedValue(clients);

        // Act
        const result = await getClients();

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].status).toBe('active');
        expect(result[1].status).toBe('inactive');
      });
    });

    describe('❌ Database Errors', () => {
      it('should handle database query error', async () => {
        // Arrange
        mockPrisma.client.findMany.mockRejectedValue(new Error('Query failed'));

        // Act & Assert
        await expect(getClients()).rejects.toThrow('Query failed');
      });

      it('should handle timeout error', async () => {
        // Arrange
        mockPrisma.client.findMany.mockRejectedValue(new Error('Query timeout'));

        // Act & Assert
        await expect(getClients()).rejects.toThrow('Query timeout');
      });
    });
  });

  describe('🔍 getClientById', () => {
    const clientId = 'client-123';

    describe('✅ Successful Retrieval', () => {
      it('should return client when found', async () => {
        // Arrange
        mockPrisma.client.findUnique.mockResolvedValue(mockClient);

        // Act
        const result = await getClientById(clientId);

        // Assert
        expect(mockPrisma.client.findUnique).toHaveBeenCalledWith({
          where: { id: clientId },
        });
        expect(result).toEqual(mockClient);
      });

      it('should return null when client not found', async () => {
        // Arrange
        mockPrisma.client.findUnique.mockResolvedValue(null);

        // Act
        const result = await getClientById('non-existent');

        // Assert
        expect(result).toBe(null);
        expect(mockPrisma.client.findUnique).toHaveBeenCalledWith({
          where: { id: 'non-existent' },
        });
      });

      it('should handle different client types', async () => {
        // Arrange
        const legalEntityClient = { ...mockClient, type: 'LegalEntity' };
        mockPrisma.client.findUnique.mockResolvedValue(legalEntityClient);

        // Act
        const result = await getClientById(clientId);

        // Assert
        expect(result?.type).toBe('LegalEntity');
      });
    });

    describe('❌ Database Errors', () => {
      it('should handle database query error', async () => {
        // Arrange
        mockPrisma.client.findUnique.mockRejectedValue(new Error('Database error'));

        // Act & Assert
        await expect(getClientById(clientId)).rejects.toThrow('Database error');
      });

      it('should handle connection timeout', async () => {
        // Arrange
        mockPrisma.client.findUnique.mockRejectedValue(new Error('Connection timeout'));

        // Act & Assert
        await expect(getClientById(clientId)).rejects.toThrow('Connection timeout');
      });
    });
  });

  describe('🔄 Cache Revalidation', () => {
    it('should revalidate cache on successful create', async () => {
      // Arrange
      mockPrisma.client.create.mockResolvedValue(mockClient);

      // Act
      await createClient(validClientData);

      // Assert
      expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/clients');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(1);
    });

    it('should revalidate cache on successful update', async () => {
      // Arrange
      mockPrisma.client.update.mockResolvedValue(mockClient);

      // Act
      await updateClient('client-123', { firstName: 'Updated' });

      // Assert
      expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/clients');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(1);
    });

    it('should revalidate cache on successful delete', async () => {
      // Arrange
      mockPrisma.client.delete.mockResolvedValue(mockClient);

      // Act
      await deleteClient('client-123');

      // Assert
      expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/clients');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(1);
    });

    it('should not revalidate cache on errors', async () => {
      // Arrange
      mockPrisma.client.create.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(createClient(validClientData)).rejects.toThrow();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('🎯 Edge Cases', () => {
    it('should handle very long field values', async () => {
      // Arrange
      const longData = {
        ...validClientData,
        firstName: 'a'.repeat(1000),
        notes: 'Very long notes: ' + 'x'.repeat(2000),
      };

      const longClient = { ...mockClient, ...longData };
      mockPrisma.client.create.mockResolvedValue(longClient);

      // Act
      const result = await createClient(longData);

      // Assert
      expect(result.firstName).toBe(longData.firstName);
      expect(result.notes).toBe(longData.notes);
    });

    it('should handle special characters in data', async () => {
      // Arrange
      const specialData = {
        ...validClientData,
        firstName: 'José María',
        lastName: 'Fernández-López',
        address: 'Av. 9 de Julio 1234, 2° "A"',
        notes: 'Cliente con caracteres especiales: @#$%^&*()',
      };

      const specialClient = { ...mockClient, ...specialData };
      mockPrisma.client.create.mockResolvedValue(specialClient);

      // Act
      const result = await createClient(specialData);

      // Assert
      expect(result.firstName).toBe('José María');
      expect(result.lastName).toBe('Fernández-López');
    });

    it('should handle unicode characters', async () => {
      // Arrange
      const unicodeData = {
        ...validClientData,
        firstName: '春节快乐',
        address: 'Россия, Москва',
        notes: 'Cliente internacional 🌍🎉',
      };

      const unicodeClient = { ...mockClient, ...unicodeData };
      mockPrisma.client.create.mockResolvedValue(unicodeClient);

      // Act
      const result = await createClient(unicodeData);

      // Assert
      expect(result.firstName).toBe('春节快乐');
      expect(result.address).toBe('Россия, Москва');
      expect(result.notes).toBe('Cliente internacional 🌍🎉');
    });
  });

  describe('🔐 Security Considerations', () => {
    it('should handle potential injection in string fields', async () => {
      // Arrange
      const maliciousData = {
        ...validClientData,
        firstName: "'; DROP TABLE clients; --",
        notes: '<script>alert("xss")</script>',
      };

      const safeClient = { ...mockClient, ...maliciousData };
      mockPrisma.client.create.mockResolvedValue(safeClient);

      // Act
      const result = await createClient(maliciousData);

      // Assert
      expect(result.firstName).toBe(maliciousData.firstName);
      expect(result.notes).toBe(maliciousData.notes);
      // Prisma should handle SQL injection protection
      expect(mockPrisma.client.create).toHaveBeenCalledWith({
        data: maliciousData,
      });
    });

    it('should validate data through Zod schema', async () => {
      // Arrange
      const validData = validClientData;

      // Act
      const parsed = clientSchema.safeParse(validData);

      // Assert
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.firstName).toBe(validData.firstName);
        expect(parsed.data.email).toBe(validData.email);
      }
    });
  });
}); 