import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import {
  getSecuritySettings,
  toggleSecureMode,
  verifyOtpSetup,
} from '../security-actions';
import prisma from '@/lib/prisma';
import { getOrganizationIdFromSession } from '../../util';
import * as otpauth from 'otpauth';

// Mock de Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock de getOrganizationIdFromSession
vi.mock('../../util', () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

// Mock de otpauth más completo
vi.mock('otpauth', () => {
  const MockSecret = vi.fn(() => ({
    base32: 'MOCKED_BASE32_SECRET',
  }));
  
  const MockTOTP = vi.fn(() => ({
    toString: () => 'otpauth://totp/test@example.com?secret=MOCKED_SECRET&issuer=Test%20Apex%20Software',
    validate: vi.fn(() => 0), // Mock validation that returns delta 0 for valid
  }));

  // Add fromBase32 as a static method
  (MockSecret as any).fromBase32 = vi.fn(() => ({
    base32: 'MOCKED_BASE32_SECRET',
  }));

  return {
    Secret: MockSecret,
    TOTP: MockTOTP,
  };
});

// Mock de console para tests silenciosos
const mockConsole = {
  error: vi.fn(),
  log: vi.fn(),
};

// Mock de process.env
const originalEnv = process.env;

const mockRevalidatePath = revalidatePath as any;
const mockPrisma = prisma as any;
const mockGetOrganization = getOrganizationIdFromSession as any;

describe('Security Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
    
    // Setup default environment variables
    process.env = {
      ...originalEnv,
      OTP_ISSUER: 'Test Apex Software',
      OTP_ALGORITHM: 'SHA1',
      OTP_DIGITS: '6',
      OTP_PERIOD: '120',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-456';
  const mockUserEmail = 'test@example.com';
  const mockUserRole = 'ADMIN';

  const mockSessionData = {
    organizationId: mockOrganizationId,
    userId: mockUserId,
    userEmail: mockUserEmail,
    userRole: mockUserRole,
    error: null,
  };

  const mockOrganization = {
    id: mockOrganizationId,
    secureModeEnabled: false,
    otpAuthUrl: null,
    otpVerified: false,
    otpSecret: null,
  };

  describe('🔍 getSecuritySettings', () => {
    describe('✅ Successful Retrieval', () => {
      it('should return security settings successfully', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue({
          ...mockOrganization,
          secureModeEnabled: true,
          otpAuthUrl: 'otpauth://totp/test@example.com?secret=MOCKED_SECRET&issuer=Test%20Apex%20Software',
          otpVerified: true,
        });

        // Act
        const result = await getSecuritySettings();

        // Assert
        expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
          where: { id: mockOrganizationId },
          select: {
            secureModeEnabled: true,
            otpAuthUrl: true,
            otpVerified: true,
          },
        });
        expect(result.secureModeEnabled).toBe(true);
        expect(result.otpAuthUrl).toBe('otpauth://totp/test@example.com?secret=MOCKED_SECRET&issuer=Test%20Apex%20Software');
        expect(result.otpVerified).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should handle null otpAuthUrl correctly', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue({
          ...mockOrganization,
          otpAuthUrl: null,
        });

        // Act
        const result = await getSecuritySettings();

        // Assert
        expect(result.otpAuthUrl).toBeNull();
        expect(result.error).toBeUndefined();
      });

      it('should handle disabled secure mode', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);

        // Act
        const result = await getSecuritySettings();

        // Assert
        expect(result.secureModeEnabled).toBe(false);
        expect(result.otpVerified).toBe(false);
        expect(result.otpAuthUrl).toBeNull();
      });
    });

    describe('❌ Error Handling', () => {
      it('should return error when user is not authenticated', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({
          organizationId: null,
          error: 'Not authenticated',
        });

        // Act
        const result = await getSecuritySettings();

        // Assert
        expect(result.secureModeEnabled).toBe(false);
        expect(result.otpAuthUrl).toBeNull();
        expect(result.otpVerified).toBe(false);
        expect(result.error).toBe('Not authenticated');
        expect(mockPrisma.organization.findUnique).not.toHaveBeenCalled();
      });

      it('should return error when organization not found', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue(null);

        // Act
        const result = await getSecuritySettings();

        // Assert
        expect(result.error).toBe('Organización no encontrada.');
        expect(result.secureModeEnabled).toBe(false);
      });

      it('should handle database errors', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockRejectedValue(new Error('Database error'));

        // Act
        const result = await getSecuritySettings();

        // Assert
        expect(result.error).toBe('Error al obtener la configuración de seguridad.');
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error fetching security settings:',
          expect.any(Error)
        );
      });
    });
  });

  describe('🔒 toggleSecureMode', () => {
    const mockSecret = {
      base32: 'MOCKED_BASE32_SECRET',
    };

    const mockTOTP = {
      toString: vi.fn(() => 'otpauth://totp/test@example.com?secret=MOCKED_SECRET&issuer=Test%20Apex%20Software'),
    };

    beforeEach(() => {
      // Mock otpauth.Secret constructor
      (otpauth.Secret as any).mockImplementation(() => mockSecret);
      // Mock otpauth.TOTP constructor
      (otpauth.TOTP as any).mockImplementation(() => mockTOTP);
    });

    describe('✅ Enabling Secure Mode', () => {
      it('should enable secure mode and generate new OTP for first time', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue({
          ...mockOrganization,
          otpSecret: null,
          otpVerified: false,
        });
        mockPrisma.organization.update.mockResolvedValue({
          ...mockOrganization,
          secureModeEnabled: true,
        });

        // Act
        const result = await toggleSecureMode(true);

        // Assert
        expect(mockPrisma.organization.update).toHaveBeenCalledWith({
          where: { id: mockOrganizationId },
          data: {
            secureModeEnabled: true,
            otpVerified: false,
            otpSecret: 'MOCKED_BASE32_SECRET',
            otpAuthUrl: 'otpauth://totp/test@example.com?secret=MOCKED_SECRET&issuer=Test%20Apex%20Software',
          },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/configuration', 'page');
        expect(result.success).toBe(true);
        expect(result.otpAuthUrl).toBe('otpauth://totp/test@example.com?secret=MOCKED_SECRET&issuer=Test%20Apex%20Software');
        expect(result.otpVerified).toBe(false);
      });

      it('should enable secure mode without generating new OTP when already verified', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue({
          ...mockOrganization,
          otpSecret: 'EXISTING_SECRET',
          otpVerified: true,
          otpAuthUrl: 'existing_url',
        });
        mockPrisma.organization.update.mockResolvedValue({
          ...mockOrganization,
          secureModeEnabled: true,
        });

        // Act
        const result = await toggleSecureMode(true);

        // Assert
        expect(mockPrisma.organization.update).toHaveBeenCalledWith({
          where: { id: mockOrganizationId },
          data: {
            secureModeEnabled: true,
            otpVerified: true,
            otpSecret: 'EXISTING_SECRET',
            otpAuthUrl: 'existing_url',
          },
        });
        expect(result.success).toBe(true);
        expect(result.otpAuthUrl).toBeNull(); // No new URL needed
        expect(result.otpVerified).toBe(true);
      });

      it('should generate new OTP when existing secret is not verified', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue({
          ...mockOrganization,
          otpSecret: 'EXISTING_SECRET',
          otpVerified: false,
        });
        mockPrisma.organization.update.mockResolvedValue({
          ...mockOrganization,
          secureModeEnabled: true,
        });

        // Act
        const result = await toggleSecureMode(true);

        // Assert
        expect(result.success).toBe(true);
        expect(result.otpAuthUrl).toBe('otpauth://totp/test@example.com?secret=MOCKED_SECRET&issuer=Test%20Apex%20Software');
        expect(result.otpVerified).toBe(false);
      });
    });

    describe('✅ Disabling Secure Mode', () => {
      it('should disable secure mode and clear OTP data', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue({
          ...mockOrganization,
          secureModeEnabled: true,
          otpSecret: 'EXISTING_SECRET',
          otpVerified: true,
        });
        mockPrisma.organization.update.mockResolvedValue({
          ...mockOrganization,
          secureModeEnabled: false,
        });

        // Act
        const result = await toggleSecureMode(false);

        // Assert
        expect(mockPrisma.organization.update).toHaveBeenCalledWith({
          where: { id: mockOrganizationId },
          data: {
            secureModeEnabled: false,
            otpVerified: false,
            otpSecret: null,
            otpAuthUrl: null,
          },
        });
        expect(result.success).toBe(true);
        expect(result.otpAuthUrl).toBeNull();
        expect(result.otpVerified).toBe(false);
      });
    });

    describe('❌ Error Handling', () => {
      it('should return error when user is not authenticated', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({
          organizationId: null,
          error: 'Not authenticated',
        });

        // Act
        const result = await toggleSecureMode(true);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Not authenticated');
        expect(mockPrisma.organization.update).not.toHaveBeenCalled();
      });

      it('should return error when organization not found', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue(null);

        // Act
        const result = await toggleSecureMode(true);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Organización no encontrada.');
        expect(mockPrisma.organization.update).not.toHaveBeenCalled();
      });

      it('should handle database errors', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
        const dbError = new Error('Database update failed');
        mockPrisma.organization.update.mockRejectedValue(dbError);

        // Act
        const result = await toggleSecureMode(true);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Database update failed');
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error toggling secure mode:',
          dbError
        );
      });

      it('should handle unknown errors', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
        mockPrisma.organization.update.mockRejectedValue('Unknown error');

        // Act
        const result = await toggleSecureMode(true);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Error al cambiar el modo seguro.');
      });
    });

    describe('🎯 Environment Configuration', () => {
      it('should use default values when environment variables are missing', async () => {
        // Arrange
        delete process.env.OTP_ISSUER;
        delete process.env.OTP_ALGORITHM;
        delete process.env.OTP_DIGITS;
        delete process.env.OTP_PERIOD;

        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
        mockPrisma.organization.update.mockResolvedValue(mockOrganization);

        // Act
        const result = await toggleSecureMode(true);

        // Assert
        expect(result.success).toBe(true);
        expect(otpauth.TOTP).toHaveBeenCalledWith({
          issuer: 'Apex Software', // Default value
          label: mockUserEmail,
          algorithm: 'SHA1', // Default value
          digits: 6, // Default value
          period: 120, // Default value
          secret: mockSecret,
        });
      });

      it('should use custom environment values', async () => {
        // Arrange
        process.env.OTP_ISSUER = 'Custom Company';
        process.env.OTP_ALGORITHM = 'SHA256';
        process.env.OTP_DIGITS = '8';
        process.env.OTP_PERIOD = '60';

        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
        mockPrisma.organization.update.mockResolvedValue(mockOrganization);

        // Act
        const result = await toggleSecureMode(true);

        // Assert
        expect(result.success).toBe(true);
        expect(otpauth.TOTP).toHaveBeenCalledWith({
          issuer: 'Custom Company',
          label: mockUserEmail,
          algorithm: 'SHA256',
          digits: 8,
          period: 60,
          secret: mockSecret,
        });
      });
    });
  });

  describe('🔐 verifyOtpSetup', () => {
    const mockValidToken = 123456;
    const mockSecret = {
      base32: 'MOCKED_BASE32_SECRET',
    };
    const mockTOTPInstance = {
      validate: vi.fn(),
    };

    beforeEach(() => {
      // Mock otpauth.Secret.fromBase32
      (otpauth.Secret.fromBase32 as any).mockReturnValue(mockSecret);
      // Mock otpauth.TOTP constructor
      (otpauth.TOTP as any).mockImplementation(() => mockTOTPInstance);
    });

    describe('✅ Successful Verification', () => {
      it('should verify OTP token successfully', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue({
          ...mockOrganization,
          secureModeEnabled: true,
          otpSecret: 'MOCKED_SECRET',
        });
        mockTOTPInstance.validate.mockReturnValue(0); // Valid token
        mockPrisma.organization.update.mockResolvedValue({
          ...mockOrganization,
          otpVerified: true,
        });

        // Act
        const result = await verifyOtpSetup(mockValidToken);

        // Assert
        expect(mockTOTPInstance.validate).toHaveBeenCalledWith({ token: '123456' });
        expect(mockPrisma.organization.update).toHaveBeenCalledWith({
          where: { id: mockOrganizationId },
          data: { otpVerified: true },
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/configuration', 'page');
        expect(result.success).toBe(true);
        expect(result.message).toBe('¡Configuración OTP verificada y completada!');
      });

      it('should handle different valid delta values', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue({
          ...mockOrganization,
          secureModeEnabled: true,
          otpSecret: 'MOCKED_SECRET',
        });
        mockTOTPInstance.validate.mockReturnValue(1); // Valid with delta 1
        mockPrisma.organization.update.mockResolvedValue({
          ...mockOrganization,
          otpVerified: true,
        });

        // Act
        const result = await verifyOtpSetup(mockValidToken);

        // Assert
        expect(result.success).toBe(true);
      });
    });

    describe('❌ Validation Errors', () => {
      it('should return error for invalid token length', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);

        // Act
        const result = await verifyOtpSetup(12345); // 5 digits instead of 6

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('El token OTP debe ser de 6 dígitos numéricos.');
        expect(mockPrisma.organization.findUnique).not.toHaveBeenCalled();
      });

      it('should return error for non-numeric token', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);

        // Act - Using a number that has letters when converted to string
        const result = await verifyOtpSetup(Number('abc123')); // NaN

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('El token OTP debe ser de 6 dígitos numéricos.');
      });

      it('should handle invalid OTP_DIGITS environment variable', async () => {
        // Arrange
        process.env.OTP_DIGITS = 'invalid';
        mockGetOrganization.mockResolvedValue(mockSessionData);

        // Act
        const result = await verifyOtpSetup(mockValidToken);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Error interno en la configuración de OTP. Contacte al administrador.');
        expect(mockConsole.error).toHaveBeenCalledWith(
          '[verifyOtpSetup] ERROR CRÍTICO: OTP_DIGITS_FROM_CONFIG no es un número válido (NaN). No se puede validar el token.'
        );
      });

      it('should handle custom OTP_DIGITS configuration', async () => {
        // Arrange
        process.env.OTP_DIGITS = '8';
        mockGetOrganization.mockResolvedValue(mockSessionData);

        // Act
        const result = await verifyOtpSetup(12345678); // 8 digits

        // Assert - Should pass validation but may fail for other reasons
        expect(result.success).toBe(false);
        // Should not fail on token length validation
        expect(result.error).not.toBe('El token OTP debe ser de 8 dígitos numéricos.');
      });
    });

    describe('🔐 Authentication Errors', () => {
      it('should return error when user is not authenticated', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue({
          organizationId: null,
          error: 'Not authenticated',
        });

        // Act
        const result = await verifyOtpSetup(mockValidToken);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Not authenticated');
        expect(mockPrisma.organization.findUnique).not.toHaveBeenCalled();
      });

      it('should return error when organization not found', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue(null);

        // Act
        const result = await verifyOtpSetup(mockValidToken);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Configuración OTP no encontrada o secreta no disponible.');
      });

      it('should return error when OTP secret is missing', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue({
          ...mockOrganization,
          otpSecret: null,
        });

        // Act
        const result = await verifyOtpSetup(mockValidToken);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Configuración OTP no encontrada o secreta no disponible.');
      });

      it('should return error when secure mode is disabled', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue({
          ...mockOrganization,
          secureModeEnabled: false,
          otpSecret: 'MOCKED_SECRET',
        });

        // Act
        const result = await verifyOtpSetup(mockValidToken);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('El modo seguro no está activado. No se puede verificar OTP.');
      });
    });

    describe('❌ OTP Validation Errors', () => {
      it('should return error for invalid OTP token', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue({
          ...mockOrganization,
          secureModeEnabled: true,
          otpSecret: 'MOCKED_SECRET',
        });
        mockTOTPInstance.validate.mockReturnValue(null); // Invalid token

        // Act
        const result = await verifyOtpSetup(mockValidToken);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Token OTP inválido.');
        expect(mockPrisma.organization.update).not.toHaveBeenCalled();
      });
    });

    describe('❌ Database Errors', () => {
      it('should handle database errors during verification', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue({
          ...mockOrganization,
          secureModeEnabled: true,
          otpSecret: 'MOCKED_SECRET',
        });
        mockTOTPInstance.validate.mockReturnValue(0);
        const dbError = new Error('Update failed');
        mockPrisma.organization.update.mockRejectedValue(dbError);

        // Act
        const result = await verifyOtpSetup(mockValidToken);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Update failed');
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Error verifying OTP setup:',
          dbError
        );
      });

      it('should handle unknown errors', async () => {
        // Arrange
        mockGetOrganization.mockResolvedValue(mockSessionData);
        mockPrisma.organization.findUnique.mockResolvedValue({
          ...mockOrganization,
          secureModeEnabled: true,
          otpSecret: 'MOCKED_SECRET',
        });
        mockTOTPInstance.validate.mockReturnValue(0);
        mockPrisma.organization.update.mockRejectedValue('Unknown error');

        // Act
        const result = await verifyOtpSetup(mockValidToken);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Error al verificar la configuración OTP.');
      });
    });
  });

  describe('📊 Console Logging', () => {
    it('should log OTP verification details', async () => {
      // Arrange
      const testToken = 123456;
      mockGetOrganization.mockResolvedValue(mockSessionData);

      // Act
      await verifyOtpSetup(testToken);

      // Assert
      expect(mockConsole.log).toHaveBeenCalledWith(
        '[verifyOtpSetup] Iniciando verificación OTP con token:',
        testToken,
        'number'
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        "[verifyOtpSetup] Token (str): '123456', Longitud: 6"
      );
    });

    it('should log environment configuration details', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue(mockSessionData);

      // Act
      await verifyOtpSetup(123456);

      // Assert
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[verifyOtpSetup] rawDigits (process.env.OTP_DIGITS):')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[verifyOtpSetup] OTP_DIGITS_FROM_CONFIG:')
      );
    });

    it('should log regex validation results', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue(mockSessionData);

      // Act
      await verifyOtpSetup(123456);

      // Assert
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[verifyOtpSetup] tokenRegex.source:')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[verifyOtpSetup] Resultado de tokenRegex.test(token):')
      );
    });
  });

  describe('🔄 Cache Revalidation', () => {
    it('should revalidate correct path on successful operations', async () => {
      // Test toggleSecureMode
      mockGetOrganization.mockResolvedValue(mockSessionData);
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.organization.update.mockResolvedValue(mockOrganization);
      
      await toggleSecureMode(true);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/configuration', 'page');

      vi.clearAllMocks();

      // Test verifyOtpSetup
      mockGetOrganization.mockResolvedValue(mockSessionData);
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...mockOrganization,
        secureModeEnabled: true,
        otpSecret: 'MOCKED_SECRET',
      });
      const mockTOTPInstance = { validate: vi.fn(() => 0) };
      (otpauth.TOTP as any).mockImplementation(() => mockTOTPInstance);
      mockPrisma.organization.update.mockResolvedValue(mockOrganization);
      
      await verifyOtpSetup(123456);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/(app)/configuration', 'page');
    });

    it('should not revalidate on errors', async () => {
      // Test toggleSecureMode error
      mockGetOrganization.mockResolvedValue({
        organizationId: null,
        error: 'Not authenticated',
      });
      
      await toggleSecureMode(true);
      expect(mockRevalidatePath).not.toHaveBeenCalled();

      vi.clearAllMocks();

      // Test verifyOtpSetup error
      mockGetOrganization.mockResolvedValue(mockSessionData);
      
      await verifyOtpSetup(12345); // Invalid length
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('🎯 Edge Cases', () => {
    it('should handle missing userEmail in session', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        ...mockSessionData,
        userEmail: null,
      });

      // Act
      const result = await toggleSecureMode(true);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('falta información de sesión');
    });

    it('should handle missing userRole in session', async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({
        ...mockSessionData,
        userRole: null,
      });

      // Act
      const result = await toggleSecureMode(true);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('falta información de sesión');
    });

    it('should handle very large token numbers', async () => {
      // Arrange
      const largeToken = 999999;
      mockGetOrganization.mockResolvedValue(mockSessionData);
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...mockOrganization,
        secureModeEnabled: true,
        otpSecret: 'MOCKED_SECRET',
      });
      const mockTOTPInstance = { validate: vi.fn(() => 0) };
      (otpauth.TOTP as any).mockImplementation(() => mockTOTPInstance);
      mockPrisma.organization.update.mockResolvedValue(mockOrganization);

      // Act
      const result = await verifyOtpSetup(largeToken);

      // Assert
      expect(result.success).toBe(true);
      expect(mockTOTPInstance.validate).toHaveBeenCalledWith({ token: '999999' });
    });

    it('should handle zero as token', async () => {
      // Arrange
      const zeroToken = 0;
      mockGetOrganization.mockResolvedValue(mockSessionData);

      // Act
      const result = await verifyOtpSetup(zeroToken);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('El token OTP debe ser de 6 dígitos numéricos.');
    });
  });
}); 
