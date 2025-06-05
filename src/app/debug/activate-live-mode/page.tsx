"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowRight, CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ActivateLiveModePage() {
  const [checking, setChecking] = useState(false);
  const [liveStatus, setLiveStatus] = useState<any>(null);

  const checkLiveMode = async () => {
    try {
      setChecking(true);

      const response = await fetch("/api/debug/check-live-mode", {
        method: "POST",
      });

      const data = await response.json();
      setLiveStatus(data);

      if (data.live_mode) {
        toast.success("✅ Live Mode está activado");
      } else {
        toast.warning("⚠️ Live Mode NO está activado");
      }
    } catch (error) {
      toast.error("Error verificando Live Mode");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-6 w-6" />🚨 PROBLEMA CRÍTICO: Live Mode Desactivado
            </CardTitle>
            <CardDescription className="text-red-700">
              Tu aplicación MercadoPago tiene credenciales de producción pero no está activada para
              recibir pagos reales
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Estado Actual */}
        <Card>
          <CardHeader>
            <CardTitle>Verificar Estado Actual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={checkLiveMode} disabled={checking} className="w-full">
              {checking ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Verificar Live Mode
            </Button>

            {liveStatus && (
              <div
                className={`p-4 rounded border ${liveStatus.live_mode ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {liveStatus.live_mode ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span
                    className={`font-medium ${liveStatus.live_mode ? "text-green-800" : "text-red-800"}`}
                  >
                    Live Mode: {liveStatus.live_mode ? "ACTIVADO ✅" : "DESACTIVADO ❌"}
                  </span>
                </div>
                {liveStatus.user_data && (
                  <div className="text-sm space-y-1">
                    <p>Email: {liveStatus.user_data.email}</p>
                    <p>País: {liveStatus.user_data.country_id}</p>
                    <p>
                      Tipo de cuenta:{" "}
                      {liveStatus.user_data.status?.mercadopago_account_type || "No disponible"}
                    </p>
                    <p>Estado: {liveStatus.user_data.status?.site_status || "No disponible"}</p>

                    {/* Mostrar problemas específicos */}
                    {liveStatus.user_data.status && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <h5 className="font-medium text-yellow-900 mb-2">
                          ⚠️ Requisitos Pendientes:
                        </h5>
                        <div className="space-y-1 text-xs">
                          {!liveStatus.user_data.status.billing?.allow && (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-3 w-3 text-red-500" />
                              <span className="text-red-700">
                                Billing deshabilitado:{" "}
                                {liveStatus.user_data.status.billing?.codes?.join(", ") ||
                                  "Sin detalles"}
                              </span>
                            </div>
                          )}
                          {!liveStatus.user_data.status.list?.allow && (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-3 w-3 text-red-500" />
                              <span className="text-red-700">
                                Listing deshabilitado:{" "}
                                {liveStatus.user_data.status.list?.codes?.join(", ") ||
                                  "Sin detalles"}
                              </span>
                            </div>
                          )}
                          {liveStatus.user_data.status.user_type === "simple_registration" && (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-3 w-3 text-orange-500" />
                              <span className="text-orange-700">
                                Registro incompleto - Se requiere información adicional
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pasos para Activar Live Mode */}
        <Card>
          <CardHeader>
            <CardTitle>Cómo Activar Live Mode en MercadoPago</CardTitle>
            <CardDescription>
              Sigue estos pasos exactos para activar tu aplicación para recibir pagos reales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Paso 1 */}
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">1</div>
              <div className="flex-1">
                <h4 className="font-semibold mb-2">Ir al Panel de Desarrolladores</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Accede a tu panel de aplicaciones de MercadoPago
                </p>
                <Button variant="outline" asChild>
                  <a
                    href="https://www.mercadopago.com.ar/developers/panel/applications"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir Panel de Desarrolladores
                  </a>
                </Button>
              </div>
            </div>

            {/* Paso 2 */}
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">2</div>
              <div className="flex-1">
                <h4 className="font-semibold mb-2">Seleccionar tu Aplicación</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Busca la aplicación que conectaste con Better Motos
                </p>
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                  <p className="text-yellow-800 text-sm">
                    💡 <strong>Tip:</strong> Debería ser la aplicación cuyas credenciales APP_USR-
                    tienes en tu .env
                  </p>
                </div>
              </div>
            </div>

            {/* Paso 3 - Actualizado con información específica */}
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">3</div>
              <div className="flex-1">
                <h4 className="font-semibold mb-2">Completar Información de Cuenta</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Tu diagnóstico muestra que necesitas completar información específica:
                </p>

                {liveStatus?.user_data?.status && (
                  <div className="space-y-3 mb-4">
                    {/* Dirección Pendiente */}
                    {(liveStatus.user_data.status.billing?.codes?.includes("address_pending") ||
                      liveStatus.user_data.status.list?.codes?.includes("address_pending")) && (
                      <div className="bg-red-50 border border-red-200 p-3 rounded">
                        <h5 className="font-medium text-red-900 mb-2">🏠 Dirección Requerida</h5>
                        <p className="text-red-800 text-sm mb-2">
                          MercadoPago necesita tu dirección completa para activar Live Mode.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="border-red-300 text-red-700"
                        >
                          <a
                            href="https://www.mercadopago.com.ar/settings/account"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Completar Dirección
                          </a>
                        </Button>
                      </div>
                    )}

                    {/* Registro Simple */}
                    {liveStatus.user_data.status.user_type === "simple_registration" && (
                      <div className="bg-orange-50 border border-orange-200 p-3 rounded">
                        <h5 className="font-medium text-orange-900 mb-2">📋 Completar Registro</h5>
                        <p className="text-orange-800 text-sm mb-2">
                          Necesitas actualizar tu registro para usar funcionalidades de vendedor.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="border-orange-300 text-orange-700"
                        >
                          <a
                            href="https://www.mercadopago.com.ar/settings/account"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Actualizar Cuenta
                          </a>
                        </Button>
                      </div>
                    )}

                    {/* Cuenta Personal */}
                    {liveStatus.user_data.status.mercadopago_account_type === "personal" && (
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                        <h5 className="font-medium text-blue-900 mb-2">
                          🏢 Considera Cuenta Business
                        </h5>
                        <p className="text-blue-800 text-sm">
                          Para un negocio como Better Motos, una cuenta business puede tener
                          ventajas.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <h6 className="font-medium">Pasos específicos para tu cuenta:</h6>
                  <ol className="text-sm space-y-1 ml-4">
                    <li>1. ✅ Completa tu dirección en configuración de cuenta</li>
                    <li>2. ✅ Verifica tu identidad (DNI/CUIT)</li>
                    <li>3. ✅ Agrega información bancaria</li>
                    <li>4. ✅ Acepta términos comerciales</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Paso 4 - Actualizado */}
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">4</div>
              <div className="flex-1">
                <h4 className="font-semibold mb-2">Activar aplicación para Producción</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Una vez completada tu información personal, activa tu aplicación:
                </p>
                <div className="space-y-2">
                  <ol className="text-sm space-y-1 ml-4">
                    <li>1. Ve al panel de desarrolladores</li>
                    <li>2. Selecciona tu aplicación Better Motos</li>
                    <li>3. Busca "Configuración de Producción" o "Go Live"</li>
                    <li>4. Completa el formulario de certificación</li>
                    <li>5. Activa el modo Live</li>
                  </ol>
                </div>
                <div className="bg-green-50 border border-green-200 p-3 rounded mt-3">
                  <p className="text-green-800 text-sm">
                    🎯 <strong>Busca:</strong> Un toggle "Live Mode" o "Modo Producción" en tu
                    aplicación
                  </p>
                </div>
              </div>
            </div>

            {/* URLs Requeridas */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded">
              <h5 className="font-medium text-blue-900 mb-2">📋 URLs que debes configurar:</h5>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Webhook URL:</span>
                  <code className="ml-2 px-2 py-1 bg-white rounded">
                    https://apex-one-lemon.vercel.app/api/webhooks/mercadopago
                  </code>
                </div>
                <div>
                  <span className="font-medium">Redirect URLs:</span>
                  <code className="ml-2 px-2 py-1 bg-white rounded">
                    https://apex-one-lemon.vercel.app/
                  </code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Después de Activar */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">✅ Después de Activar Live Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="text-green-700 text-sm">Una vez activado el Live Mode:</p>
              <ol className="text-green-700 text-sm space-y-1 ml-4">
                <li>1. Vuelve a verificar el estado con el botón de arriba</li>
                <li>2. Ve a tu aplicación y prueba un pago real</li>
                <li>3. Los pagos ya no serán rechazados por "modo sandbox"</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.location.href = "/debug/rejected-payments";
                }}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Volver al Diagnóstico
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.location.href = "/configuration";
                }}
              >
                Probar Pago Real
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Urgente */}
        <Card className="border-red-300 bg-red-100">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900 mb-1">⚠️ IMPORTANTE</h4>
                <p className="text-red-800 text-sm">
                  Hasta que no actives Live Mode, TODOS los pagos reales serán rechazados, incluso
                  con tarjetas válidas y fondos suficientes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
