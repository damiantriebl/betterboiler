"use client";

import { BrandModelCombobox } from "@/components/custom/BrandModelCombobox";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { ColorConfig } from "@/types/ColorType";
import type { MotorcycleBatchFormData } from "@/zod/NewBikeZod";
import type { Supplier } from "@prisma/client";
import type {
  Control,
  ControllerRenderProps,
  UseFormClearErrors,
  UseFormSetValue,
} from "react-hook-form";
import type { BrandForCombobox } from "../page";
import { SupplierSection } from "./SupplierSection";

interface ProductoSectionProps {
  control: Control<MotorcycleBatchFormData>;
  setValue: UseFormSetValue<MotorcycleBatchFormData>;
  clearErrors: UseFormClearErrors<MotorcycleBatchFormData>;
  availableBrands: BrandForCombobox[];
  suppliers: Supplier[];
  handleNullableNumberChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    field: ControllerRenderProps<MotorcycleBatchFormData, any>,
  ) => void;
  isSubmitting?: boolean;
}

export function ProductoSection({
  control,
  setValue,
  clearErrors,
  availableBrands,
  suppliers,
  handleNullableNumberChange,
  isSubmitting = false,
}: ProductoSectionProps) {
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear + 1;

  return (
    <div className="flex flex-wrap gap-4">
      <FormField
        control={control}
        name="modelId"
        render={({ field }) => (
          <FormItem className="flex flex-col w-full">
            <FormLabel>Marca y Modelo</FormLabel>
            <BrandModelCombobox
              brands={availableBrands}
              selectedModelId={Number(field.value)}
              onSelect={(modelId, brandId) => {
                setValue("modelId", modelId, { shouldValidate: true });
                setValue("brandId", brandId, { shouldValidate: true });
                clearErrors(["modelId", "brandId"]);
              }}
              placeholder="Selecciona Marca y Modelo"
              searchPlaceholder="Buscar Marca o Modelo..."
              notFoundMessage="No se encontraron coincidencias."
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="year"
        render={({ field }) => (
          <FormItem className="w-full md:w-[calc(50%-0.5rem)]">
            <FormLabel>Año</FormLabel>
            <FormControl>
              <Input
                className="h-10"
                type="number"
                placeholder="Ej: 2024"
                max={maxYear}
                {...field}
                onChange={(e) => handleNullableNumberChange(e, field)}
                value={field.value ?? 0}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="displacement"
        render={({ field }) => (
          <FormItem className="w-full md:w-[calc(50%-0.5rem)]">
            <FormLabel>Cilindrada (cc)</FormLabel>
            <FormControl>
              <Input
                className="h-10"
                type="number"
                placeholder="Ej: 190"
                {...field}
                onChange={(e) => handleNullableNumberChange(e, field)}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="w-full md:w-[calc(50%-0.5rem)]">
        <SupplierSection
          control={control}
          setValue={setValue}
          suppliers={suppliers}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
