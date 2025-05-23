import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { forgotPasswordAction } from '../forgot-password';
import { forgotPasswordSchema } from '@/zod/AuthZod';
import { authClient } from '@/auth-client';

// Mock de authClient
vi.mock('@/auth-client', () => ({
  authClient: {
    forgetPassword: vi.fn(),
  },
}));

// Mock de Zod schemas
vi.mock('@/zod/AuthZod', () => ({
  forgotPasswordSchema: {
    safeParse: vi.fn(),
  },
}));

const mockAuthClient = authClient as any;
const mockSchema = forgotPasswordSchema as any;

describe('forgotPasswordAction', () => {
  const initialState = { success: false as string | false, error: false as string | false };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createFormData = (email: string) => {
    const formData = new FormData();
    formData.append('email', email);
    return formData;
  };

  describe('✅ Successful Request', () => {
    it('should successfully send password reset email', async () => {
      // Arrange
      const validEmail = 'test@example.com';
      mockSchema.safeParse.mockReturnValue({
        success: true,
        data: { email: validEmail },
      });
      mockAuthClient.forgetPassword.mockResolvedValue({ error: null });

      // Act
      const result = await forgotPasswordAction(initialState, createFormData(validEmail));

      // Assert
      expect(mockSchema.safeParse).toHaveBeenCalledWith({ email: validEmail });
      expect(mockAuthClient.forgetPassword).toHaveBeenCalledWith({
        email: validEmail,
        redirectTo: '/reset-password',
      });
      expect(result.success).toBe('Si existe una cuenta con este email, recibirás un enlace para restablecer tu contraseña.');
      expect(result.error).toBe(false);
    });

    it('should handle successful request with different email', async () => {
      // Arrange
      const differentEmail = 'user@domain.com';
      mockSchema.safeParse.mockReturnValue({
        success: true,
        data: { email: differentEmail },
      });
      mockAuthClient.forgetPassword.mockResolvedValue({ error: null });

      // Act
      const result = await forgotPasswordAction(initialState, createFormData(differentEmail));

      // Assert
      expect(mockAuthClient.forgetPassword).toHaveBeenCalledWith({
        email: differentEmail,
        redirectTo: '/reset-password',
      });
      expect(result.success).toBeTruthy();
      expect(result.error).toBe(false);
    });

    it('should maintain security by returning same message for non-existent users', async () => {
      // Arrange
      const nonExistentEmail = 'nonexistent@example.com';
      mockSchema.safeParse.mockReturnValue({
        success: true,
        data: { email: nonExistentEmail },
      });
      mockAuthClient.forgetPassword.mockResolvedValue({ error: null });

      // Act
      const result = await forgotPasswordAction(initialState, createFormData(nonExistentEmail));

      // Assert
      expect(result.success).toBe('Si existe una cuenta con este email, recibirás un enlace para restablecer tu contraseña.');
      expect(result.error).toBe(false);
    });
  });

  describe('❌ Validation Errors', () => {
    it('should handle invalid email format', async () => {
      // Arrange
      mockSchema.safeParse.mockReturnValue({
        success: false,
        error: { issues: [{ message: 'Formato de email inválido' }] },
      });

      // Act
      const result = await forgotPasswordAction(initialState, createFormData('invalid-email'));

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email inválido.');
      expect(mockAuthClient.forgetPassword).not.toHaveBeenCalled();
    });

    it('should handle empty email', async () => {
      // Arrange
      mockSchema.safeParse.mockReturnValue({
        success: false,
        error: { issues: [{ message: 'Email es requerido' }] },
      });

      // Act
      const result = await forgotPasswordAction(initialState, createFormData(''));

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email inválido.');
    });

    it('should handle missing email field', async () => {
      // Arrange
      const formData = new FormData();
      mockSchema.safeParse.mockReturnValue({
        success: false,
        error: { issues: [{ message: 'Email es requerido' }] },
      });

      // Act
      const result = await forgotPasswordAction(initialState, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email inválido.');
    });
  });

  describe('🔧 Auth Client Errors', () => {
    it('should handle USER_NOT_FOUND error', async () => {
      // Arrange
      mockSchema.safeParse.mockReturnValue({
        success: true,
        data: { email: 'test@example.com' },
      });
      mockAuthClient.forgetPassword.mockResolvedValue({
        error: { message: 'USER_NOT_FOUND' },
      });

      // Act
      const result = await forgotPasswordAction(initialState, createFormData('test@example.com'));

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuario no encontrado. No existe ninguna cuenta registrada con este email.');
    });

    it('should handle auth API errors', async () => {
      // Arrange
      mockSchema.safeParse.mockReturnValue({
        success: true,
        data: { email: 'test@example.com' },
      });
      mockAuthClient.forgetPassword.mockResolvedValue({
        error: { message: 'API rate limit exceeded' },
      });

      // Act
      const result = await forgotPasswordAction(initialState, createFormData('test@example.com'));

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('API rate limit exceeded');
    });

    it('should handle auth errors without message', async () => {
      // Arrange
      mockSchema.safeParse.mockReturnValue({
        success: true,
        data: { email: 'test@example.com' },
      });
      mockAuthClient.forgetPassword.mockResolvedValue({
        error: { message: null },
      });

      // Act
      const result = await forgotPasswordAction(initialState, createFormData('test@example.com'));

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Ocurrió un error inesperado.');
    });

    it('should handle network errors', async () => {
      // Arrange
      mockSchema.safeParse.mockReturnValue({
        success: true,
        data: { email: 'test@example.com' },
      });
      mockAuthClient.forgetPassword.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(forgotPasswordAction(initialState, createFormData('test@example.com')))
        .rejects.toThrow('Network error');
    });
  });

  describe('🚀 Redirect Configuration', () => {
    it('should always use /reset-password as redirect URL', async () => {
      // Arrange
      mockSchema.safeParse.mockReturnValue({
        success: true,
        data: { email: 'test@example.com' },
      });
      mockAuthClient.forgetPassword.mockResolvedValue({ error: null });

      // Act
      await forgotPasswordAction(initialState, createFormData('test@example.com'));

      // Assert
      expect(mockAuthClient.forgetPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        redirectTo: '/reset-password',
      });
    });

    it('should not be influenced by extra form data for redirect', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('redirectTo', '/malicious-redirect');
      
      mockSchema.safeParse.mockReturnValue({
        success: true,
        data: { email: 'test@example.com' },
      });
      mockAuthClient.forgetPassword.mockResolvedValue({ error: null });

      // Act
      await forgotPasswordAction(initialState, formData);

      // Assert
      expect(mockAuthClient.forgetPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        redirectTo: '/reset-password',
      });
    });
  });

  describe('📨 FormData Handling', () => {
    it('should correctly extract email from FormData', async () => {
      // Arrange
      const testEmail = 'formdata@test.com';
      mockSchema.safeParse.mockReturnValue({
        success: true,
        data: { email: testEmail },
      });
      mockAuthClient.forgetPassword.mockResolvedValue({ error: null });

      // Act
      await forgotPasswordAction(initialState, createFormData(testEmail));

      // Assert
      expect(mockSchema.safeParse).toHaveBeenCalledWith({ email: testEmail });
    });

    it('should handle FormData with additional fields', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('extraField', 'extraValue');
      formData.append('anotherField', 'anotherValue');
      
      mockSchema.safeParse.mockReturnValue({
        success: true,
        data: { email: 'test@example.com' },
      });
      mockAuthClient.forgetPassword.mockResolvedValue({ error: null });

      // Act
      const result = await forgotPasswordAction(initialState, formData);

      // Assert
      expect(mockSchema.safeParse).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(result.success).toBeTruthy();
    });
  });

  describe('🔒 Security Considerations', () => {
    it('should not leak information about user existence', async () => {
      // Arrange - User exists
      mockSchema.safeParse.mockReturnValue({
        success: true,
        data: { email: 'existing@example.com' },
      });

      // User exists case
      mockAuthClient.forgetPassword.mockResolvedValue({ error: null });
      const result1 = await forgotPasswordAction(initialState, createFormData('existing@example.com'));

      // User doesn't exist case
      mockAuthClient.forgetPassword.mockResolvedValue({ error: null });
      const result2 = await forgotPasswordAction(initialState, createFormData('nonexistent@example.com'));

      // Assert - Both responses should be identical
      expect(result1.success).toBe(result2.success);
      expect(result1.error).toBe(result2.error);
    });
  });

  describe('🚀 Edge Cases', () => {
    it('should handle very long email addresses', async () => {
      // Arrange
      const longEmail = 'a'.repeat(100) + '@example.com';
      mockSchema.safeParse.mockReturnValue({
        success: true,
        data: { email: longEmail },
      });
      mockAuthClient.forgetPassword.mockResolvedValue({ error: null });

      // Act
      const result = await forgotPasswordAction(initialState, createFormData(longEmail));

      // Assert
      expect(result.success).toBeTruthy();
      expect(mockAuthClient.forgetPassword).toHaveBeenCalledWith({
        email: longEmail,
        redirectTo: '/reset-password',
      });
    });

    it('should handle emails with unicode characters', async () => {
      // Arrange
      const unicodeEmail = 'test.üñíçødé@example.com';
      mockSchema.safeParse.mockReturnValue({
        success: true,
        data: { email: unicodeEmail },
      });
      mockAuthClient.forgetPassword.mockResolvedValue({ error: null });

      // Act
      const result = await forgotPasswordAction(initialState, createFormData(unicodeEmail));

      // Assert
      expect(result.success).toBeTruthy();
      expect(mockAuthClient.forgetPassword).toHaveBeenCalledWith({
        email: unicodeEmail,
        redirectTo: '/reset-password',
      });
    });
  });

  describe('⚡ Performance Considerations', () => {
    it('should not make unnecessary multiple API calls', async () => {
      // Arrange
      mockSchema.safeParse.mockReturnValue({
        success: true,
        data: { email: 'test@example.com' },
      });
      mockAuthClient.forgetPassword.mockResolvedValue({ error: null });

      // Act
      await forgotPasswordAction(initialState, createFormData('test@example.com'));

      // Assert
      expect(mockAuthClient.forgetPassword).toHaveBeenCalledTimes(1);
      expect(mockSchema.safeParse).toHaveBeenCalledTimes(1);
    });

    it('should fail fast on validation errors', async () => {
      // Arrange
      mockSchema.safeParse.mockReturnValue({
        success: false,
        error: { issues: [{ message: 'Validation error' }] },
      });

      const startTime = Date.now();

      // Act
      await forgotPasswordAction(initialState, createFormData('invalid'));

      // Assert
      const endTime = Date.now();
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should fail quickly
      expect(mockAuthClient.forgetPassword).not.toHaveBeenCalled();
    });
  });
}); 