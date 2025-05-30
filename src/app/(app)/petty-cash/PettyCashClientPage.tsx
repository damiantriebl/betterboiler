"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSessionStore } from "@/stores/SessionStore";
import type {
  PettyCashDeposit,
  PettyCashSpend,
  PettyCashWithdrawal,
  Branch as PrismaBranch,
} from "@prisma/client";
import React, { useState, useEffect } from "react";

import BalanceCard from "./BalanceCard";
import DepositForm from "./DepositForm";
import OtpConfirmationModal from "./OtpConfirmationModal";
import PettyCashTable from "./PettyCashTable";
import SpendForm from "./SpendForm";
import WithdrawForm from "./WithdrawForm";

import {
  type createPettyCashDeposit,
  type createPettyCashWithdrawal,
  deletePettyCashDeposit,
  deletePettyCashMovement,
  deletePettyCashWithdrawal,
} from "@/actions";
import { getSecuritySettings } from "@/actions/configuration/security-actions";
import type { PettyCashData } from "@/actions/petty-cash/get-petty-cash-data";

const GENERAL_ACCOUNT_VALUE = "__general__";

interface User {
  id: string;
  name: string;
  role: string;
}

interface PettyCashClientPageProps {
  initialPettyCashData: PettyCashData[];
  branches: PrismaBranch[];
  users: User[];
  createDepositAction: typeof createPettyCashDeposit;
  createWithdrawalAction: typeof createPettyCashWithdrawal;
  createSpendWithTicketAction: typeof createPettyCashDeposit;
}

type ItemToDelete = {
  id: string;
  type: "deposit" | "withdrawal" | "spend";
  name?: string;
};

interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

export default function PettyCashClientPage({
  initialPettyCashData,
  branches,
  users,
  createDepositAction,
  createWithdrawalAction,
  createSpendWithTicketAction,
}: PettyCashClientPageProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showWithdrawFormForDeposit, setShowWithdrawFormForDeposit] = useState<string | null>(null);
  const [showSpendFormForWithdrawal, setShowSpendFormForWithdrawal] = useState<string | null>(null);

  const [selectedBranchId, setSelectedBranchId] = useState<number | typeof GENERAL_ACCOUNT_VALUE>(
    GENERAL_ACCOUNT_VALUE,
  );
  const userRole = useSessionStore((state) => state.userRole || "user");
  const currentUserId = useSessionStore((state) => state.userId);
  const organizationIdFromStore = useSessionStore((state) => state.organizationId);

  const [pettyCashDataState, setPettyCashDataState] =
    useState<PettyCashData[]>(initialPettyCashData);

  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ItemToDelete | null>(null);

  useEffect(() => {
    setPettyCashDataState(initialPettyCashData);
  }, [initialPettyCashData]);

  // Filtrar datos sin useMemo (React 19 optimiza automáticamente)
  const filteredPettyCashData = (() => {
    if (!pettyCashDataState) return [];
    if (selectedBranchId === GENERAL_ACCOUNT_VALUE) {
      return pettyCashDataState.filter((deposit) => deposit.branchId === null);
    }
    return pettyCashDataState.filter((deposit) => deposit.branchId === selectedBranchId);
  })();

  const calculateTotalAvailable = (deposits: PettyCashData[]) => {
    return deposits.reduce((acc, deposit) => {
      if (deposit.status !== "OPEN") return acc;
      const totalWithdrawn = deposit.withdrawals.reduce(
        (sum, withdrawal) => sum + withdrawal.amountGiven,
        0,
      );
      return acc + (deposit.amount - totalWithdrawn);
    }, 0);
  };

  const handleCloseForms = () => {
    setShowDepositForm(false);
    setShowWithdrawFormForDeposit(null);
    setShowSpendFormForWithdrawal(null);
  };

  const refreshData = async () => {
    console.log("Simulando recarga de datos...");
  };

  const handleInitiateDelete = async (id: string, type: ItemToDelete["type"], name?: string) => {
    try {
      // Primero, verificar el rol del usuario
      const allowedRolesToDelete = ["cash-manager", "admin", "root"];
      if (!userRole || !allowedRolesToDelete.includes(userRole)) {
        toast({
          variant: "destructive",
          title: "Acceso denegado",
          description: "No tienes permiso para eliminar ítems.",
        });
        setItemToDelete(null);
        return;
      }

      // Si el rol es permitido, continuar con la lógica de OTP/confirmación
      setItemToDelete({ id, type, name: name || `el ${type} seleccionado` });

      const securitySettings = await getSecuritySettings();
      if (securitySettings.error) {
        toast({
          variant: "destructive",
          title: "Error de seguridad",
          description: securitySettings.error,
        });
        setItemToDelete(null);
        return;
      }

      // Si el modo seguro de la organización está activo, siempre pedir OTP a roles permitidos
      if (securitySettings.secureModeEnabled) {
        setIsOtpModalOpen(true);
      } else {
        // Modo seguro no activo, usar confirmación simple
        if (
          window.confirm(
            `¿Estás seguro de que quieres eliminar ${name || `el ${type} seleccionado`}? Esta acción no se puede deshacer.`,
          )
        ) {
          // setIsProcessingDelete(true); // performDelete se encarga de esto
          await performDelete(id, type);
        } else {
          setItemToDelete(null);
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo verificar la configuración de seguridad o procesar la solicitud.",
      });
      setItemToDelete(null);
    }
  };

  const performDelete = async (id: string, type: ItemToDelete["type"], otpToken?: string) => {
    setIsProcessingDelete(true);
    try {
      let result: ActionResult | undefined;
      switch (type) {
        case "spend":
          result = await deletePettyCashMovement({ movementId: id, otpToken });
          break;
        case "withdrawal":
          result = await deletePettyCashWithdrawal({ withdrawalId: id, otpToken });
          break;
        case "deposit":
          result = await deletePettyCashDeposit({ depositId: id, otpToken });
          break;
        default:
          throw new Error("Tipo de ítem desconocido para eliminar");
      }

      if (result.success) {
        toast({
          title: "Éxito",
          description:
            result.message ||
            `${type.charAt(0).toUpperCase() + type.slice(1)} eliminado correctamente.`,
        });
        await refreshData();
      } else {
        toast({
          variant: "destructive",
          title: "Error al eliminar",
          description: result.error || "Ocurrió un error desconocido.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Error eliminando el ítem.",
      });
    } finally {
      setIsProcessingDelete(false);
      setIsOtpModalOpen(false);
      setItemToDelete(null);
    }
  };

  const handleConfirmDeleteWithOtp = async (otpToken: string) => {
    if (itemToDelete) {
      await performDelete(itemToDelete.id, itemToDelete.type, otpToken);
    }
  };

  const handleCloseOtpModal = () => {
    setIsOtpModalOpen(false);
    if (!isProcessingDelete) {
      setItemToDelete(null);
    }
  };

  return (
    <div className="container max-w-none p-4 ">
      <header className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white">
          Caja Chica (Jerárquica)
        </h1>
        <p className="text-md text-gray-600 dark:text-gray-300">
          Gestión de depósitos, retiros y gastos.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 md:mb-8 items-start">
        <div className="md:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <BalanceCard totalBalance={calculateTotalAvailable(filteredPettyCashData)} />
        </div>
        <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">
            Controles Principales
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              value={
                selectedBranchId === GENERAL_ACCOUNT_VALUE
                  ? GENERAL_ACCOUNT_VALUE
                  : selectedBranchId?.toString()
              }
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
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setShowDepositForm(true)}
              className="w-full"
              disabled={isLoading || !organizationIdFromStore}
            >
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
        onDeleteSpend={(spendId) => handleInitiateDelete(spendId, "spend", "este gasto")}
        onDeleteWithdrawal={(withdrawalId) =>
          handleInitiateDelete(withdrawalId, "withdrawal", "este retiro")
        }
        onDeleteDeposit={(depositId) => handleInitiateDelete(depositId, "deposit", "este depósito")}
      />

      {isOtpModalOpen && itemToDelete && (
        <OtpConfirmationModal
          isOpen={isOtpModalOpen}
          onClose={handleCloseOtpModal}
          onConfirm={handleConfirmDeleteWithOtp}
          isSubmitting={isProcessingDelete}
          itemName={itemToDelete.name}
        />
      )}

      {(isLoading || isProcessingDelete) && (
        <p className="text-center mt-4 font-semibold animate-pulse">Procesando...</p>
      )}
    </div>
  );
}
