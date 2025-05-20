import { describe, it, expect, vi, beforeEach } from 'vitest';
import { depositPettyCash } from './deposit';
import * as sessionModule from '@/actions/get-Organization-Id-From-Session';

// Mock de prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    pettyCashAccount: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    pettyCashMovement: {
      create: vi.fn(),
    },
  },
}));

const prisma = require('@/lib/prisma').default;

describe('depositPettyCash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería registrar un depósito correctamente con rol permitido', async () => {
    vi.spyOn(sessionModule, 'getOrganizationIdFromSession').mockResolvedValue({
      organizationId: 'org1',
      userId: 'user1',
      userRole: 'ADMIN',
    });
    prisma.pettyCashAccount.findFirst.mockResolvedValue({ id: 'acc1' });
    prisma.pettyCashMovement.create.mockResolvedValue({
      id: 'mov1',
      accountId: 'acc1',
      userId: 'user1',
      registrarUserId: 'user1',
      type: 'DEBE',
      amount: { toNumber: () => 100 },
      description: 'desc',
      ticketNumber: 'T1',
      createdAt: new Date().toISOString(),
    });

    const result = await depositPettyCash({
      branchIdReceived: 'GENERAL_ACCOUNT',
      amount: 100,
      description: 'desc',
      ticketNumber: 'T1',
    });
    expect(result).toMatchObject({
      id: 'mov1',
      userId: 'user1',
      registrarUserId: 'user1',
      type: 'DEBE',
      amount: 100,
      description: 'desc',
      ticketNumber: 'T1',
    });
  });

  it('debería lanzar error si el rol no está permitido', async () => {
    vi.spyOn(sessionModule, 'getOrganizationIdFromSession').mockResolvedValue({
      organizationId: 'org1',
      userId: 'user1',
      userRole: 'USER',
    });
    await expect(
      depositPettyCash({
        branchIdReceived: 'GENERAL_ACCOUNT',
        amount: 100,
        description: 'desc',
        ticketNumber: 'T1',
      })
    ).rejects.toThrow('Acceso denegado. No tienes permiso para realizar esta acción.');
  });

  it('debería lanzar error si falta información esencial', async () => {
    vi.spyOn(sessionModule, 'getOrganizationIdFromSession').mockResolvedValue({
      organizationId: null,
      userId: null,
      userRole: null,
      error: 'No session',
    });
    await expect(
      depositPettyCash({
        branchIdReceived: 'GENERAL_ACCOUNT',
        amount: 100,
        description: 'desc',
        ticketNumber: 'T1',
      })
    ).rejects.toThrow('No session');
  });
}); 