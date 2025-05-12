"use client";

import { useState, useEffect } from "react";
import ManageBrands from "./ManageBrands";
import type { OrganizationBrandDisplayData } from "./Interfaces";

interface ClientManageBrandsProps {
    initialOrganizationBrands: OrganizationBrandDisplayData[];
    organizationId: string | null | undefined;
}

export default function ClientManageBrands({
    initialOrganizationBrands,
    organizationId,
}: ClientManageBrandsProps) {
    // Use state to ensure the component only renders on the client
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Return null during SSR to prevent hydration issues
    if (!isMounted) {
        return null;
    }

    // Only render on the client side
    return (
        <ManageBrands
            initialOrganizationBrands={initialOrganizationBrands}
            organizationId={organizationId}
        />
    );
} 