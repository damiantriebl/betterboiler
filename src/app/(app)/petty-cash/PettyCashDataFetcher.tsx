import { getPettyCashData } from "@/actions/petty-cash/get-petty-cash-data";
import {
    createPettyCashDeposit,
    createPettyCashWithdrawal,
    createPettyCashSpendWithTicket,
} from "@/actions";
import PettyCashClientPage from "./PettyCashClientPage";
import type { Branch } from "@prisma/client";
import { getSessionDetails } from "@/actions/getSessionDetails";
import { getBranchesForOrganizationAction } from "@/actions/get-Branches-For-Organization-Action";
import { getUsersForOrganizationAction } from "@/actions/get-Users-For-Organization-Action";

// La definición del tipo User se puede mover a un archivo global /types/User.ts
// y ser importada tanto aquí como en getUsersForOrganizationAction.ts y en PettyCashClientPage.tsx
// para asegurar consistencia.
interface User {
    id: string;
    name: string;
    role: string;
}

export default async function PettyCashDataFetcher() {
    const sessionDetails = await getSessionDetails();

    if (sessionDetails.error || !sessionDetails.organizationId) {
        return <p className="p-4 text-red-600">Error: {sessionDetails.error || "Usuario no autenticado o sin organización."}</p>;
    }

    const organizationId = sessionDetails.organizationId;

    const { data: pettyCashData, error: pettyCashError } = await getPettyCashData();

    if (pettyCashError) {
        return <p className="p-4 text-red-600">Error al cargar datos de caja chica: {pettyCashError}</p>;
    }

    const branches: Branch[] = await getBranchesForOrganizationAction(organizationId);
    const users: User[] = await getUsersForOrganizationAction(organizationId);

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