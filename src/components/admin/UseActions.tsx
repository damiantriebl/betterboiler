"use client";

import { authClient } from "@/auth-client";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  userId: string;
  currentStatus: boolean;
  currentRole: string;
}

export default function UserActions({ userId, currentStatus, currentRole }: Props) {
  const [banned, setBanned] = useState(currentStatus);
  const [role, setRole] = useState(currentRole);
  const router = useRouter();
  const { data: session, isPending, error } = authClient.useSession();

  // Verificar si el usuario actual puede cambiar roles (admin o root)
  const canChangeRoles = session?.user.role === "admin" || session?.user.role === "root";
  // Verificar si el usuario actual puede cambiar organizaciones (solo root)
  const canChangeOrganizations = session?.user.role === "root";

  const toggleStatus = async () => {
    const newStatus = !banned;
    setBanned(newStatus);
    await fetch("/api/toggle-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, banned: newStatus }),
    });
    router.refresh();
  };

  const handleRoleChange = async (newRole: string) => {
    try {
      setRole(newRole);

      const response = await fetch("/api/update-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al actualizar el rol");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Error al actualizar el rol");
      }

      router.refresh();
    } catch (error) {
      console.error("Error updating role:", error);
      // Revertir el rol en caso de error
      setRole(currentRole);
      // Aquí podrías agregar un toast de error si usas toasts
    }
  };

  const deleteUser = async () => {
    await fetch("/api/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    router.refresh();
  };

  return (
    <div className="flex flex-row gap-2">
      <Button onClick={toggleStatus} variant="outline">
        {banned ? "Activar" : "Banear"}
      </Button>

      {canChangeRoles && (
        <Select onValueChange={handleRoleChange} defaultValue={role}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="Treasurer">Treasurer</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            {session?.user.role === "root" && <SelectItem value="root">Root</SelectItem>}
          </SelectContent>
        </Select>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">Borrar</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente al usuario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={deleteUser}>
              Confirmar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
