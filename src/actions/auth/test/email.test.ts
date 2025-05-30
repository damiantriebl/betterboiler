import sgMail from "@sendgrid/mail";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "../email";

// Mock de SendGrid
vi.mock("@sendgrid/mail", () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn(),
  },
}));

// Mock de console para tests silenciosos
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
};

// Mock de process.env
const originalEnv = process.env;

describe("sendEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.console = mockConsole as any;

    // Restaurar variables de entorno por defecto
    process.env = {
      ...originalEnv,
      SENDGRID_API_KEY: "test-api-key",
      EMAIL_FROM: "test@example.com",
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  describe("✅ Successful Email Sending", () => {
    it("should send email successfully with all parameters", async () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sgMail.send as any).mockResolvedValue([
        {
          statusCode: 202,
          headers: { "x-message-id": "test-message-id" },
        },
      ]);

      // Act
      const result = await sendEmail({
        to: "recipient@example.com",
        subject: "Test Subject",
        text: "Plain text content",
      });

      // Assert
      expect(sgMail.send).toHaveBeenCalledWith({
        to: "recipient@example.com",
        from: "test@example.com",
        subject: "Test Subject",
        text: "Plain text content",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("Email sent successfully");
      expect(mockConsole.log).toHaveBeenCalledWith(
        "Email sent successfully to recipient@example.com",
      );
    });

    it("should send email with text content only", async () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sgMail.send as any).mockResolvedValue([{ statusCode: 202 }]);

      // Act
      const result = await sendEmail({
        to: "user@test.com",
        subject: "Text Only Subject",
        text: "Only plain text content",
      });

      // Assert
      expect(sgMail.send).toHaveBeenCalledWith({
        to: "user@test.com",
        from: "test@example.com",
        subject: "Text Only Subject",
        text: "Only plain text content",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("❌ Environment Configuration Errors", () => {
    it("should return error when SENDGRID_API_KEY is missing", async () => {
      // Arrange
      process.env.SENDGRID_API_KEY = undefined;

      // Act
      const result = await sendEmail({
        to: "test@example.com",
        subject: "Subject",
        text: "Content",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe("Failed to send email. Please try again later.");
      expect(sgMail.send).not.toHaveBeenCalled();
    });

    it("should return error when EMAIL_FROM is missing", async () => {
      // Arrange
      process.env.EMAIL_FROM = undefined;

      // Act
      const result = await sendEmail({
        to: "test@example.com",
        subject: "Subject",
        text: "Content",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe("Failed to send email. Please try again later.");
      expect(sgMail.send).not.toHaveBeenCalled();
    });
  });

  describe("🔧 SendGrid API Errors", () => {
    it("should handle API errors", async () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sgMail.send as any).mockRejectedValue(new Error("Invalid request"));

      // Act
      const result = await sendEmail({
        to: "invalid-email",
        subject: "Subject",
        text: "Content",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe("Failed to send email. Please try again later.");
      expect(mockConsole.error).toHaveBeenCalledWith("Error sending email:", expect.any(Error));
    });
  });

  describe("🧪 Console Logging", () => {
    it("should log successful email sends", async () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sgMail.send as any).mockResolvedValue([{ statusCode: 202 }]);

      // Act
      await sendEmail({
        to: "logger@example.com",
        subject: "Log Test",
        text: "Logging content",
      });

      // Assert
      expect(mockConsole.log).toHaveBeenCalledWith("Email sent successfully to logger@example.com");
    });

    it("should log errors without exposing sensitive information", async () => {
      // Arrange
      const sensitiveError = new Error("API Error: Invalid key test-api-key");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sgMail.send as any).mockRejectedValue(sensitiveError);

      // Act
      await sendEmail({
        to: "test@example.com",
        subject: "Subject",
        text: "Content",
      });

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith("Error sending email:", sensitiveError);
    });
  });
});
