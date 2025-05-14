import type { InventoryStatusReport } from "@/types/reports";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: "center",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  table: {
    display: "flex",
    flexDirection: "column",
    marginBottom: 10,
  },
  tableRow: {
    display: "flex",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingVertical: 5,
  },
  tableHeader: {
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 5,
  },
});

export function InventoryReportPDF({
  data,
  dateRange,
}: {
  data: InventoryStatusReport;
  dateRange?: { from?: Date; to?: Date };
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Reporte de Inventario</Text>

        {dateRange && (
          <Text>
            Período: {dateRange.from ? format(dateRange.from, "dd/MM/yyyy", { locale: es }) : "N/A"}{" "}
            - {dateRange.to ? format(dateRange.to, "dd/MM/yyyy", { locale: es }) : "N/A"}
          </Text>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCell}>Concepto</Text>
              <Text style={styles.tableCell}>Cantidad</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Total</Text>
              <Text style={styles.tableCell}>{data.summary.total}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>En Stock</Text>
              <Text style={styles.tableCell}>{data.summary.inStock}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Reservadas</Text>
              <Text style={styles.tableCell}>{data.summary.reserved}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Vendidas</Text>
              <Text style={styles.tableCell}>{data.summary.sold}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Por Estado</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCell}>Estado</Text>
              <Text style={styles.tableCell}>Cantidad</Text>
            </View>
            {data.byState.map((item) => (
              <View key={item.state} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.state}</Text>
                <Text style={styles.tableCell}>{item._count}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Por Marca</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCell}>Marca</Text>
              <Text style={styles.tableCell}>Cantidad</Text>
            </View>
            {data.byBrand.map((item) => (
              <View key={item.brandName} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.brandName}</Text>
                <Text style={styles.tableCell}>{item._count}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Valor por Estado</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCell}>Estado</Text>
              <Text style={styles.tableCell}>Moneda</Text>
              <Text style={styles.tableCell}>Valor de Venta</Text>
              <Text style={styles.tableCell}>Costo</Text>
            </View>
            {data.valueByState.map((item) => (
              <View key={item.state} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.state}</Text>
                <Text style={styles.tableCell}>{item.currency}</Text>
                <Text style={styles.tableCell}>
                  {new Intl.NumberFormat("es-AR", {
                    style: "currency",
                    currency: item.currency,
                  }).format(item._sum.retailPrice || 0)}
                </Text>
                <Text style={styles.tableCell}>
                  {new Intl.NumberFormat("es-AR", {
                    style: "currency",
                    currency: item.currency,
                  }).format(item._sum.costPrice || 0)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
}
