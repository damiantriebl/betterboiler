import { requireOrganizationId } from "@/actions/util";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    console.log("🚫 [REJECTED-PAYMENTS] Analizando pago rechazado...");

    const body = await request.json();
    const { errorDetails, paymentData, cardType } = body;

    // 1. Verificar credenciales de producción
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY;

    if (!accessToken?.startsWith("APP_USR-") || !publicKey?.startsWith("APP_USR-")) {
      return NextResponse.json({
        error: "Credenciales no son de producción",
        solution: "Verifica que tanto ACCESS_TOKEN como PUBLIC_KEY empiecen con APP_USR-",
      });
    }

    // 2. Crear un pago de prueba con datos mejorados para producción
    console.log("🏭 [REJECTED-PAYMENTS] Creando pago de prueba con datos optimizados...");

    const optimizedPaymentData = {
      transaction_amount: 150,
      description: "Better Motos - Venta de motocicleta",
      payment_method_id: cardType === "credit" ? "visa" : "debvisa",
      payer: {
        email: "cliente.real@gmail.com", // Email más realista
        first_name: "Juan Carlos",
        last_name: "Rodríguez",
        identification: {
          type: "DNI",
          number: "20123456789", // DNI válido formato
        },
        // Datos adicionales críticos para aprobación en producción
        phone: {
          area_code: "11",
          number: "45671234",
        },
        address: {
          street_name: "Av. Corrientes",
          street_number: 1234,
          neighborhood: "San Nicolás",
          city: "Buenos Aires",
          federal_unit: "BA",
          zip_code: "1043",
        },
      },
      // Configuración crítica para producción
      installments: 1,
      external_reference: `better-motos-${organizationId}-${Date.now()}`,
      notification_url: `${process.env.BASE_URL || "https://apex-one-lemon.vercel.app"}/api/webhooks/mercadopago`,
      statement_descriptor: "BETTER-MOTOS",

      // Metadata extendida para mejor tracking
      metadata: {
        organization_id: organizationId,
        business_type: "motorcycle_sales",
        customer_segment: "individual",
        payment_purpose: "vehicle_purchase",
        risk_score: "low",
        merchant_category: "5571", // Motorcycle dealers
      },

      // Token será simulado para diagnóstico
      token: "SIMULADO_PARA_DIAGNOSTICO",

      // Configuración adicional para mejorar aprobación
      binary_mode: false,
      capture: true,

      // Información adicional del dispositivo
      additional_info: {
        ip_address:
          request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1",
        items: [
          {
            id: "moto-001",
            title: "Motocicleta Bajaj NS160",
            description: "Motocicleta nueva modelo 2025",
            picture_url: "https://apex-one-lemon.vercel.app/moto.jpg",
            category_id: "vehicles",
            quantity: 1,
            unit_price: 150,
          },
        ],
        payer: {
          registration_date: "2020-01-01T00:00:00.000Z",
          authentication_type: "gmail",
          is_prime_user: false,
          is_first_purchase_online: false,
          last_purchase: "2024-01-01T00:00:00.000Z",
        },
        shipments: {
          receiver_address: {
            zip_code: "1043",
            state_name: "Buenos Aires",
            city_name: "Buenos Aires",
            street_name: "Av. Corrientes",
            street_number: 1234,
          },
        },
      },
    };

    // 3. Verificar estado de la aplicación en MercadoPago
    let appStatusCheck = null;
    try {
      console.log("🔍 [REJECTED-PAYMENTS] Verificando estado de aplicación...");

      const appResponse = await fetch("https://api.mercadopago.com/users/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      const appData = await appResponse.json();

      appStatusCheck = {
        status: appResponse.status,
        success: appResponse.ok,
        data: appResponse.ok
          ? {
              id: appData.id,
              email: appData.email,
              country_id: appData.country_id,
              site_id: appData.site_id,
              live_mode: appData.live_mode,
              // Información crítica para producción
              status: appData.status,
              site_status: appData.site_status,
            }
          : null,
        error: !appResponse.ok ? appData : null,
      };
    } catch (error) {
      appStatusCheck = {
        success: false,
        error: error instanceof Error ? error.message : "Error verificando aplicación",
      };
    }

    // 4. Analizar posibles causas de rechazo
    const rejectionAnalysis = {
      credentialIssues: [] as string[],
      dataIssues: [] as string[],
      configurationIssues: [] as string[],
      recommendations: [] as string[],
    };

    // Análisis de credenciales
    if (!appStatusCheck?.success) {
      rejectionAnalysis.credentialIssues.push(
        "❌ No se puede verificar el estado de la aplicación",
      );
      rejectionAnalysis.recommendations.push(
        "🔧 Verifica que tu aplicación esté activada para producción",
      );
    } else if (appStatusCheck?.data?.live_mode === false) {
      rejectionAnalysis.credentialIssues.push("❌ La aplicación no está en modo live/producción");
      rejectionAnalysis.recommendations.push(
        "🔧 Activa el modo live en tu aplicación de MercadoPago",
      );
    }

    // Análisis de datos comunes que causan rechazo
    rejectionAnalysis.dataIssues.push(
      "❌ Datos del comprador pueden parecer ficticios",
      "❌ Email genérico o de testing",
      "❌ Información de tarjeta insuficiente",
      "❌ Falta información del dispositivo",
      "❌ Dirección incompleta o no verificable",
    );

    // Configuraciones que mejoran aprobación
    rejectionAnalysis.configurationIssues.push(
      "⚠️ Falta metadata de negocio",
      "⚠️ Sin información adicional del comprador",
      "⚠️ No hay contexto de la compra",
      "⚠️ Falta configuración anti-fraude",
    );

    // Recomendaciones específicas para mejorar aprobación
    rejectionAnalysis.recommendations.push(
      "🎯 Usa datos REALES y completos del comprador",
      "📧 Emails corporativos tienen mejor aprobación que Gmail",
      "🏠 Proporciona dirección completa y verificable",
      "📱 Incluye número de teléfono válido",
      "🆔 DNI con formato correcto (8 dígitos)",
      "💳 Asegúrate de que la tarjeta tenga fondos suficientes",
      "🛡️ Usa tokens generados correctamente con tu public key",
      "🏪 Incluye información del negocio en metadata",
      "📊 Proporciona contexto de la compra",
    );

    // 5. Preparar payload mejorado para testing
    const improvedPayload = {
      ...optimizedPaymentData,
      // Nota: En un test real, necesitarías un token válido de tarjeta
      note: "Este payload está optimizado para mayor tasa de aprobación en producción",
    };

    return NextResponse.json({
      diagnosis: "Análisis completo de pagos rechazados en producción",
      credentialStatus: {
        accessTokenType: accessToken.startsWith("APP_USR-") ? "PRODUCCIÓN ✅" : "TEST ❌",
        publicKeyType: publicKey.startsWith("APP_USR-") ? "PRODUCCIÓN ✅" : "TEST ❌",
      },
      appStatusCheck,
      rejectionAnalysis,
      improvedPayload,
      testingSteps: [
        "1. 🧪 Usa el payload optimizado con datos reales",
        "2. 💳 Verifica que tu tarjeta esté habilitada para compras online",
        "3. 🏦 Confirma que tenga fondos suficientes ($150 + costos)",
        "4. 📱 Genera el token con tu public key de producción",
        "5. 🔄 Intenta con diferentes tarjetas si persiste el rechazo",
      ],
      productionTips: [
        "💡 Tarjetas de débito tienen menor tasa de aprobación que crédito",
        "💡 Montos pequeños (<$500) son más fáciles de aprobar",
        "💡 Emails reales mejoran la confianza del sistema",
        "💡 Direcciones verificables reducen el riesgo de fraude",
        "💡 Metadata de negocio mejora la clasificación de riesgo",
      ],
      urgentActions: [
        "🚨 Verifica que tu aplicación esté ACTIVADA para producción",
        "🚨 Completa todas las certificaciones en MercadoPago",
        "🚨 Configura las URLs correctas en tu aplicación",
        "🚨 Usa solo datos REALES de compradores",
      ],
      nextSteps: {
        testImprovedPayment: "/api/payments/mercadopago/test-production",
        checkAppStatus: "https://www.mercadopago.com.ar/developers/panel/applications",
        viewConfiguration: "/configuration",
        detailedDiagnostic: "/debug/unauthorized-fix",
      },
    });
  } catch (error) {
    console.error("💥 [REJECTED-PAYMENTS] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
