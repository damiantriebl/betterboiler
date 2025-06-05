"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Key,
  Loader2,
  Settings,
  Shield,
  Smartphone,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface PermissionCheck {
  name: string;
  description: string;
  status: "checking" | "success" | "error" | "warning";
  details?: string;
  action?: string;
}

export default function PointPermissionsPage() {
  const [checks, setChecks] = useState<PermissionCheck[]>([
    {
      name: "Configuración MercadoPago",
      description: "Verificar si MercadoPago está configurado",
      status: "checking",
    },
    {
      name: "Access Token",
      description: "Verificar access token válido",
      status: "checking",
    },
    {
      name: "Point API Permisos",
      description: "Verificar acceso a Point Integration API",
      status: "checking",
    },
    {
      name: "Dispositivos Point",
      description: "Consultar dispositivos Point disponibles",
      status: "checking",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [organizationInfo, setOrganizationInfo] = useState<any>(null);

  useEffect(() => {
    runPermissionChecks();
  }, []);

  const runPermissionChecks = async () => {
    setLoading(true);

    // Check 1: Configuración MercadoPago
    await updateCheck(0, await checkMercadoPagoConfig());

    // Check 2: Access Token
    await updateCheck(1, await checkAccessToken());

    // Check 3: Point API Permisos
    await updateCheck(2, await checkPointApiPermissions());

    // Check 4: Dispositivos Point
    await updateCheck(3, await checkPointDevices());

    setLoading(false);
  };

  const updateCheck = async (index: number, result: Partial<PermissionCheck>) => {
    setChecks((prev) => prev.map((check, i) => (i === index ? { ...check, ...result } : check)));
    // Pequeña pausa para efecto visual
    await new Promise((resolve) => setTimeout(resolve, 500));
  };

  const checkMercadoPagoConfig = async (): Promise<Partial<PermissionCheck>> => {
    try {
      const response = await fetch("/api/configuration/mercadopago/status");
      const data = await response.json();

      if (data.organizationConnected && data.oauthEmail) {
        setOrganizationInfo(data);
        return {
          status: "success",
          details: `Conectado como: ${data.oauthEmail}`,
        };
      }
      return {
        status: "error",
        details: "MercadoPago no está conectado",
        action: "Conectar OAuth",
      };
    } catch (error) {
      return {
        status: "error",
        details: "Error verificando configuración",
        action: "Revisar conexión",
      };
    }
  };

  const checkAccessToken = async (): Promise<Partial<PermissionCheck>> => {
    try {
      const sessionResponse = await fetch("/api/auth/session");
      const sessionData = await sessionResponse.json();
      const organizationId = sessionData?.user?.organizationId;

      if (!organizationId) {
        return {
          status: "error",
          details: "No se pudo obtener organización",
        };
      }

      const response = await fetch(`/api/configuration/mercadopago/organization/${organizationId}`);
      const data = await response.json();

      if (data.accessToken && data.accessToken !== "PLACEHOLDER_TOKEN") {
        const tokenPreview = `${data.accessToken.substring(0, 15)}...`;
        return {
          status: "success",
          details: `Token válido: ${tokenPreview}`,
        };
      }
      return {
        status: "error",
        details: "Access token no configurado o inválido",
        action: "Regenerar credenciales",
      };
    } catch (error) {
      return {
        status: "error",
        details: "Error verificando access token",
      };
    }
  };

  const checkPointApiPermissions = async (): Promise<Partial<PermissionCheck>> => {
    try {
      const response = await fetch("/api/mercadopago/point/devices");

      if (response.ok) {
        return {
          status: "success",
          details: "API Point accesible - Permisos correctos",
        };
      }
      if (response.status === 403) {
        return {
          status: "error",
          details: "Sin permisos para Point API",
          action: "Configurar scopes en MercadoPago",
        };
      }
      if (response.status === 401) {
        return {
          status: "error",
          details: "Credenciales inválidas",
          action: "Verificar access token",
        };
      }
      const errorData = await response.json();
      return {
        status: "warning",
        details: `HTTP ${response.status}: ${errorData.error || "Error desconocido"}`,
        action: "Verificar configuración",
      };
    } catch (error) {
      return {
        status: "error",
        details: "Error conectando con Point API",
      };
    }
  };

  const checkPointDevices = async (): Promise<Partial<PermissionCheck>> => {
    try {
      const response = await fetch("/api/mercadopago/point/devices");

      if (response.ok) {
        const data = await response.json();
        const deviceCount = data.devices?.length || 0;

        if (deviceCount > 0) {
          const onlineDevices = data.devices.filter((d: any) => d.status === "ONLINE").length;
          return {
            status: "success",
            details: `${deviceCount} dispositivos encontrados (${onlineDevices} online)`,
          };
        }
        return {
          status: "warning",
          details: "No hay dispositivos Point registrados",
          action: "Vincular Point Smart",
        };
      }
      return {
        status: "error",
        details: "No se pudieron consultar dispositivos",
      };
    } catch (error) {
      return {
        status: "error",
        details: "Error consultando dispositivos Point",
      };
    }
  };

  const getStatusIcon = (status: PermissionCheck["status"]) => {
    switch (status) {
      case "checking":
        return <Loader2 className="w-5 h-5 animate-spin text-blue-600" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusColor = (status: PermissionCheck["status"]) => {
    switch (status) {
      case "checking":
        return "bg-blue-50 border-blue-200";
      case "success":
        return "bg-green-50 border-green-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "error":
        return "bg-red-50 border-red-200";
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          Verificación de Permisos Point API
        </h1>
        <p className="text-muted-foreground mb-8">
          Diagnóstico de configuración y permisos para MercadoPago Point Smart
        </p>
      </div>

      {/* Estado de verificación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Estado de la Verificación
            {loading && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {checks.map((check, checkIndex) => (
              <div
                key={`check-${checkIndex}-${check.name.replace(/\s+/g, "-").toLowerCase()}`}
                className={`p-4 border rounded-lg ${getStatusColor(check.status)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(check.status)}
                    <div>
                      <h4 className="font-semibold">{check.name}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{check.description}</p>
                      {check.details && <p className="text-sm">{check.details}</p>}
                    </div>
                  </div>
                  {check.action && check.status !== "success" && (
                    <Badge variant="outline" className="text-xs">
                      {check.action}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <Button onClick={runPermissionChecks} disabled={loading} variant="outline">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              Verificar Nuevamente
            </Button>

            <Button asChild variant="outline">
              <a
                href="https://www.mercadopago.com.ar/developers/panel/applications"
                target="_blank"
                rel="noopener noreferrer"
              >
                Panel MercadoPago
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Guía de configuración */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📋 Guía de Configuración Point API</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-blue-800 space-y-4">
            <div>
              <h4 className="font-semibold mb-2">1. Scopes Requeridos en MercadoPago:</h4>
              <ul className="space-y-1 text-sm ml-4">
                <li>
                  • <code className="bg-blue-100 px-1 rounded">read</code> - Lectura de datos
                </li>
                <li>
                  • <code className="bg-blue-100 px-1 rounded">write</code> - Escritura y pagos
                </li>
                <li>
                  • <code className="bg-blue-100 px-1 rounded">offline_access</code> - Acceso sin
                  conexión
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">2. URLs de la Aplicación:</h4>
              <ul className="space-y-1 text-sm ml-4">
                <li>
                  • <strong>OAuth:</strong>{" "}
                  <code className="bg-blue-100 px-1 rounded text-xs">
                    https://tu-dominio.com/api/auth/mercadopago/callback
                  </code>
                </li>
                <li>
                  • <strong>Webhooks:</strong>{" "}
                  <code className="bg-blue-100 px-1 rounded text-xs">
                    https://tu-dominio.com/api/webhooks/mercadopago
                  </code>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">3. Vincular Point Smart:</h4>
              <ul className="space-y-1 text-sm ml-4">
                <li>• Conecta tu Point Smart a WiFi</li>
                <li>• Vincula el dispositivo en el panel de MercadoPago</li>
                <li>• Verifica que aparezca como "ONLINE"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información del dispositivo */}
      {organizationInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Información de la Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Email OAuth:</strong>
                <p>{organizationInfo.oauthEmail}</p>
              </div>
              <div>
                <strong>Estado:</strong>
                <p>{organizationInfo.organizationConnected ? "Conectado" : "Desconectado"}</p>
              </div>
              {organizationInfo.hasPublicKey && (
                <div>
                  <strong>Public Key:</strong>
                  <p className="font-mono text-xs">
                    {organizationInfo.publicKey?.substring(0, 20)}...
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Próximos pasos */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-900">🚀 Próximos Pasos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-green-800 space-y-2 text-sm">
            <p>
              <strong>Una vez que todos los checks estén en verde:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>
                Ve a <code className="bg-green-100 px-1 rounded">/test-point-smart</code> para
                probar la integración
              </li>
              <li>Realiza una transacción de prueba con tu Point Smart</li>
              <li>Integra el componente en tus páginas de ventas reales</li>
              <li>Configura webhooks para notificaciones automáticas</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
