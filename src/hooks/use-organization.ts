"use client";

import { getOrganizationIdFromSession } from "@/actions/get-Organization-Id-From-Session";
import { getOrganizationDetailsById } from "@/actions";
import type { Organization } from "@prisma/client";
import { useEffect, useState } from "react";

interface UseOrganizationReturn {
  organization: Organization | null;
  loading: boolean;
  error: Error | null;
}

export function useOrganization(): UseOrganizationReturn {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchOrganizationData = async () => {
      try {
        setLoading(true);
        setError(null);

        const sessionData = await getOrganizationIdFromSession();

        if (!mounted) return;

        if (sessionData.error || !sessionData.organizationId) {
          throw new Error(sessionData.error || "No organizationId found in session");
        }

        const orgDetails = await getOrganizationDetailsById(sessionData.organizationId);

        if (!mounted) return;

        if (!orgDetails) {
          throw new Error(`Organization details not found for ID: ${sessionData.organizationId}`);
        }

        setOrganization(orgDetails);
      } catch (err) {
        if (!mounted) return;
        console.error("Error fetching organization data:", err);
        setError(
          err instanceof Error ? err : new Error("Unknown error fetching organization data"),
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchOrganizationData();

    return () => {
      mounted = false;
    };
  }, []);

  return { organization, loading, error };
}
