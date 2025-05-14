'use client';

import { useEffect, useState } from "react";
import { getLogoUrl } from '@/components/custom/OrganizationLogo';
import { fetchImageAsBase64 } from '@/actions/fetchImageAsBase64';
import { type QuotePDFProps } from '@/types/quote';

interface QuoteBridgePdfProps extends Omit<QuotePDFProps, 'organizationLogo'> {
    organizationLogoKey?: string | null;
    fileName?: string;
    onReady?: () => void;
}

const QuoteBridgePdf = ({
    organizationLogoKey,
    fileName = 'Presupuesto.pdf',
    onReady,
    ...pdfProps
}: QuoteBridgePdfProps) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const generateAndDownloadPdf = async () => {
            setLoading(true);
            setError(null);
            try {
                let logoBase64 = '';
                if (organizationLogoKey) {
                    try {
                        const signedUrl = await getLogoUrl(organizationLogoKey);
                        logoBase64 = await fetchImageAsBase64(signedUrl);
                    } catch {
                        logoBase64 = '';
                    }
                }
                // Armar props para el PDF, incluyendo el logo en base64
                const pdfPayload = {
                    ...pdfProps,
                    organizationLogo: logoBase64,
                };
                // POST a la API para generar el PDF
                const response = await fetch('/api/generate-quote-pdf', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(pdfPayload),
                });
                if (!response.ok) throw new Error('No se pudo generar el PDF');
                const blob = await response.blob();
                // Descargar el PDF automáticamente
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                if (onReady) onReady();
            } catch (err: any) {
                setError(err?.message || 'Error desconocido');
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        generateAndDownloadPdf();
        return () => { isMounted = false; };
    }, []); // Solo al montar

    if (loading) {
        return <div className="text-sm text-muted-foreground">Generando PDF...</div>;
    }
    if (error) {
        return <div className="text-sm text-red-600">Error: {error}</div>;
    }
    return null;
};

export default QuoteBridgePdf;
