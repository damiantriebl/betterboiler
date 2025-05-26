"use server";

import prisma from "@/lib/prisma";
import type { Organization, Branch, User } from "@prisma/client";
import { validateOrganizationAccess } from "./auth-session-unified";

// Types
export interface BranchData {
  id: number;
  name: string;
  organizationId: string;
  order: number;
}

export interface OrganizationUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
}

export interface OrganizationDataResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GetOrganizationUsersParams {
  organizationId?: string; // Optional, will use session if not provided
}

// Helper function for error handling
function handleDatabaseError(error: unknown, operation: string): string {
  console.error(`Error in ${operation}:`, error);
  return error instanceof Error ? error.message : "Error desconocido en la base de datos";
}

// Organization functions
export async function getOrganizationDetailsById(
  organizationId: string,
): Promise<Organization | null> {
  if (!organizationId) {
    console.error("getOrganizationDetailsById: No organizationId provided");
    return null;
  }

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });
    return organization;
  } catch (error) {
    console.error(`Error fetching organization details for ID ${organizationId}:`, error);
    return null;
  }
}

export async function getCurrentOrganizationDetails(): Promise<OrganizationDataResult<Organization>> {
  const authResult = await validateOrganizationAccess();
  
  if (!authResult.success || !authResult.organizationId) {
    return {
      success: false,
      error: authResult.error || "No se pudo obtener el ID de la organización",
    };
  }

  try {
    const organization = await getOrganizationDetailsById(authResult.organizationId);
    
    if (!organization) {
      return {
        success: false,
        error: "Organización no encontrada",
      };
    }

    return {
      success: true,
      data: organization,
    };
  } catch (error) {
    return {
      success: false,
      error: handleDatabaseError(error, "getCurrentOrganizationDetails"),
    };
  }
}

// Branch functions
export async function getBranchesForOrganizationAction(
  organizationId?: string
): Promise<Branch[]> {
  let targetOrganizationId = organizationId;

  // If no organizationId provided, get from session
  if (!targetOrganizationId) {
    const authResult = await validateOrganizationAccess();
    if (!authResult.success || !authResult.organizationId) {
      console.error("getBranchesForOrganizationAction: No organizationId available");
      return [];
    }
    targetOrganizationId = authResult.organizationId;
  }

  try {
    const branches = await prisma.branch.findMany({
      where: { organizationId: targetOrganizationId },
      orderBy: { order: "asc" },
    });
    return branches;
  } catch (error) {
    console.error("Error in getBranchesForOrganizationAction:", error);
    return [];
  }
}

export async function getBranchesData(): Promise<BranchData[]> {
  const authResult = await validateOrganizationAccess();
  
  if (!authResult.success || !authResult.organizationId) {
    console.error("[getBranchesData] No organizationId found.");
    return [];
  }

  try {
    const branchesFromDb = await prisma.branch.findMany({
      where: { organizationId: authResult.organizationId },
      select: {
        id: true,
        name: true,
        organizationId: true,
        order: true,
      },
      orderBy: { order: "asc" },
    });

    return branchesFromDb;
  } catch (error) {
    console.error("Error en getBranchesData:", error);
    return [];
  }
}

// User functions
export async function getUsersForOrganizationAction(
  organizationId?: string
): Promise<OrganizationUser[]> {
  let targetOrganizationId = organizationId;

  // If no organizationId provided, get from session
  if (!targetOrganizationId) {
    const authResult = await validateOrganizationAccess();
    if (!authResult.success || !authResult.organizationId) {
      console.error("getUsersForOrganizationAction: No organizationId available");
      return [];
    }
    targetOrganizationId = authResult.organizationId;
  }

  try {
    const users = await prisma.user.findMany({
      where: { organizationId: targetOrganizationId },
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
      },
      orderBy: { name: "asc" },
    });
    return users;
  } catch (error) {
    console.error("Error in getUsersForOrganizationAction:", error);
    return [];
  }
}

export async function getOrganizationUsers(
  params: GetOrganizationUsersParams = {}
): Promise<OrganizationDataResult<OrganizationUser[]>> {
  let targetOrganizationId = params.organizationId;

  // If no organizationId provided, get from session
  if (!targetOrganizationId) {
    const authResult = await validateOrganizationAccess();
    if (!authResult.success || !authResult.organizationId) {
      return {
        success: false,
        error: authResult.error || "No se pudo obtener el ID de la organización",
      };
    }
    targetOrganizationId = authResult.organizationId;
  }

  try {
    const users = await prisma.user.findMany({
      where: { organizationId: targetOrganizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });

    return { success: true, data: users };
  } catch (error) {
    return {
      success: false,
      error: `Error al obtener los usuarios de la organización: ${handleDatabaseError(error, "getOrganizationUsers")}`,
    };
  }
}

// Utility functions
export async function getOrganizationSummary(): Promise<OrganizationDataResult<{
  organization: Organization;
  branchCount: number;
  userCount: number;
}>> {
  const authResult = await validateOrganizationAccess();
  
  if (!authResult.success || !authResult.organizationId) {
    return {
      success: false,
      error: authResult.error || "No se pudo obtener el ID de la organización",
    };
  }

  try {
    const [organization, branchCount, userCount] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: authResult.organizationId },
      }),
      prisma.branch.count({
        where: { organizationId: authResult.organizationId },
      }),
      prisma.user.count({
        where: { organizationId: authResult.organizationId },
      }),
    ]);

    if (!organization) {
      return {
        success: false,
        error: "Organización no encontrada",
      };
    }

    return {
      success: true,
      data: {
        organization,
        branchCount,
        userCount,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: handleDatabaseError(error, "getOrganizationSummary"),
    };
  }
} 
