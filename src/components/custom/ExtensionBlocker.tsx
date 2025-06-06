"use client";

import { useEffect } from "react";

export default function ExtensionBlocker() {
  useEffect(() => {
    // Bloquear extensiones de Chrome conocidas problemáticas
    const blockExtensions = () => {
      // Lista de IDs de extensiones conocidas que causan problemas
      const problematicExtensions = [
        "jggapkmopfnbcolaeiigmammeiodbglc", // Extensión reportada en el error
        "3d7beca7-ba70-47e2-9c79-10d383cb88ae", // Otra extensión reportada
      ];

      // Bloquear carga de scripts de extensiones
      const originalFetch = window.fetch;
      window.fetch = function (input, init) {
        let url: string;
        if (typeof input === "string") {
          url = input;
        } else if (input instanceof Request) {
          url = input.url;
        } else {
          url = input.href;
        }

        // Bloquear URLs de extensiones
        if (url.startsWith("chrome-extension://")) {
          const extensionId = url.split("chrome-extension://")[1]?.split("/")[0];
          if (problematicExtensions.includes(extensionId || "")) {
            console.log(`🚫 [EXTENSION BLOCKER] Blocked extension request: ${url}`);
            return Promise.reject(new Error("Extension blocked"));
          }
        }

        return originalFetch.call(this, input, init);
      };

      // Bloquear dynamic imports de extensiones de manera más agresiva
      const originalWebpackRequire = (window as any).__webpack_require__;
      if (originalWebpackRequire) {
        (window as any).__webpack_require__ = function (moduleId: string) {
          if (
            typeof moduleId === "string" &&
            (moduleId.includes("chrome-extension://") || moduleId.includes("extension://"))
          ) {
            console.log(`🚫 [EXTENSION BLOCKER] Blocked dynamic import: ${moduleId}`);
            return { default: () => null };
          }
          return originalWebpackRequire.call(this, moduleId);
        };
      }

      // Interceptar eval para bloquear extensiones
      // biome-ignore lint/security/noGlobalEval: wrapping eval to prevent extension usage
      const originalEval = window.eval;
      window.eval = (code: string) => {
        if (
          typeof code === "string" &&
          (code.includes("chrome-extension://") || code.includes("extension://"))
        ) {
          console.log(`🚫 [EXTENSION BLOCKER] Blocked eval with extension: ${code}`);
          return null;
        }
        return originalEval.call(window, code);
      };

      // Prevenir inyección de scripts de extensiones
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;

              // Remover scripts de extensiones
              if (element.tagName === "SCRIPT") {
                const src = element.getAttribute("src");
                if (src?.startsWith("chrome-extension://")) {
                  console.log(`🚫 [EXTENSION BLOCKER] Removed extension script: ${src}`);
                  element.remove();
                }
              }

              // Remover iframes de extensiones
              if (element.tagName === "IFRAME") {
                const src = element.getAttribute("src");
                if (src?.startsWith("chrome-extension://")) {
                  console.log(`🚫 [EXTENSION BLOCKER] Removed extension iframe: ${src}`);
                  element.remove();
                }
              }
            }
          }
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });

      // Cleanup
      return () => {
        observer.disconnect();
        window.fetch = originalFetch;
        window.eval = originalEval;
        if (originalWebpackRequire) {
          (window as any).__webpack_require__ = originalWebpackRequire;
        }
      };
    };

    const cleanup = blockExtensions();

    return cleanup;
  }, []);

  // Añadir meta tags para bloquear extensiones
  useEffect(() => {
    // CSP header para bloquear extensiones
    const meta = document.createElement("meta");
    meta.httpEquiv = "Content-Security-Policy";
    meta.content =
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; object-src 'none'; base-uri 'self';";
    document.head.appendChild(meta);

    // Meta tag para bloquear extensiones específicamente
    const extensionMeta = document.createElement("meta");
    extensionMeta.name = "extension-block";
    extensionMeta.content = "deny-all";
    document.head.appendChild(extensionMeta);

    return () => {
      meta.remove();
      extensionMeta.remove();
    };
  }, []);

  return null; // Este componente no renderiza nada
}
