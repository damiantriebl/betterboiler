import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PaymentNotification {
  id: string;
  message: string;
  amount: number;
  mercadopagoId: string;
  createdAt: string;
}

export const usePaymentNotifications = () => {
  const [isPolling, setIsPolling] = useState(false);
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationId }),
      });
    } catch (error) {
      console.error("❌ Error marcando notificación como leída:", error);
    }
  };

  // Función eliminada - la lógica está dentro del useEffect

  const startPolling = () => {
    // No hacer nada - el polling ya se inicia automáticamente en useEffect
    console.log("⚠️ startPolling llamado - pero el polling ya está activo automáticamente");
  };

  const stopPolling = () => {
    // El polling solo se puede detener desmontando el componente
    console.log("⚠️ stopPolling llamado - el polling se detiene al desmontar el componente");
  };

  useEffect(() => {
    setIsPolling(true);

    // Función local para verificar notificaciones
    const checkNotifications = async () => {
      try {
        const response = await fetch("/api/notifications/payment");
        if (!response.ok) return;

        const data = await response.json();
        if (data.success && data.notifications?.length > 0) {
          // Mostrar toast para cada nueva notificación
          for (const notification of data.notifications) {
            toast.success(notification.message, {
              duration: 8000,
              action: {
                label: "Cerrar",
                onClick: () => {
                  fetch("/api/notifications/payment", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ notificationId: notification.id }),
                  }).catch((error) => console.error("❌ Error marcando notificación:", error));
                },
              },
            });
          }

          // Marcar todas como leídas automáticamente después de mostrarlas
          for (const notification of data.notifications) {
            fetch("/api/notifications/payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ notificationId: notification.id }),
            }).catch((error) => console.error("❌ Error marcando notificación:", error));
          }
        }
      } catch (error) {
        console.error("❌ Error verificando notificaciones:", error);
      }
    };

    // Verificar inmediatamente
    checkNotifications();

    // Luego verificar cada 5 segundos
    const interval = setInterval(checkNotifications, 5000);

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, []); // ← REMOVÍ isPolling de las dependencias

  return {
    notifications,
    isPolling,
    startPolling,
    stopPolling,
  };
};
