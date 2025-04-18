"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ClientForm from "./ClientForm";
import ClientTable from "./ClientTable";
import type { Client } from "./columns";
import { toast } from "@/hooks/use-toast";

interface Props {
  initialData: Client[];
}

export default function ClientComponent({ initialData }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<Client> | null>(null);

  const handleOpenModal = () => {
    setEditingClient(null); // Reset editing client for a new one
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
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
