import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("📬 Notificación de Mercado Pago recibida:", body);

    // Las notificaciones de MP pueden venir en diferentes formatos
    // Este endpoint las procesa y las redirige al webhook principal

    if (body.action === "payment.created" || body.action === "payment.updated") {
      // Redirigir al webhook principal para procesamiento
      const webhookUrl = new URL("/api/webhooks/mercadopago", request.url);

      try {
        await fetch(webhookUrl.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "payment",
            data: body,
          }),
        });
      } catch (error) {
        console.error("Error reenviando a webhook:", error);
      }
    }

    // Siempre responder con éxito para confirmar recepción
    return NextResponse.json({ status: "received" });
  } catch (error) {
    console.error("❌ Error procesando notificación de MP:", error);
    // Incluso si hay error, responder OK para evitar reenvíos
    return NextResponse.json({ status: "error" });
  }
}

// GET para verificar el estado
export async function GET() {
  return NextResponse.json({
    status: "active",
    service: "Mercado Pago Notifications",
    timestamp: new Date().toISOString(),
  });
}
