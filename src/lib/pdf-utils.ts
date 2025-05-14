import type { jsPDF } from "jspdf";
import "jspdf-autotable";
import type {
  InventoryStatusReport,
  ReservationsReport,
  SalesReport,
  SuppliersReport,
} from "@/types/reports";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AutoTableDoc extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
  autoTable: (options: {
    head: string[][];
    body: (string | number)[][];
    startY?: number;
    theme?: string;
    headStyles?: {
      fillColor?: string;
      textColor?: string;
    };
  }) => void;
}

// Helper function to format currency
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
  }).format(amount);
};

// Helper function to add header to PDF
const addHeader = (doc: jsPDF, title: string, dateRange?: { from?: Date; to?: Date }) => {
  doc.setFontSize(20);
  doc.text(title, 14, 22);

  if (dateRange) {
    doc.setFontSize(10);
    const from = dateRange.from ? format(dateRange.from, "dd/MM/yyyy", { locale: es }) : "N/A";
    const to = dateRange.to ? format(dateRange.to, "dd/MM/yyyy", { locale: es }) : "N/A";
    doc.text(`Período: ${from} - ${to}`, 14, 30);
  }

  doc.setFontSize(12);
};

// Helper function to add table to PDF
const addTable = (
  doc: AutoTableDoc,
  headers: string[],
  data: (string | number)[][],
  startY = 40,
) => {
  doc.autoTable({
    head: [headers],
    body: data,
    startY,
    theme: "grid",
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
    },
  });
};

export const generateInventoryPDF = (
  data: InventoryStatusReport,
  dateRange?: { from?: Date; to?: Date },
) => {
  const doc = new jsPDF();

  // Add header
  addHeader(doc, "Reporte de Inventario", dateRange);

  // Summary section
  doc.setFontSize(14);
  doc.text("Resumen", 14, 50);

  const summaryData = [
    ["Total", data.summary.total.toString()],
    ["En Stock", data.summary.inStock.toString()],
    ["Reservadas", data.summary.reserved.toString()],
    ["Vendidas", data.summary.sold.toString()],
  ];

  addTable(doc, ["Concepto", "Cantidad"], summaryData, 60);

  // By State section
  doc.setFontSize(14);
  doc.text("Por Estado", 14, (doc as AutoTableDoc).lastAutoTable.finalY + 20);

  const stateData = data.byState.map((item) => [item.state, item._count.toString()]);

  addTable(doc, ["Estado", "Cantidad"], stateData);

  // By Brand section
  doc.setFontSize(14);
  doc.text("Por Marca", 14, (doc as AutoTableDoc).lastAutoTable.finalY + 20);

  const brandData = data.byBrand.map((item) => [item.brandName, item._count.toString()]);

  addTable(doc, ["Marca", "Cantidad"], brandData);

  // Value by State section
  doc.setFontSize(14);
  doc.text("Valor por Estado", 14, (doc as AutoTableDoc).lastAutoTable.finalY + 20);

  const valueData = data.valueByState.map((item) => [
    item.state,
    item.currency,
    formatCurrency(item._sum.retailPrice || 0, item.currency),
    formatCurrency(item._sum.costPrice || 0, item.currency),
  ]);

  addTable(doc, ["Estado", "Moneda", "Valor de Venta", "Costo"], valueData);

  return doc;
};

export const generateSalesPDF = (data: SalesReport, dateRange?: { from?: Date; to?: Date }) => {
  const doc = new jsPDF();

  // Add header
  addHeader(doc, "Reporte de Ventas", dateRange);

  // Summary section
  doc.setFontSize(14);
  doc.text("Resumen", 14, 50);

  const summaryData = [
    ["Total de Ventas", data.summary.totalSales.toString()],
    ...Object.entries(data.summary.totalRevenue).map(([currency, amount]) => [
      `Ingresos (${currency})`,
      formatCurrency(amount, currency),
    ]),
    ...Object.entries(data.summary.totalProfit).map(([currency, amount]) => [
      `Ganancia (${currency})`,
      formatCurrency(amount, currency),
    ]),
  ];

  addTable(doc, ["Concepto", "Valor"], summaryData, 60);

  // Sales by Currency section
  doc.setFontSize(14);
  doc.text("Ventas por Moneda", 14, (doc as AutoTableDoc).lastAutoTable.finalY + 20);

  const currencyData = Object.entries(data.salesByCurrency).map(([currency, info]) => [
    currency,
    info.count.toString(),
    formatCurrency(info.totalRevenue, currency),
    formatCurrency(info.totalCost, currency),
  ]);

  addTable(doc, ["Moneda", "Cantidad", "Ingresos", "Costo"], currencyData);

  // Sales by Branch section
  doc.setFontSize(14);
  doc.text("Ventas por Sucursal", 14, (doc as AutoTableDoc).lastAutoTable.finalY + 20);

  const branchData = Object.entries(data.salesByBranch).map(([branch, info]) => [
    branch,
    info.count.toString(),
    ...Object.entries(info.revenue).map(([currency, amount]) => formatCurrency(amount, currency)),
  ]);

  addTable(doc, ["Sucursal", "Cantidad", "Ingresos"], branchData);

  return doc;
};

export const generateReservationsPDF = (
  data: ReservationsReport,
  dateRange?: { from?: Date; to?: Date },
) => {
  const doc = new jsPDF();

  // Add header
  addHeader(doc, "Reporte de Reservas", dateRange);

  // Summary section
  doc.setFontSize(14);
  doc.text("Resumen", 14, 50);

  const summaryData = [
    ["Total de Reservas", data.summary.totalReservations.toString()],
    ["Reservas Activas", data.summary.activeReservations.toString()],
    ["Reservas Completadas", data.summary.completedReservations.toString()],
    ["Reservas Canceladas", data.summary.cancelledReservations.toString()],
    ["Reservas Expiradas", data.summary.expiredReservations.toString()],
    ...Object.entries(data.summary.totalAmount).map(([currency, amount]) => [
      `Monto Total (${currency})`,
      formatCurrency(amount, currency),
    ]),
  ];

  addTable(doc, ["Concepto", "Valor"], summaryData, 60);

  // Reservations by Status section
  doc.setFontSize(14);
  doc.text("Reservas por Estado", 14, (doc as AutoTableDoc).lastAutoTable.finalY + 20);

  const statusData = Object.entries(data.reservationsByStatus).map(([status, info]) => [
    status,
    info.count.toString(),
    ...Object.entries(info.amount).map(([currency, amount]) => formatCurrency(amount, currency)),
  ]);

  addTable(doc, ["Estado", "Cantidad", "Monto"], statusData);

  return doc;
};

export const generateSuppliersPDF = (
  data: SuppliersReport,
  dateRange?: { from?: Date; to?: Date },
) => {
  const doc = new jsPDF();

  // Add header
  addHeader(doc, "Reporte de Proveedores", dateRange);

  // Summary section
  doc.setFontSize(14);
  doc.text("Resumen", 14, 50);

  const summaryData = [
    ["Total de Proveedores", data.summary.totalSuppliers.toString()],
    ["Proveedores Activos", data.summary.activeSuppliers.toString()],
    ["Proveedores Inactivos", data.summary.inactiveSuppliers.toString()],
    ...Object.entries(data.summary.totalPurchases).map(([currency, amount]) => [
      `Compras Totales (${currency})`,
      formatCurrency(amount, currency),
    ]),
  ];

  addTable(doc, ["Concepto", "Valor"], summaryData, 60);

  // Purchases by Supplier section
  doc.setFontSize(14);
  doc.text("Compras por Proveedor", 14, (doc as AutoTableDoc).lastAutoTable.finalY + 20);

  const supplierData = Object.entries(data.purchasesBySupplier).map(([supplier, info]) => [
    supplier,
    info.motorcyclesCount.toString(),
    ...Object.entries(info.purchases).map(([currency, amount]) => formatCurrency(amount, currency)),
  ]);

  addTable(doc, ["Proveedor", "Cantidad", "Monto"], supplierData);

  // Supplier Details section
  doc.setFontSize(14);
  doc.text("Detalles de Proveedores", 14, (doc as AutoTableDoc).lastAutoTable.finalY + 20);

  const detailsData = data.supplierDetails.map((supplier) => [
    supplier.name,
    supplier.status,
    supplier.motorcyclesCount.toString(),
    ...Object.entries(supplier.totalPurchases).map(([currency, amount]) =>
      formatCurrency(amount, currency),
    ),
  ]);

  addTable(doc, ["Proveedor", "Estado", "Cantidad", "Compras Totales"], detailsData);

  return doc;
};
