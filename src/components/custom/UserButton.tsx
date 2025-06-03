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

import { signOutAction } from "@/actions/auth/sign-out";
import { useSessionStore } from "@/stores/SessionStore";
import { useRouter } from "next/navigation";
import AvatarUser from "./AvatarUser";

export function UserButton() {
  const router = useRouter();
  const userName = useSessionStore((state) => state.userName);
  const userImage = useSessionStore((state) => state.userImage);
  const clearSession = useSessionStore((state) => state.clearSession);

  const handleSignOut = async () => {
    try {
      // Limpiar el session store local inmediatamente
      clearSession();

      // Llamar a la server action
      await signOutAction();
    } catch (error) {
      console.error("Error during sign out:", error);

      // Si hay error, redirigir manualmente
      router.push("/sign-in");
      router.refresh();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="size-16 rounded-full">
          <div className="flex items-center gap-2">
            {userName && <AvatarUser name={userName} src={userImage} />}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <p className="text-sm font-medium leading-none">{userName}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Perfil</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
