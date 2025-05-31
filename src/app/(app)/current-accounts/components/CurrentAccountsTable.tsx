// app/current-accounts/components/CurrentAccountsTable.tsx
"use client";

import type { CurrentAccountWithDetails } from "@/actions/current-accounts/get-current-accounts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CurrentAccountStatus, Payment, PaymentFrequency } from "@prisma/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowUpDown,
  Bike,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  CreditCard,
  DollarSign,
  FileText,
  RefreshCw,
  User,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";
import AnnulPaymentButton from "./AnnulPaymentButton";
import PaymentModal from "./PaymentModal";

// Función para formatear montos como pesos argentinos (redondeado hacia arriba)
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.ceil(amount));
};

const formatDate = (date: string | Date | null) => {
  if (!date) return "-";
  return format(new Date(date), "dd/MM/yyyy", { locale: es });
};

// Mapa para traducir la frecuencia de pagos
const frequencyMap: Record<string, string> = {
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  QUARTERLY: "Trimestral",
  ANNUALLY: "Anual",
};

// Mapa para determinar el color del estado según su valor
const statusColorMap: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PAID_OFF: "bg-blue-100 text-blue-800",
  OVERDUE: "bg-red-100 text-red-800",
  DEFAULTED: "bg-amber-100 text-amber-800",
  CANCELLED: "bg-gray-100 text-gray-800",
  ANNULLED: "bg-orange-100 text-orange-800",
  PENDING: "bg-purple-100 text-purple-800",
};

// Traducciones para los estados
const statusTranslations: Record<string, string> = {
  ACTIVE: "Activa",
  PAID_OFF: "Pagada",
  OVERDUE: "Vencida",
  DEFAULTED: "Impago",
  CANCELLED: "Cancelada",
  ANNULLED: "Anulada",
  PENDING: "Pendiente",
};

interface CurrentAccountsTableProps {
  accounts: CurrentAccountWithDetails[];
}

type SortConfig = {
  key: keyof CurrentAccountWithDetails | string | null;
  direction: "asc" | "desc" | null;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function CurrentAccountsTable({ accounts }: CurrentAccountsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Estado para el modal de pago
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    accountId: string;
    installmentNumber: number;
    amount: number;
  }>({
    isOpen: false,
    accountId: "",
    installmentNumber: 0,
    amount: 0,
  });

  const [annulledPaymentIdsInSession, setAnnulledPaymentIdsInSession] = useState<Set<string>>(
    new Set(),
  );

  const toggleAccordion = (accountId: string) => {
    setExpandedAccounts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const handlePaymentClick = (
    e: React.MouseEvent,
    accountId: string,
    installmentNumber: number,
    amount: number,
  ) => {
    e.stopPropagation();
    setPaymentModal({
      isOpen: true,
      accountId,
      installmentNumber,
      amount,
    });
  };

  const closePaymentModal = () => {
    setPaymentModal((prev) => ({ ...prev, isOpen: false }));
    handleDataRefresh();
  };

  const handleAnnulmentSuccess = (paymentIdToAnnul: string) => {
    setAnnulledPaymentIdsInSession((prev) => new Set(prev).add(paymentIdToAnnul));
    handleDataRefresh();
  };

  const handleDataRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // Calcular progreso simplificado
  const calculateProgress = (account: CurrentAccountWithDetails) => {
    const payments = account.payments || [];
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
    const totalAmount = account.totalAmount;

    if (totalAmount <= 0) return 100;
    if (account.status === "PAID_OFF") return 100;

    return Math.min(100, Math.round((totalPaid / totalAmount) * 100));
  };

  // Filtrado y sorting
  const filteredAndSortedData = () => {
    let result = [...accounts];

    // Filtrado
    if (searchTerm) {
      result = result.filter(
        (account) =>
          account.client?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.client?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.motorcycle?.model?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.motorcycle?.chassisNumber?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Sorting
    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === "client.firstName") {
          aValue = a.client?.firstName || "";
          bValue = b.client?.firstName || "";
        } else if (sortConfig.key === "totalAmount") {
          aValue = a.totalAmount;
          bValue = b.totalAmount;
        } else if (sortConfig.key === "status") {
          aValue = a.status;
          bValue = b.status;
        } else if (sortConfig.key === "startDate") {
          aValue = a.startDate ? new Date(a.startDate).getTime() : 0;
          bValue = b.startDate ? new Date(b.startDate).getTime() : 0;
        } else {
          aValue = "";
          bValue = "";
        }

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortConfig.direction === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  };

  // Paginación
  const filteredAndSortedResult = filteredAndSortedData();
  const totalPages = Math.ceil(filteredAndSortedResult.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredAndSortedResult.slice(startIndex, startIndex + pageSize);

  const handleSort = (key: keyof CurrentAccountWithDetails | string) => {
    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") direction = "desc";
      else if (sortConfig.direction === "desc") direction = null;
    }
    setSortConfig({ key: direction ? key : null, direction });
    setCurrentPage(1);
  };

  const getSortIcon = (key: keyof CurrentAccountWithDetails | string) => {
    if (sortConfig.key !== key) {
      return <ChevronsUpDown className="ml-2 h-4 w-4 opacity-30" />;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" />
    );
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (size: string) => {
    setPageSize(Number(size));
    setCurrentPage(1);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Buscar cuentas corrientes..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="max-w-sm"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDataRefresh}
              disabled={refreshing}
              className="flex gap-1 items-center"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Actualizando..." : "Actualizar"}
            </Button>
            <span className="text-sm text-muted-foreground">
              {filteredAndSortedResult.length} cuenta
              {filteredAndSortedResult.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Tabla */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]" />
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("client.firstName")}
                    className="h-auto p-0 font-medium"
                  >
                    Cliente
                    {getSortIcon("client.firstName")}
                  </Button>
                </TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("totalAmount")}
                    className="h-auto p-0 font-medium justify-end"
                  >
                    Monto Total
                    {getSortIcon("totalAmount")}
                  </Button>
                </TableHead>
                <TableHead className="text-center">Cuotas</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("startDate")}
                    className="h-auto p-0 font-medium"
                  >
                    Inicio
                    {getSortIcon("startDate")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("status")}
                    className="h-auto p-0 font-medium"
                  >
                    Estado
                    {getSortIcon("status")}
                  </Button>
                </TableHead>
                <TableHead>Progreso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    {searchTerm
                      ? "No se encontraron cuentas corrientes que coincidan con la búsqueda."
                      : "No hay cuentas corrientes registradas."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((account) => (
                  <React.Fragment key={account.id}>
                    <TableRow>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAccordion(account.id)}
                          className="h-8 w-8 p-0"
                        >
                          {expandedAccounts.has(account.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {account.client?.firstName} {account.client?.lastName}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Bike className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {account.motorcycle?.brand?.name} {account.motorcycle?.model?.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {account.motorcycle?.year} - {account.motorcycle?.chassisNumber}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-semibold">{formatCurrency(account.totalAmount)}</p>
                        <p className="text-sm text-muted-foreground">
                          Anticipo: {formatCurrency(account.downPayment)}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        <p className="font-medium">{account.numberOfInstallments}</p>
                        <p className="text-sm text-muted-foreground">
                          {frequencyMap[account.paymentFrequency] || account.paymentFrequency}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{formatDate(account.startDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={statusColorMap[account.status] || "bg-gray-100 text-gray-800"}
                        >
                          {statusTranslations[account.status] || account.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="w-24">
                          <div className="flex items-center gap-2">
                            <Progress value={calculateProgress(account)} className="h-2" />
                            <span className="text-xs font-medium">
                              {calculateProgress(account)}%
                            </span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Detalles expandidos */}
                    {expandedAccounts.has(account.id) && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-blue-50/50 border-l-2 border-blue-200">
                          <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Panel Izquierdo - Información de la Moto */}
                              <div className="space-y-4">
                                <h4 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                                  <Bike className="h-5 w-5 text-blue-600" />
                                  Información del Vehículo
                                </h4>

                                <div className="space-y-3">
                                  <div className="flex justify-between py-2 border-b border-gray-200">
                                    <span className="font-medium text-gray-600">Marca/Modelo:</span>
                                    <span className="font-semibold">
                                      {account.motorcycle?.brand?.name}{" "}
                                      {account.motorcycle?.model?.name}
                                    </span>
                                  </div>

                                  <div className="flex justify-between py-2 border-b border-gray-200">
                                    <span className="font-medium text-gray-600">Año:</span>
                                    <span>{account.motorcycle?.year}</span>
                                  </div>

                                  <div className="flex justify-between py-2 border-b border-gray-200">
                                    <span className="font-medium text-gray-600">Chasis:</span>
                                    <span className="font-mono text-sm">
                                      {account.motorcycle?.chassisNumber}
                                    </span>
                                  </div>

                                  <div className="flex justify-between py-2 border-b border-gray-200">
                                    <span className="font-medium text-gray-600">
                                      Precio Original:
                                    </span>
                                    <span className="font-bold text-lg text-green-600">
                                      {formatCurrency(account.totalAmount)}
                                    </span>
                                  </div>

                                  <div className="flex justify-between py-2 border-b border-gray-200">
                                    <span className="font-medium text-gray-600">Anticipo:</span>
                                    <span className="font-semibold text-blue-600">
                                      {formatCurrency(account.downPayment)}
                                    </span>
                                  </div>

                                  <div className="flex justify-between py-2 border-b border-gray-200">
                                    <span className="font-medium text-gray-600">
                                      Monto Financiado:
                                    </span>
                                    <span className="font-semibold">
                                      {formatCurrency(account.totalAmount - account.downPayment)}
                                    </span>
                                  </div>

                                  <div className="flex justify-between py-2 border-b border-gray-200">
                                    <span className="font-medium text-gray-600">
                                      Tasa de Interés:
                                    </span>
                                    <span className="font-semibold text-red-600">
                                      {account.interestRate}% anual
                                    </span>
                                  </div>

                                  <div className="flex justify-between py-2 border-b border-gray-200">
                                    <span className="font-medium text-gray-600">
                                      Plazo de Pagos:
                                    </span>
                                    <span className="font-semibold">
                                      {account.numberOfInstallments} cuotas{" "}
                                      {frequencyMap[account.paymentFrequency]?.toLowerCase()}es
                                    </span>
                                  </div>

                                  <div className="flex justify-between py-2 border-b border-gray-200">
                                    <span className="font-medium text-gray-600">
                                      Monto por Cuota:
                                    </span>
                                    <span className="font-bold text-lg text-orange-600">
                                      {formatCurrency(account.installmentAmount)}
                                    </span>
                                  </div>

                                  <div className="flex justify-between py-2 border-b border-gray-200">
                                    <span className="font-medium text-gray-600">
                                      Inicio del Plan:
                                    </span>
                                    <span>{formatDate(account.startDate)}</span>
                                  </div>

                                  <div className="flex justify-between py-2">
                                    <span className="font-medium text-gray-600">Estado:</span>
                                    <Badge
                                      className={
                                        statusColorMap[account.status] ||
                                        "bg-gray-100 text-gray-800"
                                      }
                                    >
                                      {statusTranslations[account.status] || account.status}
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              {/* Panel Derecho - Tabla de Cuotas */}
                              <div className="space-y-4">
                                <h4 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                                  <CreditCard className="h-5 w-5 text-green-600" />
                                  Cronograma de Cuotas
                                </h4>

                                <div className="bg-white rounded-lg border max-h-96 overflow-y-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="text-center">Cuota</TableHead>
                                        <TableHead>Vencimiento</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                        <TableHead className="text-center">Estado</TableHead>
                                        <TableHead className="text-center">Acción</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {Array.from(
                                        { length: account.numberOfInstallments },
                                        (_, index) => {
                                          const installmentNumber = index + 1;
                                          const payment = account.payments?.find(
                                            (p) => p.installmentNumber === installmentNumber,
                                          );
                                          const isDownPayment = installmentNumber === 0;
                                          const installmentDate = new Date(account.startDate);

                                          // Calcular fecha de vencimiento según frecuencia
                                          switch (account.paymentFrequency) {
                                            case "WEEKLY":
                                              installmentDate.setDate(
                                                installmentDate.getDate() + index * 7,
                                              );
                                              break;
                                            case "BIWEEKLY":
                                              installmentDate.setDate(
                                                installmentDate.getDate() + index * 14,
                                              );
                                              break;
                                            case "MONTHLY":
                                              installmentDate.setMonth(
                                                installmentDate.getMonth() + index,
                                              );
                                              break;
                                            case "QUARTERLY":
                                              installmentDate.setMonth(
                                                installmentDate.getMonth() + index * 3,
                                              );
                                              break;
                                            case "ANNUALLY":
                                              installmentDate.setFullYear(
                                                installmentDate.getFullYear() + index,
                                              );
                                              break;
                                          }

                                          const isPaid = !!payment;
                                          const isOverdue = !isPaid && installmentDate < new Date();

                                          return (
                                            <TableRow
                                              key={installmentNumber}
                                              className={
                                                isPaid
                                                  ? "bg-green-50"
                                                  : isOverdue
                                                    ? "bg-red-50"
                                                    : ""
                                              }
                                            >
                                              <TableCell className="text-center font-medium">
                                                {installmentNumber}
                                              </TableCell>
                                              <TableCell className="text-sm">
                                                {formatDate(installmentDate)}
                                              </TableCell>
                                              <TableCell className="text-right font-semibold">
                                                {formatCurrency(account.installmentAmount)}
                                              </TableCell>
                                              <TableCell className="text-center">
                                                {isPaid ? (
                                                  <Badge className="bg-green-100 text-green-800">
                                                    Pagado
                                                  </Badge>
                                                ) : isOverdue ? (
                                                  <Badge className="bg-red-100 text-red-800">
                                                    Vencido
                                                  </Badge>
                                                ) : (
                                                  <Badge className="bg-yellow-100 text-yellow-800">
                                                    Pendiente
                                                  </Badge>
                                                )}
                                              </TableCell>
                                              <TableCell className="text-center">
                                                {isPaid ? (
                                                  <div className="flex items-center justify-center gap-2">
                                                    <span className="text-xs text-green-600">
                                                      {formatDate(payment.paymentDate)}
                                                    </span>
                                                    {payment &&
                                                      !annulledPaymentIdsInSession.has(
                                                        payment.id,
                                                      ) && (
                                                        <AnnulPaymentButton
                                                          paymentId={payment.id}
                                                          onAnnulmentSuccess={() =>
                                                            handleAnnulmentSuccess(payment.id)
                                                          }
                                                        />
                                                      )}
                                                  </div>
                                                ) : (
                                                  <Button
                                                    size="sm"
                                                    onClick={(e) =>
                                                      handlePaymentClick(
                                                        e,
                                                        account.id,
                                                        installmentNumber,
                                                        account.installmentAmount,
                                                      )
                                                    }
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                  >
                                                    <DollarSign className="h-3 w-3 mr-1" />
                                                    Pagar
                                                  </Button>
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          );
                                        },
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>

                                {/* Resumen de pagos */}
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                    <div className="text-sm font-medium text-green-800">
                                      Cuotas Pagadas
                                    </div>
                                    <div className="text-lg font-bold text-green-600">
                                      {account.payments?.length || 0} /{" "}
                                      {account.numberOfInstallments}
                                    </div>
                                  </div>
                                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="text-sm font-medium text-blue-800">
                                      Último Pago
                                    </div>
                                    <div className="text-sm font-semibold text-blue-600">
                                      {account.payments?.length
                                        ? formatDate(
                                            account.payments[account.payments.length - 1]
                                              ?.paymentDate,
                                          )
                                        : "Sin pagos"}
                                    </div>
                                  </div>
                                </div>

                                {/* Botones de acción */}
                                <div className="flex gap-2 pt-4 border-t">
                                  <Button
                                    size="sm"
                                    onClick={(e) =>
                                      handlePaymentClick(
                                        e,
                                        account.id,
                                        1,
                                        account.installmentAmount,
                                      )
                                    }
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    Registrar Pago
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <FileText className="h-4 w-4 mr-1" />
                                    Ver Historial Completo
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Controles de paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Filas por página</p>
              <Select value={`${pageSize}`} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center justify-center text-sm font-medium">
                Página {currentPage} de {totalPages}
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={
                        currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                      }
                    />
                  </PaginationItem>

                  {/* Páginas */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                    if (page > totalPages) return null;
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={
                        currentPage >= totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}

        {/* Información de resultados */}
        <div className="px-4 py-3 text-sm text-muted-foreground border-t">
          Mostrando {startIndex + 1} a{" "}
          {Math.min(startIndex + pageSize, filteredAndSortedResult.length)} de{" "}
          {filteredAndSortedResult.length} cuenta{filteredAndSortedResult.length !== 1 ? "s" : ""}.
        </div>
      </div>

      {/* Modal de pago */}
      {paymentModal.isOpen && (
        <PaymentModal
          isOpen={paymentModal.isOpen}
          onClose={closePaymentModal}
          currentAccountId={paymentModal.accountId}
          defaultAmount={paymentModal.amount}
          installmentNumber={paymentModal.installmentNumber}
        />
      )}
    </>
  );
}
