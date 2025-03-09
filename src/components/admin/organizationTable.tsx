"use client";

import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { authClient } from "@/auth-client";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function OrganizationTable() {
    const { data: organizations } = authClient.useListOrganizations();
    const { data: activeOrganization } = authClient.useActiveOrganization();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState(null);

    const handleDeleteClick = (org) => {
        setSelectedOrg(org);
        setIsDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (selectedOrg) {
            await authClient.organization.delete({
                organizationId: selectedOrg.id,
            });
        }
        setIsDialogOpen(false);
        setSelectedOrg(null);
    };

    return (
        <div>
            {activeOrganization ? <p>{activeOrganization.name}</p> : null}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Logo</TableHead>
                        <TableHead>Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {organizations?.map((org) => (
                        <TableRow key={org.id}>
                            <TableCell>{org.name}</TableCell>
                            <TableCell>{org.slug}</TableCell>
                            <TableCell>{org.logo}</TableCell>
                            <TableCell>
                                <div className="flex flex-row gap-4">
                                    <Button
                                        onClick={() => handleDeleteClick(org)}
                                        variant="destructive"
                                    >
                                        Eliminar
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* Diálogo de confirmación */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Estás seguro?</DialogTitle>
                    </DialogHeader>
                    <p>
                        ¿Seguro que quieres eliminar la organización{" "}
                        <strong>{selectedOrg?.name}</strong>? Esta acción no se puede deshacer.
                    </p>
                    <DialogFooter>
                        <Button onClick={() => setIsDialogOpen(false)} variant="secondary">
                            Cancelar
                        </Button>
                        <Button onClick={confirmDelete} variant="destructive">
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
