"use client";

import type { MotorcycleWithRelations } from "@/actions/sales/get-motorcycle-by-id";
import type { BranchData } from "@/actions/stock/get-branch";
import { BrandModelCombobox } from "@/components/custom/BrandModelCombobox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ColorConfig } from "@/types/ColorType";
import type { MotorcycleBatchFormData } from "@/zod/NewBikeZod";
import type { Supplier } from "@prisma/client";
import { AlertCircle, Info, Loader2 } from "lucide-react";
import React from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import type { BrandForCombobox, ModelInfo } from "./page";

// Importar componentes modulares
import { IdentificacionSection } from "./form-sections/IdentificacionSection";
import { LegalSection } from "./form-sections/LegalSection";
import { MultimediaSection } from "./form-sections/MultimediaSection";
import { PreciosSection } from "./form-sections/PreciosSection";

// Constantes para pestañas
const TABS_ORDER = ["producto", "identificacion", "precios", "multimedia", "legal"] as const;
type TabValue = (typeof TABS_ORDER)[number];

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

// Interfaz de Props
interface NewMotoFormRefactoredProps {
  form: UseFormReturn<MotorcycleBatchFormData>;
  availableColors: ColorConfig[];
  availableBrands: BrandForCombobox[];
  availableBranches: BranchData[];
  suppliers: Supplier[];
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  selectedBrand?: BrandForCombobox | null;
  selectedModel?: ModelInfo | null;
  availableSuppliers?: Supplier[];
  isLoading?: boolean;
  serverSuccess?: boolean | null;
  serverError?: string | null;
  submitButtonLabel?: string;
  isEditing?: boolean;
  initialData?: MotorcycleWithRelations | null;
}

export function NewMotoFormRefactored({
  form,
  availableColors,
  availableBrands,
  availableBranches,
  suppliers,
  isSubmitting,
  onSubmit,
  selectedBrand,
  selectedModel,
  availableSuppliers,
  isLoading,
  serverSuccess,
  serverError,
  submitButtonLabel,
  isEditing = false,
  initialData = null,
}: NewMotoFormRefactoredProps) {
  const {
    control,
    setValue,
    getValues,
    clearErrors,
    formState: { errors },
  } = form;

  const [activeTab, setActiveTab] = React.useState<TabValue>(TABS_ORDER[0]);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = React.useState(false);
  const [selectedSupplierInfo, setSelectedSupplierInfo] = React.useState<Supplier | null>(null);
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear + 1;

  const {
    fields: unitFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "units",
  });

  // Efecto para inicializar datos de edición
  React.useEffect(() => {
    if (isEditing && initialData) {
      form.reset({
        brandId: initialData.brandId,
        modelId: initialData.modelId,
        year: initialData.year,
        displacement: initialData.displacement,
        units: initialData.id
          ? [
              {
                idTemporal: initialData.id,
                chassisNumber: initialData.chassisNumber,
                engineNumber: initialData.engineNumber ?? "",
                colorId: initialData.colorId,
                mileage: initialData.mileage,
                branchId: initialData.branchId,
                state: initialData.state,
                licensePlate: initialData.licensePlate ?? "",
                observations: initialData.observations ?? "",
              },
            ]
          : [],
        currency: initialData.currency,
        costPrice: initialData.costPrice,
        wholesalePrice: initialData.wholesalePrice,
        retailPrice: initialData.retailPrice,
        imageUrl: initialData.imageUrl,
        supplierId: initialData.supplierId ?? null,
      });
      const initialBrand = availableBrands.find((b) => b.id === initialData.brandId);
      if (initialBrand) setValue("brandId", initialBrand.id);
    } else if (unitFields.length === 0) {
      append({
        idTemporal: Date.now(),
        chassisNumber: "",
        engineNumber: "",
        colorId: availableColors.length > 0 ? Number(availableColors[0].id) : 0,
        mileage: 0,
        branchId: availableBranches.length > 0 ? Number(availableBranches[0].id) : 0,
        state: "STOCK" as const,
      });
    }
  }, [
    isEditing,
    initialData,
    form,
    setValue,
    availableBrands,
    unitFields.length,
    append,
    availableColors,
    availableBranches,
  ]);

  // Navegación entre tabs
  const handleNextTab = () => {
    const currentIndex = TABS_ORDER.indexOf(activeTab);
    if (currentIndex < TABS_ORDER.length - 1) {
      setActiveTab(TABS_ORDER[currentIndex + 1]);
    }
  };

  const handlePreviousTab = () => {
    const currentIndex = TABS_ORDER.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(TABS_ORDER[currentIndex - 1]);
    }
  };

  // Mostrar info del proveedor
  const showSupplierInfo = (supplierId: number) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (supplier) {
      setSelectedSupplierInfo(supplier);
      setIsSupplierModalOpen(true);
    }
  };

  // Renderizar sección de producto
  const renderProductoFields = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Marca y Modelo */}
        <FormField
          control={control}
          name="brandId"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Marca y Modelo *</FormLabel>
              <FormControl>
                <BrandModelCombobox
                  brands={availableBrands}
                  selectedModelId={getValues("modelId") || null}
                  onSelect={(modelId: number, brandId: number) => {
                    setValue("brandId", brandId);
                    setValue("modelId", modelId);
                    clearErrors(["brandId", "modelId"]);
                  }}
                  placeholder="Selecciona marca y modelo"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Año */}
        <FormField
          control={control}
          name="year"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Año *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1900"
                  max={maxYear}
                  disabled={isSubmitting}
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Cilindrada */}
        <FormField
          control={control}
          name="displacement"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cilindrada (cc)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  placeholder="Ej: 150"
                  disabled={isSubmitting}
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === "" ? null : Number(value));
                  }}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Proveedor */}
      <FormField
        control={control}
        name="supplierId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Proveedor</FormLabel>
            <div className="flex gap-2">
              <Select
                onValueChange={(value) => field.onChange(value === "null" ? null : Number(value))}
                value={field.value?.toString() ?? "null"}
                disabled={isSubmitting}
              >
                <FormControl className="flex-1">
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="null">Sin proveedor</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.legalName || supplier.commercialName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.value && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => field.value && showSupplierInfo(field.value)}
                  disabled={isSubmitting}
                >
                  <Info className="h-4 w-4" />
                </Button>
              )}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Mensajes de estado */}
        {serverError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {serverSuccess && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Éxito</AlertTitle>
            <AlertDescription>Los datos se guardaron correctamente.</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="producto">Producto</TabsTrigger>
            <TabsTrigger value="identificacion">Identificación</TabsTrigger>
            <TabsTrigger value="precios">Precios</TabsTrigger>
            <TabsTrigger value="multimedia">Multimedia</TabsTrigger>
            <TabsTrigger value="legal">Legal</TabsTrigger>
          </TabsList>

          <TabsContent value="producto" className="space-y-6">
            {renderProductoFields()}
          </TabsContent>

          <TabsContent value="identificacion" className="space-y-6">
            <IdentificacionSection
              control={control}
              fields={unitFields}
              append={append}
              remove={remove}
              availableColors={availableColors}
              availableBranches={availableBranches}
              isSubmitting={isSubmitting}
            />
          </TabsContent>

          <TabsContent value="precios" className="space-y-6">
            <PreciosSection control={control} isSubmitting={isSubmitting} />
          </TabsContent>

          <TabsContent value="multimedia" className="space-y-6">
            <MultimediaSection control={control} setValue={setValue} isSubmitting={isSubmitting} />
          </TabsContent>

          <TabsContent value="legal" className="space-y-6">
            <LegalSection control={control} isSubmitting={isSubmitting} />
          </TabsContent>
        </Tabs>

        {/* Navegación y submit */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreviousTab}
            disabled={activeTab === TABS_ORDER[0] || isSubmitting}
          >
            Anterior
          </Button>

          <div className="flex gap-2">
            {activeTab !== TABS_ORDER[TABS_ORDER.length - 1] ? (
              <Button type="button" onClick={handleNextTab} disabled={isSubmitting}>
                Siguiente
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting || isLoading}>
                {isSubmitting || isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  submitButtonLabel || "Guardar"
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Modal de información del proveedor */}
        <Dialog open={isSupplierModalOpen} onOpenChange={setIsSupplierModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Información del Proveedor</DialogTitle>
            </DialogHeader>
            {selectedSupplierInfo && (
              <div className="space-y-2">
                <DisplayData label="Razón Social" value={selectedSupplierInfo.legalName} />{" "}
                <DisplayData label="Nombre Comercial" value={selectedSupplierInfo.commercialName} />{" "}
                <DisplayData label="CUIT" value={selectedSupplierInfo.taxIdentification} />{" "}
                <DisplayData
                  label="Teléfono"
                  value={selectedSupplierInfo.mobileNumber || selectedSupplierInfo.landlineNumber}
                />{" "}
                <DisplayData label="Email" value={selectedSupplierInfo.email} />{" "}
                <DisplayData label="Dirección" value={selectedSupplierInfo.legalAddress} />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </form>
    </Form>
  );
}
