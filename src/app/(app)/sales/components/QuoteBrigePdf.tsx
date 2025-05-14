"use client";
import { fetchImageAsBase64 } from "@/actions/fetchImageAsBase64";
import { getLogoUrl } from "@/components/custom/OrganizationLogo";
import type { QuotePDFProps } from "@/types/quote";
import { useEffect, useState } from "react";

interface QuoteBridgePdfProps extends Omit<QuotePDFProps, "organizationLogo"> {
  organizationLogoKey?: string | null;
  fileName?: string;
  onReady?: () => void;
}

export default function QuoteBridgePdf({
  organizationLogoKey,
  fileName = "Presupuesto.pdf",
  onReady,
  ...pdfProps
}: QuoteBridgePdfProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let logoBase64 = "";
        if (organizationLogoKey) {
          const signedUrl = await getLogoUrl(organizationLogoKey);
          logoBase64 = await fetchImageAsBase64(signedUrl).catch(() => "");
        }
        const payload = { ...pdfProps, organizationLogo: logoBase64 };
        const res = await fetch("/api/generate-quote-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("No se pudo generar el PDF");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        onReady?.();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (isMounted) setError(msg);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [fileName, organizationLogoKey, onReady]);

  if (loading) return <div>Generando PDF…</div>;
  if (error) return <div>Error: {error}</div>;
  return null;
}
