"use client";

import { useSessionErrorHandler } from "@/hooks/useSessionErrorHandler";
import { useEffect, useState } from "react";

interface SessionErrorBoundaryProps {
    children: React.ReactNode;
    sessionError?: string | null;
    fallbackComponent?: React.ReactNode;
}

function SessionErrorFallback({ error }: { error: string }) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="max-w-md mx-auto text-center p-6">
                <div className="w-16 h-16 mx-auto mb-4">
                    <svg
                        className="w-full h-full text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                    </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Error de Sesión
                </h2>
                <p className="text-gray-600 mb-4">
                    {error === "No se encontró la sesión del usuario"
                        ? "Tu sesión ha expirado. Serás redirigido al inicio de sesión."
                        : error === "Usuario no tiene organización asignada"
                            ? "Tu usuario no tiene una organización asignada. Contacta al administrador."
                            : "Ha ocurrido un error con tu sesión. Por favor, intenta nuevamente."}
                </p>
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                    <span className="ml-2 text-sm text-gray-500">
                        Redirigiendo...
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function SessionErrorBoundary({
    children,
    sessionError,
    fallbackComponent,
}: SessionErrorBoundaryProps) {
    const [isClient, setIsClient] = useState(false);

    // Detectar cuando estamos en el cliente
    useEffect(() => {
        setIsClient(true);
    }, []);

    // No mostrar nada hasta que se hidrate en el cliente
    if (!isClient) {
        return <>{children}</>;
    }

    // Solo mostrar error para errores críticos internos
    if (sessionError && sessionError.startsWith("Error interno:")) {
        return fallbackComponent || <SessionErrorFallback error={sessionError} />;
    }

    // Renderizar children normalmente para casos normales (sin sesión, sin org, etc.)
    return <>{children}</>;
} 