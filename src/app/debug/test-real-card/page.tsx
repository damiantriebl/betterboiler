"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CheckCircle, CreditCard, Loader2, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Window {
  MercadoPago: any;
}

declare const window: Window & typeof globalThis;

export default function TestRealCardPage() {
  const [mpLoaded, setMpLoaded] = useState(false);
  const [cardForm, setCardForm] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(150);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    loadMercadoPagoScript();
  }, []);

  const loadMercadoPagoScript = async () => {
    try {
      // Cargar el SDK de MercadoPago
      const script = document.createElement("script");
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.onload = async () => {
        console.log("📦 [REAL-CARD-TEST] SDK MercadoPago cargado");

        // Obtener public key de producción
        const response = await fetch("/api/configuration/mercadopago/status");
        const config = await response.json();

        if (config.publicKey?.startsWith("APP_USR-")) {
          window.MercadoPago.setPublishableKey(config.publicKey);
          setMpLoaded(true);
          initCardForm();
          toast.success("✅ MercadoPago configurado con credenciales de PRODUCCIÓN");
        } else {
          toast.error("❌ Necesitas public key de PRODUCCIÓN (APP_USR-)");
        }
      };
      document.head.appendChild(script);
    } catch (error) {
      console.error("Error cargando MercadoPago SDK:", error);
      toast.error("Error cargando MercadoPago");
    }
  };

  const initCardForm = () => {
    try {
      const cardFormElement = window.MercadoPago.cardForm({
        amount: amount.toString(),
        autoMount: true,
        form: {
          id: "real-card-form",
          cardholderName: {
            id: "form-checkout__cardholderName",
            placeholder: "Titular de la tarjeta",
          },
          cardholderEmail: {
            id: "form-checkout__cardholderEmail",
            placeholder: "E-mail",
          },
          cardNumber: {
            id: "form-checkout__cardNumber",
            placeholder: "Número de la tarjeta",
          },
          expirationDate: {
            id: "form-checkout__expirationDate",
            placeholder: "MM/YY",
          },
          securityCode: {
            id: "form-checkout__securityCode",
            placeholder: "Código de seguridad",
          },
          installments: {
            id: "form-checkout__installments",
            placeholder: "Cuotas",
          },
          identificationType: {
            id: "form-checkout__identificationType",
            placeholder: "Tipo de documento",
          },
          identificationNumber: {
            id: "form-checkout__identificationNumber",
            placeholder: "Número del documento",
          },
          issuer: {
            id: "form-checkout__issuer",
            placeholder: "Banco emisor",
          },
        },
        callbacks: {
          onFormMounted: (error: any) => {
            if (error) {
              console.error("Error montando formulario:", error);
              toast.error("Error configurando formulario de tarjeta");
            } else {
              console.log("✅ [REAL-CARD-TEST] Formulario de tarjeta listo");
              toast.success("✅ Formulario listo - Ingresa tu tarjeta REAL");
            }
          },
          onSubmit: (event: Event) => {
            event.preventDefault();
            processRealPayment();
          },
          onFetching: (resource: string) => {
            console.log("🔍 Obteniendo:", resource);
            const progressMap: { [key: string]: string } = {
              payment_methods: "métodos de pago",
              issuers: "bancos emisores",
              installments: "opciones de cuotas",
            };
            toast.info(`🔍 Obteniendo ${progressMap[resource] || resource}...`);
          },
        },
      });

      setCardForm(cardFormElement);
    } catch (error) {
      console.error("Error inicializando formulario:", error);
      toast.error("Error inicializando formulario de tarjeta");
    }
  };

  const processRealPayment = async () => {
    if (!cardForm) return;

    try {
      setLoading(true);
      console.log("💳 [REAL-CARD-TEST] Procesando pago REAL...");

      // Crear token con MercadoPago
      const { token, requireESC, error } = await cardForm.createCardToken();

      if (error) {
        console.error("❌ Error creando token:", error);
        toast.error(`Error en tarjeta: ${error.message || "Datos inválidos"}`);
        return;
      }

      if (requireESC) {
        toast.warning("⚠️ Tarjeta requiere código de seguridad adicional");
        return;
      }

      console.log("🎫 [REAL-CARD-TEST] Token creado:", token);

      // Obtener datos del formulario
      const formData = new FormData(document.getElementById("real-card-form") as HTMLFormElement);

      const paymentData = {
        token: token,
        transaction_amount: amount,
        installments: Number.parseInt(formData.get("installments") as string) || 1,
        payment_method_id: formData.get("payment_method_id"),
        payer: {
          email: formData.get("cardholderEmail") as string,
          first_name: (formData.get("cardholderName") as string)?.split(" ")[0] || "Cliente",
          last_name:
            (formData.get("cardholderName") as string)?.split(" ").slice(1).join(" ") || "Test",
          identification: {
            type: formData.get("identificationType") as string,
            number: formData.get("identificationNumber") as string,
          },
        },
      };

      console.log("🚀 [REAL-CARD-TEST] Enviando pago optimizado:", paymentData);

      // Enviar pago con datos optimizados
      const response = await fetch("/api/payments/mercadopago/test-production-enhanced", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();
      setTestResult(result);

      if (response.ok && result.success) {
        toast.success(`✅ ${result.message}`);

        if (result.payment.status === "approved") {
          toast.success("🎉 ¡PAGO APROBADO! Tu tarjeta fue cobrada exitosamente", {
            duration: 10000,
          });
        } else if (result.payment.status === "rejected") {
          toast.error("❌ Pago rechazado - Verifica datos y fondos", {
            duration: 8000,
          });
        }
      } else {
        toast.error(`❌ ${result.error || "Error procesando pago"}`);

        if (result.errorAnalysis?.solutions) {
          setTimeout(() => {
            toast.info("💡 Revisa las recomendaciones abajo", { duration: 5000 });
          }, 2000);
        }
      }
    } catch (error) {
      console.error("💥 Error procesando pago:", error);
      toast.error("Error al procesar pago");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <CreditCard className="h-6 w-6" />🔒 Test con Tarjeta Real - Modo Seguro
            </CardTitle>
            <CardDescription className="text-blue-700">
              Usa tu tarjeta REAL de forma segura con MercadoPago Brick (datos nunca llegan a
              nuestro servidor)
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Advertencias de Seguridad */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-900 mb-2">🔒 Seguridad Garantizada</h4>
                <ul className="text-green-800 text-sm space-y-1">
                  <li>• ✅ Datos de tarjeta procesados directamente por MercadoPago</li>
                  <li>• ✅ Nunca enviamos tu información a nuestro servidor</li>
                  <li>• ✅ Certificación PCI DSS Level 1</li>
                  <li>• ✅ Encriptación de extremo a extremo</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuración del Test */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración del Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="amount" className="text-sm font-medium">
                  Monto a Probar (ARS)
                </label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number.parseInt(e.target.value) || 150)}
                  min="1"
                  max="1000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Este monto será cobrado REALMENTE a tu tarjeta
                </p>
              </div>
              <div className="flex items-end">
                <div
                  className={`px-3 py-2 rounded text-sm ${mpLoaded ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}
                >
                  {mpLoaded ? "✅ MercadoPago Cargado" : "⏳ Cargando MercadoPago..."}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulario de Tarjeta */}
        {mpLoaded && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Ingresa tu Tarjeta Real
              </CardTitle>
              <CardDescription>
                Completa con los datos reales de tu tarjeta. MercadoPago procesará la información de
                forma segura.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form id="real-card-form" className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="form-checkout__cardNumber" className="text-sm font-medium">
                      Número de Tarjeta
                    </label>
                    <div id="form-checkout__cardNumber" className="mp-form-control" />
                  </div>
                  <div>
                    <label htmlFor="form-checkout__expirationDate" className="text-sm font-medium">
                      Fecha de Vencimiento
                    </label>
                    <div id="form-checkout__expirationDate" className="mp-form-control" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="form-checkout__securityCode" className="text-sm font-medium">
                      Código de Seguridad
                    </label>
                    <div id="form-checkout__securityCode" className="mp-form-control" />
                  </div>
                  <div>
                    <label htmlFor="form-checkout__cardholderName" className="text-sm font-medium">
                      Titular de la Tarjeta
                    </label>
                    <div id="form-checkout__cardholderName" className="mp-form-control" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="form-checkout__cardholderEmail" className="text-sm font-medium">
                      Email
                    </label>
                    <div id="form-checkout__cardholderEmail" className="mp-form-control" />
                  </div>
                  <div>
                    <label htmlFor="form-checkout__installments" className="text-sm font-medium">
                      Cuotas
                    </label>
                    <div id="form-checkout__installments" className="mp-form-control" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="form-checkout__identificationType"
                      className="text-sm font-medium"
                    >
                      Tipo de Documento
                    </label>
                    <div id="form-checkout__identificationType" className="mp-form-control" />
                  </div>
                  <div>
                    <label
                      htmlFor="form-checkout__identificationNumber"
                      className="text-sm font-medium"
                    >
                      Número de Documento
                    </label>
                    <div id="form-checkout__identificationNumber" className="mp-form-control" />
                  </div>
                </div>

                <div>
                  <label htmlFor="form-checkout__issuer" className="text-sm font-medium">
                    Banco Emisor
                  </label>
                  <div id="form-checkout__issuer" className="mp-form-control" />
                </div>

                {/* Advertencia Final */}
                <div className="bg-orange-50 border border-orange-200 p-4 rounded">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-orange-900 mb-1">⚠️ IMPORTANTE</h5>
                      <p className="text-orange-800 text-sm mb-2">
                        Este será un <strong>PAGO REAL</strong> por ${amount} ARS. El dinero se
                        descontará de tu tarjeta.
                      </p>
                      <p className="text-orange-700 text-xs">
                        Solo procede si estás seguro de hacer esta prueba.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !mpLoaded}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Procesando Pago Real...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />💳 Pagar ${amount} ARS (REAL)
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Resultado del Test */}
        {testResult && (
          <Card
            className={`border-2 ${testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
          >
            <CardHeader>
              <CardTitle
                className={`flex items-center gap-2 ${testResult.success ? "text-green-800" : "text-red-800"}`}
              >
                {testResult.success ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <AlertTriangle className="h-6 w-6" />
                )}
                Resultado del Pago Real
              </CardTitle>
            </CardHeader>
            <CardContent>
              {testResult.success ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">ID de Pago:</p>
                      <p className="text-sm text-gray-600">{testResult.payment.id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Estado:</p>
                      <Badge
                        variant={testResult.payment.status === "approved" ? "default" : "secondary"}
                      >
                        {testResult.payment.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Monto:</p>
                      <p className="text-sm text-gray-600">
                        ${testResult.payment.amount} {testResult.payment.currency}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Método:</p>
                      <p className="text-sm text-gray-600">{testResult.payment.payment_method}</p>
                    </div>
                  </div>

                  {testResult.next_steps?.approved && (
                    <div className="bg-green-100 border border-green-200 p-3 rounded">
                      <h5 className="font-medium text-green-900 mb-2">✅ Próximos Pasos:</h5>
                      <ul className="text-green-800 text-sm space-y-1">
                        {testResult.next_steps.approved.map((step: string, stepIndex: number) => (
                          <li key={`approved-${stepIndex}-${step.substring(0, 30)}`}>• {step}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {testResult.next_steps?.rejected && (
                    <div className="bg-red-100 border border-red-200 p-3 rounded">
                      <h5 className="font-medium text-red-900 mb-2">❌ Acciones Recomendadas:</h5>
                      <ul className="text-red-800 text-sm space-y-1">
                        {testResult.next_steps.rejected.map(
                          (step: string, rejectedIndex: number) => (
                            <li key={`rejected-${rejectedIndex}-${step.substring(0, 30)}`}>
                              • {step}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-red-800">{testResult.error}</p>

                  {testResult.errorAnalysis?.solutions && (
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                      <h5 className="font-medium text-yellow-900 mb-2">💡 Soluciones:</h5>
                      <ul className="text-yellow-800 text-sm space-y-1">
                        {testResult.errorAnalysis.solutions.map(
                          (solution: string, solutionIndex: number) => (
                            <li key={`solution-${solutionIndex}-${solution.substring(0, 30)}`}>
                              • {solution}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
