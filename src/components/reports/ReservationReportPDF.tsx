import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import type { ReservationsReport } from '@/types/reports';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReservationReportPDFProps {
    report: ReservationsReport;
}

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
    },
    header: {
        marginBottom: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#666666',
        marginBottom: 20,
    },
    table: {
        width: 'auto',
        marginBottom: 20,
        flexDirection: 'column',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        borderBottomStyle: 'solid',
        alignItems: 'center',
        minHeight: 35,
    },
    tableHeader: {
        backgroundColor: '#F4F4F4',
    },
    tableCell: {
        flex: 1,
        padding: 5,
        fontSize: 12,
    },
    summary: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#F8F8F8',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    summaryLabel: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    summaryValue: {
        fontSize: 14,
    },
    statusSection: {
        marginTop: 20,
    },
    statusTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
});

export const ReservationReportPDF = ({ report }: ReservationReportPDFProps) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.title}>Reporte de Reservas</Text>
                    <Text style={styles.subtitle}>
                        Generado el {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}
                    </Text>
                </View>

                {/* Resumen General */}
                <View style={styles.summary}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Total de Reservas:</Text>
                        <Text style={styles.summaryValue}>{report.summary.totalReservations}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Reservas Activas:</Text>
                        <Text style={styles.summaryValue}>{report.summary.activeReservations}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Reservas Completadas:</Text>
                        <Text style={styles.summaryValue}>{report.summary.completedReservations}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Tasa de Conversión:</Text>
                        <Text style={styles.summaryValue}>{report.summary.conversionRate.toFixed(2)}%</Text>
                    </View>
                </View>

                {/* Montos por Moneda */}
                <View style={styles.statusSection}>
                    <Text style={styles.statusTitle}>Montos Totales por Moneda</Text>
                    {Object.entries(report.summary.totalAmount).map(([currency, amount]) => (
                        <View key={currency} style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Total en {currency}:</Text>
                            <Text style={styles.summaryValue}>{formatCurrency(amount)}</Text>
                        </View>
                    ))}
                </View>

                {/* Reservas por Estado */}
                <View style={styles.statusSection}>
                    <Text style={styles.statusTitle}>Reservas por Estado</Text>
                    {Object.entries(report.reservationsByStatus).map(([status, info]) => (
                        <View key={status} style={styles.table}>
                            <View style={[styles.tableRow, styles.tableHeader]}>
                                <Text style={styles.tableCell}>Estado: {status}</Text>
                                <Text style={styles.tableCell}>Cantidad: {info.count}</Text>
                            </View>
                            {Object.entries(info.amount).map(([currency, amount]) => (
                                <View key={currency} style={styles.tableRow}>
                                    <Text style={styles.tableCell}>Moneda: {currency}</Text>
                                    <Text style={styles.tableCell}>{formatCurrency(amount)}</Text>
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
            </Page>
        </Document>
    );
}; 