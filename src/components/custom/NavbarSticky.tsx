// NavbarSticky.tsx
"use client";
import { PriceModeSelector } from "@/components/ui/price-mode-selector";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useSessionStore } from "@/stores/SessionStore";
import OrganizationLogo from "./OrganizationLogo";

interface NavbarStickyProps {
  organization?: { logo: string | null; thumbnail: string | null; name: string };
  scrollAmount: number;
}

export default function NavbarSticky({ organization, scrollAmount }: NavbarStickyProps) {
  // Usar el store para obtener datos si no se proporcionan como props
  const storeOrgName = useSessionStore((state) => state.organizationName);
  const storeOrgLogo = useSessionStore((state) => state.organizationLogo);

  // Usar los datos del store o los proporcionados como props
  const orgData = () => {
    if (organization) return organization;
    return {
      logo: storeOrgLogo,
      thumbnail: null, // No tenemos thumbnail en el store todavía
      name: storeOrgName || "Organización",
    };
  };

  const logoKey = () => {
    const orgDataResult = orgData();
    if (!orgDataResult.logo && !orgDataResult.thumbnail) return null;
    return scrollAmount > 0.5 && orgDataResult.thumbnail
      ? orgDataResult.thumbnail
      : orgDataResult.logo;
  };

  const height = () => {
    const startHeight = 9; // Reducido para evitar que se extienda demasiado
    const endHeight = 3.5;
    return startHeight - scrollAmount * (startHeight - endHeight);
  };

  const paddingY = () => {
    const startPadding = 1; // Reducido para menos altura total
    const endPadding = 0.5;
    return startPadding - scrollAmount * (startPadding - endPadding);
  };

  const logoSize = () => {
    const startSize = 7; // Logo aún más grande
    const endSize = 3.5;
    return Math.max(endSize, startSize - scrollAmount * (startSize - endSize));
  };

  const logoVariant = () => {
    return scrollAmount > 0.3 ? "default" : "bare";
  };

  const nameOpacity = () => {
    const startFade = 0.8;
    const endFade = 0.95;
    let calculatedOpacity = 0;
    if (scrollAmount <= startFade) {
      calculatedOpacity = 0;
    } else if (scrollAmount >= endFade) {
      calculatedOpacity = 1;
    } else {
      calculatedOpacity = (scrollAmount - startFade) / (endFade - startFade);
    }
    return calculatedOpacity;
  };

  // Padding top dinámico para evitar que se corte
  const paddingTop = () => {
    const startPadding = 0.75; // Reducido para menos altura total
    const endPadding = 0.25;
    return startPadding - scrollAmount * (startPadding - endPadding);
  };

  return (
    <div
      className={`
        sticky top-0 z-10 w-full
        bg-transparent backdrop-blur-sm 
        transition-all duration-200 ease-out
        flex items-center justify-between pr-10
      `}
      style={{
        height: `${height}rem`,
        paddingTop: `${paddingTop}rem`,
        paddingBottom: `${paddingY}rem`,
        paddingLeft: "1rem",
        paddingRight: "1rem",
      }}
    >
      {/* SidebarTrigger en la izquierda */}
      <div className="flex items-center">
        <SidebarTrigger />
      </div>

      {/* Logo en el centro */}
      <div className="flex items-center space-x-4">
        {logoKey() && (
          <OrganizationLogo
            logo={logoKey()}
            thumbnail={orgData().thumbnail}
            name={orgData().name}
            size={logoSize()}
            variant={logoVariant()}
            nameDisplayOpacity={nameOpacity()}
          />
        )}
      </div>

      {/* Selector de precios en la derecha */}
      <div className="flex items-center">
        <PriceModeSelector />
      </div>
    </div>
  );
}
