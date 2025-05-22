"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getOrganizationIdFromSession } from "@/actions/get-Organization-Id-From-Session";
import * as otpauth from "otpauth";

interface DeletePettyCashWithdrawalParams {
    withdrawalId: string;
    otpToken?: string; 
}

export async function deletePettyCashWithdrawal(
    params: DeletePettyCashWithdrawalParams
): Promise<{ success: boolean; error?: string; message?: string }> {
    const { withdrawalId, otpToken } = params;

    if (!withdrawalId) {
        return { success: false, error: "ID de retiro no proporcionado." };
    }

    const sessionData = await getOrganizationIdFromSession();
    if (sessionData.error || !sessionData.organizationId || !sessionData.userRole || !sessionData.userEmail) {
        return { success: false, error: sessionData.error || "No se pudo obtener la información de la sesión o falta información esencial (email, orgId, role)." };
    }

    const { organizationId, userRole, userEmail } = sessionData;

    const allowedRoles = ["admin", "root", "cash-manager"];
    if (!allowedRoles.includes(userRole)) {
        return { success: false, error: "Acceso denegado. No tienes permiso para realizar esta acción." };
    }

    try {
        const organizationSettings = await prisma.organization.findUnique({
            where: { id: organizationId },
            select: { secureModeEnabled: true, otpSecret: true, otpVerified: true },
        });

        if (!organizationSettings) {
            return { success: false, error: "Configuración de la organización no encontrada." };
        }

        if (organizationSettings.secureModeEnabled) {
            if (!organizationSettings.otpVerified || !organizationSettings.otpSecret) {
                return { success: false, error: "El modo seguro está activado, pero la configuración OTP no está completa o verificada en la organización." };
            }
            if (!otpToken) {
                return { success: false, error: "Modo seguro activado. Se requiere un token OTP para esta acción." };
            }

            const OTP_ISSUER = process.env.OTP_ISSUER || "Apex Software";
            const OTP_ALGORITHM = process.env.OTP_ALGORITHM || "SHA1";
            const OTP_DIGITS_FROM_CONFIG = parseInt(process.env.OTP_DIGITS || "6", 10);
            const OTP_PERIOD = parseInt(process.env.OTP_PERIOD || "120", 10);

            const tokenRegex = new RegExp(`^\\d{${OTP_DIGITS_FROM_CONFIG}}$`);
            if (!tokenRegex.test(otpToken)) {
                 return { success: false, error: `El token OTP debe ser de ${OTP_DIGITS_FROM_CONFIG} dígitos numéricos.` };
            }

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
                return { success: false, error: "Token OTP inválido o expirado." };
            }
        }

        const existingWithdrawal = await prisma.pettyCashWithdrawal.findUnique({
            where: { id: withdrawalId },
            include: { 
                spends: { select: { id: true } }, // Para verificar si tiene gastos
                deposit: { select: { organizationId: true } } // Para verificar pertenencia a la organización
            },
        });

        if (!existingWithdrawal) {
            return { success: false, error: "Retiro no encontrado." };
        }

        if (existingWithdrawal.deposit.organizationId !== organizationId) {
            return { success: false, error: "Acceso denegado. Este retiro no pertenece a tu organización." };
        }

        if (existingWithdrawal.spends && existingWithdrawal.spends.length > 0) {
            return { success: false, error: "No se puede eliminar el retiro porque tiene gastos asociados. Elimine los gastos primero." };
        }

        await prisma.pettyCashWithdrawal.delete({
            where: { id: withdrawalId },
        });

        revalidatePath("/(app)/petty-cash", "page");
        return { success: true, message: "Retiro eliminado correctamente." };

    } catch (error) {
        console.error("Error deleting petty cash withdrawal:", error);
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido";
        return {
            success: false,
            error: `Error al eliminar el retiro: ${errorMessage}`,
        };
    }
} 