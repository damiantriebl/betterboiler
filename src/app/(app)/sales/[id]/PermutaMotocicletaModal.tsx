"use client";

import { getMotorcycles } from "@/actions/sales/get-motorcycles-unified";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { MotorcycleWithFullDetails } from "@/types/motorcycle";
import { MotorcycleState } from "@prisma/client";
import { Check, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";

interface PermutaMotocicletaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectMotorcycle: (motorcycle: MotorcycleWithFullDetails) => void;
}

export default function PermutaMotocicletaModal({
    isOpen,
    onClose,
    onSelectMotorcycle,
}: PermutaMotocicletaModalProps) {
    const [motorcycles, setMotorcycles] = useState<MotorcycleWithFullDetails[]>([]);
    const [filteredMotorcycles, setFilteredMotorcycles] = useState<MotorcycleWithFullDetails[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMotorcycle, setSelectedMotorcycle] = useState<MotorcycleWithFullDetails | null>(
        null,
    );

    // Cargar motocicletas disponibles para permuta (solo en stock)
    const loadMotorcycles = async () => {
        setLoading(true);
        try {
            const data = await getMotorcycles({
                filter: { state: [MotorcycleState.STOCK] },
            });
            setMotorcycles(data as MotorcycleWithFullDetails[]);
            setFilteredMotorcycles(data as MotorcycleWithFullDetails[]);
        } catch (error) {
            console.error("Error cargando motocicletas para permuta:", error);
        } finally {
            setLoading(false);
        }
    };

    // Filtrar motocicletas según término de búsqueda
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredMotorcycles(motorcycles);
            return;
        }

        const filtered = motorcycles.filter((moto) => {
            const searchString = `${moto.brand?.name || ""} ${moto.model?.name || ""} ${moto.year || ""} ${moto.chassisNumber || ""}`.toLowerCase();
            return searchString.includes(searchTerm.toLowerCase());
        });

        setFilteredMotorcycles(filtered);
    }, [searchTerm, motorcycles]);

    // Cargar motocicletas cuando se abre el modal
    useEffect(() => {
        if (isOpen) {
            loadMotorcycles();
            setSelectedMotorcycle(null);
            setSearchTerm("");
        }
    }, [isOpen]);

    const handleConfirm = () => {
        if (selectedMotorcycle) {
            onSelectMotorcycle(selectedMotorcycle);
            onClose();
        }
    };

    const formatPrice = (price: number, currency: string) => {
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: currency === "USD" ? "USD" : "ARS",
        }).format(price);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Seleccionar Motocicleta para Permuta</DialogTitle>
                    <DialogDescription>
                        Selecciona una motocicleta de tu stock para intercambiar
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 flex-1 overflow-hidden">
                    {/* Buscador */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                            placeholder="Buscar por marca, modelo, año, VIN..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Lista de motocicletas */}
                    <div className="border rounded-md overflow-hidden flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                <span>Cargando motocicletas...</span>
                            </div>
                        ) : filteredMotorcycles.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                {motorcycles.length === 0
                                    ? "No hay motocicletas disponibles en stock"
                                    : "No se encontraron motocicletas que coincidan con la búsqueda"}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12"></TableHead>
                                        <TableHead>Marca</TableHead>
                                        <TableHead>Modelo</TableHead>
                                        <TableHead>Año</TableHead>
                                        <TableHead>Color</TableHead>
                                        <TableHead>Precio</TableHead>
                                        <TableHead>VIN</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredMotorcycles.map((moto) => (
                                        <TableRow
                                            key={moto.id}
                                            className={`cursor-pointer hover:bg-muted/50 ${selectedMotorcycle?.id === moto.id ? "bg-blue-50 border-blue-200" : ""
                                                }`}
                                            onClick={() => setSelectedMotorcycle(moto)}
                                        >
                                            <TableCell>
                                                {selectedMotorcycle?.id === moto.id && (
                                                    <Check className="h-4 w-4 text-blue-600" />
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">{moto.brand?.name || "-"}</TableCell>
                                            <TableCell>{moto.model?.name || "-"}</TableCell>
                                            <TableCell>{moto.year || "-"}</TableCell>
                                            <TableCell>{moto.color?.name || "-"}</TableCell>
                                            <TableCell>
                                                {moto.retailPrice ? formatPrice(moto.retailPrice, moto.currency || "USD") : "-"}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{moto.chassisNumber || "-"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {/* Información de la motocicleta seleccionada */}
                    {selectedMotorcycle && (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                            <h4 className="font-medium text-blue-900 mb-2">Motocicleta Seleccionada</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                <div>
                                    <Label className="text-blue-700">Marca:</Label>
                                    <p className="font-medium">{selectedMotorcycle.brand?.name || "-"}</p>
                                </div>
                                <div>
                                    <Label className="text-blue-700">Modelo:</Label>
                                    <p className="font-medium">{selectedMotorcycle.model?.name || "-"}</p>
                                </div>
                                <div>
                                    <Label className="text-blue-700">Año:</Label>
                                    <p className="font-medium">{selectedMotorcycle.year || "-"}</p>
                                </div>
                                <div>
                                    <Label className="text-blue-700">Precio:</Label>
                                    <p className="font-medium">
                                        {selectedMotorcycle.retailPrice
                                            ? formatPrice(selectedMotorcycle.retailPrice, selectedMotorcycle.currency || "USD")
                                            : "-"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirm} disabled={!selectedMotorcycle}>
                        Confirmar Selección
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 