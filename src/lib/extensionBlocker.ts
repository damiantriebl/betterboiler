// Utilidad para detectar y bloquear inyección de extensiones Chrome problemáticas
import { isDevelopment } from '@/lib/env';

export const blockChromeExtensions = () => {
  if (typeof window === 'undefined') return;

  // Detectar si estamos en desarrollo
  const isDev = isDevelopment();

  // Solo ejecutar en desarrollo donde suelen aparecer estos problemas
  if (!isDev) return;

  try {
    // Bloquear intentos de acceso a chrome-extension://
    const originalFetch = window.fetch;
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      const url = input.toString();
      
      // Bloquear solicitudes a extensiones Chrome
      if (url.includes('chrome-extension://')) {
        console.warn('🚫 [EXTENSION_BLOCKER] Bloqueando solicitud a extensión Chrome:', url);
        return Promise.reject(new TypeError('Chrome extension request blocked'));
      }
      
      return originalFetch.call(this, input, init);
    };

    // Interceptar errores de módulos dinámicos relacionados con extensiones
    window.addEventListener('error', (event) => {
      const error = event.error;
      const message = event.message || '';
      
      // Detectar errores relacionados con extensiones Chrome
      if (
        message.includes('chrome-extension://') ||
        message.includes('Failed to fetch dynamically imported module') ||
        (error && error.stack && error.stack.includes('chrome-extension://'))
      ) {
        console.warn('🚫 [EXTENSION_BLOCKER] Error de extensión Chrome detectado y manejado:', message);
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    }, true);

    // Interceptar promesas rechazadas relacionadas con extensiones
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const message = reason?.message || reason?.toString() || '';
      
      if (
        message.includes('chrome-extension://') ||
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('net::ERR_FAILED')
      ) {
        console.warn('🚫 [EXTENSION_BLOCKER] Promise rechazada por extensión Chrome:', message);
        event.preventDefault();
        return false;
      }
    });

    // Crear observer para detectar elementos inyectados por extensiones
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Detectar scripts inyectados por extensiones
            if (element.tagName === 'SCRIPT') {
              const src = element.getAttribute('src') || '';
              if (src.includes('chrome-extension://')) {
                console.warn('🚫 [EXTENSION_BLOCKER] Removiendo script de extensión:', src);
                element.remove();
              }
            }
            
            // Detectar elementos con atributos de extensiones
            if (element.hasAttribute && (
              element.hasAttribute('data-extension-id') ||
              element.className?.includes('extension-') ||
              element.id?.includes('extension-')
            )) {
              console.warn('🚫 [EXTENSION_BLOCKER] Removiendo elemento de extensión:', element);
              element.remove();
            }
          }
        });
      });
    });

    // Iniciar observación
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('✅ [EXTENSION_BLOCKER] Sistema de bloqueo de extensiones activado');

  } catch (error) {
    console.warn('⚠️ [EXTENSION_BLOCKER] Error configurando bloqueo de extensiones:', error);
  }
};

// Hook para usar en componentes React
export const useExtensionBlocker = () => {
  if (typeof window !== 'undefined') {
    blockChromeExtensions();
  }
}; 