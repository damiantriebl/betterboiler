// Helper para debuggear llamadas de auth desde el cliente
export const debugAuthCalls = () => {
  if (typeof window === "undefined") return;

  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    const [resource, options] = args;
    let url: string;

    if (typeof resource === "string") {
      url = resource;
    } else if (resource instanceof URL) {
      url = resource.toString();
    } else if (resource instanceof Request) {
      url = resource.url;
    } else {
      url = String(resource);
    }

    if (url.includes("/api/auth/")) {
      console.log("🚀 [CLIENT AUTH CALL]", {
        url,
        method: options?.method || "GET",
        timestamp: new Date().toISOString(),
        stack: new Error().stack?.split("\n").slice(2, 8).join("\n"),
      });
    }

    return originalFetch(...args);
  };
};

// Para usar en el layout principal o donde inicialices tu app
export const enableAuthDebugging = () => {
  if (process.env.NODE_ENV === "development") {
    debugAuthCalls();
  }
};
