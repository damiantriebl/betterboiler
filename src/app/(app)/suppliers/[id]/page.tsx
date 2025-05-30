"use client";

import { getSupplierById } from "@/actions/suppliers/suppliers-unified";
import { DisplayData } from "@/components/custom/DisplayData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Supplier } from "@prisma/client";
import { ArrowLeft, Edit } from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import React, { useState, useEffect } from "react";
import SupplierForm from "../SupplierForm";

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
      <div className="container max-w-none p-4 space-y-4">
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
              onSuccess={(updatedData) => {
                setSupplier((prev) => (prev ? { ...prev, ...updatedData } : null));
                handleCloseEditModal();
              }}
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
              <DisplayData label="Razón Social" value={supplier.legalName} variant="grid" />
              <DisplayData
                label="Nombre Comercial"
                value={supplier.commercialName}
                variant="grid"
              />
              <DisplayData label="CUIT/CUIL" value={supplier.taxIdentification} variant="grid" />
            </TabsContent>

            {/* Pestaña Fiscal */}
            <TabsContent value="fiscal" className="space-y-1">
              <DisplayData label="Condición IVA" value={supplier.vatCondition} variant="grid" />
              <DisplayData label="Tipo Comprobante" value={supplier.voucherType} variant="grid" />
              <DisplayData label="Ingresos Brutos" value={supplier.grossIncome} variant="grid" />
              <DisplayData
                label="Insc. Tributaria Local"
                value={supplier.localTaxRegistration}
                variant="grid"
              />
            </TabsContent>

            {/* Pestaña Contacto */}
            <TabsContent value="contacto" className="space-y-1">
              <DisplayData label="Nombre Contacto" value={supplier.contactName} variant="grid" />
              <DisplayData label="Cargo Contacto" value={supplier.contactPosition} variant="grid" />
              <DisplayData label="Teléfono Fijo" value={supplier.landlineNumber} variant="grid" />
              <DisplayData label="Teléfono Móvil" value={supplier.mobileNumber} variant="grid" />
              <DisplayData label="Email" value={supplier.email} variant="grid" />
              <DisplayData label="Sitio Web" value={supplier.website} variant="grid" />
            </TabsContent>

            {/* Pestaña Direcciones */}
            <TabsContent value="direcciones" className="space-y-1">
              <DisplayData label="Domicilio Legal" value={supplier.legalAddress} variant="grid" />
              <DisplayData
                label="Domicilio Comercial"
                value={supplier.commercialAddress}
                variant="grid"
              />
              <DisplayData
                label="Domicilio Entrega"
                value={supplier.deliveryAddress}
                variant="grid"
              />
            </TabsContent>

            {/* Pestaña Bancaria */}
            <TabsContent value="bancaria" className="space-y-1">
              <DisplayData label="Banco" value={supplier.bank} variant="grid" />
              <DisplayData
                label="Tipo/Nro Cuenta"
                value={supplier.accountTypeNumber}
                variant="grid"
              />
              <DisplayData label="CBU/IBAN" value={supplier.cbu} variant="grid" />
              <DisplayData label="Alias Bancario" value={supplier.bankAlias} variant="grid" />
              <DisplayData label="SWIFT/BIC" value={supplier.swiftBic} variant="grid" />
            </TabsContent>

            {/* Pestaña Comercial */}
            <TabsContent value="comercial" className="space-y-1">
              <DisplayData label="Moneda Pago" value={supplier.paymentCurrency} variant="grid" />
              <DisplayData label="Formas Pago" value={supplier.paymentMethods} variant="grid" />
              <DisplayData
                label="Plazo Pago (días)"
                value={supplier.paymentTermDays}
                variant="grid"
              />
              <DisplayData label="Límite Crédito" value={supplier.creditLimit} variant="grid" />
              <DisplayData
                label="Descuentos/Cond."
                value={supplier.discountsConditions}
                variant="grid"
              />
              <DisplayData label="Política Devol." value={supplier.returnPolicy} variant="grid" />
            </TabsContent>

            {/* Pestaña Logística */}
            <TabsContent value="logistica" className="space-y-1">
              <DisplayData label="Métodos Envío" value={supplier.shippingMethods} variant="grid" />
              <DisplayData label="Costos Envío" value={supplier.shippingCosts} variant="grid" />
              <DisplayData label="Tiempos Entrega" value={supplier.deliveryTimes} variant="grid" />
              <DisplayData
                label="Cond. Transporte"
                value={supplier.transportConditions}
                variant="grid"
              />
            </TabsContent>

            {/* Pestaña Adicional */}
            <TabsContent value="adicional" className="space-y-1">
              <DisplayData
                label="Rubros/Categorías"
                value={supplier.itemsCategories}
                variant="grid"
              />
              <DisplayData label="Certificaciones" value={supplier.certifications} variant="grid" />
              <DisplayData
                label="Referencias"
                value={supplier.commercialReferences}
                variant="grid"
              />
              <DisplayData
                label="Notas Internas"
                value={supplier.notesObservations}
                variant="grid"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
