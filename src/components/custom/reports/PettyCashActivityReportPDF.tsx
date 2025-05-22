import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
} from "@react-pdf/renderer";
// Importar tipos desde el archivo centralizado de tipos
import type { ReportDataForPdf, EnrichedWithdrawalPrisma, EnrichedSpendPrisma } from "@/types/PettyCashActivity";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Registrar fuentes (ejemplo)
// Font.register({
//   family: 'Open Sans',
//   fonts: [
//     { src: '/fonts/OpenSans-Regular.ttf' }, 
//     { src: '/fonts/OpenSans-Bold.ttf', fontWeight: 'bold' },
//   ]
// });

const styles = StyleSheet.create({
    page: {
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        padding: 20,
        fontSize: 9,
        // fontFamily: 'Open Sans',
    },
    header: {
        marginBottom: 15,
        textAlign: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#cccccc',
        paddingBottom: 10,
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    reportSubtitle: {
        fontSize: 10,
        color: '#444444',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 15,
        marginBottom: 8,
        backgroundColor: '#f0f0f0',
        padding: 5,
        borderRadius: 3,
    },
    table: {
        // @ts-ignore
        display: "table",
        width: "auto",
        borderStyle: "solid",
        borderColor: '#bfbfbf',
        borderWidth: 1,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        marginBottom: 10,
    },
    tableRow: {
        flexDirection: "row",
    },
    tableColHeader: {
        borderStyle: "solid",
        borderColor: '#bfbfbf',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        backgroundColor: "#e0e0e0",
        padding: 4,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    tableCol: {
        borderStyle: "solid",
        borderColor: '#bfbfbf',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        padding: 4,
    },
    textCenter: { textAlign: 'center' },
    textRight: { textAlign: 'right' },
    textBold: { fontWeight: 'bold' }, // @react-pdf/renderer usa números para fontWeight o 'bold'/'normal'
    indent1: { marginLeft: 10, marginTop: 5, marginBottom: 5 },
    indent2: { marginLeft: 20, marginTop: 3, marginBottom: 3 },
    itemDetail: { marginBottom: 2, fontSize: 8.5 },
    itemLabel: { fontWeight: 'bold' },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        textAlign: 'center',
        color: 'grey',
        fontSize: 8,
    },
    summarySection: {
        marginTop: 15,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#cccccc',
    },
    summaryText: {
        fontSize: 10,
        textAlign: 'right',
        marginBottom: 3,
    }
});

interface PettyCashActivityReportPDFProps {
    data: ReportDataForPdf[];
    fromDate: Date;
    toDate: Date;
}

const PettyCashActivityReportPDF: React.FC<PettyCashActivityReportPDFProps> = ({ data, fromDate, toDate }) => {
    const formatDate = (date: Date | string | null | undefined) => date ? format(new Date(date), "dd/MM/yyyy HH:mm", { locale: es }) : 'N/A';
    const formatDateShort = (date: Date | string | null | undefined) => date ? format(new Date(date), "dd/MM/yyyy", { locale: es }) : 'N/A';
    const formatCurrency = (amount: number | null | undefined) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount || 0);
    };

    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalSpends = 0;

    data.forEach(deposit => {
        totalDeposits += deposit.amount;
        deposit.withdrawals.forEach(withdrawal => {
            totalWithdrawals += withdrawal.amountGiven;
            withdrawal.spends.forEach(spend => {
                totalSpends += spend.amount;
            });
        });
    });

    return (
        <Document author="Apex Software" title={`Reporte de Actividad de Caja Chica ${formatDateShort(fromDate)} - ${formatDateShort(toDate)}`}>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.reportTitle}>Reporte de Actividad de Caja Chica</Text>
                    <Text style={styles.reportSubtitle}>
                        Período: {formatDateShort(fromDate)} al {formatDateShort(toDate)}
                    </Text>
                </View>

                {data.map((deposit) => (
                    <View key={deposit.id} style={{ marginBottom: 15 }}>
                        <Text style={styles.sectionTitle}>
                            Depósito - {formatDate(deposit.date)} - Sucursal: {deposit.branch?.name || 'Cuenta General'} - Monto: {formatCurrency(deposit.amount)}
                        </Text>
                        <View style={styles.itemDetail}><Text><Text style={styles.itemLabel}>Referencia: </Text>{deposit.reference || '-'}</Text></View>
                        <View style={styles.itemDetail}><Text><Text style={styles.itemLabel}>Descripción: </Text>{deposit.description}</Text></View>

                        {deposit.withdrawals.length > 0 ? (
                            deposit.withdrawals.map((withdrawal) => (
                                <View key={withdrawal.id} style={styles.indent1}>
                                    <Text style={{ ...styles.sectionTitle, fontSize: 10, marginTop: 8, backgroundColor: '#f8f8f8' }}>
                                        Retiro - {formatDate(withdrawal.date)} - Usuario: {withdrawal.userName} - Monto Entregado: {formatCurrency(withdrawal.amountGiven)}
                                    </Text>
                                    <View style={styles.itemDetail}><Text><Text style={styles.itemLabel}>Justificado: </Text>{formatCurrency(withdrawal.amountJustified)}</Text></View>
                                    <View style={styles.itemDetail}><Text><Text style={styles.itemLabel}>Estado: </Text>{withdrawal.status}</Text></View>

                                    {withdrawal.spends.length > 0 ? (
                                        <View style={styles.indent2}>
                                            <Text style={{ ...styles.itemLabel, fontSize: 9, marginTop: 5, marginBottom: 3 }}>Gastos Asociados:</Text>
                                            <View style={styles.table}>
                                                <View style={styles.tableRow}>
                                                    <View style={{ ...styles.tableColHeader, width: '25%' }}><Text>Fecha</Text></View>
                                                    <View style={{ ...styles.tableColHeader, width: '25%' }}><Text>Motivo</Text></View>
                                                    <View style={{ ...styles.tableColHeader, width: '35%' }}><Text>Descripción</Text></View>
                                                    <View style={{ ...styles.tableColHeader, width: '15%' }}><Text>Monto</Text></View>
                                                </View>
                                                {withdrawal.spends.map(spend => (
                                                    <View key={spend.id} style={styles.tableRow}>
                                                        <View style={{ ...styles.tableCol, width: '25%' }}><Text style={styles.textCenter}>{formatDateShort(spend.date)}</Text></View>
                                                        <View style={{ ...styles.tableCol, width: '25%' }}><Text>{spend.motive || '-'}</Text></View>
                                                        <View style={{ ...styles.tableCol, width: '35%' }}><Text>{spend.description}</Text></View>
                                                        <View style={{ ...styles.tableCol, width: '15%' }}><Text style={styles.textRight}>{formatCurrency(spend.amount)}</Text></View>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    ) : (
                                        <Text style={{ ...styles.indent2, fontSize: 8.5, fontStyle: 'italic' }}>Sin gastos registrados para este retiro.</Text>
                                    )}
                                </View>
                            ))
                        ) : (
                            <Text style={{ ...styles.indent1, fontSize: 8.5, fontStyle: 'italic' }}>Sin retiros registrados para este depósito.</Text>
                        )}
                    </View>
                ))}

                {data.length === 0 && (
                    <Text style={{ textAlign: 'center', marginTop: 30, fontStyle: 'italic' }}>No se encontraron datos de actividad de caja chica para el período y sucursal seleccionados.</Text>
                )}

                <View style={styles.summarySection}>
                    <Text style={{ ...styles.summaryText, ...styles.textBold }}>Resumen del Período:</Text>
                    <Text style={styles.summaryText}>Total Depósitos: {formatCurrency(totalDeposits)}</Text>
                    <Text style={styles.summaryText}>Total Retiros (Entregado): {formatCurrency(totalWithdrawals)}</Text>
                    <Text style={styles.summaryText}>Total Gastos Registrados: {formatCurrency(totalSpends)}</Text>
                </View>

                <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
                    `Página ${pageNumber} de ${totalPages}`
                )} fixed />
            </Page>
        </Document>
    );
};

export default PettyCashActivityReportPDF; 