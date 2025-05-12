// archivo: app/api/mercadopago/process-payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Order } from "mercadopago";

const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
const orderAPI = new Order(mpClient);

export async function POST(request: NextRequest) {
  try {
    const { 
      paymentMethodId, 
      issuerId, 
      token, 
      payment_type, 
      installments, 
      order_total_from_frontend // Recibir el monto del frontend
    } = await request.json();
    
    console.log("Datos recibidos en backend:", { paymentMethodId, token, payment_type, installments, order_total_from_frontend });

    // Usar el monto del frontend, o un fallback si no llega (aunque debería llegar)
    // Asegurarse de que sea un número antes de toFixed
    const amountToChargeNumeric = Number(order_total_from_frontend || process.env.ORDER_TOTAL || "1");
    const amountToChargeString = amountToChargeNumeric.toFixed(2);
    // 1. Armar el cuerpo de la orden conforme a la API Orders:
    const orderData = {
      type: "online", 
      marketplace: "NONE",
      external_reference: "ORDER-12345",
      // notification_url: `${process.env.BASE_URL}/api/mercadopago/webhook`, // Considera reactivar si usas webhooks
      processing_mode: "automatic",
      total_amount: amountToChargeString, // Usar el monto procesado
      payer: {
        email: "pepe@gmail.com" // Idealmente, este email también vendría del frontend o de la sesión del usuario
      },
      // charges: [ /* (opcional) info de comisiones o fee si correspondiera */ ],
      transactions: {
        payments: [
          {
            amount: amountToChargeString, // Usar el monto procesado
            payment_method: {
              id: paymentMethodId,
              type: payment_type || "credit_card",
              token: token,
              installments: installments || 1,
            }
          }
        ]
      }
    };

    // 2. Invocar la creación de la orden via SDK (POST /v1/orders)
    console.log("Enviando orderData a Mercado Pago:", JSON.stringify(orderData, null, 2));
    const mpOrder = await orderAPI.create({ body: orderData });
    console.log("Orden creada en MP:", mpOrder);

    // 3. Retornar resultado al frontend
    return NextResponse.json({ status: mpOrder.status, id: mpOrder.id });
  } catch (err: any) {
    console.error("Error al crear orden en MP:", err.cause || err);
    const errorMessage = err.cause?.message || err.message || "Error desconocido al crear orden";
    const errorStatus = err.status || 500;
    // Devolver los detalles del error de MP si existen en err.cause.errors
    const errorDetails = err.cause?.errors || err.errors || (err.cause ? [err.cause] : []) || [{ code: 'backend_error', message: errorMessage}];
    return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: errorStatus });
  }
}
