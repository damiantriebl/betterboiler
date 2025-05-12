"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { type Client } from "@prisma/client";
import { X, UserPlus, Loader2, ChevronsUpDown, ChevronDown, ChevronUp } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import AddClientModal from "@/components/client/AddClientModal";

interface SelectClientStepProps {
    clients: Client[];
    selectedClient: Client | null;
    loadingClients: boolean;
    isReserved: boolean;
    onSelectClient: (client: Client) => void;
    onCancelClientSelection: () => void;
}

export default function SelectClientStep({
    clients,
    selectedClient,
    loadingClients,
    isReserved,
    onSelectClient,
    onCancelClientSelection,
}: SelectClientStepProps) {
    // State for sorting and pagination
    const [sortConfig, setSortConfig] = useState<{
        key: keyof Client | null;
        direction: "asc" | "desc" | null;
    }>({ key: null, direction: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);

    // Functions for handling sorting
    const handleSort = (key: keyof Client) => {
        let direction: "asc" | "desc" | null = "asc";
        if (sortConfig.key === key) {
            if (sortConfig.direction === "asc") direction = "desc";
            else if (sortConfig.direction === "desc") direction = null;
        }
        setSortConfig({ key: direction ? key : null, direction });
        setCurrentPage(1); // Reset pagination on sort
    };

    const getSortedClients = () => {
        if (!sortConfig.key || !sortConfig.direction) return clients;
        return [...clients].sort((a, b) => {
            const aValue = a[sortConfig.key as keyof Client] || "";
            const bValue = b[sortConfig.key as keyof Client] || "";

            if (typeof aValue === "string" && typeof bValue === "string") {
                return sortConfig.direction === "asc"
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            // Add numeric comparison if needed for other fields
            if (typeof aValue === "number" && typeof bValue === "number") {
                return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
            }

            return 0; // Fallback
        });
    };

    const getSortIcon = (key: keyof Client) => {
        if (sortConfig.key !== key) {
            return <ChevronsUpDown className="h-4 w-4 ml-1 text-muted-foreground" />;
        }
        return sortConfig.direction === "asc" ? (
            <ChevronUp className="h-4 w-4 ml-1" />
        ) : (
            <ChevronDown className="h-4 w-4 ml-1" />
        );
    };

    // Computed values for pagination
    const sortedClients = getSortedClients();
    const totalPages = Math.ceil(sortedClients.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedClients = sortedClients.slice(startIndex, startIndex + pageSize);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handlePageSizeChange = (size: string) => {
        setPageSize(Number(size));
        setCurrentPage(1); // Reset to first page
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Selección de Cliente</h3>

            {/* Selected client */}
            {selectedClient && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4 flex justify-between items-center">
                    <div>
                        <p className="font-medium text-blue-700">Cliente seleccionado:</p>
                        <p className="text-lg font-bold">
                            {selectedClient.firstName} {selectedClient.lastName}
                        </p>
                        <p>{selectedClient.email}</p>
                    </div>
                    {!isReserved && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onCancelClientSelection}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                            <X className="h-4 w-4 mr-2" />
                            Cambiar cliente
                        </Button>
                    )}
                </div>
            )}

            {/* Client selection table */}
            {!isReserved && !selectedClient && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="text-md font-medium">Seleccionar un cliente existente</h4>
                        <AddClientModal
                            onClientAdded={onSelectClient}
                            triggerButton={
                                <Button variant="outline" size="sm">
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Nuevo cliente
                                </Button>
                            }
                        />
                    </div>

                    {loadingClients ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div>
                            <div className="border rounded-md overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => handleSort("firstName")}
                                                    className="p-0 font-medium"
                                                >
                                                    Nombre
                                                    {getSortIcon("firstName")}
                                                </Button>
                                            </TableHead>
                                            <TableHead>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => handleSort("email")}
                                                    className="p-0 font-medium"
                                                >
                                                    Email
                                                    {getSortIcon("email")}
                                                </Button>
                                            </TableHead>
                                            <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                                            <TableHead className="hidden md:table-cell">CUIT/CUIL</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedClients.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={5}
                                                    className="h-24 text-center text-muted-foreground"
                                                >
                                                    No hay clientes disponibles.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedClients.map((client) => (
                                                <TableRow key={client.id}>
                                                    <TableCell className="font-medium">
                                                        {client.firstName} {client.lastName}
                                                    </TableCell>
                                                    <TableCell>{client.email}</TableCell>
                                                    <TableCell className="hidden md:table-cell">
                                                        {client.phone || client.mobile || "-"}
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell">
                                                        {client.taxId || "-"}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => onSelectClient(client)}
                                                        >
                                                            Seleccionar
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {paginatedClients.length > 0 && (
                                <div className="flex items-center justify-between py-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">
                                            Clientes por página:
                                        </span>
                                        <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                                            <SelectTrigger className="w-[70px] h-8">
                                                <SelectValue placeholder={pageSize.toString()} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[5, 10, 20].map((size) => (
                                                    <SelectItem key={size} value={size.toString()}>
                                                        {size}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                                                    className={cn(
                                                        currentPage === 1 && "pointer-events-none opacity-50",
                                                    )}
                                                />
                                            </PaginationItem>
                                            {Array.from({ length: totalPages }).map((_, i) => (
                                                <PaginationItem key={`page-${i + 1}`}>
                                                    <PaginationLink
                                                        isActive={currentPage === i + 1}
                                                        onClick={() => handlePageChange(i + 1)}
                                                    >
                                                        {i + 1}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            ))}
                                            <PaginationItem>
                                                <PaginationNext
                                                    onClick={() =>
                                                        currentPage < totalPages && handlePageChange(currentPage + 1)
                                                    }
                                                    className={cn(
                                                        currentPage === totalPages && "pointer-events-none opacity-50",
                                                    )}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 