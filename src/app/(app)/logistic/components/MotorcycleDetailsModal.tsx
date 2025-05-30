"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTransferPDF } from "@/hooks/use-transfer-pdf";
import { formatPrice } from "@/lib/utils";
import type { MotorcycleTransferWithRelations } from "@/types/logistics";
import {
  Calendar,
  Clock,
  DollarSign,
  Download,
  FileText,
  Mail,
  MapPin,
  Package,
  Phone,
  Truck,
  User,
} from "lucide-react";

interface MotorcycleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: MotorcycleTransferWithRelations | null;
}

export default function MotorcycleDetailsModal({
  isOpen,
  onClose,
  transfer,
}: MotorcycleDetailsModalProps) {
  const { generateAndDownloadPDF, isGenerating } = useTransferPDF();

  if (!transfer || !transfer.motorcycle) {
    return null;
  }

  const motorcycle = transfer.motorcycle;

  const handleDownloadPDF = () => {
    generateAndDownloadPDF(transfer.id);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "No especificada";
    return new Date(date).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "IN_TRANSIT":
        return "bg-blue-100 text-blue-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "IN_TRANSIT":
        return "En Tránsito";
      case "DELIVERED":
        return "Entregada";
      case "CANCELLED":
        return "Cancelada";
      case "REQUESTED":
        return "Solicitada";
      case "CONFIRMED":
        return "Confirmada";
      default:
        return status;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Detalles de Transferencia - {motorcycle.chassisNumber}
            </DialogTitle>
            <Button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              {isGenerating ? "Generando..." : "Descargar PDF"}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información de la motocicleta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Información de la Motocicleta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Marca y Modelo</p>
                    <p className="text-lg font-semibold">
                      {motorcycle.brand?.name} {motorcycle.model?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Número de Chasis</p>
                    <p className="font-mono">{motorcycle.chassisNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Año</p>
                    <p>{motorcycle.year}</p>
                  </div>
                  {motorcycle.color && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Color</p>
                      <p>{motorcycle.color.name}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Precio de Venta</p>
                    <p className="text-lg font-semibold text-green-600">
                      {formatPrice(motorcycle.retailPrice, motorcycle.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estado</p>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      {motorcycle.state}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información de la transferencia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Información de la Transferencia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Estado de Transferencia
                    </p>
                    <Badge className={getStatusColor(transfer.status)}>
                      {getStatusText(transfer.status)}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Origen
                    </p>
                    <p className="font-medium">{transfer.fromBranch?.name}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Destino
                    </p>
                    <p className="font-medium">{transfer.toBranch?.name}</p>
                  </div>

                  {transfer.logisticProvider && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Proveedor de Logística
                      </p>
                      <p className="font-medium">{transfer.logisticProvider.name}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Fecha de Solicitud
                    </p>
                    <p>{formatDate(transfer.requestedDate)}</p>
                  </div>

                  {transfer.scheduledPickupDate && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Fecha Programada
                      </p>
                      <p>{formatDate(transfer.scheduledPickupDate)}</p>
                    </div>
                  )}

                  {transfer.actualDeliveryDate && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Fecha de Entrega
                      </p>
                      <p>{formatDate(transfer.actualDeliveryDate)}</p>
                    </div>
                  )}

                  {transfer.cost && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Costo de Transporte
                      </p>
                      <p className="font-medium">{formatPrice(transfer.cost, transfer.currency)}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información del proveedor de logística */}
          {transfer.logisticProvider && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Detalles del Proveedor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Empresa</p>
                      <p className="font-medium">{transfer.logisticProvider.name}</p>
                    </div>
                    {transfer.logisticProvider.contactName && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Contacto
                        </p>
                        <p>{transfer.logisticProvider.contactName}</p>
                      </div>
                    )}
                    {transfer.logisticProvider.contactPhone && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          Teléfono
                        </p>
                        <p>{transfer.logisticProvider.contactPhone}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {transfer.logisticProvider.contactEmail && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          Email
                        </p>
                        <p>{transfer.logisticProvider.contactEmail}</p>
                      </div>
                    )}
                    {transfer.logisticProvider.address && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Dirección
                        </p>
                        <p>{transfer.logisticProvider.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Información del solicitante */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Información del Solicitante y Responsables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Solicitado por</p>
                    <p className="font-medium">
                      {transfer.requester?.name || "Usuario no disponible"}
                    </p>
                  </div>
                  {transfer.requester?.email && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        Email del solicitante
                      </p>
                      <p>{transfer.requester.email}</p>
                    </div>
                  )}
                  {transfer.requester?.role && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Rol del solicitante
                      </p>
                      <Badge variant="outline">{transfer.requester.role}</Badge>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {transfer.confirmer && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Confirmado por</p>
                        <p className="font-medium">{transfer.confirmer.name}</p>
                      </div>
                      {transfer.confirmer.email && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            Email del confirmador
                          </p>
                          <p>{transfer.confirmer.email}</p>
                        </div>
                      )}
                      {transfer.confirmer.role && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Rol del confirmador
                          </p>
                          <Badge variant="outline">{transfer.confirmer.role}</Badge>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notas */}
          {transfer.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notas Adicionales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{transfer.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
