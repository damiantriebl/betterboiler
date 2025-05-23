"use client";
import { fetchImageAsBase64 } from "@/actions/fetch-Image-As-Base64";
import { getLogoUrl } from "@/components/custom/OrganizationLogo";
import type { QuotePDFProps } from "@/types/quote";
import { useEffect, useState } from "react";
import { useSessionStore } from "@/stores/SessionStore";

interface QuoteBridgePdfProps
  extends Omit<QuotePDFProps, "organizationLogo" | "organizationName" | "userName" | "userImage"> {
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
  const { organizationName, userName, userImage } = useSessionStore();
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
          console.log("Signed URL del logo:", signedUrl);
          logoBase64 = await fetchImageAsBase64(signedUrl).catch(() => "");
          console.log("Logo base64 (primeros 100):", logoBase64?.substring(0, 100));
        }

        let motorcycleImageBase64 = "";
        const moto = pdfProps.motorcycle;
        let motoImageUrl = "";
        if (moto?.model?.files && Array.isArray(moto.model.files)) {
          const imgFile = moto.model.files.find(
            (f: { type?: string; url?: string; s3Key?: string }) =>
              f.type === "image" || f.type?.startsWith("image/"),
          );
          if (imgFile) {
            if (imgFile.url) {
              motoImageUrl = imgFile.url;
            } else if (imgFile.s3Key) {
              motoImageUrl = await getLogoUrl(imgFile.s3Key);
            }
          }
        }
        if (!motoImageUrl && moto?.model?.imageUrl) motoImageUrl = moto.model.imageUrl;
        if (!motoImageUrl && moto?.imageUrl) motoImageUrl = moto.imageUrl;
        if (motoImageUrl) {
          motorcycleImageBase64 = await convertImageToPngBase64(motoImageUrl).catch(() => "");
        }

        const payload = {
          ...pdfProps,
          organizationLogo: logoBase64,
          motorcycleImage: motorcycleImageBase64,
          organizationName,
          userName,
          userImage,
        };
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

export async function convertImageToPngBase64(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("No context");
      ctx.drawImage(img, 0, 0);
      const pngBase64 = canvas.toDataURL("image/png");
      resolve(pngBase64);
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}
