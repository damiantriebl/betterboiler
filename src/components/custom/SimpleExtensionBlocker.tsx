"use client";

import { useEffect } from "react";

export default function SimpleExtensionBlocker() {
    useEffect(() => {
        // Solo bloquear elementos DOM inyectados por extensiones
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as Element;

                        // Remover scripts de extensiones
                        if (element.tagName === 'SCRIPT') {
                            const src = element.getAttribute('src');
                            if (src && src.startsWith('chrome-extension://')) {
                                element.remove();
                            }
                        }

                        // Remover iframes de extensiones
                        if (element.tagName === 'IFRAME') {
                            const src = element.getAttribute('src');
                            if (src && src.startsWith('chrome-extension://')) {
                                element.remove();
                            }
                        }
                    }
                });
            });
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    return null;
} 