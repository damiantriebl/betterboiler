"use client";

import { authClient } from "@/auth-client";
import { useEffect, useState } from "react";

interface CookieInfo {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: string;
}

export default function CookiesDebugPage() {
    const [cookies, setCookies] = useState<CookieInfo[]>([]);
    const [session, setSession] = useState<any>(null);
    const [sessionLoading, setSessionLoading] = useState(true);
    const [sessionError, setSessionError] = useState<string | null>(null);

    useEffect(() => {
        // Obtener todas las cookies disponibles
        const allCookies = document.cookie.split(';').map(cookie => {
            const [name, value] = cookie.trim().split('=');
            return {
                name: name || '',
                value: value || '',
            };
        }).filter(cookie => cookie.name);

        setCookies(allCookies);

        // Obtener información de sesión
        const fetchSession = async () => {
            try {
                setSessionLoading(true);
                console.log('🔍 [DEBUG] Obteniendo sesión desde authClient...');

                const sessionData = await authClient.getSession();
                console.log('✅ [DEBUG] Sesión obtenida:', sessionData);
                setSession(sessionData);
            } catch (error) {
                console.error('🚨 [DEBUG] Error obteniendo sesión:', error);
                setSessionError(error instanceof Error ? error.message : String(error));
            } finally {
                setSessionLoading(false);
            }
        };

        fetchSession();
    }, []);

    const relevantCookies = cookies.filter(cookie =>
        cookie.name.toLowerCase().includes('auth') ||
        cookie.name.toLowerCase().includes('session') ||
        cookie.name.toLowerCase().includes('better') ||
        cookie.name.toLowerCase().includes('token')
    );

    return (
        <div className="container mx-auto p-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8">🍪 Debug de Cookies y Sesión</h1>

            {/* Información de Sesión */}
            <div className="mb-8 p-6 bg-gray-50 rounded-lg">
                <h2 className="text-2xl font-semibold mb-4">📊 Información de Sesión</h2>
                {sessionLoading ? (
                    <p className="text-blue-600">⏳ Cargando sesión...</p>
                ) : sessionError ? (
                    <div className="text-red-600">
                        <p className="font-semibold">❌ Error:</p>
                        <pre className="mt-2 bg-red-50 p-3 rounded text-sm overflow-x-auto">
                            {sessionError}
                        </pre>
                    </div>
                ) : session ? (
                    <div className="text-green-600">
                        <p className="font-semibold">✅ Sesión encontrada:</p>
                        <pre className="mt-2 bg-green-50 p-3 rounded text-sm overflow-x-auto">
                            {JSON.stringify(session, null, 2)}
                        </pre>
                    </div>
                ) : (
                    <p className="text-yellow-600">⚠️ No hay sesión activa</p>
                )}
            </div>

            {/* Cookies Relevantes */}
            <div className="mb-8 p-6 bg-blue-50 rounded-lg">
                <h2 className="text-2xl font-semibold mb-4">🔐 Cookies Relevantes ({relevantCookies.length})</h2>
                {relevantCookies.length > 0 ? (
                    <div className="space-y-3">
                        {relevantCookies.map((cookie, index) => (
                            <div key={index} className="bg-white p-3 rounded border">
                                <div className="font-mono text-sm">
                                    <span className="font-semibold text-blue-600">{cookie.name}</span>
                                    <span className="text-gray-500 mx-2">=</span>
                                    <span className="text-gray-700 break-all">
                                        {cookie.value.length > 50
                                            ? `${cookie.value.substring(0, 50)}...`
                                            : cookie.value
                                        }
                                    </span>
                                </div>
                                {cookie.value.length > 50 && (
                                    <details className="mt-2">
                                        <summary className="text-xs text-gray-500 cursor-pointer">Ver valor completo</summary>
                                        <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                            {cookie.value}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-red-600">❌ No se encontraron cookies relevantes de autenticación</p>
                )}
            </div>

            {/* Todas las Cookies */}
            <div className="mb-8 p-6 bg-gray-50 rounded-lg">
                <h2 className="text-2xl font-semibold mb-4">📋 Todas las Cookies ({cookies.length})</h2>
                {cookies.length > 0 ? (
                    <div className="grid gap-2">
                        {cookies.map((cookie, index) => (
                            <div key={index} className="bg-white p-2 rounded border font-mono text-sm">
                                <span className="font-semibold">{cookie.name}</span>
                                <span className="text-gray-500 mx-2">=</span>
                                <span className="text-gray-700 break-all">
                                    {cookie.value.length > 30
                                        ? `${cookie.value.substring(0, 30)}...`
                                        : cookie.value
                                    }
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-yellow-600">⚠️ No se encontraron cookies</p>
                )}
            </div>

            {/* Información del Navegador */}
            <div className="p-6 bg-gray-50 rounded-lg">
                <h2 className="text-2xl font-semibold mb-4">🌐 Información del Navegador</h2>
                <div className="space-y-2 text-sm">
                    <p><span className="font-semibold">URL:</span> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
                    <p><span className="font-semibold">User Agent:</span> {typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}</p>
                    <p><span className="font-semibold">Cookies habilitadas:</span> {typeof navigator !== 'undefined' ? (navigator.cookieEnabled ? '✅ Sí' : '❌ No') : 'N/A'}</p>
                    <p><span className="font-semibold">Local Storage:</span> {typeof window !== 'undefined' && window.localStorage ? '✅ Disponible' : '❌ No disponible'}</p>
                </div>
            </div>

            {/* Botones de Acción */}
            <div className="mt-8 flex gap-4">
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    🔄 Recargar Página
                </button>
                <button
                    onClick={() => {
                        console.log('🔍 [DEBUG] Limpiando todas las cookies...');
                        document.cookie.split(";").forEach(function (c) {
                            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                        });
                        window.location.reload();
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    🗑️ Limpiar Cookies
                </button>
            </div>
        </div>
    );
} 