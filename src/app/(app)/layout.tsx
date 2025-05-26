// Layout.tsx
"use client";
import { getSession } from "@/actions/util";
import NavbarSticky from "@/components/custom/NavbarSticky";
import AppSidebar from "@/components/ui/app-sidebar";
import { PriceModeSelector } from "@/components/ui/price-mode-selector";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import type { SessionState } from "@/stores/SessionStore";
import { useSessionStore } from "@/stores/SessionStore";
import { useEffect, useRef, useState } from "react";

interface Org {
  logo: string | null;
  thumbnail: string | null;
  name: string;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [org, setOrg] = useState<Org | null>(null);
  const [scrollAmount, setScrollAmount] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);

  const setSession = useSessionStore((state) => state.setSession);

  useEffect(() => {
    getSession()
      .then((sessionDataResponse) => {
        if (sessionDataResponse.session) {
          const currentSession = sessionDataResponse.session;

          const sessionToStore: Partial<Omit<SessionState, "setSession" | "clearSession">> = {
            userId: currentSession.user?.id ?? null,
            userName: currentSession.user?.name ?? null,
            userEmail: currentSession.user?.email ?? null,
            userImage: currentSession.user?.image ?? null,
            userRole: currentSession.user?.role ?? null,
            organizationId: currentSession.user?.organizationId ?? null,
            organizationName: null,
            organizationLogo: null,
          };
          setSession(sessionToStore);

          if (sessionToStore.organizationLogo || sessionToStore.organizationName) {
            setOrg({
              logo: sessionToStore.organizationLogo || null,
              thumbnail: null,
              name: sessionToStore.organizationName || "Organización",
            });
          }
        }
      })
      .catch(console.error);
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
          <NavbarSticky scrollAmount={scrollAmount} organization={org || undefined} />

          <div className="w-full">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
