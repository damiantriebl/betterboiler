import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { SalesReport } from "@/types/SalesReportType";

const styles = StyleSheet.create({
    page: {
        flexDirection: "column",
        backgroundColor: "#ffffff",
        padding: 30,
    },
    header: {
        marginBottom: 20,
        textAlign: "center",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: "#666666",
        marginBottom: 20,
    },
    section: {
        marginBottom: 20,
        padding: 10,
        backgroundColor: "#f8f8f8",
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 10,
    },
    table: {
        display: "flex",
        width: "auto",
        borderStyle: "solid",
        borderWidth: 1,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    tableRow: {
        margin: "auto",
        flexDirection: "row",
    },
    tableColHeader: {
        width: "25%",
        borderStyle: "solid",
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        backgroundColor: "#f0f0f0",
        padding: 5,
    },
    tableCol: {
        width: "25%",
        borderStyle: "solid",
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        padding: 5,
    },
    tableCell: {
        fontSize: 10,
    },
});

interface SalesReportPDFProps {
    report: SalesReport;
}

export default function SalesReportPDF({ report }: SalesReportPDFProps) {
    const currencies = Object.keys(report.summary.totalRevenue);
    const mainCurrency = currencies[0] || "USD";

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.title}>Reporte de Ventas</Text>
                    <Text style={styles.subtitle}>
                        Total de Ventas: {report.summary.totalSales}
                    </Text>
                </View>

                {/* Summary Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Resumen</Text>
                    <Text>Ventas Totales: {report.summary.totalSales}</Text>
                    <Text>Ingresos Totales: ${report.summary.totalRevenue[mainCurrency]?.toLocaleString()}</Text>
                    <Text>Ganancia Total: ${report.summary.totalProfit[mainCurrency]?.toLocaleString()}</Text>
                    <Text>Precio Promedio: ${report.summary.averagePrice[mainCurrency]?.toLocaleString()}</Text>
                </View>

                {/* Sales by Seller */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ventas por Vendedor</Text>
                    <View style={styles.table}>
                        <View style={styles.tableRow}>
                            <View style={styles.tableColHeader}>
                                <Text style={styles.tableCell}>Vendedor</Text>
                            </View>
                            <View style={styles.tableColHeader}>
                                <Text style={styles.tableCell}>Cantidad</Text>
                            </View>
                            <View style={styles.tableColHeader}>
                                <Text style={styles.tableCell}>Ingresos</Text>
                            </View>
                            <View style={styles.tableColHeader}>
                                <Text style={styles.tableCell}>Ganancia</Text>
                            </View>
                        </View>
                        {Object.entries(report.salesBySeller).map(([id, seller]) => (
                            <View key={id} style={styles.tableRow}>
                                <View style={styles.tableCol}>
                                    <Text style={styles.tableCell}>{seller.name}</Text>
                                </View>
                                <View style={styles.tableCol}>
                                    <Text style={styles.tableCell}>{seller.count}</Text>
                                </View>
                                <View style={styles.tableCol}>
                                    <Text style={styles.tableCell}>
                                        ${seller.revenue[mainCurrency]?.toLocaleString()}
                                    </Text>
                                </View>
                                <View style={styles.tableCol}>
                                    <Text style={styles.tableCell}>
                                        ${seller.profit[mainCurrency]?.toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Sales by Branch */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ventas por Sucursal</Text>
                    <View style={styles.table}>
                        <View style={styles.tableRow}>
                            <View style={styles.tableColHeader}>
                                <Text style={styles.tableCell}>Sucursal</Text>
                            </View>
                            <View style={styles.tableColHeader}>
                                <Text style={styles.tableCell}>Cantidad</Text>
                            </View>
                            <View style={styles.tableColHeader}>
                                <Text style={styles.tableCell}>Ingresos</Text>
                            </View>
                        </View>
                        {Object.entries(report.salesByBranch).map(([id, branch]) => (
                            <View key={id} style={styles.tableRow}>
                                <View style={styles.tableCol}>
                                    <Text style={styles.tableCell}>{branch.name}</Text>
                                </View>
                                <View style={styles.tableCol}>
                                    <Text style={styles.tableCell}>{branch.count}</Text>
                                </View>
                                <View style={styles.tableCol}>
                                    <Text style={styles.tableCell}>
                                        ${branch.revenue[mainCurrency]?.toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Sales by Month */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ventas por Mes</Text>
                    <View style={styles.table}>
                        <View style={styles.tableRow}>
                            <View style={styles.tableColHeader}>
                                <Text style={styles.tableCell}>Mes</Text>
                            </View>
                            <View style={styles.tableColHeader}>
                                <Text style={styles.tableCell}>Cantidad</Text>
                            </View>
                            <View style={styles.tableColHeader}>
                                <Text style={styles.tableCell}>Ingresos</Text>
                            </View>
                        </View>
                        {Object.entries(report.salesByMonth).map(([month, data]) => (
                            <View key={month} style={styles.tableRow}>
                                <View style={styles.tableCol}>
                                    <Text style={styles.tableCell}>{month}</Text>
                                </View>
                                <View style={styles.tableCol}>
                                    <Text style={styles.tableCell}>{data.count}</Text>
                                </View>
                                <View style={styles.tableCol}>
                                    <Text style={styles.tableCell}>
                                        ${data.revenue[mainCurrency]?.toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </Page>
        </Document>
    );
} 