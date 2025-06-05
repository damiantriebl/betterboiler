"use client";

import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, CreditCard, Palette, Settings, Users } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Determinar la pestaña activa basada en la ruta
  const getActiveTab = () => {
    if (pathname.includes("/mercadopago")) return "mercadopago";
    return "general";
  };

  const handleTabChange = (value: string) => {
    switch (value) {
      case "mercadopago":
        router.push("/settings/mercadopago");
        break;
      case "general":
        router.push("/settings");
        break;
      default:
        break;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configuración</h1>
          <p className="text-muted-foreground">Gestiona la configuración de tu organización</p>
        </div>

        <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="mercadopago" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Mercado Pago
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2" disabled>
              <Palette className="h-4 w-4" />
              Apariencia
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2" disabled>
              <Users className="h-4 w-4" />
              Usuarios
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2" disabled>
              <Bell className="h-4 w-4" />
              Notificaciones
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">{children}</div>
        </Tabs>
      </div>
    </div>
  );
}
