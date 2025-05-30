import {
  createPettyCashDeposit,
  createPettyCashSpendWithTicket,
  createPettyCashWithdrawal,
} from "@/actions";
import { getPettyCashData } from "@/actions/petty-cash/get-petty-cash-data";
import {
  getBranchesForOrganizationAction,
  getOrganizationIdFromSession,
  getUsersForOrganizationAction,
} from "@/actions/util";
import type { Branch } from "@prisma/client";
import PettyCashClientPage from "./PettyCashClientPage";

// Importar el tipo correcto desde util
import type { OrganizationUser } from "@/actions/util";

export default async function PettyCashDataFetcher() {
  const org = await getOrganizationIdFromSession();

  if (org.error || !org.organizationId) {
    return (
      <p className="p-4 text-red-600">
        Error: {org.error || "Usuario no autenticado o sin organización."}
      </p>
    );
  }

  const organizationId = org.organizationId;

  const { data: pettyCashData, error: pettyCashError } = await getPettyCashData();

  if (pettyCashError) {
    return (
      <p className="p-4 text-red-600">Error al cargar datos de caja chica: {pettyCashError}</p>
    );
  }

  const branches: Branch[] = await getBranchesForOrganizationAction(organizationId);
  const organizationUsers: OrganizationUser[] = await getUsersForOrganizationAction(organizationId);

  // Convertir OrganizationUser a User para compatibilidad con el componente
  const users = organizationUsers.map((user) => ({
    id: user.id,
    name: user.name || "Sin nombre", // Manejar el caso null
    role: user.role || "user",
  }));

  return (
    <PettyCashClientPage
      initialPettyCashData={pettyCashData || []}
      branches={branches}
      users={users}
      createDepositAction={createPettyCashDeposit}
      createWithdrawalAction={createPettyCashWithdrawal}
      createSpendWithTicketAction={createPettyCashSpendWithTicket}
    />
  );
}
