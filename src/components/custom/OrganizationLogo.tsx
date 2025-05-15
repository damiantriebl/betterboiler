// src/components/ui/OrganizationLogo.tsx
"use client";

import { cn } from "@/lib/utils";
import { Building } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSessionStore } from "@/stores/SessionStore";

interface OrganizationLogoProps {
  logo?: string | null;
  thumbnail?: string | null;
  name?: string | null;
  size?: "sm" | "default" | "lg" | number;
  variant?: "default" | "bare";
  nameDisplayOpacity?: number;
  className?: string;
  useSessionData?: boolean;
}

// cache de URLs
const urlCache = new Map<string, string>();

export async function getLogoUrl(input: string): Promise<string> {
  if (!input) throw new Error("No logo provided");
  const cachedUrl = urlCache.get(input);
  if (cachedUrl) return cachedUrl;
  if (input.startsWith("http://") || input.startsWith("https://")) {
    urlCache.set(input, input);
    return input;
  }
  try {
    const res = await fetch(`/api/s3/get-signed-url?name=${encodeURIComponent(input)}&operation=get`);
    const data = await res.json();
    if (res.ok && data.success?.url) {
      urlCache.set(input, data.success.url);
      return data.success.url;
    }
    throw new Error(data.failure || "Failed to get signed URL");
  } catch (error) {
    console.error("Error fetching logo URL:", error);
    throw error;
  }
}

export default function OrganizationLogo({
  logo,
  thumbnail,
  name,
  size = "default",
  variant = "default",
  nameDisplayOpacity = 1,
  className,
  useSessionData = true,
}: OrganizationLogoProps) {
  // Obtener datos del store si es necesario
  const storeOrgName = useSessionStore((state) => state.organizationName);
  const storeOrgLogo = useSessionStore((state) => state.organizationLogo);

  // Usar props o datos del store según sea necesario
  const displayName = name || (useSessionData ? storeOrgName : null);
  const displayLogo = logo || (useSessionData ? storeOrgLogo : null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isMounted = useRef(false);

  // Determinar si se usa tamaño personalizado o predefinido
  const isCustomSize = typeof size === "number";

  // Estilos para tamaños personalizados (usando style)
  const customContainerStyles = useMemo(() => {
    if (!isCustomSize) return {};
    const sizeValue = size as number;
    return {
      height: `${sizeValue}rem`,
      transition: "height 0.3s ease-out, background-color 0.3s ease-out, box-shadow 0.3s ease-out",
    };
  }, [size, isCustomSize]);

  const customIconStyles = useMemo(() => {
    if (!isCustomSize) return {};
    const sizeValue = size as number;
    const iconSize = sizeValue * 0.6;
    return {
      height: `${iconSize}rem`,
      transition: "height 0.3s ease-out",
    };
  }, [size, isCustomSize]);

  // Clases para tamaños predefinidos (usando Tailwind)
  const containerSizeClasses = useMemo(() => {
    if (isCustomSize) return "w-auto";
    return (
      {
        sm: "w-auto h-10",
        default: "w-auto h-32",
        lg: "w-auto h-40",
      }[size] || "w-auto h-32"
    );
  }, [size, isCustomSize]);

  const iconSizeClasses = useMemo(() => {
    if (isCustomSize) return "w-auto";
    return (
      {
        sm: "w-auto h-6",
        default: "w-auto h-[7.68rem]",
        lg: "w-auto h-24",
      }[size] || "w-auto h-[7.68rem]"
    );
  }, [size, isCustomSize]);

  // Clases combinadas para el contenedor
  const containerClasses = useMemo(
    () =>
      cn(
        "relative overflow-hidden flex items-center justify-center",
        "text-xl font-bold transition-opacity duration-200 ease-out",
        containerSizeClasses,
        variant === "default" && "bg-muted shadow-md  ",
        variant === "bare" && "bg-transparent shadow-none",
        !isCustomSize && "transition-all duration-300 ease-out",
      ),
    [containerSizeClasses, variant, isCustomSize],
  );

  // Clases combinadas para el icono de fallback
  const fallbackIconClasses = useMemo(
    () =>
      cn(
        "text-muted-foreground",
        iconSizeClasses,
        !isCustomSize && "transition-all duration-300 ease-out",
      ),
    [iconSizeClasses, isCustomSize],
  );

  // Determinar el padding para la imagen con escalado suave
  const imagePadding = useMemo(() => {
    let paddingClass = "p-2"; // Default padding
    if (isCustomSize) {
      const sizeValue = size as number;
      if (sizeValue <= 4)
        paddingClass = "p-1"; // Padding mínimo para tamaño pequeño
      else if (sizeValue > 8) paddingClass = "p-3"; // Padding más grande para tamaño grande
      // else usa el default p-2 para tamaños intermedios
    } else {
      // Aplicar padding basado en tamaño predefinido
      if (size === "sm") paddingClass = "p-1";
      else if (size === "lg") paddingClass = "p-3";
      // else usa el default p-2
    }
    // Si la variante es 'bare', siempre es p-0
    return variant === "bare" ? "p-0" : paddingClass;
  }, [size, variant, isCustomSize]);

  // Clases para la imagen
  const imgClasses = useMemo(
    () => cn("w-auto h-full object-contain transition-all duration-300", imagePadding),
    [imagePadding],
  );

  // preload thumbnail
  useEffect(() => {
    if (thumbnail) getLogoUrl(thumbnail).catch(() => { });
  }, [thumbnail]);

  const fetchLogoUrl = useCallback(
    async (key: string) => {
      if (isLoading) return;
      setIsLoading(true);
      setHasError(false);
      try {
        const url = await getLogoUrl(key);
        setImageUrl(url);
      } catch {
        setHasError(true);
        setImageUrl(null);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading],
  );

  useEffect(() => {
    if (typeof displayLogo === "string" && displayLogo.length > 0) {
      fetchLogoUrl(displayLogo);
    } else {
      setHasError(true);
    }
  }, [displayLogo, fetchLogoUrl]);

  const renderFallback = () => (
    <Building className={fallbackIconClasses} style={isCustomSize ? customIconStyles : {}} />
  );

  const renderImage = () => (
    <img
      key={imageUrl}
      src={imageUrl || ""}
      alt={displayName || "Organization Logo"}
      className={imgClasses}
      onError={() => setHasError(true)}
    />
  );

  return (
    <div
      className={containerClasses}
      style={isCustomSize ? customContainerStyles : {}}
      role="img"
      aria-label={`${displayName || "Organization"} logo container`}
    >
      {imageUrl && !hasError ? renderImage() : renderFallback()}
      {displayName && (
        <span
          className="text-xl font-bold pl-2 transition-opacity duration-200 ease-out"
          style={{ opacity: nameDisplayOpacity }}
        >
          <div
            className="text-xl font-bold pr-2 transition-opacity duration-200 ease-out"
            style={{ opacity: nameDisplayOpacity }}
          >
            {" "}
            {displayName}
          </div>
        </span>
      )}
    </div>
  );
}
