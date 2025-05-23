"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getOrganizationIdFromSession } from "@/actions/get-Organization-Id-From-Session";
import * as otpauth from "otpauth"; // Importar otpauth

interface DeletePettyCashMovementParams {
  movementId: string;
  otpToken?: string; // Token OTP opcional
}

export async function deletePettyCashMovement(
  params: DeletePettyCashMovementParams,
): Promise<{ success: boolean; error?: string; message?: string }> {
  console.log("🚀 deletePettyCashMovement action started with params:", params);
  const { movementId, otpToken } = params;

  if (!movementId) {
    console.error("🚫 Error: movementId not provided.");
    return { success: false, error: "ID de movimiento no proporcionado." };
  }
  console.log("✅ movementId provided:", movementId);

  const sessionData = await getOrganizationIdFromSession();
  console.log(
    "ℹ️ Session data from getOrganizationIdFromSession (in movement delete):",
    sessionData,
  );

  if (
    sessionData.error ||
    !sessionData.organizationId ||
    !sessionData.userRole ||
    !sessionData.userEmail
  ) {
    console.error(
      "🚫 Error: Invalid session data or missing essential fields (in movement delete).",
      sessionData,
    );
    return {
      success: false,
      error:
        sessionData.error ||
        "No se pudo obtener la información de la sesión o falta información esencial (email, orgId, role).",
    };
  }
  console.log("✅ Session data valid (in movement delete):", {
    organizationId: sessionData.organizationId,
    userRole: sessionData.userRole,
    userEmail: sessionData.userEmail,
  });

  const { organizationId, userRole, userEmail } = sessionData;

  const allowedRoles = ["admin", "root", "cash-manager"];
  if (!allowedRoles.includes(userRole)) {
    console.error(
      `🚫 Error: User role '${userRole}' not in allowedRoles (in movement delete):`,
      allowedRoles,
    );
    return {
      success: false,
      error: "Acceso denegado. No tienes permiso para realizar esta acción.",
    };
  }
  console.log(`✅ User role '${userRole}' is allowed (in movement delete).`);

  try {
    console.log(
      "⏳ Fetching organization settings for organizationId (in movement delete):",
      organizationId,
    );
    const organizationSettings = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { secureModeEnabled: true, otpSecret: true, otpVerified: true },
    });
    console.log("ℹ️ Organization settings fetched (in movement delete):", organizationSettings);

    if (!organizationSettings) {
      console.error(
        "🚫 Error: Organization settings not found for organizationId (in movement delete):",
        organizationId,
      );
      return { success: false, error: "Configuración de la organización no encontrada." };
    }
    console.log("✅ Organization settings found (in movement delete).");

    if (organizationSettings.secureModeEnabled) {
      console.log("🔒 Secure mode enabled. Proceeding with OTP checks (in movement delete).");
      if (!organizationSettings.otpVerified || !organizationSettings.otpSecret) {
        console.error(
          "🚫 Error: Secure mode enabled but OTP not configured/verified in organization (in movement delete).",
          organizationSettings,
        );
        return {
          success: false,
          error:
            "El modo seguro está activado, pero la configuración OTP no está completa o verificada en la organización.",
        };
      }
      console.log("✅ Organization OTP configured and verified (in movement delete).");

      if (!otpToken) {
        console.error(
          "🚫 Error: Secure mode enabled, but no otpToken provided with params (in movement delete):",
          params,
        );
        return {
          success: false,
          error: "Modo seguro activado. Se requiere un token OTP para esta acción.",
        };
      }
      console.log("✅ otpToken provided (in movement delete):", otpToken);

      const OTP_ISSUER = process.env.OTP_ISSUER || "Apex Software";
      const OTP_ALGORITHM = process.env.OTP_ALGORITHM || "SHA1";
      const OTP_DIGITS_FROM_CONFIG = Number.parseInt(process.env.OTP_DIGITS || "6", 10);
      const OTP_PERIOD = Number.parseInt(process.env.OTP_PERIOD || "120", 10);

      console.log("Backend OTP_DIGITS_FROM_CONFIG (in movement delete):", OTP_DIGITS_FROM_CONFIG);
      console.log("Backend received otpToken (in movement delete):", otpToken);
      console.log("Backend otpToken type (in movement delete):", typeof otpToken);

      const tokenRegex = new RegExp(`^\\d{${OTP_DIGITS_FROM_CONFIG}}$`);
      console.log("Backend tokenRegex (in movement delete):", tokenRegex.toString());

      if (!tokenRegex.test(otpToken)) {
        console.log("Backend regex test failed (in movement delete)");
        return {
          success: false,
          error: `El token OTP debe ser de ${OTP_DIGITS_FROM_CONFIG} dígitos numéricos.`,
        };
      }
      console.log("Backend regex test passed (in movement delete)");

      const secret = otpauth.Secret.fromBase32(organizationSettings.otpSecret);
      const totp = new otpauth.TOTP({
        issuer: OTP_ISSUER,
        label: userEmail,
        algorithm: OTP_ALGORITHM,
        digits: OTP_DIGITS_FROM_CONFIG,
        period: OTP_PERIOD,
        secret: secret,
      });

      const delta = totp.validate({ token: otpToken, window: 1 });

      if (delta === null) {
        console.error("🚫 Error: Invalid or expired OTP token (in movement delete).", {
          otpToken,
          delta,
        });
        return { success: false, error: "Token OTP inválido o expirado." };
      }
      console.log("✅ OTP token validated successfully (in movement delete).", { delta });
    }

    console.log("⏳ Checking if spend exists. Movement ID:", movementId);
    const existingSpend = await prisma.pettyCashSpend.findUnique({
      where: { id: movementId, organizationId: organizationId },
    });
    console.log("ℹ️ Existing spend data:", existingSpend ? { id: existingSpend.id } : null);

    if (!existingSpend) {
      console.error(
        "🚫 Error: Spend not found or does not belong to organization. Movement ID:",
        movementId,
        "Org ID:",
        organizationId,
      );
      return { success: false, error: "Gasto no encontrado o no pertenece a tu organización." };
    }
    console.log("✅ Spend found. Proceeding with deletion.");

    await prisma.pettyCashSpend.delete({
      where: { id: movementId },
    });
    console.log("✅ Spend deleted successfully from DB. Movement ID:", movementId);

    revalidatePath("/(app)/petty-cash", "page");
    console.log("🔄 Path revalidated: /(app)/petty-cash (in movement delete)");
    return { success: true, message: "Gasto eliminado correctamente." };
  } catch (error) {
    console.error("💥 CRITICAL ERROR in deletePettyCashMovement:", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido";
    return {
      success: false,
      error: `Error al eliminar el gasto: ${errorMessage}`,
    };
  }
}
