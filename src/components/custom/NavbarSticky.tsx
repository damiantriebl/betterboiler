// NavbarSticky.tsx
"use client";
import { useMemo } from "react";
import OrganizationLogo from "./OrganizationLogo";
import { useSessionStore } from "@/stores/SessionStore";

interface NavbarStickyProps {
  organization?: { logo: string | null; thumbnail: string | null; name: string };
  scrollAmount: number;
}

export default function NavbarSticky({ organization, scrollAmount }: NavbarStickyProps) {
  // Usar el store para obtener datos si no se proporcionan como props
  const storeOrgName = useSessionStore((state) => state.organizationName);
  const storeOrgLogo = useSessionStore((state) => state.organizationLogo);

  // Usar los datos del store o los proporcionados como props
  const orgData = useMemo(() => {
    if (organization) return organization;
    return {
      logo: storeOrgLogo,
      thumbnail: null, // No tenemos thumbnail en el store todavía
      name: storeOrgName || "Organización"
    };
  }, [organization, storeOrgLogo, storeOrgName]);

  const logoKey = useMemo(() => {
    return scrollAmount > 0.5 && orgData.thumbnail
      ? orgData.thumbnail
      : orgData.logo;
  }, [orgData.logo, orgData.thumbnail, scrollAmount]);

  const height = useMemo(() => {
    const startHeight = 5;
    const endHeight = 3.5;
    return startHeight - scrollAmount * (startHeight - endHeight);
  }, [scrollAmount]);

  const paddingY = useMemo(() => {
    const startPadding = 0.75;
    const endPadding = 0.25;
    return startPadding - scrollAmount * (startPadding - endPadding);
  }, [scrollAmount]);

  const logoSize = useMemo(() => {
    const startSize = 8;
    const endSize = 2.5;
    return Math.max(endSize, startSize - scrollAmount * (startSize - endSize));
  }, [scrollAmount]);

  const logoVariant = useMemo(() => {
    return scrollAmount > 0.3 ? "default" : "bare";
  }, [scrollAmount]);

  const showName = scrollAmount > 0.7;
  const nameOpacity = useMemo(() => {
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
  }, [scrollAmount]);

  return (
    <div
      className={`
        sticky top-0 z-50 flex items-center justify-center space-x-4
        bg-background transition-all duration-200 ease-out
      `}
      style={{
        height: `${height}rem`,
        padding: `${paddingY}rem 0`,
      }}
    >
      <OrganizationLogo
        logo={logoKey}
        thumbnail={orgData.thumbnail}
        name={orgData.name}
        size={logoSize}
        variant={logoVariant}
        nameDisplayOpacity={nameOpacity}
      />
    </div>
  );
}
