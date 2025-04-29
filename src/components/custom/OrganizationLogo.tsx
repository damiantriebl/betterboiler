'use client';

import { Building } from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";

interface OrganizationLogoProps {
    logo?: string | null;
    name?: string | null;
    thumbnail?: string | null;
    size?: 'sm' | 'default' | 'lg';
    variant?: 'default' | 'bare';
}

// Cache para URLs ya obtenidas
const urlCache = new Map<string, string>();

// Function to build the final image URL
async function getLogoUrl(input: string): Promise<string> {
    if (!input) throw new Error("No logo provided");

    // Check cache first
    if (urlCache.has(input)) {
        console.log('📎 Using cached URL for:', input);
        return urlCache.get(input)!;
    }

    // If input is already a full URL, return it
    if (input.startsWith("http://") || input.startsWith("https://")) {
        console.log('📎 Using direct URL:', input);
        urlCache.set(input, input);
        return input;
    }

    // Otherwise treat input as S3 key: fetch a signed URL
    console.log('🔐 Requesting signed URL for key:', input);
    const res = await fetch(`/api/s3/get-signed-url?name=${encodeURIComponent(input)}&operation=get`);
    console.log('📡 API response:', res.status, res.statusText);
    const data = await res.json();

    if (res.ok && data.success?.url) {
        console.log('✅ Obtained signed URL:', data.success.url);
        urlCache.set(input, data.success.url);
        return data.success.url;
    }
    throw new Error(data.failure || 'Failed to get signed URL');
}

export function OrganizationLogo({ logo, name, thumbnail, size = 'default', variant = 'default' }: OrganizationLogoProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Clases dinámicas basadas en props
    const containerClasses = useMemo(() => cn(
        "relative rounded-lg overflow-hidden flex items-center justify-center transition-all duration-300",
        {
            "w-10 h-10": size === 'sm',
            "w-32 h-32": size === 'default',
            "w-40 h-40": size === 'lg'
        },
        variant === 'default' && "bg-muted shadow-md",
        variant === 'bare' && "bg-transparent shadow-none"
    ), [size, variant]);

    const fallbackIconClasses = useMemo(() => cn(
        "text-muted-foreground transition-all duration-300",
        {
            "w-6 h-6": size === 'sm',
            "w-16 h-16": size === 'default',
            "w-24 h-24": size === 'lg'
        }
    ), [size]);

    const imageClasses = useMemo(() => cn(
        "w-full h-full object-contain transition-all duration-300",
        size === 'sm' ? "p-1" : variant === 'bare' ? 'p-0' : 'p-2'
    ), [size, variant]);

    const fetchLogoUrl = useCallback(async (logoKey: string) => {
        if (isLoading) return;

        setIsLoading(true);
        try {
            const url = await getLogoUrl(logoKey);
            setImageUrl(url);
            setHasError(false);
        } catch (error) {
            console.error('❌ Error obtaining logo URL:', error);
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!logo) {
            setHasError(true);
            setImageUrl(null);
            return;
        }

        fetchLogoUrl(logo);
    }, [logo, fetchLogoUrl]);

    if (!logo || hasError || !imageUrl) {
        return (
            <div className={containerClasses} tabIndex={0} aria-label={`${name || 'Organization'} logo placeholder`}>
                <Building className={fallbackIconClasses} />
            </div>
        );
    }

    return (
        <div className={containerClasses}>
            <img
                src={imageUrl}
                alt={name || "Organization Logo"}
                className={imageClasses}
                onError={() => setHasError(true)}
            />
        </div>
    );
}
