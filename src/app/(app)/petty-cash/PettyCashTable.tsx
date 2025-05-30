"use client";
import type { PettyCashData } from "@/actions/petty-cash/get-petty-cash-data"; // Tipos de datos jerárquicos
import type { PettyCashDepositStatus, PettyCashWithdrawalStatus } from "@prisma/client"; // Para los enums de estado
import React, { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronDown,
  ChevronRight,
  Landmark,
  Paperclip,
  PlusCircle,
  ShoppingCart,
  Trash2,
  Users,
} from "lucide-react";

// Definición local para UserData si no se importa una específica
interface UserEntryData {
  id: string;
  name: string;
}

// Helper para formatear moneda
const formatCurrency = (amount: number) => {
  return `$${amount.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Helper para formatear fecha
const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// CAMBIO: usa UserEntryData
const getUserNameById = (userId: string, users: UserEntryData[]): string => {
  const user = users.find((u) => u.id === userId);
  return user ? user.name : "Usuario Desconocido";
};

interface PettyCashTableProps {
  deposits: PettyCashData[];
  users: UserEntryData[]; // CAMBIO: usa UserEntryData
  onAddWithdrawal: (depositId: string) => void;
  onAddSpend: (withdrawalId: string) => void;
  onDeleteSpend: (spendId: string) => void; // Nueva prop para manejar el borrado de gastos
  onDeleteWithdrawal: (withdrawalId: string) => void; // Nueva prop
  onDeleteDeposit: (depositId: string) => void; // Nueva prop
  userRole?: string;
  currentUserId?: string | null;
}

const PettyCashTable = ({
  deposits,
  users,
  onAddWithdrawal,
  onAddSpend,
  onDeleteSpend,
  onDeleteWithdrawal,
  onDeleteDeposit,
}: PettyCashTableProps) => {
  if (!deposits || deposits.length === 0) {
    return (
      <div className="mt-6 border rounded-lg p-8 text-center">
        <Landmark className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
        <h3 className="mt-2 text-lg font-medium text-gray-700 dark:text-gray-200">
          Sin Depósitos de Caja Chica
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Aún no se han registrado depósitos.
        </p>
        {/* Botón para crear el primer depósito podría ir aquí, manejado por la página cliente */}
      </div>
    );
  }

  return (
    <div className="w-full rounded-md border mt-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Fecha</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Referencia</TableHead>
            <TableHead className="text-right">Depositado</TableHead>
            <TableHead className="text-center">Estado</TableHead>
            <TableHead className="text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deposits.map((deposit) => (
            <DepositEntry
              key={deposit.id}
              deposit={deposit}
              users={users}
              onAddWithdrawal={onAddWithdrawal}
              onAddSpend={onAddSpend}
              onDeleteSpend={onDeleteSpend}
              onDeleteWithdrawal={onDeleteWithdrawal}
              onDeleteDeposit={onDeleteDeposit}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

interface DepositEntryProps {
  deposit: PettyCashData;
  users: UserEntryData[]; // CAMBIO: usa UserEntryData
  onAddWithdrawal: (depositId: string) => void;
  onAddSpend: (withdrawalId: string) => void;
  onDeleteSpend: (spendId: string) => void; // Nueva prop
  onDeleteWithdrawal: (withdrawalId: string) => void;
  onDeleteDeposit: (depositId: string) => void;
}

const DepositEntry = ({
  deposit,
  users,
  onAddWithdrawal,
  onAddSpend,
  onDeleteSpend,
  onDeleteWithdrawal,
  onDeleteDeposit,
}: DepositEntryProps) => {
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  const getDepositStatusBadge = (status: PettyCashDepositStatus) => {
    switch (status) {
      case "OPEN":
        return <Badge className="bg-blue-100 text-blue-700">Abierto</Badge>;
      case "CLOSED":
        return (
          <Badge variant="destructive" className="bg-gray-100 text-gray-700">
            Cerrado
          </Badge>
        );
      case "PENDING_FUNDING":
        return <Badge className="bg-yellow-100 text-yellow-700">Pendiente Fondos</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <>
      <TableRow className="bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
        <TableCell className="px-2 py-2">
          <Button
            variant="ghost"
            size="sm"
            className={`w-9 p-0 ${isDepositOpen ? "bg-slate-200 dark:bg-slate-600" : ""}`}
            onClick={() => setIsDepositOpen(!isDepositOpen)}
            aria-expanded={isDepositOpen}
          >
            {isDepositOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="sr-only">{isDepositOpen ? "Colapsar" : "Expandir"}</span>
          </Button>
        </TableCell>
        <TableCell>{formatDate(deposit.date)}</TableCell>
        <TableCell className="font-medium">{deposit.description}</TableCell>
        <TableCell className="text-xs text-gray-500 dark:text-gray-400">
          {deposit.reference || "N/A"}
        </TableCell>
        <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
          {formatCurrency(deposit.amount)}
        </TableCell>
        <TableCell className="text-center">{getDepositStatusBadge(deposit.status)}</TableCell>
        <TableCell className="text-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddWithdrawal(deposit.id)}
            disabled={deposit.status !== "OPEN"}
            className="text-xs"
          >
            <Users className="mr-1 h-3 w-3" /> Retiro
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => onDeleteDeposit(deposit.id)}
            className="bg-destructive hover:bg-pink-600 text-white text-xs px-2 py-1 h-auto"
          >
            <Trash2 className="mr-1 h-3 w-3" /> Borrar
          </Button>
        </TableCell>
      </TableRow>

      {isDepositOpen && (
        <TableRow className="bg-white dark:bg-gray-850">
          <TableCell colSpan={7} className="p-0">
            {deposit.withdrawals && deposit.withdrawals.length > 0 ? (
              <div className="pl-10 pr-4 py-2">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs bg-slate-100 dark:bg-slate-750">
                      <TableHead className="w-8" />
                      <TableHead>Fecha Ret.</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead>Desc. Retiro</TableHead>
                      <TableHead className="text-right">Entregado</TableHead>
                      <TableHead className="text-right">Justificado</TableHead>
                      <TableHead className="text-center">Estado Ret.</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deposit.withdrawals.map((withdrawal) => (
                      <WithdrawalEntry
                        key={withdrawal.id}
                        withdrawal={withdrawal}
                        users={users}
                        onAddSpend={onAddSpend}
                        onDeleteSpend={onDeleteSpend}
                        onDeleteWithdrawal={onDeleteWithdrawal}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="pl-10 pr-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                Este depósito aún no tiene retiros asociados.
              </div>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

interface WithdrawalEntryProps {
  withdrawal: PettyCashData["withdrawals"][number];
  users: UserEntryData[];
  onAddSpend: (withdrawalId: string) => void;
  onDeleteSpend: (spendId: string) => void;
  onDeleteWithdrawal: (withdrawalId: string) => void;
}

const WithdrawalEntry = ({
  withdrawal,
  users,
  onAddSpend,
  onDeleteSpend,
  onDeleteWithdrawal,
}: WithdrawalEntryProps) => {
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);

  const getWithdrawalStatusBadge = (status: PettyCashWithdrawalStatus) => {
    switch (status) {
      case "PENDING_JUSTIFICATION":
        return <Badge className="bg-amber-100 text-amber-700">Pend. Justif.</Badge>;
      case "PARTIALLY_JUSTIFIED":
        return <Badge className="bg-sky-100 text-sky-700">Parc. Justif.</Badge>;
      case "JUSTIFIED":
        return <Badge className="bg-emerald-100 text-emerald-700">Justificado</Badge>;
      case "NOT_CLOSED":
        return <Badge className="bg-rose-100 text-rose-700">No Cerrado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <>
      <TableRow className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm">
        <TableCell className="px-1 py-1">
          <Button
            variant="ghost"
            size="sm"
            className={`w-7 p-0 ${isWithdrawalOpen ? "bg-slate-200 dark:bg-slate-600" : ""}`}
            onClick={() => setIsWithdrawalOpen(!isWithdrawalOpen)}
            aria-expanded={isWithdrawalOpen}
          >
            {isWithdrawalOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span className="sr-only">{isWithdrawalOpen ? "Colapsar" : "Expandir"}</span>
          </Button>
        </TableCell>
        <TableCell>{formatDate(withdrawal.date)}</TableCell>
        <TableCell>{getUserNameById(withdrawal.userId, users)}</TableCell>
        <TableCell className="text-xs">-</TableCell>
        <TableCell className="text-right font-medium text-orange-600 dark:text-orange-400">
          {formatCurrency(withdrawal.amountGiven)}
        </TableCell>
        <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
          {formatCurrency(withdrawal.amountJustified)}
        </TableCell>
        <TableCell className="text-center">{getWithdrawalStatusBadge(withdrawal.status)}</TableCell>
        <TableCell className="text-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddSpend(withdrawal.id)}
            disabled={withdrawal.status === "JUSTIFIED"}
            className="text-xs"
          >
            <ShoppingCart className="mr-1 h-3 w-3" /> Gasto
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => onDeleteWithdrawal(withdrawal.id)}
            className="bg-destructive hover:bg-pink-600 text-white text-xs px-2 py-1 h-auto"
          >
            <Trash2 className="mr-1 h-3 w-3" /> Borrar
          </Button>
        </TableCell>
      </TableRow>

      {isWithdrawalOpen && (
        <TableRow className="bg-white dark:bg-gray-850">
          <TableCell colSpan={8} className="p-0">
            {" "}
            {/* 8 columns for withdrawal's content */}
            {withdrawal.spends && withdrawal.spends.length > 0 ? (
              <div className="pl-10 pr-4 py-2">
                {" "}
                {/* Indentation for spends table */}
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs bg-slate-50 dark:bg-slate-800">
                      <TableHead>Fecha Gasto</TableHead>
                      <TableHead>Descripción Gasto</TableHead>
                      <TableHead className="text-right">Monto Gasto</TableHead>
                      <TableHead>Comprobante</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>{" "}
                      {/* Nueva columna Acciones */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawal.spends.map((spend) => (
                      <SpendEntry key={spend.id} spend={spend} onDelete={onDeleteSpend} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="pl-10 pr-4 py-3 text-center text-xs text-gray-500 dark:text-gray-400">
                Este retiro aún no tiene gastos asociados.
              </div>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

interface SpendEntryProps {
  spend: PettyCashData["withdrawals"][number]["spends"][number];
  onDelete: (spendId: string) => void;
}
const SpendEntry = ({ spend, onDelete }: SpendEntryProps) => {
  return (
    <TableRow className="text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
      <TableCell>{formatDate(spend.date)}</TableCell>
      <TableCell>{spend.description}</TableCell>
      <TableCell className="text-right font-medium">{formatCurrency(spend.amount)}</TableCell>
      <TableCell>
        {spend.ticketUrl ? (
          <a
            href={spend.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 hover:underline flex items-center"
          >
            <Paperclip className="mr-1 h-3 w-3" /> Ver
          </a>
        ) : (
          <span className="text-gray-400">N/A</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        <Button
          variant="default"
          size="sm"
          onClick={() => onDelete(spend.id)}
          className="bg-destructive hover:bg-pink-600 text-white text-xs px-2 py-1 h-auto"
          aria-label={`Borrar gasto ${spend.description || spend.id}`}
        >
          <Trash2 className="mr-1 h-3 w-3" /> Borrar
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default PettyCashTable;
