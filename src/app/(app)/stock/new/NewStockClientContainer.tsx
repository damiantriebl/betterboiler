"use client";

import { createMotorcycleBatch } from "@/actions/stock/create-motorcycle-batch";
import type { BranchData } from "@/actions/stock/get-branch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { ColorConfig } from "@/types/ColorType";
import type { MotorcycleBatchFormData } from "@/zod/NewBikeZod";
import { motorcycleBatchSchema } from "@/zod/NewBikeZod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Supplier } from "@prisma/client";
import React, { useTransition } from "react";
import { useForm } from "react-hook-form";
import { BatchPreview } from "./BatchPreview";
import { NewMotoFormRefactored } from "./NewMotoForm";
import type { BrandForCombobox } from "./page";
import { CreateBatchState } from "@/actions/stock/create-motorcycle-batch";

interface NewStockClientContainerProps {
  availableColors: ColorConfig[];
  availableBrands: BrandForCombobox[];
  availableBranches: BranchData[];
  suppliers: Supplier[];
}

export function NewStockClientContainer({
  availableColors,
  availableBrands,
  availableBranches,
  suppliers,
}: NewStockClientContainerProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const form = useForm<MotorcycleBatchFormData>({
    resolver: zodResolver(motorcycleBatchSchema),
    defaultValues: {
      brandId: undefined,
      modelId: undefined,
      year: new Date().getFullYear(),
      units: [],
      supplierId: null,
      costPrice: null,
      retailPrice: 0,
      wholesalePrice: null,
      currency: "ARS",
      ivaPorcentajeMinorista: 21,
      otrosImpuestosMinorista: null,
      gananciaPorcentajeMinorista: null,
      ivaPorcentajeMayorista: 21,
      otrosImpuestosMayorista: null,
      gananciaPorcentajeMayorista: null,
      imageUrl: null,
      displacement: null,
    },
  });

  const onSubmit = (data: MotorcycleBatchFormData) => {
    startTransition(async () => {
      try {
        const result = await createMotorcycleBatch(null, data);
        if (result.success) {
          toast({
            title: "Éxito",
            description: "¡Lote guardado exitosamente!",
          });
          form.reset();
        } else {
          toast({
            variant: "destructive",
            title: "Error al guardar",
            description: result.error || "Ocurrió un error desconocido.",
          });
        }
      } catch (error) {
        console.error("Error inesperado en onSubmit:", error);
        toast({
          variant: "destructive",
          title: "Error inesperado",
          description: "Ocurrió un error inesperado al procesar la solicitud.",
        });
      }
    });
  };

  const watchedFormData = form.watch();

  return (
    <div className="w-full flex flex-col items-start gap-6">
      <div className="w-full">
        <BatchPreview
          formData={watchedFormData}
          availableBrands={availableBrands}
          availableColors={availableColors}
          availableBranches={availableBranches}
          suppliers={suppliers}
        />
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Datos del Lote</CardTitle>
          <CardDescription>
            Completa la información para registrar las nuevas unidades.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <NewMotoFormRefactored
            form={form}
            availableColors={availableColors}
            availableBrands={availableBrands}
            availableBranches={availableBranches}
            suppliers={suppliers}
            isSubmitting={isPending}
            onSubmit={form.handleSubmit(onSubmit)}
            submitButtonLabel="Guardar Lote"
          />
        </CardContent>
      </Card>
    </div>
  );
}
