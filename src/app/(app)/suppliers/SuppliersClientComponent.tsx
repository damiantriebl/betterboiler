"use client"; // Este es ahora el componente cliente

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import SupplierForm from "./SupplierForm";
import SupplierTable from "./SupplierTable"; // Necesitamos importar SupplierTable aquí
import { Supplier } from "@prisma/client"; // Usar el tipo Supplier de Prisma
// import { SupplierFormData } from '@/zod/SuppliersZod'; // Ya no necesitamos SupplierFormData aquí

interface SuppliersClientComponentProps {
  initialData: Supplier[]; // Recibe los datos iniciales del server component
}

export default function SuppliersClientComponent({ initialData }: SuppliersClientComponentProps) {
  // Estado local solo para controlar el modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Ya no necesitamos estado para los proveedores `const [suppliers, setSuppliers] = useState<Supplier[]>(initialData);`
  // ni para `editingSupplier` por ahora.

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Ya no necesitamos handleAddSupplier, el form llama a la acción directamente
  // La revalidación de la caché actualizará los datos en la tabla.

  // Placeholder para handlers de edición y borrado que se pasarían a la tabla
  // ¡IMPORTANTE! handleDeleteSupplier ahora necesita llamar a la Server Action
  const handleEditSupplier = (supplier: Supplier) => {
    console.log("Editar Supplier (Placeholder):", supplier);
    // Aquí iría la lógica para abrir el modal con los datos del proveedor a editar
    // Se necesitaría pasar `supplier` a `SupplierForm` como `initialData`
    // y SupplierForm necesitaría llamar a `updateSupplier` en lugar de `createSupplier`.
    alert("Funcionalidad Editar no implementada aún.");
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
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenModal}>
              <PlusCircle className="mr-2 h-4 w-4" /> Agregar Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[80%] lg:max-w-[60%] xl:max-w-4xl">
            <DialogHeader>
              {/* Título visible opcional o mantener sr-only */}
              <DialogTitle>Agregar Nuevo Proveedor</DialogTitle>
            </DialogHeader>
            <SupplierForm
              // onSuccess ya no es necesario aquí si el form resetea y cierra modal
              // Podríamos pasar una función onSuccess para cerrar el modal si el form no lo hace
              onSuccess={() => handleCloseModal()} // Cerrar modal en éxito
              onCancel={handleCloseModal}
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
