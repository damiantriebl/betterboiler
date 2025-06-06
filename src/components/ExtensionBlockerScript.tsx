'use client';

import { useEffect } from 'react';
import { blockChromeExtensions } from '@/lib/extensionBlocker';

export const ExtensionBlockerScript = () => {
    useEffect(() => {
        // Ejecutar el bloqueador de extensiones solo en el cliente
        blockChromeExtensions();
    }, []);

    return null; // Este componente no renderiza nada
}; 