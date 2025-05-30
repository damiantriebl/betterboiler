import prisma from "@/lib/prisma";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOrganizationIdFromSession } from "../../util";
import { type PettyCashData, getPettyCashData } from "../get-petty-cash-data";

// Mock de Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    pettyCashDeposit: {
      findMany: vi.fn(),
    },
  },
}));

// Mock de getOrganizationIdFromSession
vi.mock("../../util", () => ({
  getOrganizationIdFromSession: vi.fn(),
}));

// Mock de console para tests silenciosos
const mockConsole = {
  error: vi.fn(),
  log: vi.fn(),
};

const mockPrisma = prisma as any;
const mockGetOrganization = getOrganizationIdFromSession as any;

describe("Get Petty Cash Data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockOrganizationId = "org-123";
  const mockDepositData: PettyCashData[] = [
    {
      id: "deposit-1",
      organizationId: mockOrganizationId,
      description: "Depósito inicial",
      amount: 10000.0,
      date: new Date("2024-01-15"),
      reference: "REF-001",
      status: "OPEN",
      branchId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      withdrawals: [
        {
          id: "withdrawal-1",
          organizationId: mockOrganizationId,
          depositId: "deposit-1",
          userId: "user-1",
          userName: "Juan Pérez",
          amountGiven: 1000.0,
          amountJustified: 500.0,
          date: new Date("2024-01-16"),
          status: "PARTIALLY_JUSTIFIED",
          createdAt: new Date(),
          updatedAt: new Date(),
          spends: [
            {
              id: "spend-1",
              organizationId: mockOrganizationId,
              withdrawalId: "withdrawal-1",
              motive: "transporte",
              description: "Viáticos de viaje",
              amount: 500.0,
              date: new Date("2024-01-16"),
              ticketUrl: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
      ],
    },
    {
      id: "deposit-2",
      organizationId: mockOrganizationId,
      description: "Segundo depósito",
      amount: 5000.0,
      date: new Date("2024-01-20"),
      reference: null,
      status: "CLOSED",
      branchId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      withdrawals: [],
    },
  ];

  describe("✅ Casos Exitosos", () => {
    it("debería obtener los datos de caja chica correctamente", async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findMany.mockResolvedValue(mockDepositData);

      // Act
      const result = await getPettyCashData();

      // Assert
      expect(mockGetOrganization).toHaveBeenCalled();
      expect(mockPrisma.pettyCashDeposit.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
        },
        include: {
          withdrawals: {
            include: {
              spends: true,
            },
            orderBy: {
              date: "desc",
            },
          },
        },
        orderBy: {
          date: "desc",
        },
      });
      expect(result.data).toEqual(mockDepositData);
      expect(result.error).toBeUndefined();
    });

    it("debería retornar datos vacíos cuando no hay depósitos", async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findMany.mockResolvedValue([]);

      // Act
      const result = await getPettyCashData();

      // Assert
      expect(result.data).toEqual([]);
      expect(result.error).toBeUndefined();
    });

    it("debería manejar depósitos con diferentes estados correctamente", async () => {
      // Arrange
      const mixedStatusDeposits = [
        { ...mockDepositData[0], status: "OPEN" },
        { ...mockDepositData[1], status: "CLOSED" },
      ];
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findMany.mockResolvedValue(mixedStatusDeposits);

      // Act
      const result = await getPettyCashData();

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].status).toBe("OPEN");
      expect(result.data?.[1].status).toBe("CLOSED");
    });

    it("debería manejar depósitos con retiros y gastos anidados", async () => {
      // Arrange
      const complexDeposit = [
        {
          ...mockDepositData[0],
          withdrawals: [
            {
              ...mockDepositData[0].withdrawals[0],
              spends: [
                {
                  id: "spend-1",
                  organizationId: mockOrganizationId,
                  withdrawalId: "withdrawal-1",
                  motive: "combustible",
                  description: "Gasolina del vehículo",
                  amount: 250.0,
                  date: new Date("2024-01-16"),
                  ticketUrl: "https://s3.amazonaws.com/ticket1.pdf",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                {
                  id: "spend-2",
                  organizationId: mockOrganizationId,
                  withdrawalId: "withdrawal-1",
                  motive: "otros",
                  description: "Materiales de oficina",
                  amount: 250.0,
                  date: new Date("2024-01-17"),
                  ticketUrl: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ],
            },
          ],
        },
      ];

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findMany.mockResolvedValue(complexDeposit);

      // Act
      const result = await getPettyCashData();

      // Assert
      expect(result.data?.[0].withdrawals[0].spends).toHaveLength(2);
      expect(result.data?.[0].withdrawals[0].spends[0].motive).toBe("combustible");
      expect(result.data?.[0].withdrawals[0].spends[1].motive).toBe("otros");
    });
  });

  describe("❌ Manejo de Errores", () => {
    it("debería manejar error cuando no se puede obtener el organizationId", async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({ error: "Session not found" });

      // Act
      const result = await getPettyCashData();

      // Assert
      expect(result.error).toBe("Session not found");
      expect(result.data).toBeUndefined();
      expect(mockPrisma.pettyCashDeposit.findMany).not.toHaveBeenCalled();
    });

    it("debería manejar organizationId faltante", async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({ organizationId: null });

      // Act
      const result = await getPettyCashData();

      // Assert
      expect(result.error).toBe("Organization not found");
      expect(result.data).toBeUndefined();
      expect(mockPrisma.pettyCashDeposit.findMany).not.toHaveBeenCalled();
    });

    it("debería manejar errores de base de datos conocidos", async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      const dbError = new Error("Database connection failed");
      mockPrisma.pettyCashDeposit.findMany.mockRejectedValue(dbError);

      // Act
      const result = await getPettyCashData();

      // Assert
      expect(result.error).toBe("Failed to fetch petty cash data: Database connection failed");
      expect(result.data).toBeUndefined();
      expect(mockConsole.error).toHaveBeenCalledWith("Error fetching petty cash data:", dbError);
    });

    it("debería manejar errores desconocidos", async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findMany.mockRejectedValue("Unknown error");

      // Act
      const result = await getPettyCashData();

      // Assert
      expect(result.error).toBe("Failed to fetch petty cash data: Unknown error");
      expect(result.data).toBeUndefined();
      expect(mockConsole.error).toHaveBeenCalledWith(
        "Error fetching petty cash data:",
        "Unknown error",
      );
    });
  });

  describe("🎯 Edge Cases", () => {
    it("debería manejar organizationId con caracteres especiales", async () => {
      // Arrange
      const specialOrgId = "org-123-特殊";
      mockGetOrganization.mockResolvedValue({ organizationId: specialOrgId });
      mockPrisma.pettyCashDeposit.findMany.mockResolvedValue([]);

      // Act
      const result = await getPettyCashData();

      // Assert
      expect(mockPrisma.pettyCashDeposit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: specialOrgId },
        }),
      );
      expect(result.data).toEqual([]);
    });

    it("debería manejar dataset muy grande", async () => {
      // Arrange
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockDepositData[0],
        id: `deposit-${i}`,
        description: `Depósito ${i}`,
      }));

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findMany.mockResolvedValue(largeDataset);

      // Act
      const result = await getPettyCashData();

      // Assert
      expect(result.data).toHaveLength(1000);
      expect(result.error).toBeUndefined();
    });

    it("debería manejar depósitos con campos null/undefined", async () => {
      // Arrange
      const depositWithNulls = [
        {
          id: "deposit-null",
          organizationId: mockOrganizationId,
          description: "Depósito con nulls",
          amount: 1000.0,
          date: new Date(),
          reference: null,
          status: "OPEN",
          branchId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          withdrawals: [],
        },
      ];

      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findMany.mockResolvedValue(depositWithNulls);

      // Act
      const result = await getPettyCashData();

      // Assert
      expect(result.data?.[0].reference).toBeNull();
      expect(result.data?.[0].branchId).toBeNull();
      expect(result.data?.[0].withdrawals).toEqual([]);
    });

    it("debería verificar correctamente el orden de los resultados", async () => {
      // Arrange
      mockGetOrganization.mockResolvedValue({ organizationId: mockOrganizationId });
      mockPrisma.pettyCashDeposit.findMany.mockResolvedValue(mockDepositData);

      // Act
      await getPettyCashData();

      // Assert
      expect(mockPrisma.pettyCashDeposit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { date: "desc" },
          include: expect.objectContaining({
            withdrawals: expect.objectContaining({
              orderBy: { date: "desc" },
            }),
          }),
        }),
      );
    });
  });
});
