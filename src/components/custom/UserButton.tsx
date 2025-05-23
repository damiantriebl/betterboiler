"use client";

import { LogOut, User as UserIcon } from "lucide-react"; // Iconos
import Link from "next/link";
import React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button"; // Para el trigger si prefieres un botón
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton"; // Para el estado de carga

import { authClient } from "@/auth-client";
import { createAuthClient } from "better-auth/react";
import { useRouter } from "next/navigation";
const { useSession } = createAuthClient();

export function UserButton() {
  const router = useRouter();
  // Usar la desestructuración correcta según la documentación
  const { data: session, isPending, error } = useSession(); // Usar isPending, error

  // Estado de carga
  if (isPending) {
    // Usar isPending en lugar de status === "loading"
    return <Skeleton className="h-8 w-8 rounded-full" />;
  }

  // Si hubo un error o no hay sesión después de cargar
  if (error || !session) {
    // Loguear el error si existe
    if (error) console.error("Error fetching session:", error);
    // Podrías mostrar un botón de login o nada
    return null;
  }

  // Ahora sabemos que session y session.user existen
  const user = session.user;
  const userName = user.name || "Usuario";
  const userEmail = user.email || "";
  // Usar user.image para la imagen del avatar
  const userImage = user.image || undefined; // Usar user.image y asegurar undefined si es null/undefined
  const initials =
    userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?";

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in"); // redirect to login page
        },
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="size-16 rounded-full">
          <Avatar className="size-16">
            <AvatarImage src={userImage} alt={userName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Grupo de items (opcional) */}
        {/* <DropdownMenuGroup> ... </DropdownMenuGroup> */}
        <DropdownMenuItem asChild>
          {/* Asegúrate que la ruta /profile exista */}
          <Link href="/profile">
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Perfil</span>
          </Link>
        </DropdownMenuItem>
        {/* Puedes añadir más items aquí (ej: Configuración) */}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
