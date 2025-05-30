import type {
  Branch,
  Brand,
  LogisticProvider,
  Model,
  MotoColor,
  Motorcycle,
  MotorcycleTransfer,
  MotorcycleTransferStatus,
  User,
} from "@prisma/client";

export interface LogisticProviderWithTransfers extends LogisticProvider {
  transfers?: MotorcycleTransfer[];
}

export interface MotorcycleTransferWithRelations extends MotorcycleTransfer {
  motorcycle?: Motorcycle & {
    brand?: Brand | null;
    model?: Model | null;
    color?: MotoColor | null;
  };
  fromBranch?: Branch | null;
  toBranch?: Branch | null;
  logisticProvider?: LogisticProvider | null;
  requester?: User | null;
  confirmer?: User | null;
}

export interface MotorcycleForTransfer {
  id: number;
  chassisNumber: string;
  year: number;
  brand?: { name: string } | null;
  model?: { name: string } | null;
  color?: { name: string } | null;
  branch?: { id: number; name: string } | null;
  retailPrice: number;
  currency: string;
  state: string;
  imageUrl?: string | null;
}

export interface TransferRequest {
  motorcycleId: number;
  fromBranchId: number;
  toBranchId: number;
  logisticProviderId?: number | null;
  notes?: string;
  scheduledPickupDate?: Date;
}

export interface TransferFilters {
  status?: MotorcycleTransferStatus[];
  fromBranchId?: number;
  toBranchId?: number;
  logisticProviderId?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

export type { MotorcycleTransferStatus };

// Transport types constants
export const TRANSPORT_TYPES = ["terrestre", "aéreo", "marítimo", "especializado"] as const;

export const VEHICLE_TYPES = ["camión", "furgoneta", "remolque_especializado", "grúa"] as const;

export const COVERAGE_ZONES = ["local", "nacional", "internacional"] as const;

export const PROVIDER_STATUS_OPTIONS = ["activo", "inactivo"] as const;

export const TRANSFER_STATUS_OPTIONS = [
  "REQUESTED",
  "CONFIRMED",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
] as const;

export type TransportType = (typeof TRANSPORT_TYPES)[number];
export type VehicleType = (typeof VEHICLE_TYPES)[number];
export type CoverageZone = (typeof COVERAGE_ZONES)[number];
export type ProviderStatus = (typeof PROVIDER_STATUS_OPTIONS)[number];
export type TransferStatus = (typeof TRANSFER_STATUS_OPTIONS)[number];
