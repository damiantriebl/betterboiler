"use server";

import { setupPaymentMethod } from "@/actions/util/payment-methods-unified";

export async function setupPermutaPaymentMethod() {
  return await setupPaymentMethod({
    name: "Permuta",
    type: "permuta",
    description: "Pago mediante intercambio de bienes",
    iconUrl: "/icons/payment-methods/permuta.svg",
  });
} 