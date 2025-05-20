import { getPettyCashData } from "@/actions/get-petty-cash-data";
import {
    createPettyCashDeposit,
    createPettyCashWithdrawal,
    createPettyCashSpendWithTicket,
} from "@/actions";
import PettyCashClientPage from "./PettyCashClientPage";
import prisma from "@/lib/prisma";
import type { Branch } from "@prisma/client";
import { auth } from "@/auth";
import { headers } from "next/headers";

// Mock data para Users (mantener o reemplazar con datos reales de BD si es necesario)
interface User {
    id: string;
    name: string;
    role: string;
}
// MOCK_BRANCHES será reemplazado
const MOCK_USERS: User[] = [
    { id: "user1", name: "Damian", role: "admin" },
    { id: "user2", name: "Pepe", role: "user" },
    { id: "user3", name: "Javi", role: "user" },
];

async function getBranchesForOrganization(organizationId: string): Promise<Branch[]> {
    try {
        const branches = await prisma.branch.findMany({
            where: { organizationId },
            orderBy: { order: "asc" },
        });
        return branches;
    } catch (error) {
        console.error("Error fetching branches for organization:", error);
        return [];
    }
}

export default async function PettyCashPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    const organizationId = session?.user?.organizationId;

    if (!organizationId) {
        return <p className="p-4 text-red-600">Error: Usuario no autenticado o sin organización.</p>;
    }

    const { data: pettyCashData, error: pettyCashError } = await getPettyCashData(); // Potentially pass organizationId and selectedBranchId here later

    if (pettyCashError) {
        return <p className="p-4 text-red-600">Error al cargar datos de caja chica: {pettyCashError}</p>;
    }

    const branches = await getBranchesForOrganization(organizationId);
    const users = MOCK_USERS; // Mantener mock users por ahora

    return (
        <PettyCashClientPage
            initialPettyCashData={pettyCashData || []}
            branches={branches} // Pasar branches reales
            users={users}
            createDepositAction={createPettyCashDeposit}
            createWithdrawalAction={createPettyCashWithdrawal}
            createSpendAction={createPettyCashSpendWithTicket}
        />
    );
}