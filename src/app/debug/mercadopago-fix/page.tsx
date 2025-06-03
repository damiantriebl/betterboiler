"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export default function MercadoPagoFixPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleForcePublicKey = async () => {
        setLoading(true);
        setResult(null);

        try {
            const response = await fetch('/api/debug/mercadopago-force-public-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({
                success: false,
                error: 'Error de conexión',
                details: error instanceof Error ? error.message : 'Error desconocido'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCheckConfig = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/debug/mercadopago-config');
            const data = await response.json();
            setResult({
                ...data,
                type: 'config_check'
            });
        } catch (error) {
            setResult({
                success: false,
                error: 'Error verificando configuración',
                details: error instanceof Error ? error.message : 'Error desconocido'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleReconnect = () => {
        window.location.href = '/configuration';
    };

    return (
        <div className="container max-w-4xl mx-auto px-4 py-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5" />
                        Debug MercadoPago - Solución Public Key
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Herramientas para diagnosticar y arreglar el problema de public key nula en MercadoPago
                    </p>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* Botones de acción */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button
                            onClick={handleCheckConfig}
                            disabled={loading}
                            variant="outline"
                            className="w-full"
                        >
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                            Verificar Configuración
                        </Button>

                        <Button
                            onClick={handleForcePublicKey}
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                            Forzar Obtención Public Key
                        </Button>

                        <Button
                            onClick={handleReconnect}
                            disabled={loading}
                            variant="secondary"
                            className="w-full"
                        >
                            Ir a Configuración
                        </Button>
                    </div>

                    {/* Resultados */}
                    {result && (
                        <Card className={`${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    {result.success ? (
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-red-600" />
                                    )}
                                    {result.success ? 'Éxito' : 'Error'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {result.type === 'config_check' ? (
                                    <div className="space-y-3">
                                        <p className="font-medium">Configuraciones encontradas: {result.totalConfigs}</p>
                                        {result.configs?.map((config: any, index: number) => (
                                            <div key={index} className="bg-white p-3 rounded border space-y-2">
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div>
                                                        <strong>Organización:</strong> {config.organizationId}
                                                    </div>
                                                    <div>
                                                        <strong>Access Token:</strong> {config.hasAccessToken ? '✅ Presente' : '❌ Ausente'}
                                                    </div>
                                                    <div>
                                                        <strong>Public Key:</strong> {config.hasPublicKey ? '✅ Presente' : '❌ AUSENTE'}
                                                    </div>
                                                    <div>
                                                        <strong>Última actualización:</strong> {new Date(config.updatedAt).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {result.message && (
                                            <p className="text-green-800 font-medium">{result.message}</p>
                                        )}

                                        {result.error && (
                                            <p className="text-red-800 font-medium">{result.error}</p>
                                        )}

                                        {result.publicKey && (
                                            <div className="bg-white p-3 rounded border">
                                                <strong>Public Key obtenida:</strong> {result.publicKey}
                                            </div>
                                        )}

                                        {result.userInfo && (
                                            <div className="bg-white p-3 rounded border">
                                                <strong>Usuario MercadoPago:</strong>
                                                <ul className="mt-2 space-y-1 text-sm">
                                                    <li>ID: {result.userInfo.id}</li>
                                                    <li>Email: {result.userInfo.email}</li>
                                                    <li>Site: {result.userInfo.siteId}</li>
                                                </ul>
                                            </div>
                                        )}

                                        {result.attempts && result.attempts.length > 0 && (
                                            <div className="bg-white p-3 rounded border">
                                                <strong>Intentos realizados:</strong>
                                                <div className="mt-2 space-y-2">
                                                    {result.attempts.map((attempt: any, index: number) => (
                                                        <div key={index} className="text-sm border-l-2 pl-3 border-gray-300">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-2 h-2 rounded-full ${attempt.success ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                                <strong>{attempt.endpoint}</strong>
                                                                <span className="text-gray-500">({attempt.status || 'no-status'})</span>
                                                            </div>
                                                            {attempt.error && (
                                                                <p className="text-red-600 text-xs mt-1">{attempt.error}</p>
                                                            )}
                                                            {attempt.dataCount && (
                                                                <p className="text-blue-600 text-xs mt-1">Datos: {attempt.dataCount}</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {result.suggestions && (
                                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                                                <strong className="text-yellow-800">Sugerencias:</strong>
                                                <ul className="mt-2 space-y-1 text-sm text-yellow-700">
                                                    {result.suggestions.map((suggestion: string, index: number) => (
                                                        <li key={index}>• {suggestion}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* JSON completo para debugging */}
                                <details className="mt-4">
                                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                                        Ver respuesta completa (JSON)
                                    </summary>
                                    <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-60">
                                        {JSON.stringify(result, null, 2)}
                                    </pre>
                                </details>
                            </CardContent>
                        </Card>
                    )}

                    {/* Instrucciones */}
                    <Card className="bg-blue-50 border-blue-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg text-blue-800">
                                📋 Pasos para solucionar el problema
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ol className="space-y-2 text-sm text-blue-700">
                                <li><strong>1.</strong> Verificar configuración actual con el primer botón</li>
                                <li><strong>2.</strong> Si public key es null, usar "Forzar Obtención" para intentar recuperarla</li>
                                <li><strong>3.</strong> Si falla, desconectar y reconectar MercadoPago (ahora con scopes mejorados)</li>
                                <li><strong>4.</strong> Probar el checkout de nuevo después de obtener la public key</li>
                            </ol>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>
        </div>
    );
} 