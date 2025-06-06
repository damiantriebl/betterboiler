"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MotorcycleBatchFormData } from "@/zod/NewBikeZod";
import type { Supplier } from "@prisma/client";
import { Info } from "lucide-react";
import { useState } from "react";
import type { Control, UseFormSetValue } from "react-hook-form";

// Helper DisplayData para mostrar info en modal
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
    <div className="flex gap-2 items-baseline py-1 border-b border-dashed last:border-b-0">
      <span className="font-medium text-sm w-1/3 flex-none">{label}:</span>
      <span className="text-sm flex-grow">{displayValue}</span>
    </div>
  );
};

interface SupplierSectionProps {
  control: Control<MotorcycleBatchFormData>;
  setValue: UseFormSetValue<MotorcycleBatchFormData>;
  suppliers: Supplier[];
  isSubmitting?: boolean;
}

export function SupplierSection({
  control,
  setValue,
  suppliers,
  isSubmitting = false,
}: SupplierSectionProps) {
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedSupplierInfo, setSelectedSupplierInfo] = useState<Supplier | null>(null);

  return (
    <FormField
      control={control}
      name="supplierId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Proveedor</FormLabel>
          <div className="flex gap-2">
            <Select
              onValueChange={(value) => {
                const numericValue = value === "null" ? null : Number(value);
                field.onChange(numericValue);
                setValue("supplierId", numericValue);
                const selectedSupplier = suppliers.find((s) => s.id === numericValue);
                setSelectedSupplierInfo(selectedSupplier || null);
              }}
              value={field.value ? field.value.toString() : "null"}
              disabled={isSubmitting}
            >
              <FormControl>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="null">Sin proveedor</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id.toString()}>
                    {supplier.legalName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isSupplierModalOpen} onOpenChange={setIsSupplierModalOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!selectedSupplierInfo || isSubmitting}
                  className="flex-shrink-0"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Información del Proveedor</DialogTitle>
                </DialogHeader>
                {selectedSupplierInfo ? (
                  <div className="max-h-[60vh] overflow-y-auto p-1 pr-3 space-y-1">
                    <DisplayData label="Razón Social" value={selectedSupplierInfo.legalName} />
                    <DisplayData
                      label="Nombre Comercial"
                      value={selectedSupplierInfo.commercialName}
                    />
                    <DisplayData label="CUIT/CUIL" value={selectedSupplierInfo.taxIdentification} />
                    <DisplayData label="Condición IVA" value={selectedSupplierInfo.vatCondition} />
                    <DisplayData label="Teléfono Móvil" value={selectedSupplierInfo.mobileNumber} />
                    <DisplayData label="Email" value={selectedSupplierInfo.email} />
                    <DisplayData
                      label="Dirección Comercial"
                      value={selectedSupplierInfo.commercialAddress}
                    />
                    <DisplayData label="Estado" value={selectedSupplierInfo.status} />
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Selecciona un proveedor para ver su información.
                  </p>
                )}
              </DialogContent>
            </Dialog>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
