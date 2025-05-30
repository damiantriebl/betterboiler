import type { PrismaClient } from "@prisma/client";
import { beforeEach } from "vitest";
import { type DeepMockProxy, mockDeep, mockReset } from "vitest-mock-extended";

const prisma = mockDeep<PrismaClient>();

beforeEach(() => {
  mockReset(prisma);
});

export { prisma };
export type MockPrisma = DeepMockProxy<PrismaClient>;
