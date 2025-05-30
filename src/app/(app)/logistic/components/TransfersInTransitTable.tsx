"use client";

import { confirmTransferArrival } from "@/actions/logistics/motorcycle-transfers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useTransferUpdates } from "@/hooks/use-transfer-updates";
import type { MotorcycleTransferWithRelations } from "@/types/logistics";
import {
  Bike,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  MapPin,
  Truck,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import MotorcycleDetailsModal from "./MotorcycleDetailsModal";

interface TransfersInTransitTableProps {
  transfers: MotorcycleTransferWithRelations[];
  onTransferUpdate: () => void;
}

type SortConfig = {
  key: string | null;
  direction: "asc" | "desc" | null;
};

export default function TransfersInTransitTable({
  transfers: initialTransfers,
  onTransferUpdate,
}: TransfersInTransitTableProps) {
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedTransfer, setSelectedTransfer] = useState<MotorcycleTransferWithRelations | null>(
    null,
  );
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });
  const { toast } = useToast();

  // Usar el hook personalizado para manejar las transferencias
  const { transfers, removeTransfer, refreshTransfers } = useTransferUpdates(initialTransfers);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Actualizar transferencias cuando cambien las props - sin incluir la función en dependencias
  useEffect(() => {
    refreshTransfers(initialTransfers);
  }, [initialTransfers, refreshTransfers]); // Solo initialTransfers en dependencias

  const handleConfirmArrival = (transferId: number) => {
    startTransition(async () => {
      try {
        const result = await confirmTransferArrival(transferId);

        if (!result.success) {
          toast({
            title: "Error",
            description: result.error || "Error al confirmar la llegada",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Llegada confirmada",
          description: "La motocicleta ha llegado a su destino y está disponible en stock.",
        });

        // Actualizar estado local - remover la transferencia confirmada
        removeTransfer(transferId);

        // Notificar al componente padre para que actualice las motocicletas disponibles
        onTransferUpdate();
      } catch (error) {
        console.error("Error confirmando llegada:", error);
        toast({
          title: "Error",
          description: "Error al confirmar la llegada. Inténtelo nuevamente.",
          variant: "destructive",
        });
      }
    });
  };

  const handleViewDetails = (transfer: MotorcycleTransferWithRelations) => {
    setSelectedTransfer(transfer);
    setShowDetailsModal(true);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "No especificada";
    return new Date(date).toLocaleDateString();
  };

  // Filtrado y sorting
  const filteredAndSortedData = (() => {
    let result = [...transfers];

    // Filtrado
    if (searchTerm) {
      result = result.filter(
        (transfer) =>
          transfer.motorcycle?.brand?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transfer.motorcycle?.model?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transfer.motorcycle?.chassisNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transfer.fromBranch?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transfer.toBranch?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transfer.logisticProvider?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Sorting
    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case "motorcycle":
            aValue = `${a.motorcycle?.brand?.name || ""} ${a.motorcycle?.model?.name || ""}`;
            bValue = `${b.motorcycle?.brand?.name || ""} ${b.motorcycle?.model?.name || ""}`;
            break;
          case "fromBranch":
            aValue = a.fromBranch?.name || "";
            bValue = b.fromBranch?.name || "";
            break;
          case "toBranch":
            aValue = a.toBranch?.name || "";
            bValue = b.toBranch?.name || "";
            break;
          case "logisticProvider":
            aValue = a.logisticProvider?.name || "";
            bValue = b.logisticProvider?.name || "";
            break;
          case "scheduledPickupDate":
            aValue = a.scheduledPickupDate ? new Date(a.scheduledPickupDate).getTime() : 0;
            bValue = b.scheduledPickupDate ? new Date(b.scheduledPickupDate).getTime() : 0;
            break;
          default:
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
  })();

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") direction = "desc";
      else if (sortConfig.direction === "desc") direction = null;
    }
    setSortConfig({ key: direction ? key : null, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <ChevronsUpDown className="ml-2 h-4 w-4 opacity-30" />;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" />
    );
  };

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Transferencias en Tránsito
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (transfers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bike className="w-5 h-5" />
            Transferencias en Tránsito
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Bike className="mx-auto w-12 h-12 mb-4 opacity-50" />
            <p>No hay transferencias en tránsito</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bike className="w-5 h-5" />
            Transferencias en Tránsito ({transfers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controles superiores */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Buscar transferencias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {filteredAndSortedData.length} transferencia
                {filteredAndSortedData.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Tabla */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("motorcycle")}
                      className="h-auto p-0 font-medium"
                    >
                      Motocicleta
                      {getSortIcon("motorcycle")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("fromBranch")}
                      className="h-auto p-0 font-medium"
                    >
                      Origen
                      {getSortIcon("fromBranch")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("toBranch")}
                      className="h-auto p-0 font-medium"
                    >
                      Destino
                      {getSortIcon("toBranch")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("logisticProvider")}
                      className="h-auto p-0 font-medium"
                    >
                      Proveedor
                      {getSortIcon("logisticProvider")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("scheduledPickupDate")}
                      className="h-auto p-0 font-medium"
                    >
                      Fecha Estimada
                      {getSortIcon("scheduledPickupDate")}
                    </Button>
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {searchTerm
                        ? "No se encontraron transferencias que coincidan con la búsqueda."
                        : "No hay transferencias en tránsito."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedData.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {transfer.motorcycle?.brand?.name} {transfer.motorcycle?.model?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {transfer.motorcycle?.chassisNumber}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {transfer.fromBranch?.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {transfer.toBranch?.name}
                        </div>
                      </TableCell>
                      <TableCell>{transfer.logisticProvider?.name || "Sin proveedor"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(transfer.scheduledPickupDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          En Tránsito
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(transfer)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleConfirmArrival(transfer.id)}
                            disabled={isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Confirmar Llegada
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de detalles */}
      {selectedTransfer && showDetailsModal && (
        <MotorcycleDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedTransfer(null);
          }}
          transfer={selectedTransfer}
        />
      )}
    </>
  );
}
