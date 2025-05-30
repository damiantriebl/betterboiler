// Unified User Management API Library
// Siguiendo principios SOLID y DRY

import { getOrganizationIdFromSession, getSession } from "@/actions/util";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// 🔒 Types & Schemas for validation
export const updateUserBanStatusSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  banned: z.boolean(),
});

export const updateUserOrganizationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  organizationId: z.string().min(1, "Organization ID is required"),
});

export const updateUserRoleSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["user", "Treasurer", "admin", "root"], {
    required_error: "Role is required",
    invalid_type_error: "Invalid role",
  }),
});

export const deleteUserSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

// 🎯 Base types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
  details?: unknown;
}

export interface UserManagementOperation<TInput, TOutput = void> {
  schema: z.ZodSchema<TInput>;
  operation: (input: TInput, context?: OperationContext) => Promise<TOutput>;
  requiresAuth?: boolean;
  requiresOrganization?: boolean;
  allowedRoles?: string[]; // Roles que pueden hacer la operación sin restricción de organización
}

interface OperationContext {
  organizationId?: string;
  userId?: string;
  userRole?: string;
}

// 🔧 Core API handler factory (siguiendo Factory Pattern)
export class UserManagementApiHandler<TInput, TOutput = void> {
  constructor(private readonly config: UserManagementOperation<TInput, TOutput>) {}

  async handle(req: Request): Promise<NextResponse> {
    try {
      // 1. Parse and validate input
      const body = await req.json();
      const validationResult = this.config.schema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: "Datos de entrada inválidos",
            details: validationResult.error.format(),
          } satisfies ApiResponse,
          { status: 400 },
        );
      }

      // 2. Authentication & Authorization (if required)
      const context: OperationContext = {};

      if (this.config.requiresAuth || this.config.requiresOrganization) {
        // Primero obtenemos la sesión completa
        const sessionResult = await getSession();

        if (sessionResult.error || !sessionResult.session?.user) {
          return NextResponse.json(
            {
              success: false,
              error: "No autorizado - sesión inválida",
            } satisfies ApiResponse,
            { status: 401 },
          );
        }

        const user = sessionResult.session.user;
        context.userId = user.id;
        context.userRole = user.role;

        // Verificar si el usuario tiene un rol especial que le permite operar sin organizationId
        const hasSpecialRole = this.config.allowedRoles?.includes(user.role || "");

        if (hasSpecialRole) {
          // Usuarios con roles especiales pueden proceder sin organizationId
          console.log(`[USER_MANAGEMENT] Usuario con rol especial: ${user.role}`);
        } else if (this.config.requiresOrganization) {
          // Para usuarios normales, requerir organizationId
          if (!user.organizationId) {
            return NextResponse.json(
              {
                success: false,
                error: "No autorizado - organización requerida",
              } satisfies ApiResponse,
              { status: 401 },
            );
          }
          context.organizationId = user.organizationId;
        }
      }

      // 3. Execute operation
      const result = await this.config.operation(validationResult.data, context);

      // 4. Return success response
      return NextResponse.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      } satisfies ApiResponse<TOutput>);
    } catch (error) {
      console.error("[USER_MANAGEMENT_API] Error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Error interno del servidor",
          timestamp: new Date().toISOString(),
        } satisfies ApiResponse,
        { status: 500 },
      );
    }
  }
}

// 🔧 Pre-configured operations (siguiendo Strategy Pattern)
export const userOperations = {
  // Toggle user ban status
  toggleBanStatus: new UserManagementApiHandler({
    schema: updateUserBanStatusSchema,
    requiresAuth: true,
    operation: async ({ userId, banned }) => {
      return await prisma.user.update({
        where: { id: userId },
        data: { banned },
        select: { id: true, banned: true, email: true },
      });
    },
  }),

  // Update user organization
  updateOrganization: new UserManagementApiHandler({
    schema: updateUserOrganizationSchema,
    requiresAuth: true,
    requiresOrganization: true,
    allowedRoles: ["root"], // Solo ROOT puede cambiar organizaciones, no admin
    operation: async ({ userId, organizationId }) => {
      return await prisma.user.update({
        where: { id: userId },
        data: { organizationId },
        select: { id: true, organizationId: true, email: true },
      });
    },
  }),

  // Update user role - ADMIN y ROOT pueden cambiar roles
  updateRole: new UserManagementApiHandler({
    schema: updateUserRoleSchema,
    requiresAuth: true,
    requiresOrganization: true,
    allowedRoles: ["admin", "root"], // ADMIN y ROOT pueden cambiar roles
    operation: async ({ userId, role }) => {
      return await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: { id: true, role: true, email: true },
      });
    },
  }),

  // Delete user
  deleteUser: new UserManagementApiHandler({
    schema: deleteUserSchema,
    requiresAuth: true,
    operation: async ({ userId }) => {
      await prisma.user.delete({
        where: { id: userId },
      });
      return { deletedUserId: userId };
    },
  }),
} as const;

// 🎯 Utility function for creating handlers
export function createUserManagementHandler<TInput, TOutput = void>(
  operation: UserManagementOperation<TInput, TOutput>,
) {
  const handler = new UserManagementApiHandler(operation);
  return {
    POST: (req: Request) => handler.handle(req),
  };
}
