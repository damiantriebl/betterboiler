import prisma from "@/lib/prisma";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getOrganizationPaymentMethods,
  setupCurrentAccountMethod,
  setupPaymentMethod,
  togglePaymentMethodStatus,
} from "../payment-methods-unified";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    paymentMethod: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    organizationPaymentMethod: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../auth-session-unified", () => ({
  validateOrganizationAccess: vi.fn(),
}));

const mockPrisma = prisma as any;

// Import the mocked function
import { validateOrganizationAccess } from "../auth-session-unified";
const mockValidateOrganizationAccess = validateOrganizationAccess as Mock;

describe("payment-methods-unified", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("setupCurrentAccountMethod", () => {
    it("should create and enable current account method when not exists", async () => {
      const mockPaymentMethod = {
        id: "pm-1",
        name: "Cuenta Corriente",
        type: "current_account",
        description: "Pago con cuenta corriente financiada",
        iconUrl: "/icons/payment-methods/current-account.svg",
      };

      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.paymentMethod.findFirst.mockResolvedValue(null);
      mockPrisma.paymentMethod.create.mockResolvedValue(mockPaymentMethod);
      mockPrisma.organizationPaymentMethod.findFirst.mockResolvedValue(null);
      mockPrisma.organizationPaymentMethod.findFirst
        .mockResolvedValueOnce(null) // For existing check
        .mockResolvedValueOnce({ order: 2 }); // For highest order
      mockPrisma.organizationPaymentMethod.create.mockResolvedValue({});

      const result = await setupCurrentAccountMethod();

      expect(result).toEqual({
        success: true,
        data: {
          paymentMethod: mockPaymentMethod,
          enabled: false,
        },
      });

      expect(mockPrisma.paymentMethod.create).toHaveBeenCalledWith({
        data: {
          name: "Cuenta Corriente",
          type: "current_account",
          description: "Pago con cuenta corriente financiada",
          iconUrl: "/icons/payment-methods/current-account.svg",
        },
      });

      expect(mockPrisma.organizationPaymentMethod.create).toHaveBeenCalledWith({
        data: {
          organizationId: "org-1",
          methodId: "pm-1",
          isEnabled: true,
          order: 3,
        },
      });
    });

    it("should use existing payment method when already exists", async () => {
      const mockPaymentMethod = {
        id: "pm-1",
        name: "Cuenta Corriente",
        type: "current_account",
        description: "Pago con cuenta corriente financiada",
        iconUrl: "/icons/payment-methods/current-account.svg",
      };

      const mockOrgMethod = {
        id: "opm-1",
        organizationId: "org-1",
        methodId: "pm-1",
        isEnabled: true,
        order: 1,
      };

      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.paymentMethod.findFirst.mockResolvedValue(mockPaymentMethod);
      mockPrisma.organizationPaymentMethod.findFirst.mockResolvedValue(mockOrgMethod);

      const result = await setupCurrentAccountMethod();

      expect(result).toEqual({
        success: true,
        data: {
          paymentMethod: mockPaymentMethod,
          enabled: true,
        },
      });

      expect(mockPrisma.paymentMethod.create).not.toHaveBeenCalled();
      expect(mockPrisma.organizationPaymentMethod.create).not.toHaveBeenCalled();
    });

    it("should return error when organization access fails", async () => {
      mockValidateOrganizationAccess.mockResolvedValue({
        success: false,
        error: "No access",
      });

      const result = await setupCurrentAccountMethod();

      expect(result).toEqual({
        success: false,
        error: "No access",
      });
    });

    it("should handle database errors", async () => {
      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.paymentMethod.findFirst.mockRejectedValue(new Error("Database error"));

      const result = await setupCurrentAccountMethod();

      expect(result).toEqual({
        success: false,
        error: "Database error",
      });
    });

    it("should handle case when payment method creation fails", async () => {
      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.paymentMethod.findFirst.mockResolvedValue(null);
      mockPrisma.paymentMethod.create.mockResolvedValue(null);

      const result = await setupCurrentAccountMethod();

      expect(result).toEqual({
        success: false,
        error: "No se pudo crear o encontrar el método de pago 'Cuenta Corriente'.",
      });
    });

    it("should set order to 1 when no existing payment methods", async () => {
      const mockPaymentMethod = {
        id: "pm-1",
        name: "Cuenta Corriente",
        type: "current_account",
        description: "Pago con cuenta corriente financiada",
        iconUrl: "/icons/payment-methods/current-account.svg",
      };

      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.paymentMethod.findFirst.mockResolvedValue(mockPaymentMethod);
      mockPrisma.organizationPaymentMethod.findFirst
        .mockResolvedValueOnce(null) // For existing check
        .mockResolvedValueOnce(null); // For highest order (no existing methods)
      mockPrisma.organizationPaymentMethod.create.mockResolvedValue({});

      const result = await setupCurrentAccountMethod();

      expect(result).toEqual({
        success: true,
        data: {
          paymentMethod: mockPaymentMethod,
          enabled: false,
        },
      });

      expect(mockPrisma.organizationPaymentMethod.create).toHaveBeenCalledWith({
        data: {
          organizationId: "org-1",
          methodId: "pm-1",
          isEnabled: true,
          order: 1,
        },
      });
    });
  });

  describe("setupPaymentMethod", () => {
    it("should create and enable custom payment method", async () => {
      const params = {
        name: "Credit Card",
        type: "credit_card",
        description: "Credit card payments",
        iconUrl: "/icons/credit-card.svg",
      };

      const mockPaymentMethod = {
        id: "pm-2",
        ...params,
      };

      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.paymentMethod.findFirst.mockResolvedValue(null);
      mockPrisma.paymentMethod.create.mockResolvedValue(mockPaymentMethod);
      mockPrisma.organizationPaymentMethod.findFirst
        .mockResolvedValueOnce(null) // For existing check
        .mockResolvedValueOnce({ order: 1 }); // For highest order
      mockPrisma.organizationPaymentMethod.create.mockResolvedValue({});

      const result = await setupPaymentMethod(params);

      expect(result).toEqual({
        success: true,
        data: {
          paymentMethod: mockPaymentMethod,
          enabled: false,
        },
      });

      expect(mockPrisma.paymentMethod.create).toHaveBeenCalledWith({
        data: params,
      });
    });

    it("should return error when organization access fails", async () => {
      const params = {
        name: "Credit Card",
        type: "credit_card",
        description: "Credit card payments",
        iconUrl: "/icons/credit-card.svg",
      };

      mockValidateOrganizationAccess.mockResolvedValue({
        success: false,
        error: "No access",
      });

      const result = await setupPaymentMethod(params);

      expect(result).toEqual({
        success: false,
        error: "No access",
      });
    });
  });

  describe("getOrganizationPaymentMethods", () => {
    it("should return enabled payment methods for organization", async () => {
      const mockPaymentMethods = [
        {
          id: "opm-1",
          organizationId: "org-1",
          methodId: "pm-1",
          isEnabled: true,
          order: 1,
        },
        {
          id: "opm-2",
          organizationId: "org-1",
          methodId: "pm-2",
          isEnabled: true,
          order: 2,
        },
      ];

      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.organizationPaymentMethod.findMany.mockResolvedValue(mockPaymentMethods);

      const result = await getOrganizationPaymentMethods();

      expect(result).toEqual({
        success: true,
        data: mockPaymentMethods,
      });

      expect(mockPrisma.organizationPaymentMethod.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          isEnabled: true,
        },
        orderBy: { order: "asc" },
      });
    });

    it("should return error when organization access fails", async () => {
      mockValidateOrganizationAccess.mockResolvedValue({
        success: false,
        error: "No access",
      });

      const result = await getOrganizationPaymentMethods();

      expect(result).toEqual({
        success: false,
        error: "No access",
      });
    });

    it("should handle database errors", async () => {
      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.organizationPaymentMethod.findMany.mockRejectedValue(new Error("Database error"));

      const result = await getOrganizationPaymentMethods();

      expect(result).toEqual({
        success: false,
        error: "Database error",
      });
    });
  });

  describe("togglePaymentMethodStatus", () => {
    it("should enable payment method when disabled", async () => {
      const mockOrgMethod = {
        id: "opm-1",
        organizationId: "org-1",
        methodId: "pm-1",
        isEnabled: false,
        order: 1,
      };

      const mockUpdatedMethod = {
        ...mockOrgMethod,
        isEnabled: true,
      };

      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.organizationPaymentMethod.findFirst.mockResolvedValue(mockOrgMethod);
      mockPrisma.organizationPaymentMethod.update.mockResolvedValue(mockUpdatedMethod);

      const result = await togglePaymentMethodStatus("pm-1", true);

      expect(result).toEqual({
        success: true,
        data: mockUpdatedMethod,
      });

      expect(mockPrisma.organizationPaymentMethod.update).toHaveBeenCalledWith({
        where: { id: "opm-1" },
        data: { isEnabled: true },
      });
    });

    it("should disable payment method when enabled", async () => {
      const mockOrgMethod = {
        id: "opm-1",
        organizationId: "org-1",
        methodId: "pm-1",
        isEnabled: true,
        order: 1,
      };

      const mockUpdatedMethod = {
        ...mockOrgMethod,
        isEnabled: false,
      };

      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.organizationPaymentMethod.findFirst.mockResolvedValue(mockOrgMethod);
      mockPrisma.organizationPaymentMethod.update.mockResolvedValue(mockUpdatedMethod);

      const result = await togglePaymentMethodStatus("pm-1", false);

      expect(result).toEqual({
        success: true,
        data: mockUpdatedMethod,
      });

      expect(mockPrisma.organizationPaymentMethod.update).toHaveBeenCalledWith({
        where: { id: "opm-1" },
        data: { isEnabled: false },
      });
    });

    it("should return error when payment method not found", async () => {
      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.organizationPaymentMethod.findFirst.mockResolvedValue(null);

      const result = await togglePaymentMethodStatus("pm-1", true);

      expect(result).toEqual({
        success: false,
        error: "Método de pago no encontrado para esta organización",
      });
    });

    it("should return error when organization access fails", async () => {
      mockValidateOrganizationAccess.mockResolvedValue({
        success: false,
        error: "No access",
      });

      const result = await togglePaymentMethodStatus("pm-1", true);

      expect(result).toEqual({
        success: false,
        error: "No access",
      });
    });

    it("should handle database errors", async () => {
      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.organizationPaymentMethod.findFirst.mockRejectedValue(new Error("Database error"));

      const result = await togglePaymentMethodStatus("pm-1", true);

      expect(result).toEqual({
        success: false,
        error: "Database error",
      });
    });

    it("should handle update errors", async () => {
      const mockOrgMethod = {
        id: "opm-1",
        organizationId: "org-1",
        methodId: "pm-1",
        isEnabled: false,
        order: 1,
      };

      mockValidateOrganizationAccess.mockResolvedValue({
        success: true,
        organizationId: "org-1",
      });

      mockPrisma.organizationPaymentMethod.findFirst.mockResolvedValue(mockOrgMethod);
      mockPrisma.organizationPaymentMethod.update.mockRejectedValue(new Error("Update error"));

      const result = await togglePaymentMethodStatus("pm-1", true);

      expect(result).toEqual({
        success: false,
        error: "Update error",
      });
    });
  });
});
