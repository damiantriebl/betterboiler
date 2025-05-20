"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionStore } from "@/stores/SessionStore";
import React, { useState, useEffect, useMemo } from "react";
import type { Branch as PrismaBranch, PettyCashDeposit, PettyCashWithdrawal, PettyCashSpend } from "@prisma/client";
import { useToast } from "@/hooks/use-toast";

import BalanceCard from "./BalanceCard";
import DepositForm from "./DepositForm";
import WithdrawForm from "./WithdrawForm";
import SpendForm from "./SpendForm";
import PettyCashTable from "./PettyCashTable";

import type { PettyCashData } from "@/actions/get-petty-cash-data";
import type {
    createPettyCashDeposit,
    createPettyCashWithdrawal,
} from "@/actions";

const GENERAL_ACCOUNT_VALUE = "__general__";

interface User { id: string; name: string; role: string; }

interface PettyCashClientPageProps {
    initialPettyCashData: PettyCashData[];
    branches: PrismaBranch[];
    users: User[];
    createDepositAction: typeof createPettyCashDeposit;
    createWithdrawalAction: typeof createPettyCashWithdrawal;
}

export default function PettyCashClientPage({
    initialPettyCashData,
    branches,
    users,
    createDepositAction,
    createWithdrawalAction,
}: PettyCashClientPageProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const [showDepositForm, setShowDepositForm] = useState(false);
    const [showWithdrawFormForDeposit, setShowWithdrawFormForDeposit] = useState<string | null>(null);
    const [showSpendFormForWithdrawal, setShowSpendFormForWithdrawal] = useState<string | null>(null);

    const [selectedBranchId, setSelectedBranchId] = useState<number | typeof GENERAL_ACCOUNT_VALUE>(GENERAL_ACCOUNT_VALUE);
    const userRole = useSessionStore((state) => state.userRole || "user");
    const currentUserId = useSessionStore((state) => state.userId);
    const organizationIdFromStore = useSessionStore((state) => state.organizationId);

    const filteredPettyCashData = useMemo(() => {
        if (!initialPettyCashData) return [];
        if (selectedBranchId === GENERAL_ACCOUNT_VALUE) {
            return initialPettyCashData.filter(deposit => deposit.branchId === null);
        }
        return initialPettyCashData.filter(deposit => deposit.branchId === selectedBranchId);
    }, [initialPettyCashData, selectedBranchId]);

    const calculateTotalAvailable = (deposits: PettyCashData[]) => {
        return deposits.reduce((acc, deposit) => {
            if (deposit.status !== "OPEN") return acc;
            const totalWithdrawn = deposit.withdrawals.reduce((sum, withdrawal) => sum + withdrawal.amountGiven, 0);
            return acc + (deposit.amount - totalWithdrawn);
        }, 0);
    };

    const handleCloseForms = () => {
        setShowDepositForm(false);
        setShowWithdrawFormForDeposit(null);
        setShowSpendFormForWithdrawal(null);
    };

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <header className="mb-6 md:mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white">Caja Chica (Jerárquica)</h1>
                <p className="text-md text-gray-600 dark:text-gray-300">Gestión de depósitos, retiros y gastos.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 md:mb-8 items-start">
                <div className="md:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <BalanceCard totalBalance={calculateTotalAvailable(filteredPettyCashData)} />
                </div>
                <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">Controles Principales</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Select
                            value={selectedBranchId === GENERAL_ACCOUNT_VALUE ? GENERAL_ACCOUNT_VALUE : selectedBranchId?.toString()}
                            onValueChange={(value) => {
                                if (value === GENERAL_ACCOUNT_VALUE) {
                                    setSelectedBranchId(GENERAL_ACCOUNT_VALUE);
                                } else {
                                    setSelectedBranchId(Number(value));
                                }
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar Caja" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={GENERAL_ACCOUNT_VALUE}>Cuenta General</SelectItem>
                                {branches.map(branch => (
                                    <SelectItem key={branch.id} value={branch.id.toString()}>{branch.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={() => setShowDepositForm(true)} className="w-full" disabled={isLoading || !organizationIdFromStore}>
                            Nuevo Depósito
                        </Button>
                    </div>
                </div>
            </div>

            {showDepositForm && organizationIdFromStore && (
                <DepositForm
                    onSubmitAction={createDepositAction}
                    onClose={handleCloseForms}
                    organizationId={organizationIdFromStore}
                    branches={branches}
                />
            )}
            {showWithdrawFormForDeposit && organizationIdFromStore && (
                <WithdrawForm
                    depositId={showWithdrawFormForDeposit}
                    onSubmitAction={createWithdrawalAction}
                    onClose={handleCloseForms}
                    users={users}
                    organizationId={organizationIdFromStore}
                />
            )}
            {showSpendFormForWithdrawal && organizationIdFromStore && (
                <SpendForm
                    withdrawalId={showSpendFormForWithdrawal}
                    onClose={handleCloseForms}
                    organizationId={organizationIdFromStore}
                />
            )}

            <PettyCashTable
                deposits={filteredPettyCashData}
                users={users}
                userRole={userRole}
                currentUserId={currentUserId}
                onAddWithdrawal={(depositId) => setShowWithdrawFormForDeposit(depositId)}
                onAddSpend={(withdrawalId) => setShowSpendFormForWithdrawal(withdrawalId)}
            />

            {isLoading && <p className="text-center mt-4 font-semibold animate-pulse">Procesando...</p>}
        </div>
    );
} 