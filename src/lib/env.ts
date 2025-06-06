// Función segura para detectar modo desarrollo en cliente y servidor
export const isDevelopment = (): boolean => {
  // En el servidor, usar process.env
  if (typeof window === "undefined") {
    return process.env.NODE_ENV === "development";
  }
  
  // En el cliente, usar múltiples métodos de detección
  if (typeof window !== "undefined") {
    // Método 1: Detectar localhost/desarrollo local
    const isLocalhost = window.location.hostname === "localhost" || 
                       window.location.hostname === "127.0.0.1" ||
                       window.location.hostname.includes("localhost") ||
                       window.location.port === "3000";
    
    // Método 2: Verificar si estamos en un dominio de desarrollo
    const isDevelopmentDomain = window.location.hostname.includes("localhost") ||
                               window.location.hostname.includes("dev") ||
                               window.location.hostname.includes("staging");
    
    // Método 3: Next.js buildId check (funciona en desarrollo)
    try {
      const nextData = (window as any).__NEXT_DATA__;
      if (nextData?.buildId === "development") {
        return true;
      }
    } catch {
      // Ignorar errores
    }
    
    // Método 4: Verificar parámetros de URL para desarrollo
    const urlParams = new URLSearchParams(window.location.search);
    const debugMode = urlParams.get('debug') === 'true';
    
    return isLocalhost || isDevelopmentDomain || debugMode;
  }
  
  return false;
}; 