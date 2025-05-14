export interface SalesReport {
  summary: {
    totalSales: number;
    totalRevenue: Record<string, number>;
    totalProfit: Record<string, number>;
    averagePrice: Record<string, number>;
  };
  salesBySeller: Record<
    string,
    {
      name: string;
      count: number;
      revenue: Record<string, number>;
      profit: Record<string, number>;
    }
  >;
  salesByBranch: Record<
    string,
    {
      name: string;
      count: number;
      revenue: Record<string, number>;
    }
  >;
  salesByMonth: Record<
    string,
    {
      count: number;
      revenue: Record<string, number>;
    }
  >;
}

export interface ReportFilters {
  organizationId: string;
  dateRange?: {
    from: Date;
    to?: Date;
  };
  branchId?: string;
  brandId?: string;
  modelId?: string;
  supplierId?: string;
}
