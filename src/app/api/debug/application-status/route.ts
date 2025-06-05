import { requireOrganizationId } from "@/actions/util";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json({ error: "Access token no configurado" }, { status: 400 });
    }

    console.log("🔍 [APPLICATION-STATUS] Investigando estado de aplicación...");

    // 1. Información básica del usuario
    const userResponse = await fetch("https://api.mercadopago.com/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const userData = await userResponse.json();

    // 2. Intentar obtener información de la aplicación
    let appData = null;
    try {
      const appResponse = await fetch("https://api.mercadopago.com/applications/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (appResponse.ok) {
        appData = await appResponse.json();
      }
    } catch (error) {
      console.log("⚠️ No se pudo obtener info de aplicación directamente");
    }

    // 3. Verificar configuraciones de OAuth
    let oauthData = null;
    try {
      const oauthResponse = await fetch("https://api.mercadopago.com/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: process.env.MERCADOPAGO_CLIENT_ID || "",
          client_secret: process.env.MERCADOPAGO_CLIENT_SECRET || "",
        }),
      });

      if (oauthResponse.ok) {
        oauthData = await oauthResponse.json();
      }
    } catch (error) {
      console.log("⚠️ Error verificando OAuth");
    }

    // 4. Verificar capacidades de pago
    let paymentMethodsData = null;
    try {
      const pmResponse = await fetch("https://api.mercadopago.com/v1/payment_methods", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (pmResponse.ok) {
        paymentMethodsData = await pmResponse.json();
      }
    } catch (error) {
      console.log("⚠️ Error obteniendo métodos de pago");
    }

    // 5. Análisis específico para Live Mode
    const analysis = {
      live_mode_status: userData.live_mode || false,
      account_type: userData.status?.mercadopago_account_type,
      user_type: userData.status?.user_type,
      site_status: userData.status?.site_status,

      // Verificaciones críticas
      can_sell: userData.status?.sell?.allow,
      can_bill: userData.status?.billing?.allow,
      can_list: userData.status?.list?.allow,

      // Problemas detectados
      blocking_issues: [] as string[],
      suggested_actions: [] as string[],

      // Información de credenciales
      token_info: {
        starts_with: `${accessToken.substring(0, 8)}...`,
        is_production: accessToken.startsWith("APP_USR-"),
        length: accessToken.length,
      },
    };

    // Detectar problemas específicos
    if (!userData.status?.sell?.allow) {
      analysis.blocking_issues.push("Venta no permitida");
      if (userData.status?.sell?.codes?.length > 0) {
        analysis.suggested_actions.push(`Resolver: ${userData.status.sell.codes.join(", ")}`);
      }
    }

    if (!userData.status?.billing?.allow) {
      analysis.blocking_issues.push("Facturación no permitida");
      if (userData.status?.billing?.codes?.length > 0) {
        analysis.suggested_actions.push(`Resolver: ${userData.status.billing.codes.join(", ")}`);
      }
    }

    if (userData.status?.user_type === "simple_registration") {
      analysis.blocking_issues.push("Registro de usuario incompleto");
      analysis.suggested_actions.push("Completar registro como vendedor");
    }

    // Determinar el estado real y siguiente paso
    let nextStep = "unknown";
    let explanation = "";

    if (analysis.blocking_issues.length > 0) {
      nextStep = "complete_account_setup";
      explanation = "Completar configuración de cuenta antes de activar Live Mode";
    } else if (userData.live_mode === false) {
      nextStep = "activate_live_mode_application";
      explanation = "Cuenta lista - Activar Live Mode en la aplicación específica";
    } else {
      nextStep = "ready";
      explanation = "Live Mode ya activado";
    }

    // 6. Buscar formas de activar Live Mode
    const activationMethods = {
      // Método 1: Panel de desarrolladores manual
      developer_panel: {
        url: "https://www.mercadopago.com.ar/developers/panel/applications",
        description: "Método tradicional - buscar toggle de Live Mode",
      },

      // Método 2: Contacto directo con soporte
      support_contact: {
        method: "Contactar soporte de MercadoPago",
        reason: "Si no aparece opción de Live Mode en panel",
      },

      // Método 3: Verificar si hay endpoints específicos
      api_method: {
        available: false,
        note: "No hay endpoint público para activar Live Mode",
      },
    };

    return NextResponse.json({
      success: true,
      investigation: "Análisis completo de aplicación MercadoPago",

      user_data: {
        id: userData.id,
        email: userData.email,
        country: userData.country_id,
        live_mode: userData.live_mode,
        account_type: userData.status?.mercadopago_account_type,
        user_type: userData.status?.user_type,
      },

      application_data: appData,
      oauth_data: oauthData ? { has_client_credentials: true } : { has_client_credentials: false },
      payment_methods_available: paymentMethodsData ? paymentMethodsData.length : 0,

      analysis,
      next_step: nextStep,
      explanation,

      activation_methods: activationMethods,

      // Información específica para el caso actual
      specific_recommendations:
        analysis.blocking_issues.length === 0
          ? [
              "✅ Tu cuenta está lista para Live Mode",
              "🔍 El problema es que Live Mode no está activado en tu APLICACIÓN específica",
              "📱 No hay endpoint público para activar Live Mode programáticamente",
              "💬 Opciones: 1) Panel manual, 2) Contactar soporte MP, 3) Crear ticket",
              '🎯 Tu aplicación tiene credenciales de producción válidas pero no está "certificada"',
            ]
          : [
              "⚠️ Hay problemas en tu cuenta que impiden Live Mode",
              "🔧 Completa los requisitos pendientes primero",
              "📋 Una vez resueltos, podrás activar Live Mode",
            ],

      debug_info: {
        timestamp: new Date().toISOString(),
        environment: "production",
        organization_id: organizationId,
      },
    });
  } catch (error) {
    console.error("💥 [APPLICATION-STATUS] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
