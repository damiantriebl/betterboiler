"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as otpauth from "otpauth";
import { getOrganizationIdFromSession } from "@/actions/get-Organization-Id-From-Session"; // Asumiendo que esta devuelve { organizationId, userId, userRole, userEmail }

// --- Tipos de Retorno de las Acciones ---

export interface SecuritySettings {
    secureModeEnabled: boolean;
    otpAuthUrl: string | null;
    otpVerified: boolean;
    error?: string;
}

export interface ToggleSecureModeResult {
    success: boolean;
    otpAuthUrl?: string | null; // URL para el QR, solo si se genera un nuevo OTP
    otpVerified?: boolean;
    error?: string;
    message?: string;
}

export interface VerifyOtpSetupResult {
    success: boolean;
    error?: string;
    message?: string;
}

// --- Acción para obtener la configuración de seguridad ---

export async function getSecuritySettings(): Promise<SecuritySettings> {
    const session = await getOrganizationIdFromSession();
    if (!session.organizationId || session.error) {
        return {
            secureModeEnabled: false,
            otpAuthUrl: null,
            otpVerified: false,
            error: session.error || "Organización no encontrada o no autenticada.",
        };
    }

    try {
        const organization = await prisma.organization.findUnique({
            where: { id: session.organizationId },
            select: {
                secureModeEnabled: true,
                otpAuthUrl: true,
                otpVerified: true,
            },
        });

        if (!organization) {
            return {
                secureModeEnabled: false,
                otpAuthUrl: null,
                otpVerified: false,
                error: "Organización no encontrada.",
            };
        }
        // Aseguramos que todos los campos esperados por SecuritySettings estén aquí
        return {
            secureModeEnabled: organization.secureModeEnabled,
            otpAuthUrl: organization.otpAuthUrl ?? null, // Prisma puede devolver null
            otpVerified: organization.otpVerified,
        };
    } catch (error) {
        console.error("Error fetching security settings:", error);
        return {
            secureModeEnabled: false,
            otpAuthUrl: null,
            otpVerified: false,
            error: "Error al obtener la configuración de seguridad.",
        };
    }
}

// --- Acción para activar/desactivar el Modo Seguro y generar OTP ---

export async function toggleSecureMode(
    isEnabled: boolean,
): Promise<ToggleSecureModeResult> {
    const session = await getOrganizationIdFromSession();
    if (!session.organizationId || !session.userId || !session.userEmail || !session.userRole || session.error) {
        return {
            success: false,
            error: session.error || "Usuario no autenticado o falta información de sesión (email, orgId, role).",
        };
    }

    const { organizationId, userEmail } = session;

    try {
        let newOtpAuthUrl: string | null = null;
        let newOtpSecretB32: string | null = null;
        let otpShouldBeVerified = false;

        const currentOrg = await prisma.organization.findUnique({
            where: { id: organizationId },
            select: { otpSecret: true, otpAuthUrl: true, otpVerified: true, secureModeEnabled: true },
        });

        if (!currentOrg) {
            return { success: false, error: "Organización no encontrada." };
        }

        // --- Parámetros OTP --- 
        const OTP_ISSUER = process.env.OTP_ISSUER || "Apex Software"; 
        const OTP_ALGORITHM = process.env.OTP_ALGORITHM || "SHA1"; 
        const OTP_DIGITS = Number.parseInt(process.env.OTP_DIGITS || "6"); 
        const OTP_PERIOD = Number.parseInt(process.env.OTP_PERIOD || "120");  
        console.log(`[toggleSecureMode] Usando para QR: Issuer=${OTP_ISSUER}, Algorithm=${OTP_ALGORITHM}, Digits=${OTP_DIGITS}, Period=${OTP_PERIOD}`);

        if (isEnabled) {
            if (!currentOrg.otpSecret || !currentOrg.otpVerified) {
                const secretInstance = new otpauth.Secret();
                newOtpSecretB32 = secretInstance.base32;

                const totp = new otpauth.TOTP({
                    issuer: OTP_ISSUER,
                    label: userEmail,
                    algorithm: OTP_ALGORITHM,
                    digits: OTP_DIGITS,
                    period: OTP_PERIOD,
                    secret: secretInstance,
                });
                newOtpAuthUrl = totp.toString();
                console.log("[toggleSecureMode] Generated otpAuthUrl:", newOtpAuthUrl);
                otpShouldBeVerified = false;
            } else {
                newOtpSecretB32 = currentOrg.otpSecret;
                newOtpAuthUrl = currentOrg.otpAuthUrl;
                otpShouldBeVerified = true;
            }
        } else {
            otpShouldBeVerified = false;
        }

        const dataToUpdate: Partial<typeof currentOrg> & { secureModeEnabled: boolean; otpVerified: boolean; otpSecret?: string | null; otpAuthUrl?: string | null; } = {
            secureModeEnabled: isEnabled,
            otpVerified: otpShouldBeVerified,
        };

        if (isEnabled) {
            dataToUpdate.otpSecret = newOtpSecretB32;
            dataToUpdate.otpAuthUrl = newOtpAuthUrl;
        } else {
            dataToUpdate.otpSecret = null; 
            dataToUpdate.otpAuthUrl = null; 
        }
        
        await prisma.organization.update({
            where: { id: organizationId },
            data: dataToUpdate,
        });

        revalidatePath("/(app)/configuration", "page");

        return {
            success: true,
            otpAuthUrl: (isEnabled && newOtpAuthUrl !== currentOrg.otpAuthUrl && !currentOrg.otpVerified && newOtpAuthUrl) ? newOtpAuthUrl : null,
            otpVerified: otpShouldBeVerified,
            message: `Modo seguro ${isEnabled ? "activado" : "desactivado"}. ${ (isEnabled && newOtpAuthUrl !== currentOrg.otpAuthUrl && !currentOrg.otpVerified && newOtpAuthUrl) ? "Escanee el QR para configurar OTP." : (isEnabled && currentOrg.otpVerified ? "OTP ya configurado y verificado." : "")}`,
        };
    } catch (error) {
        console.error("Error toggling secure mode:", error);
        let errorMessage = "Error al cambiar el modo seguro.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}

// --- Acción para verificar el token OTP ---

export async function verifyOtpSetup(tokenAsNumber: number): Promise<VerifyOtpSetupResult> {
    console.log("[verifyOtpSetup] Iniciando verificación OTP con token:", tokenAsNumber, typeof tokenAsNumber);
    const session = await getOrganizationIdFromSession();
    if (!session.organizationId || !session.userEmail || session.error) {
        return {
            success: false,
            error: session.error || "Usuario no autenticado o falta información de sesión (email, orgId).",
        };
    }
    const { organizationId, userEmail } = session;

    const token = String(tokenAsNumber);

    // --- Parámetros OTP --- 
    const OTP_ISSUER = process.env.OTP_ISSUER || "Apex Software";
    const OTP_ALGORITHM = process.env.OTP_ALGORITHM || "SHA1";
    const rawDigits = process.env.OTP_DIGITS || "6";
    const OTP_DIGITS_FROM_CONFIG = Number.parseInt(rawDigits, 10);
    const OTP_PERIOD = Number.parseInt(process.env.OTP_PERIOD || "120", 10);

    console.log(`[verifyOtpSetup] Token (str): '${token}', Longitud: ${token.length}`);
    console.log(`[verifyOtpSetup] rawDigits (process.env.OTP_DIGITS): '${rawDigits}'`);
    console.log(`[verifyOtpSetup] OTP_DIGITS_FROM_CONFIG: ${OTP_DIGITS_FROM_CONFIG} (Tipo: ${typeof OTP_DIGITS_FROM_CONFIG})`);
    
    const tokenRegex = new RegExp(`^\\d{${OTP_DIGITS_FROM_CONFIG}}$`);
    console.log(`[verifyOtpSetup] tokenRegex.source: ${tokenRegex.source}`);
    
    const testResult = tokenRegex.test(token);
    console.log(`[verifyOtpSetup] Resultado de tokenRegex.test(token): ${testResult}`);

    if (Number.isNaN(OTP_DIGITS_FROM_CONFIG) || OTP_DIGITS_FROM_CONFIG <= 0) {
        console.error(`[verifyOtpSetup] ERROR CRÍTICO: OTP_DIGITS_FROM_CONFIG no es un número válido (${OTP_DIGITS_FROM_CONFIG}). No se puede validar el token.`);
        return { success: false, error: "Error interno en la configuración de OTP. Contacte al administrador." };
    }

    if (!token || !testResult) { 
        return { success: false, error: `El token OTP debe ser de ${OTP_DIGITS_FROM_CONFIG} dígitos numéricos.` };
    } 

    try {
        const organization = await prisma.organization.findUnique({
            where: { id: organizationId },
            select: { otpSecret: true, secureModeEnabled: true },
        });

        if (!organization || !organization.otpSecret) {
            return { success: false, error: "Configuración OTP no encontrada o secreta no disponible." };
        }

        if (!organization.secureModeEnabled) {
            return { success: false, error: "El modo seguro no está activado. No se puede verificar OTP." };
        }
        
        const secret = otpauth.Secret.fromBase32(organization.otpSecret);
        
        const totp = new otpauth.TOTP({
            issuer: OTP_ISSUER,
            label: userEmail, 
            algorithm: OTP_ALGORITHM,
            digits: OTP_DIGITS_FROM_CONFIG,
            period: OTP_PERIOD,
            secret: secret, 
        });

        const delta = totp.validate({ token });

        if (delta === null) {
            return { success: false, error: "Token OTP inválido." };
        }

        await prisma.organization.update({
            where: { id: organizationId },
            data: { otpVerified: true },
        });

        revalidatePath("/(app)/configuration", "page");
        return { success: true, message: "¡Configuración OTP verificada y completada!" };

    } catch (error) {
        console.error("Error verifying OTP setup:", error);
        let errorMessage = "Error al verificar la configuración OTP.";
         if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
} 