"use client";

import { useEffect, useState } from "react";

interface SimpleClientWrapperProps {
    children: React.ReactNode;
}

export default function SimpleClientWrapper({ children }: SimpleClientWrapperProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    return <>{children}</>;
} 