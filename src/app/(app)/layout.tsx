// Layout.tsx
"use client";
import { getOrganization } from "@/actions/get-organization";
import { getSession } from "@/actions/get-session";
import NavbarSticky from "@/components/custom/NavbarSticky";
import AppSidebar from "@/components/ui/app-sidebar";
import { PriceModeSelector } from "@/components/ui/price-mode-selector";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useSessionStore } from "@/stores/SessionStore";
import { useEffect, useRef, useState } from "react";
import TestDevtools from "./testdevtool";
import { Input } from "@/components/ui/input";

interface Org {
  logo: string | null;
  thumbnail: string | null;
  name: string;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [org, setOrg] = useState<Org | null>(null);
  const [scrollAmount, setScrollAmount] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);

  // Acceso al store de sesión
  const setSession = useSessionStore((state) => state.setSession);

  // Cargar datos de sesión completos
  useEffect(() => {
    getSession().then((sessionData) => {
      if (sessionData) {
        // Actualizar el store con todos los datos de sesión
        setSession(sessionData);

        // Actualizar el estado local del org para NavbarSticky (si se requiere)
        if (sessionData.organizationName) {
          setOrg({
            logo: sessionData.organizationLogo || null,
            thumbnail: null, // No tenemos thumbnail en la sesión
            name: sessionData.organizationName
          });
        }
      }
    }).catch(console.error);
  }, [setSession]);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const scrollTransitionDistance = 100;

    const handleScroll = () => {
      const currentScroll = el.scrollTop;
      const amount = Math.min(1, Math.max(0, currentScroll / scrollTransitionDistance));
      setScrollAmount(amount);
    };

    handleScroll();

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="relative">
          <SidebarTrigger />
        </div>
        <main ref={mainRef} className="flex flex-col flex-1 overflow-y-auto items-center">
          <div className="flex items-end w-full justify-end pr-16">
            <PriceModeSelector />
          </div>
          {/* NavbarSticky ahora puede trabajar con o sin props de organización */}
          <NavbarSticky scrollAmount={scrollAmount} organization={org || undefined} />

          <div className="w-full">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
