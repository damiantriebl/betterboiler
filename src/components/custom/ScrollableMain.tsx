"use client";

import type React from "react";
import { useScrollAmount } from "@/hooks/use-scroll-amount";
import NavbarSticky from "./NavbarSticky";

interface ScrollableMainProps {
  children: React.ReactNode;
  organizationData?: {
    logo: string | null;
    thumbnail: string | null;
    name: string;
  } | null;
}

export default function ScrollableMain({ children, organizationData }: ScrollableMainProps) {
  const { scrollAmount, mainRef } = useScrollAmount();

  return (
    <main ref={mainRef} className="flex flex-col flex-1 overflow-y-auto items-center">
      <NavbarSticky scrollAmount={scrollAmount} organization={organizationData || undefined} />
      <div className="w-full">{children}</div>
    </main>
  );
}
