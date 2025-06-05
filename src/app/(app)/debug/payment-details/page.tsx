"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  User,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PaymentDetails {
  success: boolean;
  payment_id: string;
  external_reference?: string;
  status: string;
  status_detail: string;
  transaction_amount: number;
  net_amount?: number;
  total_paid_amount?: number;
  currency_id: string;
  payment_method_id: string;
  payment_type_id: string;
  installments: number;
  payer: {
    id?: string;
    email: string;
    first_name?: string;
    last_name?: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  date_created: string;
  date_approved?: string;
  date_last_updated: string;
  failure_reason?: {
    code: string;
    description: string;
  };
  debug_info: {
    organization_id: string;
    processing_mode?: string;
    pos_id?: string;
    store_id?: string;
    collector_id?: string;
    sponsor_id?: string;
    platform_id?: string;
    merchant_account_id?: string;
  };
  raw_response: any;
  error?: string;
  details?: string;
  mercadopago_error?: string;
}

export default function PaymentDetailsPage() {
  const [paymentId, setPaymentId] = useState("003f286d-bd76-4e8d-8223-4fff180cbeea");
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchPayment = async () => {
    if (!paymentId.trim()) {
      toast.error("Ingresa un ID de pago válido");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setPaymentDetails(null);

      console.log("🔍 Buscando pago:", paymentId);

      const response = await fetch(`/api/mercadopago/payment-details/${paymentId.trim()}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setPaymentDetails(data);
        toast.success("✅ Detalles del pago obtenidos exitosamente");
      } else {
        setError(data.error || "Error consultando el pago");
        console.error("❌ Error:", data);

        if (data.details) {
          toast.error(`Error: ${data.error} - ${data.details}`);
        } else {
          toast.error(`Error: ${data.error}`);
        }
      }
    } catch (err) {
      console.error("❌ Error interno:", err);
      setError("Error de conexión");
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "in_process":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      approved: "default",
      rejected: "destructive",
      pending: "secondary",
      in_process: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.toUpperCase()}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency = "ARS") => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-AR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-6 w-6" />
            Investigar Pago de MercadoPago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="paymentId">ID del Pago</Label>
              <Input
                id="paymentId"
                value={paymentId}
                onChange={(e) => setPaymentId(e.target.value)}
                placeholder="Ej: 1234567890, 003f286d-bd76-4e8d-8223-4fff180cbeea"
                className="font-mono"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={searchPayment} disabled={loading} className="gap-2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Buscar
              </Button>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaymentId("003f286d-bd76-4e8d-8223-4fff180cbeea")}
            >
              Usar ID del Error
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPaymentId("")}>
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <div>
              <strong>Error consultando el pago:</strong> {error}
            </div>
            <div className="mt-2 text-sm">
              Posibles causas:
              <ul className="list-disc list-inside ml-2">
                <li>ID de pago incorrecto o no existe</li>
                <li>Pago pertenece a otra cuenta de MercadoPago</li>
                <li>Tokens de testing vs producción</li>
                <li>Configuración OAuth incorrecta</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Payment Details */}
      {paymentDetails && (
        <div className="grid gap-6">
          {/* Estado General */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Estado del Pago
                </span>
                {getStatusBadge(paymentDetails.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>ID del Pago</Label>
                <p className="font-mono text-sm">{paymentDetails.payment_id}</p>
              </div>
              <div>
                <Label>Referencia Externa</Label>
                <p className="font-mono text-sm">
                  {paymentDetails.external_reference || "No especificada"}
                </p>
              </div>
              <div>
                <Label>Estado Detallado</Label>
                <p className="text-sm">{paymentDetails.status_detail}</p>
              </div>
              {paymentDetails.failure_reason && (
                <div>
                  <Label>Razón del Rechazo</Label>
                  <p className="text-sm text-red-600">
                    <strong>{paymentDetails.failure_reason.code}:</strong>{" "}
                    {paymentDetails.failure_reason.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Información Financiera */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Información Financiera
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Monto de Transacción</Label>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(paymentDetails.transaction_amount, paymentDetails.currency_id)}
                </p>
              </div>
              {paymentDetails.net_amount && (
                <div>
                  <Label>Monto Neto Recibido</Label>
                  <p className="text-lg font-semibold text-blue-600">
                    {formatCurrency(paymentDetails.net_amount, paymentDetails.currency_id)}
                  </p>
                </div>
              )}
              <div>
                <Label>Cuotas</Label>
                <p className="text-sm">{paymentDetails.installments}x</p>
              </div>
            </CardContent>
          </Card>

          {/* Método de Pago */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Método de Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Método</Label>
                <p className="text-sm">{paymentDetails.payment_method_id}</p>
              </div>
              <div>
                <Label>Tipo</Label>
                <p className="text-sm">{paymentDetails.payment_type_id}</p>
              </div>
            </CardContent>
          </Card>

          {/* Información del Pagador */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Pagador
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Email</Label>
                <p className="text-sm">{paymentDetails.payer.email}</p>
              </div>
              <div>
                <Label>Nombre</Label>
                <p className="text-sm">
                  {paymentDetails.payer.first_name} {paymentDetails.payer.last_name}
                </p>
              </div>
              {paymentDetails.payer.identification && (
                <div>
                  <Label>Identificación</Label>
                  <p className="text-sm">
                    {paymentDetails.payer.identification.type}:{" "}
                    {paymentDetails.payer.identification.number}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fechas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Fechas
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Creado</Label>
                <p className="text-sm">{formatDate(paymentDetails.date_created)}</p>
              </div>
              {paymentDetails.date_approved && (
                <div>
                  <Label>Aprobado</Label>
                  <p className="text-sm">{formatDate(paymentDetails.date_approved)}</p>
                </div>
              )}
              <div>
                <Label>Última Actualización</Label>
                <p className="text-sm">{formatDate(paymentDetails.date_last_updated)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Información Técnica */}
          <Card>
            <CardHeader>
              <CardTitle>🔧 Información Técnica de Debug</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Organization ID</Label>
                  <p className="font-mono text-sm">{paymentDetails.debug_info.organization_id}</p>
                </div>
                {paymentDetails.debug_info.processing_mode && (
                  <div>
                    <Label>Processing Mode</Label>
                    <p className="font-mono text-sm">{paymentDetails.debug_info.processing_mode}</p>
                  </div>
                )}
                {paymentDetails.debug_info.collector_id && (
                  <div>
                    <Label>Collector ID</Label>
                    <p className="font-mono text-sm">{paymentDetails.debug_info.collector_id}</p>
                  </div>
                )}
              </div>

              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log("Raw MercadoPago Response:", paymentDetails.raw_response);
                    toast.success("Respuesta completa mostrada en consola");
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Respuesta Completa en Consola
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
