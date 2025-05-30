"use client";

import { getOrganizationDetailsById, getOrganizationIdFromSession } from "@/actions/util";
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

        if (!sessionData) {
          throw new Error("No se pudo obtener los datos de la sesión");
        }

        if (sessionData.error) {
          throw new Error(sessionData.error);
        }

        if (!sessionData.organizationId) {
          throw new Error("No se encontró ID de organización en la sesión");
        }

        const orgDetails = await getOrganizationDetailsById(sessionData.organizationId);

        if (!mounted) return;

        if (!orgDetails) {
          throw new Error(
            `No se encontraron detalles de la organización para ID: ${sessionData.organizationId}`,
          );
        }

        setOrganization(orgDetails);
      } catch (err) {
        if (!mounted) return;
        console.error("Error fetching organization data:", err);
        setError(
          err instanceof Error
            ? err
            : new Error("Error desconocido al obtener datos de la organización"),
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
