// --- CAMBIOS PARA CLIENTES ---

import { getClients } from "@/actions/clients/manage-clients";
import ClientComponent from "./ClientComponent";

export default async function ClientsPage() {
  const initialClientsData = await getClients();
  const formattedData = (initialClientsData ?? [])
    .map((client) => ({
      ...client,
      lastName: client.lastName ?? undefined,
      companyName: client.companyName ?? undefined,
      phone: client.phone ?? undefined,
      address: client.address ?? undefined,
      vatStatus: client.vatStatus ?? undefined,
      notes: client.notes ?? undefined,
      type: client.type as "Individual" | "LegalEntity",
      status: client.status as "active" | "inactive",
    }))
    .map((client) => ({
      ...client,
      mobile: client.mobile ?? undefined,
    }));
  return <ClientComponent initialData={formattedData} />;
}
