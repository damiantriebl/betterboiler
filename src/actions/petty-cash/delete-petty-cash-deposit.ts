"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getOrganizationIdFromSession } from "@/actions/get-Organization-Id-From-Session";
import * as otpauth from "otpauth";

interface DeletePettyCashDepositParams {
    depositId: string;
    otpToken?: string; 
}

export async function deletePettyCashDeposit(
    params: DeletePettyCashDepositParams
): Promise<{ success: boolean; error?: string; message?: string }> {
    console.log("🚀 deletePettyCashDeposit action started with params:", params);
    const { depositId, otpToken } = params;

    if (!depositId) {
        console.error("🚫 Error: depositId not provided.");
        return { success: false, error: "ID de depósito no proporcionado." };
    }
    console.log("✅ depositId provided:", depositId);

    const sessionData = await getOrganizationIdFromSession();
    console.log("ℹ️ Session data from getOrganizationIdFromSession:", sessionData);

    if (sessionData.error || !sessionData.organizationId || !sessionData.userRole || !sessionData.userEmail) {
        console.error("🚫 Error: Invalid session data or missing essential fields.", sessionData);
        return { success: false, error: sessionData.error || "No se pudo obtener la información de la sesión o falta información esencial (email, orgId, role)." };
    }
    console.log("✅ Session data valid:", { organizationId: sessionData.organizationId, userRole: sessionData.userRole, userEmail: sessionData.userEmail });

    const { organizationId, userRole, userEmail } = sessionData;

    const allowedRoles = ["admin", "root", "cash-manager"];
    if (!allowedRoles.includes(userRole)) {
        console.error(`🚫 Error: User role '${userRole}' not in allowedRoles:`, allowedRoles);
        return { success: false, error: "Acceso denegado. No tienes permiso para realizar esta acción." };
    }
    console.log(`✅ User role '${userRole}' is allowed.`);

    try {
        console.log("⏳ Fetching organization settings for organizationId:", organizationId);
        const organizationSettings = await prisma.organization.findUnique({
            where: { id: organizationId },
            select: { secureModeEnabled: true, otpSecret: true, otpVerified: true },
        });
        console.log("ℹ️ Organization settings fetched:", organizationSettings);

        if (!organizationSettings) {
            console.error("🚫 Error: Organization settings not found for organizationId:", organizationId);
            return { success: false, error: "Configuración de la organización no encontrada." };
        }
        console.log("✅ Organization settings found.");

        if (organizationSettings.secureModeEnabled) {
            console.log("🔒 Secure mode enabled. Proceeding with OTP checks.");
            if (!organizationSettings.otpVerified || !organizationSettings.otpSecret) {
                console.error("🚫 Error: Secure mode enabled but OTP not configured/verified in organization.", organizationSettings);
                return { success: false, error: "El modo seguro está activado, pero la configuración OTP no está completa o verificada en la organización." };
            }
            console.log("✅ Organization OTP configured and verified.");

            if (!otpToken) {
                console.error("🚫 Error: Secure mode enabled, but no otpToken provided with params:", params);
                return { success: false, error: "Modo seguro activado. Se requiere un token OTP para esta acción." };
            }
            console.log("✅ otpToken provided:", otpToken);

            const OTP_ISSUER = process.env.OTP_ISSUER || "Apex Software";
            const OTP_ALGORITHM = process.env.OTP_ALGORITHM || "SHA1";
            const OTP_DIGITS_FROM_CONFIG = parseInt(process.env.OTP_DIGITS || "6", 10);
            const OTP_PERIOD = parseInt(process.env.OTP_PERIOD || "120", 10);

            console.log("Backend OTP_DIGITS_FROM_CONFIG:", OTP_DIGITS_FROM_CONFIG); 
            console.log("Backend received otpToken:", otpToken); 
            console.log("Backend otpToken type:", typeof otpToken); 

            const tokenRegex = new RegExp(`^\\d{${OTP_DIGITS_FROM_CONFIG}}$`);
            console.log("Backend tokenRegex:", tokenRegex.toString()); 

            if (!tokenRegex.test(otpToken)) {
                 console.log("Backend regex test failed"); 
                 return { success: false, error: `El token OTP debe ser de ${OTP_DIGITS_FROM_CONFIG} dígitos numéricos.` };
            }
            console.log("Backend regex test passed"); 

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
                console.error("🚫 Error: Invalid or expired OTP token.", { otpToken, delta });
                return { success: false, error: "Token OTP inválido o expirado." };
            }
            console.log("✅ OTP token validated successfully.", { delta });
        }

        console.log("⏳ Checking if deposit exists and for associated withdrawals. Deposit ID:", depositId);
        const existingDeposit = await prisma.pettyCashDeposit.findUnique({
            where: { id: depositId, organizationId: organizationId }, 
            include: { 
                withdrawals: { select: { id: true } }, 
            },
        });
        console.log("ℹ️ Existing deposit data:", existingDeposit ? { id: existingDeposit.id, withdrawalsCount: existingDeposit.withdrawals.length } : null);

        if (!existingDeposit) {
            console.error("🚫 Error: Deposit not found or does not belong to organization. Deposit ID:", depositId, "Org ID:", organizationId);
            return { success: false, error: "Depósito no encontrado o no pertenece a tu organización." };
        }
        console.log("✅ Deposit found.");

        if (existingDeposit.withdrawals && existingDeposit.withdrawals.length > 0) {
            console.error("🚫 Error: Cannot delete deposit with associated withdrawals. Withdrawals count:", existingDeposit.withdrawals.length);
            return { success: false, error: "No se puede eliminar el depósito porque tiene retiros asociados. Elimine los retiros primero." };
        }
        console.log("✅ Deposit has no associated withdrawals. Proceeding with deletion.");

        await prisma.pettyCashDeposit.delete({
            where: { id: depositId },
        });
        console.log("✅ Deposit deleted successfully from DB. Deposit ID:", depositId);

        revalidatePath("/(app)/petty-cash", "page");
        console.log("🔄 Path revalidated: /(app)/petty-cash");
        return { success: true, message: "Depósito eliminado correctamente." };

    } catch (error) {
        console.error("💥 CRITICAL ERROR in deletePettyCashDeposit:", error);
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido";
        return {
            success: false,
            error: `Error al eliminar el depósito: ${errorMessage}`,
        };
    }
} 