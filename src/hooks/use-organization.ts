"use client";

import { useEffect, useState } from "react";
import { Organization } from "@prisma/client";
import { getOrganization } from "@/actions/get-organization";

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

    const fetchOrganization = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getOrganization();
        
        if (!mounted) return;

        if (!data) {
          throw new Error("No organization found");
        }
        
        setOrganization(data);
      } catch (err) {
        if (!mounted) return;
        console.error("Error fetching organization:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchOrganization();

    return () => {
      mounted = false;
    };
  }, []);

  return { organization, loading, error };
} 