import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
} from "@react-pdf/renderer";
import type { PettyCashSpend, Branch } from "@prisma/client"; // Asumiendo tipos generados
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Registrar fuentes (opcional, pero recomendado para consistencia)
// Asegúrate de tener los archivos de fuentes en tu proyecto, ej. en /public/fonts
// Font.register({
//   family: 'Roboto',
//   fonts: [
//     { src: '/fonts/Roboto-Regular.ttf' },
//     { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' },
//   ],
// });

const styles = StyleSheet.create({
    page: {
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        padding: 30,
        // fontFamily: 'Roboto', // Usar la fuente registrada
    },
    header: {
        marginBottom: 20,
        textAlign: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 12,
        color: 'gray',
    },
    table: {
        // @ts-ignore
        display: "table",
        width: "auto",
        borderStyle: "solid",
        borderWidth: 1,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        marginBottom: 20,
    },
    tableRow: {
        margin: "auto",
        flexDirection: "row",
    },
    tableColHeader: {
        width: "20%", // Ajustar según necesidad
        borderStyle: "solid",
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        backgroundColor: "#f0f0f0",
        padding: 5,
    },
    tableCol: {
        width: "20%", // Ajustar según necesidad (5 columnas)
        borderStyle: "solid",
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        padding: 5,
    },
    tableCellHeader: {
        margin: "auto",
        fontSize: 10,
        fontWeight: 'bold',
    },
    tableCell: {
        margin: "auto",
        fontSize: 9,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        color: 'grey',
        fontSize: 10,
    },
    totalAmount: {
        marginTop: 10,
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'right',
    }
});

interface PettyCashSpendWithDetails extends PettyCashSpend {
    withdrawal: {
        deposit: {
            branch: Branch | null;
        };
    };
}

interface PettyCashSpendPDFProps {
    movements: PettyCashSpendWithDetails[];
    fromDate: Date;
    toDate: Date;
    // Podrías pasar el nombre de la organización y sucursal seleccionada si es necesario
}

const PettyCashSpendPDF: React.FC<PettyCashSpendPDFProps> = ({ movements, fromDate, toDate }) => {
    const formatDate = (date: Date | string) => format(new Date(date), "P", { locale: es });
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
    };

    const totalAmountSpent = movements.reduce((sum, movement) => sum + movement.amount, 0);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.title}>Reporte de Movimientos de Caja Chica</Text>
                    <Text style={styles.subtitle}>
                        Período: {formatDate(fromDate)} - {formatDate(toDate)}
                    </Text>
                    {/* Aquí podrías agregar el nombre de la sucursal si se seleccionó una específica */}
                </View>

                <View style={styles.table}>
                    {/* Encabezados de la tabla */}
                    <View style={styles.tableRow}>
                        <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Fecha</Text></View>
                        <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Sucursal</Text></View>
                        <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Motivo/Gasto</Text></View>
                        <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Descripción</Text></View>
                        <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Monto</Text></View>
                    </View>
                    {/* Filas de datos */}
                    {movements.map((movement) => (
                        <View key={movement.id} style={styles.tableRow}>
                            <View style={styles.tableCol}><Text style={styles.tableCell}>{formatDate(movement.date)}</Text></View>
                            <View style={styles.tableCol}><Text style={styles.tableCell}>{movement.withdrawal.deposit.branch?.name || 'Cuenta General'}</Text></View>
                            <View style={styles.tableCol}><Text style={styles.tableCell}>{movement.motive || '-'}</Text></View>
                            <View style={styles.tableCol}><Text style={styles.tableCell}>{movement.description}</Text></View>
                            <View style={styles.tableCol}><Text style={styles.tableCell}>{formatCurrency(movement.amount)}</Text></View>
                        </View>
                    ))}
                </View>

                <Text style={styles.totalAmount}>Total Gastado: {formatCurrency(totalAmountSpent)}</Text>

                <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
                    `Página ${pageNumber} de ${totalPages}`
                )} fixed />
            </Page>
        </Document>
    );
};

export default PettyCashSpendPDF; 