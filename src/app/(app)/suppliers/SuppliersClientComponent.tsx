"use client"; // Este es ahora el componente cliente

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Supplier } from "@prisma/client"; // Usar el tipo Supplier de Prisma
import { PlusCircle } from "lucide-react";
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

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Proveedores</h1>
        {/* Modal para crear proveedor */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreateModal}>
              <PlusCircle className="mr-2 h-4 w-4" /> Agregar Proveedor
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

      {/* Renderizar la tabla, pasando los datos iniciales y los handlers */}
      <SupplierTable
        initialData={initialData} // Pasar los datos recibidos del server
        onEdit={handleEditSupplier} // Pasar la función de editar (placeholder)
        onDelete={handleDeleteSupplierPlaceholder} // Pasar la función de eliminar (placeholder)
      />
    </div>
  );
}
