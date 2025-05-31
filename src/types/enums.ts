// Enums locales para uso en componentes cliente
// Estos deben coincidir exactamente con los valores de Prisma

export enum MotorcycleState {
  STOCK = "STOCK",
  PAUSADO = "PAUSADO",
  RESERVADO = "RESERVADO",
  PROCESANDO = "PROCESANDO",
  VENDIDO = "VENDIDO",
  ELIMINADO = "ELIMINADO",
  EN_TRANSITO = "EN_TRANSITO",
}

export const estadoVentaConfig: Record<MotorcycleState, { label: string; className: string }> = {
  [MotorcycleState.STOCK]: { label: "En Stock", className: "text-green-600" },
  [MotorcycleState.PAUSADO]: { label: "Pausado", className: "text-yellow-600" },
  [MotorcycleState.RESERVADO]: { label: "Reservado", className: "text-blue-600" },
  [MotorcycleState.PROCESANDO]: { label: "En Proceso", className: "text-purple-600" },
  [MotorcycleState.VENDIDO]: { label: "Vendido", className: "text-gray-600" },
  [MotorcycleState.ELIMINADO]: { label: "Eliminado", className: "text-red-600" },
  [MotorcycleState.EN_TRANSITO]: { label: "En Tránsito", className: "text-orange-600" },
};
