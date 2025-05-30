import type { Motorcycle, MotorcycleState } from "@prisma/client";
import type { DateRange as DayPickerDateRange } from "react-day-picker";

export type DateRange = DayPickerDateRange;

export interface ReportFilters {
  organizationId: string;
  dateRange?: DateRange;
  branchId?: string;
  brandId?: string;
  modelId?: string;
  supplierId?: string;
}

// Inventory Report Types
export interface InventoryStatusReport {
  byState: {
    state: MotorcycleState;
    _count: number;
  }[];
  valueByState: {
    state: MotorcycleState;
    currency: string;
    _sum: {
      retailPrice: number | null;
      costPrice: number | null;
    };
  }[];
  byBrand: {
    brandId: number;
    brandName: string;
    _count: number;
  }[];
  summary: {
    total: number;
    inStock: number;
    reserved: number;
    sold: number;
  };
  availableMotorcycles?: {
    id: number;
    chassisNumber: string;
    engineNumber: string | null;
    year: number;
    mileage: number;
    retailPrice: number;
    costPrice: number | null;
    currency: string;
    displacement: number | null;
    createdAt: Date;
    brand: { name: string } | null;
    model: { name: string } | null;
    color: { name: string; colorOne: string; colorTwo: string | null } | null;
    branch: { name: string } | null;
  }[];
}

// Sales Report Types
export interface SalesSummary {
  totalSales: number;
  totalRevenue: {
    [key: string]: number; // Por moneda
  };
  totalProfit: {
    [key: string]: number; // Por moneda
  };
  averagePrice: {
    [key: string]: number; // Por moneda
  };
}

export interface SalesReport {
  summary: SalesSummary;
  salesBySeller: {
    [key: string]: {
      name: string;
      count: number;
      revenue: {
        [key: string]: number; // Por moneda
      };
      profit: {
        [key: string]: number; // Por moneda
      };
    };
  };
  salesByBranch: {
    [key: string]: {
      name: string;
      count: number;
      revenue: {
        [key: string]: number; // Por moneda
      };
    };
  };
  salesByMonth: {
    [key: string]: {
      count: number;
      revenue: {
        [key: string]: number; // Por moneda
      };
    };
  };
}

// Reservations Report Types
export interface ReservationSummary {
  totalReservations: number;
  activeReservations: number;
  completedReservations: number;
  cancelledReservations: number;
  expiredReservations: number;
  totalAmount: {
    [key: string]: number; // Por moneda
  };
  conversionRate: number;
}

export interface ReservationsReport {
  summary: ReservationSummary;
  reservationsByStatus: {
    [key: string]: {
      count: number;
      amount: {
        [key: string]: number;
      };
    };
  };
  reservationsByBranch: {
    [key: string]: {
      total: number;
      active: number;
      completed: number;
      cancelled: number;
      expired: number;
      amount: {
        [key: string]: number;
      };
    };
  };
  reservationsByMonth: {
    [key: string]: {
      total: number;
      active: number;
      completed: number;
      cancelled: number;
      expired: number;
      amount: {
        [key: string]: number;
      };
    };
  };
}

// Suppliers Report Types
export interface SupplierSummary {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
  totalPurchases: {
    [key: string]: number; // Por moneda
  };
}

export interface SuppliersReport {
  summary: SupplierSummary;
  purchasesBySupplier: {
    [key: string]: {
      motorcyclesCount: number;
      purchases: {
        [key: string]: number;
      };
    };
  };
  purchasesByMonth: {
    [key: string]: {
      count: number;
      amount: {
        [key: string]: number;
      };
    };
  };
  supplierDetails: {
    id: number;
    name: string;
    status: string;
    motorcyclesCount: number;
    totalPurchases: {
      [key: string]: number;
    };
  }[];
}

export interface MotorcycleWithRelations extends Motorcycle {
  brand?: {
    name: string;
  } | null;
  model?: {
    name: string;
  } | null;
  color?: {
    name: string;
  } | null;
  branch?: {
    name: string;
  } | null;
}
