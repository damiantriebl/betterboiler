"use client";

import { usePaymentNotifications } from "@/hooks/usePaymentNotifications";

export default function PaymentNotificationManager() {
  // Solo inicializar el hook - toda la lógica está dentro del hook
  usePaymentNotifications();

  // Este componente no renderiza nada visible, solo maneja las notificaciones
  return null;
}
