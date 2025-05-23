"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { type ClientFormData } from "@/zod/ClientsZod";
import type { Client } from "@prisma/client";
import { PlusCircle } from "lucide-react";
import React, { useState } from "react";
import ClientForm from "./ClientForm";
import ClientTable from "./ClientTable";

interface Props {
  initialData: Client[];
}

// Tipo que combina ClientFormData con id para edición
type ClientForForm = Partial<ClientFormData & { id?: string }>;

export default function ClientComponent({ initialData }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientForForm | null>(null);

  const handleOpenModal = () => {
    setEditingClient(null); // Reset editing client for a new one
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleEditClient = (client: Client) => {
    // Convertir Client de Prisma a ClientForForm
    const clientForForm: ClientForForm = {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName ?? undefined,
      companyName: client.companyName ?? undefined,
      email: client.email,
      phone: client.phone ?? undefined,
      mobile: client.mobile ?? undefined,
      taxId: client.taxId,
      address: client.address ?? undefined,
      vatStatus: client.vatStatus ?? undefined,
      type: client.type as "Individual" | "LegalEntity",
      status: client.status as "active" | "inactive",
      notes: client.notes ?? undefined,
    };
    setEditingClient(clientForForm);
    setIsModalOpen(true);
  };

  const handleDeleteClient = (clientId: string) => {
    // La eliminación se maneja directamente en la tabla
    // Aquí podemos añadir lógica adicional si es necesario
    console.log("Cliente eliminado:", clientId);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenModal}>
              <PlusCircle className="mr-2 h-4 w-4" /> Agregar Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? "Editar Cliente" : "Agregar Nuevo Cliente"}
              </DialogTitle>
            </DialogHeader>
            <ClientForm
              client={editingClient || {}}
              onSubmit={() => {
                handleCloseModal();
                toast({
                  title: editingClient ? "Cliente actualizado" : "Cliente agregado",
                  description: "La operación se completó exitosamente.",
                });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <ClientTable
        initialData={initialData}
        onEdit={handleEditClient}
        onDelete={handleDeleteClient}
      />
    </div>
  );
}
