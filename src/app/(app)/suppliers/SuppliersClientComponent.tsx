"use client"; // Este es ahora el componente cliente

import { SecurityModeToggle } from "@/components/custom/SecurityModeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Supplier } from "@prisma/client"; // Usar el tipo Supplier de Prisma
import { PlusCircle, Search, Users } from "lucide-react";
import React, { useState } from "react";
import SupplierForm from "./SupplierForm";
import SupplierTable from "./SupplierTable"; // Necesitamos importar SupplierTable aquí
// import { SupplierFormData } from '@/zod/SuppliersZod'; // Ya no necesitamos SupplierFormData aquí

interface SuppliersClientComponentProps {
  initialData: Supplier[]; // Recibe los datos iniciales del server component
}

export default function SuppliersClientComponent({ initialData }: SuppliersClientComponentProps) {
  // Estados para modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleOpenEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditingSupplier(null);
    setIsEditModalOpen(false);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    handleOpenEditModal(supplier);
  };

  // handleDeleteSupplier se pasará a la tabla, pero la lógica de llamada a la acción
  // probablemente estará dentro de SupplierTable o sus columnas.
  const handleDeleteSupplierPlaceholder = (supplierId: number) => {
    console.log("Intentando eliminar proveedor ID (Placeholder):", supplierId);
    // La llamada real a `deleteSupplier(supplierId)` se hará desde la tabla/columnas.
    alert("Funcionalidad Eliminar se conectará en la tabla.");
  };

  // Filtros aplicados a los datos
  const filteredData = () => {
    return initialData.filter((supplier) => {
      const matchesSearch =
        supplier.legalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.commercialName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (supplier.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      const matchesStatus = statusFilter === "all" || supplier.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  };

  // Función para limpiar filtros
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Header consistente con sales y stock */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Proveedores</h1>
          <p className="text-muted-foreground">
            Administra tu red de proveedores de forma eficiente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SecurityModeToggle variant="badge" />
          {/* Modal para crear proveedor */}
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreateModal} size="lg" className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-5 w-5" />
                Agregar Proveedor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[80%] lg:max-w-[60%] xl:max-w-4xl">
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Proveedor</DialogTitle>
              </DialogHeader>
              <SupplierForm
                onSuccess={() => handleCloseCreateModal()}
                onCancel={handleCloseCreateModal}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Card con filtros y tabla - consistente con sales y stock */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista de Proveedores
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
          </CardTitle>

          {/* Sección de filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Buscar por nombre, empresa o contacto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="ACTIVO">Activo</SelectItem>
                  <SelectItem value="INACTIVO">Inactivo</SelectItem>
                  <SelectItem value="SUSPENDIDO">Suspendido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Renderizar la tabla, pasando los datos filtrados y los handlers */}
          <SupplierTable
            initialData={filteredData()} // Pasar los datos filtrados
            onEdit={handleEditSupplier} // Pasar la función de editar
            onDelete={handleDeleteSupplierPlaceholder} // Pasar la función de eliminar (placeholder)
          />
        </CardContent>
      </Card>

      {/* Modal para editar proveedor */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[80%] lg:max-w-[60%] xl:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Editar Proveedor</DialogTitle>
          </DialogHeader>
          <SupplierForm
            initialData={editingSupplier}
            supplierId={editingSupplier?.id}
            onSuccess={() => handleCloseEditModal()}
            onCancel={handleCloseEditModal}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
