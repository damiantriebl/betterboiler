"use client";

import PointSmartIntegration from "@/components/custom/PointSmartIntegration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Smartphone, Activity, Target, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";

export default function TestPointActionsPage() {
    const [testResults, setTestResults] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const { toast } = useToast();

    const handleTestAction = async (type: string) => {
        setLoading(prev => ({ ...prev, [type]: true }));

        try {
            const response = await fetch('/api/mercadopago/point/create-action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-debug-key': 'DEBUG_KEY',
                },
                body: JSON.stringify({
                    type: 'print',
                    terminal_id: 'PAX_A910__SMARTPOS1495357742',
                    external_reference: `test-action-${type}-${Date.now()}`,
                    subtype: 'text',
                    content: `🧪 TEST ${type.toUpperCase()}\nTimestamp: ${new Date().toLocaleString()}\nAcción de prueba`,
                }),
            });

            const result = await response.json();

            setTestResults(prev => ({ ...prev, [type]: result }));

            if (response.ok && result.success) {
                toast({
                    title: "✅ Acción creada",
                    description: `Action ID: ${result.action.id}`,
                    variant: "default",
                });

                // Comenzar polling de la acción
                startActionPolling(result.action.id, type);
            } else {
                toast({
                    title: "❌ Error",
                    description: result.error || "Error creando acción",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error:', error);
            toast({
                title: "❌ Error",
                description: "Error de comunicación",
                variant: "destructive",
            });
        } finally {
            setLoading(prev => ({ ...prev, [type]: false }));
        }
    };

    const startActionPolling = async (actionId: string, testType: string) => {
        let attempts = 0;
        const maxAttempts = 20;

        const checkStatus = async () => {
            try {
                const response = await fetch(`/api/mercadopago/point/action-status/${actionId}`, {
                    headers: { 'x-debug-key': 'DEBUG_KEY' },
                });
                const data = await response.json();

                console.log(`🎯 Polling Action ${actionId} (${attempts + 1}/${maxAttempts}):`, data);

                // Actualizar resultado con el estado actual
                setTestResults(prev => ({
                    ...prev,
                    [`${testType}_polling`]: {
                        ...data,
                        attempt: attempts + 1,
                        timestamp: new Date().toISOString(),
                    }
                }));

                if (data.status === 'finished' || data.status === 'error' || data.status === 'canceled') {
                    console.log(`✅ Action ${actionId} finalizada con estado:`, data.status);
                    return;
                }

                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(checkStatus, 3000);
                }
            } catch (error) {
                console.error('Error polling action:', error);
            }
        };

        checkStatus();
    };

    const handleCancelOrder = async (orderId: string, testType: string) => {
        setLoading(prev => ({ ...prev, [`cancel_${testType}`]: true }));

        try {
            const response = await fetch(`/api/mercadopago/point/cancel/${orderId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-debug-key': 'DEBUG_KEY',
                },
            });

            const result = await response.json();

            setTestResults(prev => ({
                ...prev,
                [`cancel_${testType}`]: result
            }));

            if (response.ok && result.success) {
                toast({
                    title: "✅ Order cancelada",
                    description: `Order ${orderId} cancelada exitosamente`,
                    variant: "default",
                });
            } else {
                toast({
                    title: "❌ Error",
                    description: result.error || "Error cancelando order",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error:', error);
            toast({
                title: "❌ Error",
                description: "Error de comunicación",
                variant: "destructive",
            });
        } finally {
            setLoading(prev => ({ ...prev, [`cancel_${testType}`]: false }));
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'finished': return 'text-green-600';
            case 'created': return 'text-blue-600';
            case 'on_terminal': return 'text-yellow-600';
            case 'processing': return 'text-purple-600';
            case 'error': case 'canceled': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-4 flex items-center gap-3">
                    <Target className="w-8 h-8 text-blue-600" />
                    Test Point Smart Actions System
                </h1>
                <p className="text-muted-foreground mb-8">
                    Pruebas del nuevo sistema de acciones y cancelaciones para Point Smart
                </p>
            </div>

            {/* Tests de Acciones Individuales */}
            <div className="grid gap-6">
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                    <CardHeader>
                        <CardTitle className="text-blue-900">🎯 Tests de Acciones Individuales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <h4 className="font-semibold">Test 1: Acción Simple</h4>
                                <Button
                                    onClick={() => handleTestAction('simple')}
                                    disabled={loading.simple}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                >
                                    {loading.simple ? "Creando..." : "🎯 Crear Acción Simple"}
                                </Button>

                                {testResults.simple && (
                                    <div className="p-3 bg-white border rounded text-xs">
                                        <p><strong>Action ID:</strong> {testResults.simple.action?.id}</p>
                                        <p><strong>Status:</strong>
                                            <span className={getStatusColor(testResults.simple.action?.status)}>
                                                {testResults.simple.action?.status}
                                            </span>
                                        </p>
                                    </div>
                                )}

                                {testResults.simple_polling && (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded text-xs">
                                        <p><strong>Polling Status:</strong>
                                            <span className={getStatusColor(testResults.simple_polling.status)}>
                                                {testResults.simple_polling.status}
                                            </span>
                                        </p>
                                        <p><strong>Intento:</strong> {testResults.simple_polling.attempt}</p>
                                        <p><strong>Timestamp:</strong> {new Date(testResults.simple_polling.timestamp).toLocaleTimeString()}</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-semibold">Test 2: Acción con Contenido</h4>
                                <Button
                                    onClick={() => handleTestAction('content')}
                                    disabled={loading.content}
                                    className="w-full bg-purple-600 hover:bg-purple-700"
                                >
                                    {loading.content ? "Creando..." : "📝 Crear con Contenido"}
                                </Button>

                                {testResults.content && (
                                    <div className="p-3 bg-white border rounded text-xs">
                                        <p><strong>Action ID:</strong> {testResults.content.action?.id}</p>
                                        <p><strong>Status:</strong>
                                            <span className={getStatusColor(testResults.content.action?.status)}>
                                                {testResults.content.action?.status}
                                            </span>
                                        </p>
                                    </div>
                                )}

                                {testResults.content_polling && (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded text-xs">
                                        <p><strong>Polling Status:</strong>
                                            <span className={getStatusColor(testResults.content_polling.status)}>
                                                {testResults.content_polling.status}
                                            </span>
                                        </p>
                                        <p><strong>Intento:</strong> {testResults.content_polling.attempt}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tests de Cancelación */}
                <Card className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
                    <CardHeader>
                        <CardTitle className="text-red-900">🚫 Tests de Cancelación</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <h4 className="font-semibold">Cancelar Order Específica</h4>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Order ID (ej: ORD01JX...)"
                                        className="flex-1 px-3 py-2 border rounded text-sm"
                                        id="cancelOrderId"
                                    />
                                    <Button
                                        onClick={() => {
                                            const input = document.getElementById('cancelOrderId') as HTMLInputElement;
                                            if (input.value) {
                                                handleCancelOrder(input.value, 'manual');
                                            }
                                        }}
                                        disabled={loading.cancel_manual}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        {loading.cancel_manual ? "..." : "🚫 Cancelar"}
                                    </Button>
                                </div>

                                {testResults.cancel_manual && (
                                    <div className="p-3 bg-white border rounded text-xs">
                                        <p><strong>Success:</strong> {testResults.cancel_manual.success ? "✅" : "❌"}</p>
                                        <p><strong>Message:</strong> {testResults.cancel_manual.message || testResults.cancel_manual.error}</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-semibold">Test Notificación Manual</h4>
                                <Button
                                    onClick={async () => {
                                        try {
                                            const response = await fetch('/api/mercadopago/point/test-notification', {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                },
                                                body: JSON.stringify({
                                                    message: "🧪 Notificación de prueba desde Test Actions",
                                                    amount: 42.50
                                                }),
                                            });
                                            const result = await response.json();

                                            if (response.ok) {
                                                toast({
                                                    title: "✅ Notificación creada",
                                                    description: `ID: ${result.notification.id}`,
                                                    variant: "default",
                                                });
                                            } else {
                                                toast({
                                                    title: "❌ Error",
                                                    description: result.error || "Error creando notificación",
                                                    variant: "destructive",
                                                });
                                            }
                                        } catch (error) {
                                            toast({
                                                title: "❌ Error",
                                                description: "Error de comunicación",
                                                variant: "destructive",
                                            });
                                        }
                                    }}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                >
                                    🔔 Crear Notificación de Prueba
                                </Button>
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                    <p>✅ <strong>Endpoint correcto:</strong> POST /v1/orders/{'{order_id}'}/cancel</p>
                                    <p>🔍 <strong>Acciones:</strong> GET /terminals/v1/actions/{'{action_id}'}</p>
                                    <p>📡 <strong>Polling:</strong> Cada 3 segundos para acciones</p>
                                    <p>⚙️ <strong>Estados:</strong> created → on_terminal → processing → finished</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Test Integrado con PointSmartIntegration */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-green-600" />
                            Test Integrado con Acciones
                            <Badge variant="secondary" className="ml-auto bg-green-50 text-green-700">
                                Con Action Polling
                            </Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Prueba completa con order + action + polling simultáneo
                        </p>
                    </CardHeader>
                    <CardContent>
                        <PointSmartIntegration
                            amount={1500}
                            description="🧪 Test Integrado - Acciones + Pagos Point Smart"
                            saleId="test-actions-integrated-001"
                            motorcycleId={999}
                            onPaymentSuccess={(data) => {
                                console.log("✅ Test integrado exitoso:", data);
                                setTestResults(prev => ({
                                    ...prev,
                                    integrated_success: {
                                        ...data,
                                        timestamp: new Date().toISOString()
                                    }
                                }));
                                toast({
                                    title: "✅ Test Integrado Exitoso",
                                    description: `Order: ${data.order_id}`,
                                    variant: "default",
                                });
                            }}
                            onPaymentError={(error) => {
                                console.error("❌ Error en test integrado:", error);
                                setTestResults(prev => ({
                                    ...prev,
                                    integrated_error: {
                                        ...error,
                                        timestamp: new Date().toISOString()
                                    }
                                }));
                            }}
                        />

                        {/* Resultados del test integrado */}
                        {(testResults.integrated_success || testResults.integrated_error) && (
                            <div className="mt-4 p-4 bg-gray-50 border rounded">
                                <h4 className="font-semibold mb-2">📊 Resultado del Test Integrado:</h4>

                                {testResults.integrated_success && (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2 text-green-700">
                                            <CheckCircle className="w-4 h-4" />
                                            <span className="font-semibold">Pago Exitoso</span>
                                        </div>
                                        <p><strong>Order ID:</strong> {testResults.integrated_success.order_id}</p>
                                        <p><strong>Payment ID:</strong> {testResults.integrated_success.payment_id}</p>
                                        <p><strong>Timestamp:</strong> {new Date(testResults.integrated_success.timestamp).toLocaleString()}</p>
                                    </div>
                                )}

                                {testResults.integrated_error && (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2 text-red-700">
                                            <AlertCircle className="w-4 h-4" />
                                            <span className="font-semibold">Error en el Pago</span>
                                        </div>
                                        <p><strong>Error:</strong> {testResults.integrated_error.error || "Error desconocido"}</p>
                                        <p><strong>Timestamp:</strong> {new Date(testResults.integrated_error.timestamp).toLocaleString()}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Información técnica */}
                <Card className="bg-gray-50 border-gray-200">
                    <CardHeader>
                        <CardTitle className="text-gray-800">🔧 Información Técnica</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-6 text-sm">
                            <div>
                                <h4 className="font-semibold mb-3">📡 Nuevos Endpoints:</h4>
                                <ul className="space-y-1 font-mono text-xs">
                                    <li>• POST /api/mercadopago/point/create-action</li>
                                    <li>• GET /api/mercadopago/point/action-status/[id]</li>
                                    <li>• POST /api/mercadopago/point/cancel/[orderId]</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-3">🎯 Estados de Acciones:</h4>
                                <ul className="space-y-1">
                                    <li><span className="text-blue-600 font-semibold">created</span> - Acción creada</li>
                                    <li><span className="text-yellow-600 font-semibold">on_terminal</span> - En el terminal</li>
                                    <li><span className="text-purple-600 font-semibold">processing</span> - Procesando</li>
                                    <li><span className="text-green-600 font-semibold">finished</span> - Completada</li>
                                    <li><span className="text-red-600 font-semibold">error/canceled</span> - Error o cancelada</li>
                                </ul>
                            </div>
                        </div>

                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="font-semibold text-blue-900 mb-2">🚀 Mejoras Implementadas:</h4>
                            <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
                                <div>
                                    <strong>✅ Sistema de Acciones:</strong>
                                    <p>Cada order de Point Smart ahora crea una acción asociada para tracking detallado.</p>
                                </div>
                                <div>
                                    <strong>✅ Polling Dual:</strong>
                                    <p>Monitoreo simultáneo de orders y acciones para máxima visibilidad.</p>
                                </div>
                                <div>
                                    <strong>✅ Cancelación Correcta:</strong>
                                    <p>Usando el endpoint oficial POST /v1/orders/{'{order_id}'}/cancel.</p>
                                </div>
                                <div>
                                    <strong>✅ UI Mejorada:</strong>
                                    <p>Componente actualizado con información de action_id y estados.</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 