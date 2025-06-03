"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, Check, X, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface MercadoPagoAccount {
    id: string;
    email: string;
    connected: boolean;
    webhookUrl: string;
    notificationUrl: string;
}

interface ManageMercadoPagoProps {
    organizationId: string;
}

export default function ManageMercadoPago({ organizationId }: ManageMercadoPagoProps) {
    const [account, setAccount] = useState<MercadoPagoAccount | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadMercadoPagoStatus();

        // Escuchar mensajes de ventanas popup OAuth
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            if (event.data.type === 'mp_oauth_success') {
                toast.success('🎉 OAuth Completado - MercadoPago conectado exitosamente');
                // Recargar el estado después de un OAuth exitoso
                setTimeout(() => {
                    loadMercadoPagoStatus();
                }, 2000);
            } else if (event.data.type === 'mp_oauth_error') {
                toast.error(`Error OAuth: ${event.data.error}${event.data.detail ? ` - ${event.data.detail}` : ''}`);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [organizationId]);

    const loadMercadoPagoStatus = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/configuration/mercadopago/status`);
            if (response.ok) {
                const data = await response.json();

                // Mapear respuesta del endpoint de status al formato de account
                if (data.organizationConnected && data.oauthEmail) {
                    setAccount({
                        id: organizationId, // Usar organizationId como ID
                        email: data.oauthEmail,
                        connected: true,
                        webhookUrl: `${window.location.origin}/api/webhooks/mercadopago/${organizationId}`,
                        notificationUrl: `${window.location.origin}/api/notifications/mercadopago/${organizationId}`
                    });
                } else {
                    setAccount(null);
                }
            }
        } catch (error) {
            console.error('Error cargando estado de Mercado Pago:', error);
        } finally {
            setLoading(false);
        }
    };

    const connectMercadoPago = async () => {
        try {
            setConnecting(true);

            // Iniciar el flujo OAuth de Mercado Pago (sin parámetros adicionales)
            const response = await fetch('/api/configuration/mercadopago/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                console.log('🔗 Abriendo OAuth de MercadoPago:', data);

                // Abrir OAuth en nueva ventana/pestaña
                const authWindow = window.open(
                    data.authUrl,
                    'mercadopago-oauth-manage',
                    'width=600,height=700,scrollbars=yes,resizable=yes'
                );

                if (authWindow) {
                    toast.success('🔗 OAuth Iniciado - Se abrió MercadoPago en nueva ventana. Completa la autorización.');
                } else {
                    // Fallback si el popup fue bloqueado
                    window.location.href = data.authUrl;
                }
            } else {
                toast.error(data.error || 'Error al conectar con Mercado Pago');
            }
        } catch (error) {
            console.error('Error conectando con Mercado Pago:', error);
            toast.error('Error al conectar con Mercado Pago');
        } finally {
            setConnecting(false);
        }
    };

    const disconnectMercadoPago = async () => {
        try {
            const response = await fetch('/api/configuration/mercadopago/disconnect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                setAccount(null);
                toast.success('Mercado Pago desconectado exitosamente');
                await loadMercadoPagoStatus(); // Recargar estado
            } else {
                toast.error('Error al desconectar Mercado Pago');
            }
        } catch (error) {
            console.error('Error desconectando Mercado Pago:', error);
            toast.error('Error al desconectar Mercado Pago');
        }
    };

    const refreshConnection = async () => {
        try {
            setRefreshing(true);
            await loadMercadoPagoStatus();
            toast.success('Estado actualizado');
        } catch (error) {
            toast.error('Error al actualizar estado');
        } finally {
            setRefreshing(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado al portapapeles`);
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>Cargando configuración de Mercado Pago...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                Mercado Pago
                                {account?.connected ? (
                                    <Badge variant="default" className="bg-green-500">
                                        <Check className="h-3 w-3 mr-1" />
                                        Conectado
                                    </Badge>
                                ) : (
                                    <Badge variant="destructive">
                                        <X className="h-3 w-3 mr-1" />
                                        No conectado
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription>
                                Conecta tu cuenta de Mercado Pago para procesar pagos automáticamente
                            </CardDescription>
                        </div>
                        <Button
                            onClick={refreshConnection}
                            variant="outline"
                            size="sm"
                            disabled={refreshing}
                        >
                            {refreshing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!account?.connected ? (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground mb-4">
                                No tienes una cuenta de Mercado Pago conectada
                            </p>
                            <Button
                                onClick={connectMercadoPago}
                                disabled={connecting}
                                className="bg-blue-500 hover:bg-blue-600"
                            >
                                {connecting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Conectando...
                                    </>
                                ) : (
                                    <>
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Conectar con Mercado Pago
                                    </>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <Label>Cuenta conectada</Label>
                                <p className="text-sm text-muted-foreground">{account.email}</p>
                                <p className="text-xs text-muted-foreground">ID: {account.id}</p>
                            </div>

                            <div className="grid gap-4">
                                <div>
                                    <Label>Webhook URL</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={account.webhookUrl}
                                            readOnly
                                            className="font-mono text-xs"
                                        />
                                        <Button
                                            onClick={() => copyToClipboard(account.webhookUrl, 'Webhook URL')}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Configura esta URL en tu aplicación de Mercado Pago
                                    </p>
                                </div>

                                <div>
                                    <Label>Notification URL</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={account.notificationUrl}
                                            readOnly
                                            className="font-mono text-xs"
                                        />
                                        <Button
                                            onClick={() => copyToClipboard(account.notificationUrl, 'Notification URL')}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <Button
                                    onClick={disconnectMercadoPago}
                                    variant="destructive"
                                    size="sm"
                                >
                                    Desconectar Mercado Pago
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {account?.connected && (
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                        <h3 className="font-semibold text-blue-900 mb-2">
                            ℹ️ Configuración en Mercado Pago
                        </h3>
                        <div className="space-y-2 text-sm text-blue-800">
                            <p>1. Ve a tu panel de desarrolladores de Mercado Pago</p>
                            <p>2. Selecciona tu aplicación</p>
                            <p>3. Configura las URLs de webhook en la sección de notificaciones</p>
                            <p>4. Los pagos se procesarán automáticamente</p>
                        </div>
                        <div className="mt-3">
                            <Button variant="outline" size="sm" asChild>
                                <a
                                    href="https://www.mercadopago.com.ar/developers/panel/applications"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600"
                                >
                                    Ir al Panel de Desarrolladores
                                    <ExternalLink className="h-4 w-4 ml-2" />
                                </a>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
} 