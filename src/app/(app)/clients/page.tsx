// --- CAMBIOS PARA CLIENTES ---

import { getClients } from "@/actions/clients/manage-clients";
import ClientComponent from "./ClientComponent";

export default async function ClientsPage() {
  const initialClientsData = await getClients();
  return <ClientComponent initialData={initialClientsData ?? []} />;
}
