"use client";

import { getMotorcyclesForTransfer } from "@/actions/logistics/get-motorcycles-for-transfer";
import { getTransfersInTransit } from "@/actions/logistics/motorcycle-transfers";
import { SecurityModeToggle } from "@/components/custom/SecurityModeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMotorcycleUpdates } from "@/hooks/use-motorcycle-updates";
import { useToast } from "@/hooks/use-toast";
import { useTransferUpdates } from "@/hooks/use-transfer-updates";
import { formatPrice } from "@/lib/utils";
import type { MotorcycleForTransfer, MotorcycleTransferWithRelations } from "@/types/logistics";
import type { Branch, LogisticProvider } from "@prisma/client";
import { ArrowRight, Plus, Search, Truck } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import LogisticProviderModal from "./components/LogisticProviderModal";
import MotorcycleTable from "./components/MotorcycleTable";
import TransferModal from "./components/TransferModal";
import TransfersInTransitTable from "./components/TransfersInTransitTable";

interface LogisticClientProps {
  initialMotorcycles: MotorcycleForTransfer[];
  logisticProviders: LogisticProvider[];
  branches: Branch[];
  transfersInTransit: MotorcycleTransferWithRelations[];
}

export default function LogisticClient({
  initialMotorcycles,
  logisticProviders,
  branches,
  transfersInTransit,
}: LogisticClientProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedLeftBranch, setSelectedLeftBranch] = useState<number | null>(null);
  const [selectedRightBranch, setSelectedRightBranch] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedMotorcycles, setSelectedMotorcycles] = useState<number[]>([]);
  const [transferMotorcycles, setTransferMotorcycles] = useState<MotorcycleForTransfer[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Usar hooks personalizados para manejar los estados
  const { motorcycles, refreshMotorcycles, removeMultipleMotorcycles } =
    useMotorcycleUpdates(initialMotorcycles);
  const { transfers, addTransfer, removeTransfer, updateTransfer, refreshTransfers } =
    useTransferUpdates(transfersInTransit);

  // Manejar hidratación
  useEffect(() => {
    setMounted(true);
  }, []);

  // Actualizar transferMotorcycles cuando cambien las selecciones
  useEffect(() => {
    if (!mounted) return;

    console.log("🔧 useEffect ejecutándose:");
    console.log("🔧 selectedMotorcycles:", selectedMotorcycles);
    console.log("🔧 motorcycles.length:", motorcycles.length);

    const selectedMotoData = motorcycles.filter((m) => selectedMotorcycles.includes(m.id));
    console.log("🔧 selectedMotoData:", selectedMotoData);

    setTransferMotorcycles(selectedMotoData);
  }, [selectedMotorcycles, motorcycles, mounted]);

  // Función para actualizar motocicletas disponibles
  const updateMotorcyclesFromServer = async () => {
    startTransition(async () => {
      try {
        const result = await getMotorcyclesForTransfer();
        if (result.success && result.motorcycles) {
          refreshMotorcycles(result.motorcycles);
          // Limpiar selecciones que ya no existen
          setSelectedMotorcycles((prev) =>
            prev.filter((id) =>
              result.motorcycles?.some((m: MotorcycleForTransfer) => m.id === id),
            ),
          );
        }
      } catch (error) {
        console.error("Error actualizando motocicletas:", error);
      }
    });
  };

  // Mostrar un loading state hasta que el componente esté montado
  if (!mounted) {
    return (
      <div className="container max-w-none p-4 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Logística</h1>
            <p className="text-muted-foreground">
              Gestiona las transferencias de motocicletas entre sucursales
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  console.log("🔍 LogisticClient recibió:");
  console.log("🔍 initialMotorcycles.length:", initialMotorcycles.length);
  console.log("🔍 logisticProviders.length:", logisticProviders.length);
  console.log("🔍 branches.length:", branches.length);
  console.log("🔍 transfersInTransit.length:", transfersInTransit.length);
  console.log("🔍 transfersInTransit:", transfersInTransit);

  // Filtrar motocicletas por sucursal, marca y búsqueda
  const filteredMotorcycles = motorcycles.filter((motorcycle) => {
    const matchesBranch = selectedLeftBranch ? motorcycle.branch?.id === selectedLeftBranch : true;
    const matchesBrand = selectedBrand ? motorcycle.brand?.name === selectedBrand : true;
    const matchesSearch =
      !searchTerm ||
      motorcycle.chassisNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      motorcycle.brand?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      motorcycle.model?.name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesBranch && matchesBrand && matchesSearch;
  });

  // Obtener marcas únicas para el filtro
  const uniqueBrands = Array.from(
    new Set(motorcycles.filter((m) => m.brand?.name).map((m) => m.brand?.name)),
  )
    .filter((name): name is string => name !== undefined)
    .sort((a, b) => a.localeCompare(b));

  console.log("🎯 RENDER - Estado actual:");
  console.log("🎯 selectedMotorcycles:", selectedMotorcycles);
  console.log("🎯 transferMotorcycles:", transferMotorcycles);
  console.log("🎯 selectedRightBranch:", selectedRightBranch);
  console.log("🎯 filteredMotorcycles.length:", filteredMotorcycles.length);

  // Obtener estadísticas por sucursal
  const branchStats = branches.map((branch) => {
    const count = motorcycles.filter((m) => m.branch?.id === branch.id).length;
    return { ...branch, motorcycleCount: count };
  });

  const handleMotorcycleSelect = (motorcycleId: number, selected: boolean) => {
    console.log("🔧 handleMotorcycleSelect llamado:", { motorcycleId, selected });
    if (selected) {
      setSelectedMotorcycles((prev) => {
        const newSelection = [...prev, motorcycleId];
        console.log("🔧 Agregando moto, nueva selección:", newSelection);
        return newSelection;
      });
    } else {
      setSelectedMotorcycles((prev) => {
        const newSelection = prev.filter((id) => id !== motorcycleId);
        console.log("🔧 Removiendo moto, nueva selección:", newSelection);
        return newSelection;
      });
    }
  };

  const handleTransferClick = () => {
    if (selectedMotorcycles.length === 0) {
      toast({
        title: "Error",
        description: "Debe seleccionar al menos una motocicleta para transferir.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedRightBranch) {
      toast({
        title: "Error",
        description: "Debe seleccionar una sucursal de destino.",
        variant: "destructive",
      });
      return;
    }

    const selectedMotoData = motorcycles.filter((m) => selectedMotorcycles.includes(m.id));

    // Verificar que todas las motocicletas tengan sucursal de origen
    const motosWithoutBranch = selectedMotoData.filter((m) => !m.branch?.id);
    if (motosWithoutBranch.length > 0) {
      toast({
        title: "Error",
        description: "Algunas motocicletas no tienen sucursal de origen asignada.",
        variant: "destructive",
      });
      return;
    }

    console.log("🔍 Motocicletas seleccionadas con sus sucursales:");
    for (const moto of selectedMotoData) {
      console.log(
        `🔍 Moto ${moto.chassisNumber}: sucursal ${moto.branch?.name} (ID: ${moto.branch?.id})`,
      );
    }

    setTransferMotorcycles(selectedMotoData);
    setShowTransferModal(true);
  };

  const handleTransferSuccess = async () => {
    // Limpiar selecciones
    setSelectedMotorcycles([]);
    setTransferMotorcycles([]);
    setShowTransferModal(false);

    // Actualizar tanto motocicletas como transferencias
    await Promise.all([updateMotorcyclesFromServer(), updateTransfersFromServer()]);
  };

  // Función para actualizar transferencias en tránsito
  const updateTransfersFromServer = async () => {
    startTransition(async () => {
      try {
        const result = await getTransfersInTransit();
        if (result.success && result.transfers) {
          refreshTransfers(result.transfers);
        }
      } catch (error) {
        console.error("Error actualizando transferencias:", error);
      }
    });
  };

  const handleProviderSuccess = () => {
    setShowProviderModal(false);
    // No necesitamos refrescar nada aquí, solo cerrar el modal
  };

  const handleTransferUpdate = async () => {
    // Solo actualizar motocicletas disponibles cuando se confirma una llegada
    // Las transferencias se actualizan localmente en su propio componente
    await updateMotorcyclesFromServer();
  };

  const handleConfirmArrival = (transferId: number) => {
    // ... lógica de confirmación

    // Actualizar estado local - remover la transferencia confirmada
    removeTransfer(transferId);

    // Solo notificar al padre para actualizar motocicletas disponibles
    handleTransferUpdate();
  };

  return (
    <main className="flex flex-col gap-6 px-4">
      {/* Header consistente */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Logística</h1>
          <p className="text-muted-foreground">
            Gestiona las transferencias de motocicletas entre sucursales
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowProviderModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Proveedor
          </Button>
        </div>
      </div>

      {/* Indicador de selección */}
      {selectedMotorcycles.length > 0 && selectedRightBranch && (
        <div className="flex justify-center">
          <div className="text-sm text-muted-foreground bg-blue-50 px-4 py-3 rounded-lg border border-blue-200">
            <span className="font-medium text-blue-700">
              {selectedMotorcycles.length} moto{selectedMotorcycles.length !== 1 ? "s" : ""}{" "}
              seleccionada{selectedMotorcycles.length !== 1 ? "s" : ""}
            </span>
            <span className="text-blue-600">
              {" "}
              → {branches.find((b) => b.id === selectedRightBranch)?.name}
            </span>
          </div>
        </div>
      )}

      {/* Transferencias en tránsito */}
      <TransfersInTransitTable transfers={transfers} onTransferUpdate={handleTransferUpdate} />

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {branchStats.map((branch) => (
          <Card key={branch.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{branch.name}</p>
                  <p className="text-2xl font-bold">{branch.motorcycleCount}</p>
                </div>
                <Badge variant="secondary">{branch.motorcycleCount} motos</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tablas principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabla izquierda - Motocicletas origen */}
        <Card>
          <CardHeader>
            <CardTitle className="mb-4">Motocicletas Disponibles</CardTitle>

            {/* Filtros dentro de la card */}
            <div className="space-y-4">
              {/* Fila 1: Búsqueda */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por chasis, marca o modelo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Fila 2: Filtros por sucursal y marca */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Select
                  value={selectedLeftBranch?.toString() || "all"}
                  onValueChange={(value) =>
                    setSelectedLeftBranch(value === "all" ? null : Number(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las sucursales</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedBrand || "all"}
                  onValueChange={(value) => setSelectedBrand(value === "all" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por marca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las marcas</SelectItem>
                    {uniqueBrands.map((brandName) => (
                      <SelectItem key={brandName} value={brandName}>
                        {brandName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contador de resultados */}
              <div className="text-sm text-muted-foreground">
                Mostrando {filteredMotorcycles.length} de {motorcycles.length} motocicletas
                {(searchTerm || selectedLeftBranch || selectedBrand) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedLeftBranch(null);
                      setSelectedBrand(null);
                    }}
                    className="ml-2 h-6 px-2 text-xs"
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <MotorcycleTable
              motorcycles={filteredMotorcycles}
              selectedMotorcycles={selectedMotorcycles}
              onMotorcycleSelect={handleMotorcycleSelect}
              showSelection={true}
            />
          </CardContent>
        </Card>

        {/* Tabla derecha - Destino */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Destino de Transferencia</CardTitle>
              <Select
                value={selectedRightBranch?.toString() || undefined}
                onValueChange={(value) => setSelectedRightBranch(value ? Number(value) : null)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Seleccionar destino" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {selectedRightBranch ? (
              <div className="space-y-4">
                {/* Información del destino */}
                <div className="text-center py-4 border-b">
                  <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    <ArrowRight className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">
                    Destino: {branches.find((b) => b.id === selectedRightBranch)?.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedMotorcycles.length > 0
                      ? `${selectedMotorcycles.length} motocicleta${selectedMotorcycles.length !== 1 ? "s" : ""} seleccionada${selectedMotorcycles.length !== 1 ? "s" : ""}`
                      : "Selecciona motocicletas de la tabla izquierda"}
                  </p>
                </div>

                {/* Motocicletas seleccionadas */}
                {selectedMotorcycles.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="font-medium text-center">Motocicletas para transferir:</h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {transferMotorcycles.map((motorcycle) => (
                        <div
                          key={motorcycle.id}
                          className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-blue-900">
                                {motorcycle.chassisNumber}
                              </div>
                              <div className="text-sm text-blue-700">
                                {motorcycle.brand?.name} {motorcycle.model?.name}
                              </div>
                              <div className="text-xs text-blue-600">
                                Año: {motorcycle.year} | Color: {motorcycle.color?.name}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-blue-900">
                                {formatPrice(motorcycle.retailPrice, motorcycle.currency)}
                              </div>
                              <div className="text-xs text-blue-600">{motorcycle.branch?.name}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Botón de transferir - AQUÍ ESTÁ EL BOTÓN PRINCIPAL */}
                    <Button
                      onClick={handleTransferClick}
                      disabled={isPending}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      size="lg"
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      Crear {selectedMotorcycles.length} Transferencia
                      {selectedMotorcycles.length !== 1 ? "s" : ""}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-sm text-muted-foreground bg-gray-50 p-4 rounded-lg">
                      💡 <strong>Instrucciones:</strong>
                      <br />
                      1. Marca las casillas de verificación en la tabla de motocicletas disponibles
                      <br />
                      2. Las motocicletas seleccionadas aparecerán aquí
                      <br />
                      3. Presiona el botón "Crear Transferencia" para proceder
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Truck className="mx-auto w-12 h-12 mb-4 opacity-50" />
                <p>Selecciona una sucursal de destino</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modales */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onSuccess={handleTransferSuccess}
        motorcycles={transferMotorcycles}
        fromBranchId={null} // Se determinará automáticamente desde las motocicletas
        toBranchId={selectedRightBranch}
        branches={branches}
        logisticProviders={logisticProviders}
      />

      <LogisticProviderModal
        isOpen={showProviderModal}
        onClose={() => setShowProviderModal(false)}
        onSuccess={handleProviderSuccess}
      />
    </main>
  );
}
