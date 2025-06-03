"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, AlertCircle, CheckCircle, Copy, Eye, EyeOff, CreditCard, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TestMercadoPagoProps {
    organizationId: string;
}

interface ConfigStatus {
    hasGlobalAccessToken: boolean;
    hasGlobalPublicKey: boolean;
    hasOAuthConfig: boolean;
    hasOAuthAccessToken: boolean;
    oauthEmail: string | null;
    environment: 'sandbox' | 'production' | 'unknown';
    integrationMode: 'oauth' | 'direct' | 'incomplete';
    organizationConnected: boolean;
}

export default function TestMercadoPago({ organizationId }: TestMercadoPagoProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<any>(null);
    const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
    const [showCredentials, setShowCredentials] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        checkConfiguration();
    }, []);

    const checkConfiguration = async () => {
        try {
            const response = await fetch('/api/configuration/mercadopago/status');
            if (response.ok) {
                const data = await response.json();
                setConfigStatus(data);
            }
        } catch (error) {
            console.log('Error verificando configuración:', error);
        }
    };

    const testGlobalCredentials = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        setDebugInfo(null);

        try {
            console.log('🔧 Testeando credenciales globales...');

            const response = await fetch('/api/configuration/mercadopago/validate-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('✅ Credenciales globales válidas');
                setDebugInfo(data);
                toast({
                    title: "Credenciales globales OK",
                    description: `Aplicación conectada como: ${data.user?.email || 'Usuario válido'}`,
                });
            } else {
                setError(`❌ Error: ${data.error || 'Credenciales inválidas'}`);
                setDebugInfo(data);
            }

        } catch (error) {
            console.error('💥 Error validando credenciales globales:', error);
            setError(`💥 Error de red: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    const testDirectPayment = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            console.log('🧪 Testeando pago directo...');

            const response = await fetch('/api/payments/mercadopago/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    transaction_amount: 100,
                    description: 'Test de Pago Directo - Mercado Pago',
                    payer: {
                        email: 'test_user_1234@testuser.com'
                    }
                })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(`✅ Pago de prueba creado: ID ${data.payment?.id}`);
                setDebugInfo(data);
                toast({
                    title: "Test de pago exitoso",
                    description: `Pago ${data.payment?.status} por $${data.payment?.amount}`,
                });
            } else {
                setError(`❌ Error en pago: ${data.error}`);
                setDebugInfo(data);
            }

        } catch (error) {
            console.error('💥 Error en test de pago:', error);
            setError(`💥 Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    const connectOrganization = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        setDebugInfo(null);

        try {
            console.log('🔧 Iniciando conexión OAuth para organización...');

            const response = await fetch('/api/configuration/mercadopago/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    organizationId,
                    webhookUrl: `${window.location.origin}/api/webhooks/mercadopago/${organizationId}`,
                    notificationUrl: `${window.location.origin}/api/notifications/mercadopago/${organizationId}`
                })
            });

            const responseText = await response.text();

            if (response.ok) {
                const data = JSON.parse(responseText);
                setSuccess('✅ URL de conexión generada');
                setDebugInfo(data);

                if (data.authUrl) {
                    console.log('🚀 Abriendo URL de autorización de Mercado Pago...');

                    // Mostrar instrucciones antes de abrir la ventana
                    toast({
                        title: "Abriendo MercadoPago",
                        description: "Se abre en nueva pestaña. Si hay error 400, verifica la configuración del callback.",
                        duration: 5000,
                    });

                    // Abrir en nueva pestaña
                    const newWindow = window.open(data.authUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');

                    if (!newWindow) {
                        toast({
                            title: "Bloqueador de ventanas",
                            description: "Permite ventanas emergentes y vuelve a intentar",
                            variant: "destructive"
                        });
                    }
                }
            } else {
                const errorData = JSON.parse(responseText);
                setError(`❌ Error OAuth: ${errorData.error}`);
                setDebugInfo(errorData);
            }

        } catch (error) {
            console.error('💥 Error OAuth:', error);
            setError(`💥 Error OAuth: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copiado",
            description: "Texto copiado al portapapeles",
        });
    };

    const getStatusBadge = (hasItem: boolean, label: string, isOptional: boolean = false) => (
        <Badge variant={hasItem ? "default" : isOptional ? "secondary" : "destructive"} className="mr-2 mb-2">
            {hasItem ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
            {label}
        </Badge>
    );

    const getIntegrationModeInfo = () => {
        if (!configStatus) return null;

        switch (configStatus.integrationMode) {
            case 'direct':
                return {
                    title: '💳 Modo: Pagos Directos',
                    description: 'Tu aplicación puede procesar pagos usando credenciales globales',
                    color: 'bg-green-50 border-green-200',
                    available: ['Procesar pagos directos', 'Crear órdenes', 'Webhooks', 'Testing completo'],
                    next: configStatus.organizationConnected ? [] : ['Conectar organizaciones para marketplace']
                };
            case 'oauth':
                return {
                    title: '🏢 Modo: Marketplace Completo',
                    description: 'Funcionalidad completa: pagos directos + organizaciones conectadas',
                    color: 'bg-blue-50 border-blue-200',
                    available: ['Todo lo de pagos directos', 'Organizaciones conectadas', 'Marketplace completo'],
                    next: []
                };
            default:
                return {
                    title: '⚠️ Configuración Incompleta',
                    description: 'Faltan credenciales globales para funcionar',
                    color: 'bg-yellow-50 border-yellow-200',
                    available: ['Configurar credenciales globales'],
                    next: ['Agregar ACCESS_TOKEN y PUBLIC_KEY al .env']
                };
        }
    };

    const modeInfo = getIntegrationModeInfo();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    🧪 Test Mercado Pago
                    <Badge variant="outline">
                        {configStatus?.environment === 'sandbox' ? 'Sandbox' :
                            configStatus?.environment === 'production' ? 'Production' : 'Sin configurar'}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Modo de integración */}
                {modeInfo && (
                    <div className={`p-4 rounded-lg border ${modeInfo.color}`}>
                        <h4 className="font-medium mb-2">{modeInfo.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{modeInfo.description}</p>
                        <div className="text-sm">
                            <p className="font-medium mb-1">✅ Disponible:</p>
                            <ul className="list-disc list-inside space-y-1 mb-3">
                                {modeInfo.available.map((item, index) => (
                                    <li key={index} className="text-xs">{item}</li>
                                ))}
                            </ul>
                            {modeInfo.next.length > 0 && (
                                <div>
                                    <p className="font-medium mb-1">🎯 Siguiente paso:</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        {modeInfo.next.map((item, index) => (
                                            <li key={index} className="text-xs text-blue-600">{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Estado de configuración */}
                {configStatus && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-3">📋 Estado de Credenciales</h4>

                        <div className="mb-4">
                            <p className="text-sm font-medium mb-2">🌐 Credenciales Globales (.env):</p>
                            <div className="flex flex-wrap">
                                {getStatusBadge(configStatus.hasGlobalAccessToken, "ACCESS_TOKEN")}
                                {getStatusBadge(configStatus.hasGlobalPublicKey, "PUBLIC_KEY")}
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-medium mb-2">🏢 Organización Conectada (BD):</p>
                            <div className="flex flex-wrap">
                                {getStatusBadge(configStatus.hasOAuthConfig, "OAuth Configurado", true)}
                                {configStatus.oauthEmail && (
                                    <Badge variant="default" className="mr-2 mb-2">
                                        <Building className="w-3 h-3 mr-1" />
                                        {configStatus.oauthEmail}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="mt-2">
                            <Badge variant={configStatus.environment === 'sandbox' ? "secondary" : "outline"}>
                                Entorno: {configStatus.environment}
                            </Badge>
                        </div>
                    </div>
                )}

                <div className="text-sm text-muted-foreground">
                    Organización ID: <code>{organizationId}</code>
                </div>

                {/* Botones de acción según configuración */}
                <div className="flex gap-2 flex-wrap">
                    {configStatus?.hasGlobalAccessToken && (
                        <Button
                            onClick={testGlobalCredentials}
                            disabled={loading}
                            variant="outline"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            1. Validar Credenciales Globales
                        </Button>
                    )}

                    {configStatus?.integrationMode === 'direct' && (
                        <>
                            <Button
                                onClick={testDirectPayment}
                                disabled={loading}
                                className="bg-green-500 hover:bg-green-600"
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <CreditCard className="h-4 w-4 mr-2" />
                                )}
                                2. Test Pago Directo
                            </Button>

                            {!configStatus.organizationConnected && (
                                <Button
                                    onClick={connectOrganization}
                                    disabled={loading}
                                    className="bg-blue-500 hover:bg-blue-600"
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Building className="h-4 w-4 mr-2" />
                                    )}
                                    3. Conectar Organización
                                </Button>
                            )}
                        </>
                    )}

                    {configStatus?.integrationMode === 'oauth' && (
                        <Button
                            onClick={testDirectPayment}
                            disabled={loading}
                            className="bg-green-500 hover:bg-green-600"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <CreditCard className="h-4 w-4 mr-2" />
                            )}
                            Test Pago (Marketplace)
                        </Button>
                    )}
                </div>

                {/* Alerts de estado */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>{success}</AlertDescription>
                    </Alert>
                )}

                {/* Debug info */}
                {debugInfo && (
                    <div className="mt-4">
                        <details className="bg-gray-50 p-3 rounded">
                            <summary className="font-medium cursor-pointer">📋 Debug Info</summary>
                            <pre className="mt-2 text-xs overflow-auto">
                                {JSON.stringify(debugInfo, null, 2)}
                            </pre>
                        </details>
                    </div>
                )}

                {/* Guía de configuración */}
                <div className="bg-blue-50 p-4 rounded text-sm">
                    <div className="font-medium mb-3 flex items-center gap-2">
                        📝 Arquitectura de Credenciales
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowCredentials(!showCredentials)}
                        >
                            {showCredentials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <p className="font-medium text-blue-900">🌐 Credenciales Globales (.env):</p>
                            <p className="text-xs text-blue-700">Para que tu aplicación funcione</p>
                        </div>

                        <div>
                            <p className="font-medium text-blue-900">🏢 Credenciales por Organización (BD):</p>
                            <p className="text-xs text-blue-700">Se van agregando cuando las organizaciones se conectan via OAuth</p>
                        </div>

                        <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                            <p className="font-medium text-yellow-800 mb-2">⚠️ Si OAuth da Error 400:</p>
                            <div className="text-xs text-yellow-700 space-y-1">
                                <p>1. Ve a: <strong>https://www.mercadopago.com.ar/developers/panel/app</strong></p>
                                <p>2. Selecciona tu app con CLIENT_ID: <strong>8619959583573876</strong></p>
                                <p>3. Configuración → Redirect URIs → Agregar:</p>
                                <p className="font-mono bg-white p-1 rounded">https://apex-one-lemon.vercel.app/api/configuration/mercadopago/callback</p>
                                <p>4. Guarda los cambios</p>
                            </div>
                        </div>

                        {showCredentials && (
                            <div className="bg-white p-3 rounded border">
                                <p className="font-medium text-blue-900 mb-2">Variables requeridas en .env.local:</p>
                                <div className="space-y-2 font-mono text-xs">
                                    <div className="flex items-center gap-2">
                                        <code className="bg-gray-100 p-1 rounded flex-1">
                                            MERCADOPAGO_ACCESS_TOKEN=TEST-tu_access_token_global
                                        </code>
                                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard('MERCADOPAGO_ACCESS_TOKEN=TEST-')}>
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code className="bg-gray-100 p-1 rounded flex-1">
                                            MERCADOPAGO_PUBLIC_KEY=TEST-tu_public_key_global
                                        </code>
                                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard('MERCADOPAGO_PUBLIC_KEY=TEST-')}>
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="mt-3 p-2 bg-green-50 rounded">
                                        <p className="text-xs font-medium text-green-800">✅ CLIENT_ID y CLIENT_SECRET:</p>
                                        <p className="text-xs text-green-700">Se almacenan automáticamente en la BD cuando cada organización se conecta</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <p className="font-medium text-blue-900">🧪 Testing con datos de prueba:</p>
                            <div className="text-xs space-y-1">
                                <p>• Email: test@testuser.com</p>
                                <p>• Tarjeta: 4509 9535 6623 3704 (Visa)</p>
                                <p>• CVV: 123, Exp: 11/30</p>
                                <p>• Titular: APRO (pago aprobado)</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Enlaces útiles */}
                <div className="bg-green-50 p-4 rounded text-sm">
                    <div className="font-medium mb-2">🔗 Enlaces útiles:</div>
                    <div className="space-y-1">
                        <a href="https://www.mercadopago.com.ar/developers/es/docs/checkout-api-v2/integration-model"
                            target="_blank" rel="noopener noreferrer"
                            className="block text-green-700 hover:underline">
                            📚 Documentación Checkout API
                        </a>
                        <a href="https://www.mercadopago.com.ar/developers/es/docs/checkout-api-v2/testing"
                            target="_blank" rel="noopener noreferrer"
                            className="block text-green-700 hover:underline">
                            🧪 Guía de testing oficial
                        </a>
                        <a href="https://www.mercadopago.com.ar/developers/panel/app"
                            target="_blank" rel="noopener noreferrer"
                            className="block text-green-700 hover:underline">
                            ⚙️ Panel de desarrolladores
                        </a>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
} 