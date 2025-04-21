"use client";

import React, { useState, useEffect } from "react";
import { notFound, useParams } from "next/navigation";
import { getSupplierById } from "@/actions/suppliers/manage-suppliers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit } from "lucide-react";
import type { Supplier } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import SupplierForm from "../SupplierForm";
import { Skeleton } from "@/components/ui/skeleton";

// Helper para mostrar datos opcionales o un placeholder
const DisplayData = ({
  label,
  value,
}: { label: string; value: string | number | string[] | null | undefined }) => {
  const displayValue =
    value === null ||
    value === undefined ||
    (Array.isArray(value) && value.length === 0) ||
    value === "" ? (
      <span className="text-muted-foreground italic">N/A</span>
    ) : Array.isArray(value) ? (
      value.join(", ")
    ) : (
      value
    );

  return (
    <div className="grid grid-cols-3 gap-2 py-1 border-b border-dashed last:border-b-0">
      <span className="font-medium text-sm col-span-1">{label}:</span>
      <span className="text-sm col-span-2">{displayValue}</span>
    </div>
  );
};

export default function SupplierDetailPage() {
  const params = useParams();
  const idParam = params.id as string;
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    const fetchSupplier = async () => {
      setIsLoading(true);
      setError(null);
      const supplierId = Number.parseInt(idParam, 10);
      if (Number.isNaN(supplierId)) {
        setError("ID de proveedor inválido.");
        setIsLoading(false);
        return;
      }
      try {
        const fetchedSupplier = await getSupplierById(supplierId);
        if (!fetchedSupplier) {
          notFound();
        } else {
          setSupplier(fetchedSupplier);
        }
      } catch (err) {
        console.error(err);
        setError("Error al cargar el proveedor.");
      } finally {
        setIsLoading(false);
      }
    };

    if (idParam) {
      fetchSupplier();
    }
  }, [idParam]);

  const handleOpenEditModal = () => setIsEditModalOpen(true);
  const handleCloseEditModal = () => setIsEditModalOpen(false);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-600">{error}</div>;
  }

  if (!supplier) {
    notFound();
  }

  const tabsConfig = [
    { value: "identificacion", label: "Identificación" },
    { value: "fiscal", label: "Datos Fiscales" },
    { value: "contacto", label: "Contacto" },
    { value: "direcciones", label: "Direcciones" },
    { value: "bancaria", label: "Info. Bancaria" },
    { value: "comercial", label: "Cond. Comerciales" },
    { value: "logistica", label: "Logística" },
    { value: "adicional", label: "Info. Adicional" },
  ];

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <Link
          href="/suppliers"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
        >
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Proveedores
          </Button>
        </Link>
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm" onClick={handleOpenEditModal}>
              <Edit className="mr-2 h-4 w-4" />
              Editar Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[80%] lg:max-w-[60%] xl:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Editar Proveedor</DialogTitle>
            </DialogHeader>
            <SupplierForm
              initialData={supplier}
              supplierId={supplier.id}
              onSuccess={() => handleCloseEditModal()}
              onCancel={handleCloseEditModal}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{supplier.commercialName || supplier.legalName}</CardTitle>
              {supplier.commercialName && supplier.legalName !== supplier.commercialName && (
                <CardDescription>{supplier.legalName}</CardDescription>
              )}
            </div>
            <Badge
              variant={supplier.status === "activo" ? "default" : "outline"}
              className={cn(
                supplier.status === "activo"
                  ? "bg-green-100 text-green-800 border-green-300"
                  : "bg-gray-100 text-gray-600 border-gray-300",
              )}
            >
              {supplier.status === "activo" ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="identificacion" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:grid-cols-8 mb-4">
              {tabsConfig.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Pestaña Identificación */}
            <TabsContent value="identificacion" className="space-y-1">
              <DisplayData label="Razón Social" value={supplier.legalName} />
              <DisplayData label="Nombre Comercial" value={supplier.commercialName} />
              <DisplayData label="CUIT/CUIL" value={supplier.taxIdentification} />
            </TabsContent>

            {/* Pestaña Fiscal */}
            <TabsContent value="fiscal" className="space-y-1">
              <DisplayData label="Condición IVA" value={supplier.vatCondition} />
              <DisplayData label="Tipo Comprobante" value={supplier.voucherType} />
              <DisplayData label="Ingresos Brutos" value={supplier.grossIncome} />
              <DisplayData label="Insc. Tributaria Local" value={supplier.localTaxRegistration} />
            </TabsContent>

            {/* Pestaña Contacto */}
            <TabsContent value="contacto" className="space-y-1">
              <DisplayData label="Nombre Contacto" value={supplier.contactName} />
              <DisplayData label="Cargo Contacto" value={supplier.contactPosition} />
              <DisplayData label="Teléfono Fijo" value={supplier.landlineNumber} />
              <DisplayData label="Teléfono Móvil" value={supplier.mobileNumber} />
              <DisplayData label="Email" value={supplier.email} />
              <DisplayData label="Sitio Web" value={supplier.website} />
            </TabsContent>

            {/* Pestaña Direcciones */}
            <TabsContent value="direcciones" className="space-y-1">
              <DisplayData label="Domicilio Legal" value={supplier.legalAddress} />
              <DisplayData label="Domicilio Comercial" value={supplier.commercialAddress} />
              <DisplayData label="Domicilio Entrega" value={supplier.deliveryAddress} />
            </TabsContent>

            {/* Pestaña Bancaria */}
            <TabsContent value="bancaria" className="space-y-1">
              <DisplayData label="Banco" value={supplier.bank} />
              <DisplayData label="Tipo/Nro Cuenta" value={supplier.accountTypeNumber} />
              <DisplayData label="CBU/IBAN" value={supplier.cbu} />
              <DisplayData label="Alias Bancario" value={supplier.bankAlias} />
              <DisplayData label="SWIFT/BIC" value={supplier.swiftBic} />
            </TabsContent>

            {/* Pestaña Comercial */}
            <TabsContent value="comercial" className="space-y-1">
              <DisplayData label="Moneda Pago" value={supplier.paymentCurrency} />
              <DisplayData label="Formas Pago" value={supplier.paymentMethods} />
              <DisplayData label="Plazo Pago (días)" value={supplier.paymentTermDays} />
              <DisplayData label="Límite Crédito" value={supplier.creditLimit} />
              <DisplayData label="Descuentos/Cond." value={supplier.discountsConditions} />
              <DisplayData label="Política Devol." value={supplier.returnPolicy} />
            </TabsContent>

            {/* Pestaña Logística */}
            <TabsContent value="logistica" className="space-y-1">
              <DisplayData label="Métodos Envío" value={supplier.shippingMethods} />
              <DisplayData label="Costos Envío" value={supplier.shippingCosts} />
              <DisplayData label="Tiempos Entrega" value={supplier.deliveryTimes} />
              <DisplayData label="Cond. Transporte" value={supplier.transportConditions} />
            </TabsContent>

            {/* Pestaña Adicional */}
            <TabsContent value="adicional" className="space-y-1">
              <DisplayData label="Rubros/Categorías" value={supplier.itemsCategories} />
              <DisplayData label="Certificaciones" value={supplier.certifications} />
              <DisplayData label="Referencias" value={supplier.commercialReferences} />
              <DisplayData label="Notas Internas" value={supplier.notesObservations} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
