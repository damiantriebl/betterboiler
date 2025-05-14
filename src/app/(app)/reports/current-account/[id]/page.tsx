"use client";

import {
  type CurrentAccountForReport,
  getCurrentAccountForReport,
} from "@/actions/current-accounts/get-current-account-for-report";
import CurrentAccountReportDocument from "@/components/pdf/CurrentAccountReportDocument";
import { Button } from "@/components/ui/button";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import { Eye, FileDown, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function CurrentAccountReportPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;

  const [accountData, setAccountData] = useState<CurrentAccountForReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showViewer, setShowViewer] = useState(false); // Optional: for toggling viewer vs download link

  useEffect(() => {
    if (accountId) {
      setLoading(true);
      getCurrentAccountForReport(accountId)
        .then((data) => {
          if (data) {
            setAccountData(data);
            setError(null);
          } else {
            setAccountData(null);
            setError("No se pudo encontrar la cuenta corriente o no hay datos para el reporte.");
          }
        })
        .catch((err) => {
          console.error("Error fetching current account for report:", err);
          setError(
            "Error al cargar los datos para el reporte: " +
              (err instanceof Error ? err.message : String(err)),
          );
          setAccountData(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setError("ID de cuenta no proporcionado.");
      setLoading(false);
    }
  }, [accountId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando datos del reporte...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <p className="text-red-600 text-xl mb-4">Error</p>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => router.back()}>Volver</Button>
      </div>
    );
  }

  if (!accountData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <p className="text-xl mb-4">No Hay Datos</p>
        <p className="text-muted-foreground mb-6">
          No se encontraron datos para generar el reporte de esta cuenta.
        </p>
        <Button onClick={() => router.back()}>Volver</Button>
      </div>
    );
  }

  const fileName = `Reporte_CC_${accountData.client.lastName || "Cliente"}_${accountData.motorcycle?.chassisNumber || accountData.id}.pdf`;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reporte de Cuenta Corriente</h1>
        <Button onClick={() => router.back()} variant="outline">
          Volver a Cuentas
        </Button>
      </div>

      <div className="bg-card p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-xl font-semibold mb-2">
          {accountData.client.firstName} {accountData.client.lastName}
        </h2>
        <p className="text-muted-foreground">
          Vehículo: {accountData.motorcycle?.brand?.name} {accountData.motorcycle?.model?.name} (
          {accountData.motorcycle?.year})
        </p>
        <p className="text-muted-foreground">ID Cuenta: {accountData.id}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="flex-grow p-6 border rounded-lg">
          <h3 className="text-lg font-medium mb-4">Descargar o Visualizar PDF</h3>
          <div className="flex gap-4 mb-4">
            <PDFDownloadLink
              document={<CurrentAccountReportDocument account={accountData} />}
              fileName={fileName}
            >
              {({ blob, url, loading: pdfLoading, error: pdfError }) =>
                pdfLoading ? (
                  <Button disabled size="lg" className="w-full md:w-auto">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando PDF...
                  </Button>
                ) : (
                  <Button size="lg" className="w-full md:w-auto">
                    <FileDown className="mr-2 h-4 w-4" />
                    Descargar PDF
                  </Button>
                )
              }
            </PDFDownloadLink>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowViewer(!showViewer)}
              className="w-full md:w-auto"
            >
              <Eye className="mr-2 h-4 w-4" />
              {showViewer ? "Ocultar Previsualización" : "Previsualizar PDF"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            El PDF contendrá el detalle completo de la cuenta corriente, incluyendo información del
            cliente, vehículo, resumen financiero y plan de pagos.
          </p>
        </div>
      </div>

      {showViewer && (
        <div style={{ height: "100vh", marginTop: "20px" }}>
          <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
            <CurrentAccountReportDocument account={accountData} />
          </PDFViewer>
        </div>
      )}
    </div>
  );
}
