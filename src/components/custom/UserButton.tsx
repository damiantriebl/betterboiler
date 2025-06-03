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
import { useSessionStore } from "@/stores/SessionStore";
import { useRouter } from "next/navigation";
import AvatarUser from "./AvatarUser";

export function UserButton() {
  const router = useRouter();
  const userName = useSessionStore((state) => state.userName);
  const userImage = useSessionStore((state) => state.userImage);
  const clearSession = useSessionStore((state) => state.clearSession);

  const handleLogout = async () => {
    try {
      console.log(`🚪 [USER BUTTON] Iniciando logout completo...`);

      // 1. Limpiar el store de Zustand
      clearSession();

      // 2. Limpiar localStorage completo para evitar estados inconsistentes
      if (typeof window !== 'undefined') {
        localStorage.removeItem('session-store');
        console.log(`🧹 [USER BUTTON] localStorage limpiado`);
      }

      // 3. Hacer logout en Better Auth
      await authClient.signOut();
      console.log(`✅ [USER BUTTON] Logout de Better Auth completado`);

      // 4. Redirigir con recarga completa para limpiar cualquier estado residual
      window.location.href = '/sign-in';

    } catch (error) {
      console.error(`❌ [USER BUTTON] Error durante logout:`, error);

      // Fallback: redirigir con recarga forzada
      window.location.href = '/sign-in';
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
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
