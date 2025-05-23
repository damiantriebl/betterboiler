import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { updateUserAction } from '../update-user';
import prisma from '@/lib/prisma';

// Mock de Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock de console para tests silenciosos
const mockConsole = {
  error: vi.fn(),
};

const mockRevalidatePath = revalidatePath as any;
const mockPrisma = prisma as any;

describe('updateUserAction', () => {
  const initialState = { success: false };
  
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createFormData = (data: Record<string, string>) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    return formData;
  };

  const mockValidUser = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user',
    organizationId: 'org-123',
  };

  describe('✅ Successful User Update', () => {
    it('should update user successfully with all fields', async () => {
      // Arrange
      mockPrisma.user.findFirst.mockResolvedValue(null); // No duplicate email
      mockPrisma.user.update.mockResolvedValue({
        ...mockValidUser,
        phone: '+1234567890',
        address: '123 Main St',
        profileOriginal: 'original-key-123',
        profileCrop: 'crop-key-123',
      });

      // Act
      const result = await updateUserAction(initialState, createFormData({
        userId: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        address: '123 Main St',
        profileOriginalKey: 'original-key-123',
        profileCropKey: 'crop-key-123',
      }));

      // Assert
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'john@example.com',
          NOT: { id: 'user-123' },
        },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          address: '123 Main St',
          profileOriginal: 'original-key-123',
          profileCrop: 'crop-key-123',
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/profile');
      expect(result.success).toBe(true);
    });

    it('should update user with required fields only', async () => {
      // Arrange
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({
        ...mockValidUser,
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: null,
        address: null,
        profileOriginal: null,
        profileCrop: null,
      });

      // Act
      const result = await updateUserAction(initialState, createFormData({
        userId: 'user-123',
        name: 'Jane Doe',
        email: 'jane@example.com',
      }));

      // Assert
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'jane@example.com',
          NOT: { id: 'user-123' },
        },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: null,
          address: null,
          profileOriginal: null,
          profileCrop: null,
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/profile');
      expect(result.success).toBe(true);
    });

    it('should handle empty optional fields as null', async () => {
      // Arrange
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({
        ...mockValidUser,
        name: 'Test User',
        email: 'test@example.com',
        phone: null,
        address: null,
        profileOriginal: null,
        profileCrop: null,
      });

      // Act
      const result = await updateUserAction(initialState, createFormData({
        userId: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        phone: '',
        address: '',
        profileOriginalKey: '',
        profileCropKey: '',
      }));

      // Assert
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          NOT: { id: 'user-123' },
        },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          name: 'Test User',
          email: 'test@example.com',
          phone: null,
          address: null,
          profileOriginal: null,
          profileCrop: null,
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/profile');
      expect(result.success).toBe(true);
    });
  });

  describe('❌ Validation Errors', () => {
    it('should return error when userId is missing', async () => {
      // Arrange
      const formData = createFormData({
        name: 'John Doe',
        email: 'john@example.com',
      });

      // Act
      const result = await updateUserAction(initialState, formData);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Los campos nombre y email son obligatorios',
      });
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('should return error when name is missing', async () => {
      // Arrange
      const formData = createFormData({
        userId: 'user-123',
        email: 'john@example.com',
      });

      // Act
      const result = await updateUserAction(initialState, formData);

      // Assert
      expect(result.error).toBe('Los campos nombre y email son obligatorios');
      expect(result.success).toBe(false);
    });

    it('should return error when email is missing', async () => {
      // Arrange
      const formData = createFormData({
        userId: 'user-123',
        name: 'John Doe',
      });

      // Act
      const result = await updateUserAction(initialState, formData);

      // Assert
      expect(result.error).toBe('Los campos nombre y email son obligatorios');
      expect(result.success).toBe(false);
    });

    it('should return error when all required fields are missing', async () => {
      // Arrange
      const formData = new FormData();

      // Act
      const result = await updateUserAction(initialState, formData);

      // Assert
      expect(result.error).toBe('Los campos nombre y email son obligatorios');
      expect(result.success).toBe(false);
    });
  });

  describe('🔍 Email Duplication Check', () => {
    it('should return error when email is already in use by another user', async () => {
      // Arrange
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'other-user-456',
        email: 'existing@example.com',
      });

      // Act
      const result = await updateUserAction(initialState, createFormData({
        userId: 'user-123',
        name: 'John Doe',
        email: 'existing@example.com',
      }));

      // Assert
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'existing@example.com',
          NOT: { id: 'user-123' },
        },
      });
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: 'Este correo electrónico ya está en uso por otro usuario',
      });
    });

    it('should allow user to keep their current email', async () => {
      // Arrange
      mockPrisma.user.findFirst.mockResolvedValue(null); // No other user has this email
      mockPrisma.user.update.mockResolvedValue({
        ...mockValidUser,
        name: 'John Doe',
        email: 'john@example.com',
        phone: null,
        address: null,
        profileOriginal: null,
        profileCrop: null,
      });

      // Act
      const result = await updateUserAction(initialState, createFormData({
        userId: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
      }));

      // Assert
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'john@example.com',
          NOT: { id: 'user-123' },
        },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: null,
          address: null,
          profileOriginal: null,
          profileCrop: null,
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/profile');
      expect(result.success).toBe(true);
    });
  });

  describe('❌ Database Error Handling', () => {
    it('should handle database errors during email check', async () => {
      // Arrange
      mockPrisma.user.findFirst.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await updateUserAction(initialState, createFormData({
        userId: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
      }));

      // Assert
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'john@example.com',
          NOT: { id: 'user-123' },
        },
      });
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: 'Ha ocurrido un error al actualizar el perfil',
      });
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error al actualizar el perfil:',
        new Error('Database error')
      );
    });

    it('should handle database errors during user update', async () => {
      // Arrange
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.update.mockRejectedValue(new Error('Update failed'));

      // Act
      const result = await updateUserAction(initialState, createFormData({
        userId: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
      }));

      // Assert
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'john@example.com',
          NOT: { id: 'user-123' },
        },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: null,
          address: null,
          profileOriginal: null,
          profileCrop: null,
        },
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Ha ocurrido un error al actualizar el perfil');
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error al actualizar el perfil:',
        new Error('Update failed')
      );
    });
  });

  describe('🔄 Cache Revalidation', () => {
    it('should revalidate profile path after successful update', async () => {
      // Arrange
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({
        ...mockValidUser,
        name: 'John Doe',
        email: 'john@example.com',
      });

      // Act
      await updateUserAction(initialState, createFormData({
        userId: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
      }));

      // Assert
      expect(mockRevalidatePath).toHaveBeenCalledWith('/profile');
      expect(mockRevalidatePath).toHaveBeenCalledTimes(1);
    });

    it('should not revalidate path when update fails', async () => {
      // Arrange
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'other-user',
        email: 'existing@example.com',
      });

      // Act
      await updateUserAction(initialState, createFormData({
        userId: 'user-123',
        name: 'John Doe',
        email: 'existing@example.com',
      }));

      // Assert
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('📋 FormData Handling', () => {
    it('should not revalidate on duplicate email errors', async () => {
      // Arrange
      const updateData = {
        id: 'user-123',
        name: 'John Doe',
        email: 'existing@example.com',
        role: 'user',
      };

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'other-user-456',
        email: 'existing@example.com',
      });

      // Act
      await updateUserAction(initialState, createFormData(updateData));

      // Assert
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('📋 FormData Handling', () => {
    it('should correctly extract all fields from FormData', async () => {
      // Arrange
      const updateData = {
        userId: 'user-123',
        name: 'FormData User',
        email: 'formdata@example.com',
        role: 'manager',
      };

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({
        ...mockValidUser,
        ...updateData,
      });

      // Act
      await updateUserAction(initialState, createFormData(updateData));

      // Assert
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'formdata@example.com',
          NOT: { id: 'user-123' },
        },
      });
    });

    it('should handle FormData with extra fields', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('userId', 'user-123');
      formData.append('name', 'Test User');
      formData.append('email', 'test@example.com');
      formData.append('role', 'user');
      formData.append('extraField', 'should-be-ignored');
      formData.append('anotherField', 'should-be-ignored');

      const expectedData = {
        userId: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      };

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({
        ...mockValidUser,
        ...expectedData,
      });

      // Act
      const result = await updateUserAction(initialState, formData);

      // Assert
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          NOT: { id: 'user-123' },
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('🚀 Edge Cases', () => {
    it('should handle very long names', async () => {
      // Arrange
      const longName = 'A'.repeat(500);
      const updateData = {
        userId: 'user-123',
        name: longName,
        email: 'test@example.com',
        role: 'user',
      };

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({
        ...mockValidUser,
        ...updateData,
      });

      // Act
      const result = await updateUserAction(initialState, createFormData(updateData));

      // Assert
      expect(result.success).toBe(true);
    });

    it('should handle unicode characters in names', async () => {
      // Arrange
      const unicodeName = 'José María Ñoño 中文';
      const updateData = {
        userId: 'user-123',
        name: unicodeName,
        email: 'jose@example.com',
        role: 'user',
      };

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({
        ...mockValidUser,
        ...updateData,
      });

      // Act
      const result = await updateUserAction(initialState, createFormData(updateData));

      // Assert
      expect(result.success).toBe(true);
    });

    it('should handle email with special characters', async () => {
      // Arrange
      const specialEmail = 'user+test@sub-domain.example-site.co.uk';
      const updateData = {
        userId: 'user-123',
        name: 'Test User',
        email: specialEmail,
        role: 'user',
      };

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({
        ...mockValidUser,
        ...updateData,
      });

      // Act
      const result = await updateUserAction(initialState, createFormData(updateData));

      // Assert
      expect(result.success).toBe(true);
    });

    it('should handle different role values', async () => {
      // Arrange
      const roles = ['user', 'admin', 'manager', 'viewer'];

      for (const role of roles) {
        const updateData = {
          userId: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          role,
        };

        mockPrisma.user.findFirst.mockResolvedValue(null);
        mockPrisma.user.update.mockResolvedValue({
          ...mockValidUser,
          ...updateData,
        });

        // Act
        const result = await updateUserAction(initialState, createFormData(updateData));

        // Assert
        expect(result.success).toBe(true);
        expect(mockPrisma.user.update).toHaveBeenCalledWith({
          where: { id: updateData.userId },
          data: {
            name: updateData.name,
            email: updateData.email,
            phone: null,
            address: null,
            profileOriginal: null,
            profileCrop: null,
          },
        });
      }
    });
  });

  describe('⚡ Performance Considerations', () => {
    it('should not make unnecessary database calls on validation failure', async () => {
      // Arrange - datos inválidos (faltan campos requeridos)
      
      // Act
      const result = await updateUserAction(initialState, createFormData({
        userId: '',
        name: '',
        email: '',
      }));

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Los campos nombre y email son obligatorios');
      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('should avoid update operation when email check fails', async () => {
      // Arrange
      const updateData = {
        userId: 'user-123',
        name: 'John Doe',
        email: 'existing@example.com',
        role: 'user',
      };

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'other-user-456',
        email: 'existing@example.com',
      });

      // Act
      const result = await updateUserAction(initialState, createFormData(updateData));

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Este correo electrónico ya está en uso por otro usuario');
      expect(mockPrisma.user.findFirst).toHaveBeenCalledTimes(1);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });
}); 