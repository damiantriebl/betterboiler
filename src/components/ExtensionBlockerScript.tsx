"use client";

import { blockChromeExtensions } from "@/lib/extensionBlocker";
import { useEffect } from "react";

export const ExtensionBlockerScript = () => {
  useEffect(() => {
    // Ejecutar el bloqueador de extensiones solo en el cliente
    blockChromeExtensions();
  }, []);

  return null; // Este componente no renderiza nada
};
