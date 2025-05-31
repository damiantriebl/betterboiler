"use client";

import { SecurityModeToggle } from "@/components/custom/SecurityModeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
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
import { toast } from "@/hooks/use-toast";
import type { ClientFormData } from "@/zod/ClientsZod";
import type { Client } from "@prisma/client";
import { Filter, PlusCircle, Search, Users } from "lucide-react";
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

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

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

  // Filtros aplicados a los datos
  const filteredData = initialData.filter((client) => {
    const matchesSearch =
      client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (client.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.phone?.includes(searchTerm) ?? false) ||
      (client.mobile?.includes(searchTerm) ?? false);

    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    const matchesType = typeFilter === "all" || client.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header consistente con suppliers y stock */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Clientes</h1>
          <p className="text-muted-foreground">
            Administra tu cartera de clientes de forma eficiente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SecurityModeToggle variant="badge" />
          {/* Modal para crear cliente */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenModal} size="lg" className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-5 w-5" />
                Agregar Cliente
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
      </div>

      {/* Card con filtros y tabla - consistente con suppliers y stock */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista de Clientes
            <div className="h-2 w-2 bg-purple-500 rounded-full animate-pulse" />
          </CardTitle>

          {/* Sección de filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Buscar por nombre, email o teléfono..."
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
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="Individual">Persona Física</SelectItem>
                  <SelectItem value="LegalEntity">Persona Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Renderizar la tabla, pasando los datos filtrados */}
          <ClientTable
            initialData={filteredData}
            onEdit={handleEditClient}
            onDelete={handleDeleteClient}
          />
        </CardContent>
      </Card>
    </div>
  );
}
