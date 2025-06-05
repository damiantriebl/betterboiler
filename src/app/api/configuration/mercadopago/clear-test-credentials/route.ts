import { validateOrganizationAccess } from "@/actions/util";
import prisma from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("🧹 [ClearTestCredentials] Limpiando todas las credenciales de testing...");

    // Validar acceso a la organización
    const { organizationId, error } = await validateOrganizationAccess();
    if (error || !organizationId) {
      console.error("❌ [ClearTestCredentials] Error de organización:", error);
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 1. Verificar credenciales globales (.env)
    const hasTestGlobalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith("TEST-");
    const hasTestGlobalPublicKey = process.env.MERCADOPAGO_PUBLIC_KEY?.startsWith("TEST-");
    const hasProdGlobalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith("APP_USR-");
    const hasProdGlobalPublicKey = process.env.MERCADOPAGO_PUBLIC_KEY?.startsWith("APP_USR-");

    // 2. Buscar configuraciones OAuth de testing
    const testOAuthConfigs = await prisma.mercadoPagoOAuth.findMany({
      where: {
        OR: [{ accessToken: { startsWith: "TEST-" } }, { publicKey: { startsWith: "TEST-" } }],
      },
    });

    // 3. Buscar configuraciones OAuth de producción
    const prodOAuthConfigs = await prisma.mercadoPagoOAuth.findMany({
      where: {
        OR: [
          { accessToken: { startsWith: "APP_USR-" } },
          { publicKey: { startsWith: "APP_USR-" } },
        ],
      },
    });

    console.log("🔍 [ClearTestCredentials] Estado actual:", {
      globalCredentials: {
        testAccessToken: hasTestGlobalAccessToken,
        testPublicKey: hasTestGlobalPublicKey,
        prodAccessToken: hasProdGlobalAccessToken,
        prodPublicKey: hasProdGlobalPublicKey,
      },
      oauthConfigs: {
        testConfigs: testOAuthConfigs.length,
        prodConfigs: prodOAuthConfigs.length,
      },
    });

    // 4. Eliminar configuraciones OAuth de testing
    if (testOAuthConfigs.length > 0) {
      const deletedTest = await prisma.mercadoPagoOAuth.deleteMany({
        where: {
          OR: [{ accessToken: { startsWith: "TEST-" } }, { publicKey: { startsWith: "TEST-" } }],
        },
      });
      console.log(
        `🗑️ [ClearTestCredentials] Eliminadas ${deletedTest.count} configuraciones OAuth de testing`,
      );
    }

    // 5. Preparar resultado
    const result = {
      success: true,
      message: "Credenciales de testing limpiadas exitosamente",
      actions: {
        deletedOAuthConfigs: testOAuthConfigs.length,
        remainingProdConfigs: prodOAuthConfigs.length,
      },
      currentState: {
        globalCredentials: {
          accessToken: hasProdGlobalAccessToken
            ? "PRODUCCIÓN"
            : hasTestGlobalAccessToken
              ? "TEST (REVISAR)"
              : "NO CONFIGURADO",
          publicKey: hasProdGlobalPublicKey
            ? "PRODUCCIÓN"
            : hasTestGlobalPublicKey
              ? "TEST (REVISAR)"
              : "NO CONFIGURADO",
        },
        oauthState: "SOLO_PRODUCCIÓN",
      },
      recommendations: [] as Array<{
        type: string;
        title: string;
        description: string;
        action: string;
      }>,
    };

    // 6. Generar recomendaciones
    if (hasTestGlobalAccessToken || hasTestGlobalPublicKey) {
      result.recommendations.push({
        type: "warning",
        title: "Variables de entorno con credenciales TEST",
        description:
          "Debes actualizar manualmente las variables MERCADOPAGO_ACCESS_TOKEN y MERCADOPAGO_PUBLIC_KEY en tu archivo .env.local",
        action: "manual",
      });
    }

    if (!hasProdGlobalAccessToken && !hasProdGlobalPublicKey && prodOAuthConfigs.length === 0) {
      result.recommendations.push({
        type: "error",
        title: "No tienes credenciales de producción",
        description:
          "Necesitas configurar credenciales de producción (APP_USR-) para que los pagos funcionen",
        action: "configure_production",
      });
    }

    if (hasProdGlobalAccessToken && hasProdGlobalPublicKey) {
      result.recommendations.push({
        type: "success",
        title: "Configuración correcta",
        description: "Tienes credenciales de producción globales configuradas",
        action: "ready",
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ [ClearTestCredentials] Error interno:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
