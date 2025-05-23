import { describe, it, expect, beforeEach, vi } from 'vitest';
import signOutAction from '../sign-out';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Mock de dependencias
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn().mockImplementation(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

// Mock de console para tests silenciosos
const mockConsole = {
  error: vi.fn(),
};

describe('signOutAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
    // Restore original environment
    delete process.env.AUTH_SESSION_COOKIE_NAME;
  });

  const mockCookieStore = {
    delete: vi.fn(),
  };

  describe('✅ Successful Sign Out', () => {
    it('should delete session cookie and redirect to sign-in', async () => {
      // Arrange
      process.env.AUTH_SESSION_COOKIE_NAME = 'custom-session-token';
      const cookiesMock = cookies as any;
      cookiesMock.mockResolvedValue(mockCookieStore);

      // Act & Assert - redirect should throw
      await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));

      expect(cookiesMock).toHaveBeenCalledOnce();
      expect(mockCookieStore.delete).toHaveBeenCalledWith('custom-session-token');
      expect(redirect).toHaveBeenCalledWith('/sign-in');
    });

    it('should use default cookie name when AUTH_SESSION_COOKIE_NAME is not set', async () => {
      // Arrange
      const cookiesMock = cookies as any;
      cookiesMock.mockResolvedValue(mockCookieStore);

      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));

      expect(mockCookieStore.delete).toHaveBeenCalledWith('better-auth-session-token');
      expect(redirect).toHaveBeenCalledWith('/sign-in');
    });

    it('should use default cookie name when AUTH_SESSION_COOKIE_NAME is empty', async () => {
      // Arrange
      process.env.AUTH_SESSION_COOKIE_NAME = '';
      const cookiesMock = cookies as any;
      cookiesMock.mockResolvedValue(mockCookieStore);

      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));

      expect(mockCookieStore.delete).toHaveBeenCalledWith('better-auth-session-token');
      expect(redirect).toHaveBeenCalledWith('/sign-in');
    });
  });

  describe('🔐 Environment Configuration', () => {
    it('should handle different custom cookie names', async () => {
      // Arrange
      const customCookieNames = [
        'my-auth-session',
        'app-session-token',
        'secure-session-id',
        'user-auth-cookie',
      ];

      const cookiesMock = cookies as any;
      cookiesMock.mockResolvedValue(mockCookieStore);

      for (const cookieName of customCookieNames) {
        // Reset mocks for each iteration
        vi.clearAllMocks();
        process.env.AUTH_SESSION_COOKIE_NAME = cookieName;

        // Act & Assert
        await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));

        expect(mockCookieStore.delete).toHaveBeenCalledWith(cookieName);
        expect(redirect).toHaveBeenCalledWith('/sign-in');
      }
    });

    it('should handle special characters in cookie name', async () => {
      // Arrange
      process.env.AUTH_SESSION_COOKIE_NAME = 'auth-session_token.v1';
      const cookiesMock = cookies as any;
      cookiesMock.mockResolvedValue(mockCookieStore);

      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));

      expect(mockCookieStore.delete).toHaveBeenCalledWith('auth-session_token.v1');
    });
  });

  describe('❌ Error Handling - Cookie Operations', () => {
    it('should handle cookies() promise rejection', async () => {
      // Arrange
      const cookiesMock = cookies as any;
      cookiesMock.mockRejectedValue(new Error('Cookies not available'));

      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error al intentar borrar la cookie de sesión:',
        new Error('Cookies not available')
      );
      expect(redirect).toHaveBeenCalledWith('/sign-in');
    });

    it('should handle cookie store delete method failure', async () => {
      // Arrange
      const cookiesMock = cookies as any;
      const failingCookieStore = {
        delete: vi.fn().mockImplementation(() => {
          throw new Error('Failed to delete cookie');
        }),
      };
      cookiesMock.mockResolvedValue(failingCookieStore);

      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error al intentar borrar la cookie de sesión:',
        new Error('Failed to delete cookie')
      );
      expect(redirect).toHaveBeenCalledWith('/sign-in');
    });

    it('should handle undefined cookie store', async () => {
      // Arrange
      const cookiesMock = cookies as any;
      cookiesMock.mockResolvedValue(null);

      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));

      expect(mockConsole.error).toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith('/sign-in');
    });
  });

  describe('🔄 Redirect Behavior', () => {
    it('should always redirect even when cookie deletion succeeds', async () => {
      // Arrange
      const cookiesMock = cookies as any;
      cookiesMock.mockResolvedValue(mockCookieStore);

      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));

      expect(redirect).toHaveBeenCalledWith('/sign-in');
      expect(redirect).toHaveBeenCalledTimes(1);
    });

    it('should always redirect even when cookie deletion fails', async () => {
      // Arrange
      const cookiesMock = cookies as any;
      cookiesMock.mockRejectedValue(new Error('Cookie operation failed'));

      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));

      expect(redirect).toHaveBeenCalledWith('/sign-in');
      expect(redirect).toHaveBeenCalledTimes(1);
    });

    it('should redirect to correct path', async () => {
      // Arrange
      const cookiesMock = cookies as any;
      cookiesMock.mockResolvedValue(mockCookieStore);

      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));

      expect(redirect).toHaveBeenCalledWith('/sign-in');
    });
  });

  describe('🧪 Cookie Store Integration', () => {
    it('should call delete method on resolved cookie store', async () => {
      // Arrange
      const cookiesMock = cookies as any;
      cookiesMock.mockResolvedValue(mockCookieStore);

      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));

      expect(cookiesMock).toHaveBeenCalledOnce();
      expect(mockCookieStore.delete).toHaveBeenCalledOnce();
    });

    it('should handle cookie store with additional methods', async () => {
      // Arrange
      const extendedCookieStore = {
        delete: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
        clear: vi.fn(),
      };

      const cookiesMock = cookies as any;
      cookiesMock.mockResolvedValue(extendedCookieStore);

      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));

      expect(extendedCookieStore.delete).toHaveBeenCalledWith('better-auth-session-token');
      expect(extendedCookieStore.get).not.toHaveBeenCalled();
      expect(extendedCookieStore.set).not.toHaveBeenCalled();
      expect(extendedCookieStore.clear).not.toHaveBeenCalled();
    });
  });

  describe('🎯 Edge Cases', () => {
    it('should handle very long cookie names', async () => {
      // Arrange
      const longCookieName = 'a'.repeat(500);
      process.env.AUTH_SESSION_COOKIE_NAME = longCookieName;

      const cookiesMock = cookies as any;
      cookiesMock.mockResolvedValue(mockCookieStore);

      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));

      expect(mockCookieStore.delete).toHaveBeenCalledWith(longCookieName);
    });

    it('should handle unicode characters in cookie name', async () => {
      // Arrange
      const unicodeCookieName = 'auth-сессия-🔐';
      process.env.AUTH_SESSION_COOKIE_NAME = unicodeCookieName;

      const cookiesMock = cookies as any;
      cookiesMock.mockResolvedValue(mockCookieStore);

      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));

      expect(mockCookieStore.delete).toHaveBeenCalledWith(unicodeCookieName);
    });

    it('should handle multiple consecutive errors gracefully', async () => {
      // Arrange
      const cookiesMock = cookies as any;
      cookiesMock.mockRejectedValue(new Error('Persistent error'));

      // Act & Assert - Should work the same way multiple times
      for (let i = 0; i < 3; i++) {
        await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));
        expect(redirect).toHaveBeenCalledWith('/sign-in');
      }

      expect(mockConsole.error).toHaveBeenCalledTimes(3);
    });
  });

  describe('🔐 Security Considerations', () => {
    it('should not expose cookie name in error messages', async () => {
      // Arrange
      process.env.AUTH_SESSION_COOKIE_NAME = 'sensitive-session-token';
      const cookiesMock = cookies as any;
      cookiesMock.mockRejectedValue(new Error('Cookie error'));

      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error al intentar borrar la cookie de sesión:',
        new Error('Cookie error')
      );
      // The error message should not contain the sensitive cookie name
      const errorCall = mockConsole.error.mock.calls[0];
      expect(errorCall[0]).not.toContain('sensitive-session-token');
    });

    it('should always redirect regardless of cookie deletion success', async () => {
      // Arrange - Simulate various scenarios
      const scenarios = [
        { cookiesMock: vi.fn().mockResolvedValue(mockCookieStore) },
        { cookiesMock: vi.fn().mockRejectedValue(new Error('Error')) },
        { cookiesMock: vi.fn().mockResolvedValue(null) },
        { cookiesMock: vi.fn().mockResolvedValue(undefined) },
      ];

      for (const scenario of scenarios) {
        vi.clearAllMocks();
        (cookies as any).mockImplementation(scenario.cookiesMock);

        // Act & Assert
        await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));
        expect(redirect).toHaveBeenCalledWith('/sign-in');
      }
    });
  });

  describe('⚡ Performance Considerations', () => {
    it('should not delay redirect even if cookie operations are slow', async () => {
      // Arrange
      const cookiesMock = cookies as any;
      cookiesMock.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockCookieStore), 100)
          )
      );

      const startTime = Date.now();

      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));

      const endTime = Date.now();
      // Should complete relatively quickly despite cookie delay
      expect(endTime - startTime).toBeLessThan(200);
      expect(redirect).toHaveBeenCalledWith('/sign-in');
    });
  });

  describe('🔄 State Cleanup', () => {
    it('should call delete exactly once per execution', async () => {
      // Arrange
      const cookiesMock = cookies as any;
      cookiesMock.mockResolvedValue(mockCookieStore);

      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));

      expect(mockCookieStore.delete).toHaveBeenCalledTimes(1);
      expect(redirect).toHaveBeenCalledTimes(1);
    });

    it('should not retry cookie deletion on failure', async () => {
      // Arrange
      const failingCookieStore = {
        delete: vi.fn().mockImplementation(() => {
          throw new Error('Delete failed');
        }),
      };

      const cookiesMock = cookies as any;
      cookiesMock.mockResolvedValue(failingCookieStore);

      // Act & Assert
      await expect(signOutAction()).rejects.toEqual(new Error('NEXT_REDIRECT'));

      expect(failingCookieStore.delete).toHaveBeenCalledTimes(1);
      expect(redirect).toHaveBeenCalledTimes(1);
    });
  });
}); 