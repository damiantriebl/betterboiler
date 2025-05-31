import {
  type Branch,
  type Brand,
  type Model,
  type ModelFile,
  type MotoColor,
  type Motorcycle,
  MotorcycleState as PrismaMotorcycleState,
  type Reservation,
} from "@prisma/client";

// Enum local para usar en componentes cliente
export enum MotorcycleState {
  STOCK = "STOCK",
  PAUSADO = "PAUSADO", 
  RESERVADO = "RESERVADO",
  PROCESANDO = "PROCESANDO",
  VENDIDO = "VENDIDO",
  ELIMINADO = "ELIMINADO",
  EN_TRANSITO = "EN_TRANSITO",
}

// Type que mapea al enum de Prisma para compatibilidad
export type PrismaMotorcycleStateType = PrismaMotorcycleState;

export interface ModelFileWithUrl {
  id: string;
  name: string;
  type: string;
  s3Key: string;
  s3KeySmall: string | null;
  size: number;
  createdAt: Date;
  updatedAt: Date;
  url: string;
}

export interface ReservationWithDetails extends Reservation {
  clientId: string;
  amount: number;
  createdAt: Date;
  status: string;
  paymentMethod: string | null;
  notes: string | null;
  currency: string;
  updatedAt: Date;
  organizationId: string;
  expirationDate: Date | null;
  motorcycleId: number;
}

export interface MotorcycleWithDetails extends Motorcycle {
  brand?: Brand | null;
  model?:
    | (Model & {
        imageUrl?: string | null;
        files?: ModelFileWithUrl[];
      })
    | null;
  branch?: Branch | null;
  color?: MotoColor | null;
  reservations?: ReservationWithDetails[];
  reservation?: ReservationWithDetails | null;
}

export interface MotorcycleWithFullDetails extends MotorcycleWithDetails {
  brand?: (Brand & { organizationBrands?: { color: string }[] }) | null;
}

export interface MotorcycleWithActions extends MotorcycleWithDetails {
  reservation?: ReservationWithDetails | null;
}

export interface ReservationUpdate {
  motorcycleId: number;
  clientId: string;
  amount: number;
  reservationId: number;
}

export const estadoVentaConfig: Record<PrismaMotorcycleState, { label: string; className: string }> = {
  [PrismaMotorcycleState.STOCK]: { label: "En Stock", className: "text-green-600" },
  [PrismaMotorcycleState.PAUSADO]: { label: "Pausado", className: "text-yellow-600" },
  [PrismaMotorcycleState.RESERVADO]: { label: "Reservado", className: "text-blue-600" },
  [PrismaMotorcycleState.PROCESANDO]: { label: "En Proceso", className: "text-purple-600" },
  [PrismaMotorcycleState.VENDIDO]: { label: "Vendido", className: "text-gray-600" },
  [PrismaMotorcycleState.ELIMINADO]: { label: "Eliminado", className: "text-red-600" },
  [PrismaMotorcycleState.EN_TRANSITO]: { label: "En Tránsito", className: "text-orange-600" },
};
