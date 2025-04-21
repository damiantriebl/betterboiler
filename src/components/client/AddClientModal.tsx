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
import { toast } from "@/hooks/use-toast";
import { Client } from "@prisma/client";

// Importar el formulario de cliente
import ClientForm from "@/app/(app)/clients/ClientForm";

interface AddClientModalProps {
    onClientAdded?: (client: Client) => void;
    triggerButton?: React.ReactNode;
    className?: string;
    defaultOpen?: boolean;
}

export default function AddClientModal({
    onClientAdded,
    triggerButton,
    className,
    defaultOpen = false,
}: AddClientModalProps) {
    const [isModalOpen, setIsModalOpen] = useState(defaultOpen);

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleClientSubmit = (client: Client) => {
        handleCloseModal();

        // Notificar éxito
        toast({
            title: "Cliente agregado",
            description: "El cliente ha sido agregado exitosamente.",
        });

        // Llamar al callback con el cliente real recibido
        if (onClientAdded) {
            onClientAdded(client);
        }
    };

    // Botón predeterminado si no se proporciona uno personalizado
    const defaultTriggerButton = (
        <Button onClick={handleOpenModal} className={className}>
            <PlusCircle className="mr-2 h-4 w-4" /> Agregar Cliente
        </Button>
    );

    return (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
                {triggerButton || defaultTriggerButton}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
                </DialogHeader>
                <ClientForm
                    onSubmit={handleClientSubmit}
                    onCancel={handleCloseModal}
                />
            </DialogContent>
        </Dialog>
    );
} 