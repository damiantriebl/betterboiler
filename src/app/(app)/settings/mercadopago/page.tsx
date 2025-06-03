"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { MercadoPagoConfiguration } from "@/types/payment-methods";

export default function MercadoPagoConfigPage() {
    const [config, setConfig] = useState<Partial<MercadoPagoConfiguration>>({
        access_token: '',
        public_key: '',
        environment: 'sandbox',
        success_url: '',
        failure_url: '',
        pending_url: '',
        webhook_url: '',
        notification_url: '',
        integrator_id: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [isValid, setIsValid] = useState(false);

    // Cargar configuración existente
    useEffect(() => {
        loadConfiguration();
    }, []);

    const loadConfiguration = async () => {
        try {
            const response = await fetch('/api/settings/mercadopago');
            if (response.ok) {
                const data = await response.json();
                if (data.config) {
                    setConfig(data.config);
                    setIsValid(data.isValid || false);
                }
            }
        } catch (error) {
            console.error('Error cargando configuración:', error);
            toast.error('Error al cargar la configuración');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch('/api/settings/mercadopago', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                toast.success('Configuración guardada exitosamente');
                await loadConfiguration(); // Recargar para verificar validez
            } else {
                const error = await response.json();
                toast.error(error.error || 'Error al guardar la configuración');
            }
        } catch (error) {
            console.error('Error guardando configuración:', error);
            toast.error('Error al guardar la configuración');
        } finally {
            setSaving(false);
        }
    };

    const testConnection = async () => {
        if (!config.access_token) {
            toast.error('Ingresa el Access Token primero');
            return;
        }

        setTesting(true);
        try {
            const response = await fetch('/api/settings/mercadopago/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ access_token: config.access_token })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                toast.success('Conexión exitosa con Mercado Pago');
                setIsValid(true);
            } else {
                toast.error(result.error || 'Error al conectar con Mercado Pago');
                setIsValid(false);
            }
        } catch (error) {
            console.error('Error testando conexión:', error);
            toast.error('Error al probar la conexión');
            setIsValid(false);
        } finally {
            setTesting(false);
        }
    };

    const handleInputChange = (field: keyof MercadoPagoConfiguration, value: string) => {
        setConfig(prev => ({
            ...prev,
            [field]: value
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Cargando configuración...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-muted-foreground">
                        Conecta tu cuenta de Mercado Pago para procesar pagos
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isValid ? (
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
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Configuración principal */}
                <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Credenciales de API</h2>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="environment">Entorno</Label>
                            <Select
                                value={config.environment}
                                onValueChange={(value) => handleInputChange('environment', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar entorno" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sandbox">Sandbox (Pruebas)</SelectItem>
                                    <SelectItem value="production">Producción</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground mt-1">
                                Usa Sandbox para pruebas y Producción para pagos reales
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="access_token">Access Token *</Label>
                            <Input
                                id="access_token"
                                type="password"
                                value={config.access_token || ''}
                                onChange={(e) => handleInputChange('access_token', e.target.value)}
                                placeholder="APP_USR-..."
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                Token privado para procesar pagos
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="public_key">Public Key *</Label>
                            <Input
                                id="public_key"
                                value={config.public_key || ''}
                                onChange={(e) => handleInputChange('public_key', e.target.value)}
                                placeholder="APP_USR-..."
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                Clave pública para formularios de pago
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="integrator_id">Integrator ID (Opcional)</Label>
                            <Input
                                id="integrator_id"
                                value={config.integrator_id || ''}
                                onChange={(e) => handleInputChange('integrator_id', e.target.value)}
                                placeholder="dev_..."
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={testConnection}
                                variant="outline"
                                disabled={testing || !config.access_token}
                            >
                                {testing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Probando...
                                    </>
                                ) : (
                                    'Probar Conexión'
                                )}
                            </Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    'Guardar Configuración'
                                )}
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* URLs de configuración */}
                <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">URLs de Configuración</h2>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="success_url">URL de Éxito</Label>
                            <Input
                                id="success_url"
                                value={config.success_url || ''}
                                onChange={(e) => handleInputChange('success_url', e.target.value)}
                                placeholder="https://tudominio.com/payments/success"
                            />
                        </div>

                        <div>
                            <Label htmlFor="failure_url">URL de Error</Label>
                            <Input
                                id="failure_url"
                                value={config.failure_url || ''}
                                onChange={(e) => handleInputChange('failure_url', e.target.value)}
                                placeholder="https://tudominio.com/payments/failure"
                            />
                        </div>

                        <div>
                            <Label htmlFor="pending_url">URL Pendiente</Label>
                            <Input
                                id="pending_url"
                                value={config.pending_url || ''}
                                onChange={(e) => handleInputChange('pending_url', e.target.value)}
                                placeholder="https://tudominio.com/payments/pending"
                            />
                        </div>

                        <div>
                            <Label htmlFor="webhook_url">Webhook URL</Label>
                            <Input
                                id="webhook_url"
                                value={config.webhook_url || ''}
                                onChange={(e) => handleInputChange('webhook_url', e.target.value)}
                                placeholder="https://tudominio.com/api/webhooks/mercadopago"
                                readOnly
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                Esta URL se configurará automáticamente
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="notification_url">Notification URL</Label>
                            <Input
                                id="notification_url"
                                value={config.notification_url || ''}
                                onChange={(e) => handleInputChange('notification_url', e.target.value)}
                                placeholder="https://tudominio.com/api/notifications/mercadopago"
                                readOnly
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                Esta URL se configurará automáticamente
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Información importante */}
            <Card className="p-6 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-blue-900 mb-2">Cómo obtener tus credenciales</h3>
                        <div className="space-y-2 text-sm text-blue-800">
                            <p>1. Ve a tu panel de desarrolladores de Mercado Pago</p>
                            <p>2. Selecciona tu aplicación o crea una nueva</p>
                            <p>3. Copia el Access Token y Public Key del entorno correspondiente</p>
                            <p>4. Configura las URLs de notificación en tu aplicación de MP</p>
                        </div>
                        <div className="mt-3">
                            <Button variant="outline" size="sm" asChild>
                                <a
                                    href="https://www.mercadopago.com.ar/developers/panel/credentials"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600"
                                >
                                    Ir al Panel de Desarrolladores
                                    <ExternalLink className="h-4 w-4 ml-2" />
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
} 