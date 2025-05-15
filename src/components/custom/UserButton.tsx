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
import AvatarUser from "./AvatarUser";
import { useSessionStore } from "@/stores/SessionStore";
import { Image } from "@react-pdf/renderer";
import { Text } from "@react-pdf/renderer";

const { useSession } = createAuthClient();

export function UserButton() {
  const router = useRouter();
  const userName = useSessionStore((state) => state.userName);
  const userImage = useSessionStore((state) => state.userImage);
  console.log(userImage, 'user image');
  console.log(userName, 'user name');
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
          <div className="flex items-center gap-2">
            {userName &&
              <AvatarUser name={userName} src={userImage} />
            }
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
