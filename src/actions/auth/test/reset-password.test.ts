import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetPasswordAction } from '../reset-password';
import { authClient } from '@/auth-client';
import type { serverMessage } from '@/types/ServerMessageType';

// Mock del authClient
vi.mock('@/auth-client', () => ({
  authClient: {
    resetPassword: vi.fn(),
  },
}));

describe('resetPasswordAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createFormData = (data: Record<string, string>) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    return formData;
  };

  const initialState = { success: false as string | false, error: false as string | false };

  describe('✅ Successful Password Reset', () => {
    it('should reset password successfully with valid data', async () => {
      // Arrange
      const mockAuthClient = authClient as any;
      mockAuthClient.resetPassword.mockResolvedValue({ error: null });

      const formData = createFormData({
        password: 'newPassword123',
        passwordConfirm: 'newPassword123',
        token: 'valid-reset-token',
      });

      // Act
      const result = await resetPasswordAction(initialState, formData);

      // Assert
      expect(mockAuthClient.resetPassword).toHaveBeenCalledWith({
        newPassword: 'newPassword123',
        token: 'valid-reset-token',
      });
      expect(result).toEqual({
        success: 'Contraseña restablecida con éxito. Ya puedes iniciar sesión.',
        error: false,
      });
    });

    it('should handle different valid password formats', async () => {
      // Arrange
      const validPasswords = [
        'simplePass',
        'Complex123!',
        'very-long-password-with-special-chars@#$',
        '123456789',
      ];

      const mockAuthClient = authClient as any;
      mockAuthClient.resetPassword.mockResolvedValue({ error: null });

      // Act & Assert
      for (const password of validPasswords) {
        const formData = createFormData({
          password,
          passwordConfirm: password,
          token: 'valid-token',
        });

        const result = await resetPasswordAction(initialState, formData);
        
        expect(result.success).toBeTruthy();
        expect(result.error).toBe(false);
      }
    });
  });

  describe('❌ Password Mismatch Validation', () => {
    it('should return error when passwords do not match', async () => {
      // Arrange
      const formData = createFormData({
        password: 'password123',
        passwordConfirm: 'differentPassword',
        token: 'valid-token',
      });

      // Act
      const result = await resetPasswordAction(initialState, formData);

      // Assert
      expect(result).toEqual({
        error: 'Las contraseñas no coinciden.',
        success: false,
      });
      expect(authClient.resetPassword).not.toHaveBeenCalled();
    });

    it('should handle empty password confirmation', async () => {
      // Arrange
      const formData = createFormData({
        password: 'password123',
        passwordConfirm: '',
        token: 'valid-token',
      });

      // Act
      const result = await resetPasswordAction(initialState, formData);

      // Assert
      expect(result.error).toBe('Las contraseñas no coinciden.');
      expect(result.success).toBe(false);
    });

    it('should handle case-sensitive password mismatch', async () => {
      // Arrange
      const formData = createFormData({
        password: 'Password123',
        passwordConfirm: 'password123',
        token: 'valid-token',
      });

      // Act
      const result = await resetPasswordAction(initialState, formData);

      // Assert
      expect(result.error).toBe('Las contraseñas no coinciden.');
      expect(result.success).toBe(false);
    });
  });

  describe('🔍 Error Handling - Specific Auth Errors', () => {
    it('should handle USER_NOT_FOUND error', async () => {
      // Arrange
      const mockAuthClient = authClient as any;
      mockAuthClient.resetPassword.mockResolvedValue({
        error: { message: 'USER_NOT_FOUND' },
      });

      const formData = createFormData({
        password: 'newPassword123',
        passwordConfirm: 'newPassword123',
        token: 'invalid-token',
      });

      // Act
      const result = await resetPasswordAction(initialState, formData);

      // Assert
      expect(result).toEqual({
        error: 'Usuario no encontrado. No existe ninguna cuenta registrada con este email.',
        success: false,
      });
    });

    it('should handle PASSWORD_TOO_SHORT error', async () => {
      // Arrange
      const mockAuthClient = authClient as any;
      mockAuthClient.resetPassword.mockResolvedValue({
        error: { message: 'PASSWORD_TOO_SHORT' },
      });

      const formData = createFormData({
        password: '123',
        passwordConfirm: '123',
        token: 'valid-token',
      });

      // Act
      const result = await resetPasswordAction(initialState, formData);

      // Assert
      expect(result).toEqual({
        error: 'PASSWORD_TOO_SHORT',
        success: false,
      });
    });

    it('should handle custom error message for PASSWORD_TOO_SHORT', async () => {
      // Arrange
      const mockAuthClient = authClient as any;
      mockAuthClient.resetPassword.mockResolvedValue({
        error: { message: null }, // null message should fallback to default
      });

      const formData = createFormData({
        password: 'short',
        passwordConfirm: 'short',
        token: 'valid-token',
      });

      // Act
      const result = await resetPasswordAction(initialState, formData);

      // Assert
      expect(result.error).toBe('Ocurrió un error inesperado.');
      expect(result.success).toBe(false);
    });
  });

  describe('🔍 Error Handling - Generic Errors', () => {
    it('should handle unknown auth errors with custom message', async () => {
      // Arrange
      const mockAuthClient = authClient as any;
      mockAuthClient.resetPassword.mockResolvedValue({
        error: { message: 'TOKEN_EXPIRED' },
      });

      const formData = createFormData({
        password: 'newPassword123',
        passwordConfirm: 'newPassword123',
        token: 'expired-token',
      });

      // Act
      const result = await resetPasswordAction(initialState, formData);

      // Assert
      expect(result).toEqual({
        error: 'TOKEN_EXPIRED',
        success: false,
      });
    });

    it('should handle auth errors without message', async () => {
      // Arrange
      const mockAuthClient = authClient as any;
      mockAuthClient.resetPassword.mockResolvedValue({
        error: { message: null },
      });

      const formData = createFormData({
        password: 'newPassword123',
        passwordConfirm: 'newPassword123',
        token: 'some-token',
      });

      // Act
      const result = await resetPasswordAction(initialState, formData);

      // Assert
      expect(result).toEqual({
        error: 'Ocurrió un error inesperado.',
        success: false,
      });
    });

    it('should handle network or unexpected errors', async () => {
      // Arrange
      const mockAuthClient = authClient as any;
      mockAuthClient.resetPassword.mockRejectedValue(new Error('Network error'));

      const formData = createFormData({
        password: 'newPassword123',
        passwordConfirm: 'newPassword123',
        token: 'valid-token',
      });

      // Act & Assert
      await expect(resetPasswordAction(initialState, formData)).rejects.toThrow('Network error');
    });
  });

  describe('📋 FormData Handling', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Reset the mock completely for this describe block
      const mockAuthClient = authClient as any;
      mockAuthClient.resetPassword.mockReset();
    });

    it('should handle null FormData values', async () => {
      // Arrange
      const formData = new FormData();
      // No se agregan valores, serán null

      // Act
      const result = await resetPasswordAction(initialState, formData);

      // Assert
      expect(result.success).toBe(false);
      // La función debería manejar valores null/undefined gracefully
      expect(typeof result.error).toBe('string');
    });

    it('should handle FormData with extra fields', async () => {
      // Arrange
      const formData = createFormData({
        password: 'password123',
        passwordConfirm: 'password123',
        token: 'valid-token',
        extraField: 'should-be-ignored',
        csrfToken: 'csrf-token',
      });

      const mockAuthClient = authClient as any;
      mockAuthClient.resetPassword.mockResolvedValue({ error: null });

      // Act
      const result = await resetPasswordAction(initialState, formData);

      // Assert
      expect(mockAuthClient.resetPassword).toHaveBeenCalledWith({
        newPassword: 'password123',
        token: 'valid-token',
      });
      expect(result.success).toBeTruthy();
    });
  });

  describe('🔄 State Persistence', () => {
    it('should not depend on previous state for successful operation', async () => {
      // Arrange
      const mockAuthClient = authClient as any;
      mockAuthClient.resetPassword.mockResolvedValue({ error: null });

      const formData = createFormData({
        password: 'password123',
        passwordConfirm: 'password123',
        token: 'valid-token',
      });

      const previousState = { success: 'old success', error: 'old error' };

      // Act
      const result = await resetPasswordAction(previousState as any, formData);

      // Assert
      expect(result).toEqual({
        success: 'Contraseña restablecida con éxito. Ya puedes iniciar sesión.',
        error: false,
      });
    });
  });

  describe('🎯 Edge Cases', () => {
    it('should handle very long passwords', async () => {
      // Arrange
      const longPassword = 'a'.repeat(1000);
      const mockAuthClient = authClient as any;
      mockAuthClient.resetPassword.mockResolvedValue({ error: null });

      const formData = createFormData({
        password: longPassword,
        passwordConfirm: longPassword,
        token: 'valid-token',
      });

      // Act
      const result = await resetPasswordAction(initialState, formData);

      // Assert
      expect(mockAuthClient.resetPassword).toHaveBeenCalledWith({
        newPassword: longPassword,
        token: 'valid-token',
      });
      expect(result.success).toBeTruthy();
    });

    it('should handle special characters in passwords', async () => {
      // Arrange
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const mockAuthClient = authClient as any;
      mockAuthClient.resetPassword.mockResolvedValue({ error: null });

      const formData = createFormData({
        password: specialPassword,
        passwordConfirm: specialPassword,
        token: 'valid-token',
      });

      // Act
      const result = await resetPasswordAction(initialState, formData);

      // Assert
      expect(result.success).toBeTruthy();
    });

    it('should handle unicode characters in passwords', async () => {
      // Arrange
      const unicodePassword = 'contraseña123🔒';
      const mockAuthClient = authClient as any;
      mockAuthClient.resetPassword.mockResolvedValue({ error: null });

      const formData = createFormData({
        password: unicodePassword,
        passwordConfirm: unicodePassword,
        token: 'valid-token',
      });

      // Act
      const result = await resetPasswordAction(initialState, formData);

      // Assert
      expect(result.success).toBeTruthy();
    });
  });

  describe('🔐 Security Considerations', () => {
    it('should pass token securely to auth client', async () => {
      // Arrange
      const sensitiveToken = 'jwt.token.with.sensitive.data';
      const mockAuthClient = authClient as any;
      mockAuthClient.resetPassword.mockResolvedValue({ error: null });

      const formData = createFormData({
        password: 'newPassword123',
        passwordConfirm: 'newPassword123',
        token: sensitiveToken,
      });

      // Act
      await resetPasswordAction(initialState, formData);

      // Assert
      expect(mockAuthClient.resetPassword).toHaveBeenCalledWith({
        newPassword: 'newPassword123',
        token: sensitiveToken,
      });
    });

    it('should not expose sensitive data in error responses', async () => {
      // Arrange
      const mockAuthClient = authClient as any;
      mockAuthClient.resetPassword.mockResolvedValue({
        error: { message: 'INTERNAL_SERVER_ERROR' },
      });

      const formData = createFormData({
        password: 'sensitivePassword',
        passwordConfirm: 'sensitivePassword',
        token: 'sensitive-token',
      });

      // Act
      const result = await resetPasswordAction(initialState, formData);

      // Assert
      expect(result.error).toBe('INTERNAL_SERVER_ERROR');
      expect(result.error).not.toContain('sensitivePassword');
      expect(result.error).not.toContain('sensitive-token');
    });
  });
}); 