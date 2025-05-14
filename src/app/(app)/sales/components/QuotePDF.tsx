import { formatPrice } from "@/lib/utils";
import type { AmortizationScheduleEntry, QuotePDFProps } from "@/types/quote";
import {
  Document,
  Image,
  Image as PDFImage,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  logoContainer: {
    width: 100,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 5,
  },
  section: {
    marginBottom: 20,
  },
  motorcycleInfo: {
    flexDirection: "row",
    marginBottom: 20,
  },
  motorcycleDetails: {
    flex: 2,
  },
  motorcycleImageContainer: {
    flex: 1,
    alignItems: "center",
  },
  motorcycleImage: {
    width: "100%",
    maxHeight: 200,
    objectFit: "contain",
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  detailLabel: {
    fontWeight: "bold",
    width: "40%",
  },
  detailValue: {
    width: "60%",
  },
  paymentSection: {
    marginTop: 20,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  tableCell: {
    flex: 1,
    textAlign: "center",
  },
  tableCellLeft: {
    flex: 1,
    textAlign: "left",
  },
  tableCellRight: {
    flex: 1,
    textAlign: "right",
  },
  total: {
    fontWeight: "bold",
    fontSize: 14,
    marginTop: 10,
  },
  footer: {
    marginTop: 30,
    fontSize: 10,
    textAlign: "center",
  },
  logoImage: {
    width: 100,
    height: 100,
  },
});

export const QuotePDFDocument = ({
  motorcycle,
  paymentData,
  activeTab,
  basePrice,
  modifierAmount,
  finalPrice,
  financedAmount,
  installmentDetails,
  totalWithFinancing,
  organizationLogo,
  formatAmount: formatAmountProp, // Renombrar para evitar conflicto si se pasa como prop
}: QuotePDFProps) => {
  if (!motorcycle) return null;

  console.log(
    "Server QuotePDFDocument: organizationLogo (primeros 100 chars)",
    organizationLogo?.substring(0, 100),
  );

  const getFormattedDate = () => {
    return new Date().toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPaymentMethodText = () => {
    switch (activeTab) {
      case "efectivo":
        return "Efectivo/Transferencia";
      case "tarjeta":
        return `Tarjeta - ${paymentData.cuotas} cuota(s)`;
      case "cuenta_corriente":
        return `Financiación - ${paymentData.currentAccountInstallments} cuotas (${paymentData.annualInterestRate}% interés)`;
      default:
        return "No especificado";
    }
  };

  const mainImageSrc = motorcycle.imageUrl;
  const modelImageSrc = motorcycle.model?.imageUrl;

  let imageToDisplay: string | null | undefined = null;
  if (mainImageSrc && mainImageSrc.trim() !== "") {
    imageToDisplay = mainImageSrc;
  } else if (modelImageSrc && modelImageSrc.trim() !== "") {
    imageToDisplay = modelImageSrc;
  }

  // Usar la prop renombrada o la función local si la prop no es una función
  const formatAmount =
    typeof formatAmountProp === "function"
      ? formatAmountProp
      : (amount: number) => formatPrice(amount, motorcycle?.currency || "ARS");

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Presupuesto</Text>
          <Text style={styles.subtitle}>Fecha: {getFormattedDate()}</Text>
        </View>
        <View style={styles.logoContainer}>
          {
            organizationLogo ? (
              <Image src={organizationLogo} style={styles.logoImage} />
            ) : (
              <Text>Logo</Text>
            ) // Fallback si no hay logo o no es base64
          }
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>Información del Vehículo</Text>
        <View style={styles.motorcycleInfo}>
          <View style={styles.motorcycleDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Marca/Modelo:</Text>
              <Text style={styles.detailValue}>
                {motorcycle?.brand?.name} {motorcycle?.model?.name}
              </Text>
            </View>
            {/* ... más detalles del vehículo ... */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Año:</Text>
              <Text style={styles.detailValue}>{motorcycle?.year}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Color:</Text>
              <Text style={styles.detailValue}>{motorcycle?.color?.name || "N/A"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Chasis:</Text>
              <Text style={styles.detailValue}>{motorcycle?.chassisNumber || "N/A"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Motor:</Text>
              <Text style={styles.detailValue}>{motorcycle?.engineNumber || "N/A"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Kilometraje:</Text>
              <Text style={styles.detailValue}>{motorcycle?.mileage} km</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Cilindrada:</Text>
              <Text style={styles.detailValue}>{motorcycle?.displacement || "N/A"} cc</Text>
            </View>
          </View>
          {imageToDisplay && (
            <View style={styles.motorcycleImageContainer}>
              <PDFImage src={imageToDisplay} style={styles.motorcycleImage} />
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>Información de Pago</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Método de Pago:</Text>
          <Text style={styles.detailValue}>{getPaymentMethodText()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Precio Base:</Text>
          <Text style={styles.detailValue}>{formatAmount(basePrice)}</Text>
        </View>
        {paymentData.discountValue > 0 && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {paymentData.discountType === "discount" ? "Descuento" : "Recargo"} (
              {paymentData.discountValue}%):
            </Text>
            <Text style={styles.detailValue}>
              {paymentData.discountType === "discount" ? "-" : "+"}
              {formatAmount(modifierAmount)}
            </Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { fontWeight: "bold" }]}>Precio Final:</Text>
          <Text style={[styles.detailValue, { fontWeight: "bold" }]}>
            {formatAmount(finalPrice)}
          </Text>
        </View>
        {activeTab === "tarjeta" && paymentData.cuotas > 1 && (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Cuotas:</Text>
              <Text style={styles.detailValue}>{paymentData.cuotas}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Valor de Cuota:</Text>
              <Text style={styles.detailValue}>
                {formatAmount(finalPrice / paymentData.cuotas)}
              </Text>
            </View>
          </>
        )}
        {activeTab === "cuenta_corriente" && (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pago Inicial:</Text>
              <Text style={styles.detailValue}>{formatAmount(paymentData.downPayment)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Monto a Financiar:</Text>
              <Text style={styles.detailValue}>{formatAmount(financedAmount)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tasa de Interés:</Text>
              <Text style={styles.detailValue}>{paymentData.annualInterestRate}% anual</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Cuotas:</Text>
              <Text style={styles.detailValue}>
                {paymentData.currentAccountInstallments} ({paymentData.currentAccountFrequency})
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Valor de Cuota:</Text>
              <Text style={styles.detailValue}>
                {formatAmount(installmentDetails.installmentAmount)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total a Pagar:</Text>
              <Text style={styles.detailValue}>{formatAmount(totalWithFinancing)}</Text>
            </View>
            {activeTab === "cuenta_corriente" &&
              "totalInterest" in installmentDetails &&
              installmentDetails.totalInterest !== undefined &&
              installmentDetails.totalInterest > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Intereses Totales:</Text>
                  <Text style={styles.detailValue}>
                    {formatAmount(installmentDetails.totalInterest)}
                  </Text>
                </View>
              )}
            {installmentDetails.schedule && installmentDetails.schedule.length > 0 && (
              <View style={styles.table}>
                <Text style={{ marginBottom: 5, fontWeight: "bold" }}>Plan de Pagos:</Text>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCellLeft, { flex: 0.5 }]}>N°</Text>
                  <Text style={styles.tableCellRight}>Capital</Text>
                  <Text style={styles.tableCellRight}>Amort.</Text>
                  <Text style={styles.tableCellRight}>Interés</Text>
                  <Text style={styles.tableCellRight}>Cuota</Text>
                </View>
                {installmentDetails.schedule.map((item) => (
                  <View key={item.installmentNumber} style={styles.tableRow}>
                    <Text style={[styles.tableCellLeft, { flex: 0.5 }]}>
                      {item.installmentNumber}
                    </Text>
                    <Text style={styles.tableCellRight}>
                      {formatAmount(item.capitalAtPeriodStart)}
                    </Text>
                    <Text style={styles.tableCellRight}>{formatAmount(item.amortization)}</Text>
                    <Text style={styles.tableCellRight}>
                      {formatAmount(item.interestForPeriod)}
                    </Text>
                    <Text style={styles.tableCellRight}>
                      {formatAmount(item.calculatedInstallmentAmount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>

      {activeTab === "cuenta_corriente" && (
        <>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Financiación:</Text>
            <Text style={styles.detailValue}>{formatAmount(financedAmount)}</Text>
          </View>
          {installmentDetails?.schedule && installmentDetails.schedule.length > 0 && (
            <>
              <Text style={styles.subtitle}>Detalle de Cuotas (Financiación)</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableCellLeft}>Cuota N°</Text>
                  <Text style={styles.tableCellRight}>Valor Cuota</Text>
                  <Text style={styles.tableCellRight}>Saldo Restante</Text>
                </View>
                {installmentDetails.schedule.map((detail: AmortizationScheduleEntry) => (
                  <View key={detail.installmentNumber} style={styles.tableRow}>
                    <Text style={styles.tableCellLeft}>{detail.installmentNumber}</Text>
                    <Text style={styles.tableCellRight}>
                      {formatAmount(detail.calculatedInstallmentAmount)}
                    </Text>
                    <Text style={styles.tableCellRight}>
                      {formatAmount(detail.capitalAtPeriodEnd)}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={[styles.detailRow, styles.total, { justifyContent: "flex-end" }]}>
                <Text
                  style={[
                    styles.detailLabel,
                    { textAlign: "right", width: "auto", marginRight: 5 },
                  ]}
                >
                  Total con Financiación:
                </Text>
                <Text style={[styles.detailValue, { textAlign: "right", width: "auto" }]}>
                  {formatAmount(totalWithFinancing)}
                </Text>
              </View>
            </>
          )}
        </>
      )}
      <View style={styles.footer}>
        <Text>Este presupuesto es válido por 7 días desde la fecha de emisión.</Text>
        <Text>Todos los precios incluyen IVA.</Text>
      </View>
    </Page>
  );
};
