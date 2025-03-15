"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { authClient } from "@/auth-client";
import { useRouter } from "next/navigation";

interface Props {
  userId: string;
  currentStatus: boolean;
  currentRole: string;
}

export default function UserActions({ userId, currentStatus, currentRole }: Props) {
  const [banned, setBanned] = useState(currentStatus);
  const [role, setRole] = useState(currentRole);
  const router = useRouter(); 
  const { 
    data: session, 
    isPending, 
    error, 
} = authClient.useSession() 

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
    setRole(newRole);
    const updatedUser = await authClient.admin.setRole({
        userId,
        role: newRole,
      });
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

      <Select onValueChange={handleRoleChange} defaultValue={role}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Rol" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="user">User</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          {session?.user.role === "root" && <SelectItem value="root">Root</SelectItem>}
        </SelectContent>
      </Select>

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
