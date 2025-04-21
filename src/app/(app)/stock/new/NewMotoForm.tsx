"use client";

import React, { useCallback } from "react";
import {
  type Control,
  type UseFormSetValue,
  type UseFormClearErrors,
  type UseFormGetValues,
  type FormState,
  type FieldValues,
  type FieldErrors,
  type UseFormStateReturn,
  useFieldArray,
  type UseFormReturn,
  type ControllerRenderProps,
} from "react-hook-form";
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
import { Button } from "@/components/ui/button";
import UploadButton, { type UploadResult } from "@/components/custom/UploadCropperButton";
import { Loader2, Plus, Trash2, Info, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BrandModelCombobox } from "@/components/custom/BrandModelCombobox";
import { ColorSelector } from "@/components/custom/ColorSelector";
import type { BranchData } from "@/actions/stock/get-branch";
import { SucursalSelector } from "@/components/custom/SucursalSelector";
import type { BrandForCombobox, ModelInfo } from "./page";
import type { ColorConfig } from "@/types/ColorType";
import type {
  UnitIdentificationFormData as IdentificacionData,
  MotorcycleBatchFormData,
} from "@/zod/NewBikeZod";
import { z } from "zod";
import type { Supplier } from "@prisma/client";
import { MotorcycleState } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useActionState } from "react";

// Tipos inferidos de react-hook-form para los field arrays
type UnitField = IdentificacionData & { id: string }; // react-hook-form añade un 'id' propio

// Constantes para pestañas - Renamed Comercial to Precios
const TABS_ORDER = ["producto", "identificacion", "precios", "multimedia", "legal"] as const;
type TabValue = (typeof TABS_ORDER)[number];

// Copiar Helper DisplayData para mostrar info en modal
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

// Interfaz de Props - Recibe form completo
interface NewMotoFormProps {
  form: UseFormReturn<MotorcycleBatchFormData>; // Cambiar props individuales por form
  // Eliminar props individuales ya contenidas en form
  // control: Control<MotorcycleBatchFormData>;
  // formState: UseFormStateReturn<MotorcycleBatchFormData>;
  // errors: FieldErrors<MotorcycleBatchFormData>;
  // getValues: UseFormGetValues<MotorcycleBatchFormData>;
  // setValue: UseFormSetValue<MotorcycleBatchFormData>;
  // clearErrors: UseFormClearErrors<MotorcycleBatchFormData>;
  availableColors: ColorConfig[];
  availableBrands: BrandForCombobox[]; // Mantener este tipo por ahora
  availableBranches: BranchData[];
  suppliers: Supplier[];
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; // Mantener onSubmit para el <form> tag
  selectedBrand?: BrandForCombobox | null;
  selectedModel?: ModelInfo | null;
  availableSuppliers?: Supplier[];
  isLoading?: boolean;
  unitId?: number;
  serverSuccess?: boolean | null; // Mantener props de estado del servidor si se usan
  serverError?: string | null;
  submitButtonLabel?: string;
}

export function NewMotoForm({
  form, // Usar form
  // Eliminar props individuales
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
  unitId,
  serverSuccess, // Mantener si se usan
  serverError,
  submitButtonLabel,
}: NewMotoFormProps) {
  // Extraer métodos necesarios de form si se usan directamente (aunque FormField los obtiene del contexto)
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

  // Usar useFieldArray para obtener fields, append y remove
  const {
    fields: unitFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "units",
  });

  const addIdentificacion = useCallback(() => {
    append({
      idTemporal: Date.now(),
      chassisNumber: "",
      engineNumber: "",
      colorId: availableColors.length > 0 ? Number(availableColors[0].id) : 0,
      mileage: 0,
      branchId: availableBranches.length > 0 ? Number(availableBranches[0].id) : 0,
      state: MotorcycleState.STOCK,
    });
  }, [append, availableColors, availableBranches]);

  React.useEffect(() => {
    if (unitFields.length === 0) {
      addIdentificacion();
    }
  }, [unitFields.length, addIdentificacion]);

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

  const handleNullableNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: ControllerRenderProps<FieldValues, string>
  ) => {
    field.onChange(e.target.value === "" ? null : e.target.valueAsNumber);
  };

  const renderSupplierField = () => (
    <FormField
      control={control}
      name="supplierId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Proveedor (Opcional)</FormLabel>
          <div className="flex items-center gap-2">
            <Select
              value={field.value?.toString() ?? "none"}
              onValueChange={(value) => {
                const numericValue = Number.parseInt(value, 10);
                setValue("supplierId", Number.isNaN(numericValue) ? null : numericValue, {
                  shouldValidate: true,
                });
              }}
              disabled={isSubmitting}
            >
              <FormControl>
                <SelectTrigger className="flex-grow">
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">-- Ninguno --</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id.toString()}>
                    {supplier.commercialName || supplier.legalName}
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
                  className="h-10 w-10 flex-shrink-0"
                  disabled={!field.value || field.value.toString() === "none"}
                  onClick={() => {
                    const supplierId = field.value;
                    if (supplierId && supplierId.toString() !== "none") {
                      const supplier = suppliers.find(
                        (s) => s.id.toString() === supplierId.toString(),
                      );
                      if (supplier) {
                        setSelectedSupplierInfo(supplier);
                        setIsSupplierModalOpen(true);
                      } else {
                        console.error("Selected supplier not found.");
                      }
                    }
                  }}
                >
                  <Info className="h-4 w-4" />
                  <span className="sr-only">Ver Info Proveedor</span>
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

  const renderProductoFields = () => (
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
      <div className="w-full md:w-[calc(50%-0.5rem)]">{renderSupplierField()}</div>
    </div>
  );

  const renderIdentificacionFields = () => (
    <div className="space-y-6">
      {unitFields.map((fieldItem: UnitField, index: number) => (
        <div key={fieldItem.id} className="p-4 border rounded-md space-y-4 relative">
          <Button
            variant="ghost"
            size="icon"
            type="button"
            className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={() => remove(index)}
            disabled={isSubmitting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <h4 className="text-md font-medium border-b pb-1">Unidad {index + 1}</h4>
          <div className="flex flex-wrap gap-4">
            <FormField
              control={control}
              name={`units.${index}.chassisNumber` as const}
              render={({ field }) => (
                <FormItem className="w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]">
                  <FormLabel>Nro. Chasis</FormLabel>
                  <FormControl>
                    <Input className="h-10" placeholder="ABC123XYZ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`units.${index}.engineNumber` as const}
              render={({ field }) => (
                <FormItem className="w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]">
                  <FormLabel>Nro. Motor</FormLabel>
                  <FormControl>
                    <Input
                      className="h-10"
                      placeholder="Opcional"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`units.${index}.colorId` as const}
              render={({ field }) => (
                <FormItem className="flex flex-col w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]">
                  <FormLabel>Color</FormLabel>
                  <ColorSelector
                    colors={availableColors}
                    selectedColorId={field.value}
                    onSelect={(id: number | null) => field.onChange(id)}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`units.${index}.mileage` as const}
              render={({ field }) => (
                <FormItem className="w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]">
                  <FormLabel>Kilometraje</FormLabel>
                  <FormControl>
                    <Input
                      className="h-10"
                      type="number"
                      placeholder="0"
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
              name={`units.${index}.branchId` as const}
              render={({ field }) => (
                <FormItem className="flex flex-col w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]">
                  <FormLabel>Sucursal</FormLabel>
                  <SucursalSelector
                    sucursales={availableBranches}
                    selectedSucursalId={field.value}
                    onSelect={(id: number | null) => field.onChange(id)}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`units.${index}.state` as const}
              render={({ field }) => (
                <FormItem className="w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]">
                  <FormLabel>Estado</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || MotorcycleState.STOCK}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estado..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(MotorcycleState).map((estado) => (
                        <SelectItem key={estado} value={estado}>
                          {estado}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2 w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10"
        onClick={addIdentificacion}
        disabled={isSubmitting}
      >
        <Plus className="mr-2 h-4 w-4" />
        Añadir Unidad
      </Button>
      {errors.units?.root && (
        <p className="text-sm font-medium text-destructive mt-2">
          {typeof errors.units.root.message === "string"
            ? errors.units.root.message
            : "Error en unidades"}
        </p>
      )}
    </div>
  );

  const renderPreciosFields = () => {
    const calculateFinalPrice = useCallback((
      costo: number | null,
      ivaP: number | null,
      otrosImp: number | null,
      gananciaP: number | null,
    ) => {
      const pc = costo ?? 0;
      const iva = ivaP ?? 0;
      const otros = otrosImp ?? 0;
      const ganancia = gananciaP ?? 0;
      if (pc <= 0) return otros;
      const final = pc * (1 + ganancia / 100) * (1 + iva / 100) + otros;
      return Number.parseFloat(final.toFixed(2));
    }, []);

    const calculateGainPercentage = useCallback((
      costo: number | null,
      precioFinal: number | null,
      ivaP: number | null,
      otrosImp: number | null,
    ) => {
      const pc = costo ?? 0;
      const pf = precioFinal ?? 0;
      const iva = ivaP ?? 0;
      const otros = otrosImp ?? 0;
      const factorIVA = 1 + iva / 100;
      if (pc <= 0 || factorIVA === 0) return 0;
      const ganancia = 100 * ((pf - otros) / (pc * factorIVA) - 1);
      return Number.parseFloat(ganancia.toFixed(2));
    }, []);

    const costPrice = getValues("costPrice");
    const ivaMinorista = getValues("ivaPorcentajeMinorista");
    const otrosMinorista = getValues("otrosImpuestosMinorista");
    const gananciaMinorista = getValues("gananciaPorcentajeMinorista");
    const ivaMayorista = getValues("ivaPorcentajeMayorista");
    const otrosMayorista = getValues("otrosImpuestosMayorista");
    const gananciaMayorista = getValues("gananciaPorcentajeMayorista");

    React.useEffect(() => {
      const retailPrice = getValues("retailPrice");
      const calculatedFinalMinorista = calculateFinalPrice(
        costPrice,
        ivaMinorista,
        otrosMinorista,
        gananciaMinorista,
      );
      if (Math.abs((retailPrice || 0) - calculatedFinalMinorista) > 0.01) {
        setValue("retailPrice", calculatedFinalMinorista, { shouldValidate: false });
      }
    }, [costPrice, ivaMinorista, otrosMinorista, gananciaMinorista, calculateFinalPrice]);

    React.useEffect(() => {
      const wholesalePrice = getValues("wholesalePrice");
      const calculatedFinalMayorista = calculateFinalPrice(
        costPrice,
        ivaMayorista,
        otrosMayorista,
        gananciaMayorista,
      );
      if (Math.abs((wholesalePrice || 0) - calculatedFinalMayorista) > 0.01) {
        setValue("wholesalePrice", calculatedFinalMayorista, { shouldValidate: false });
      }
    }, [costPrice, ivaMayorista, otrosMayorista, gananciaMayorista, calculateFinalPrice]);

    const handleMinoristaGainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newGain = e.target.value === "" ? null : Number.parseFloat(e.target.value);
      setValue("gananciaPorcentajeMinorista", newGain, { shouldValidate: true });
      const { costPrice, ivaPorcentajeMinorista, otrosImpuestosMinorista } = getValues();
      const newFinal = calculateFinalPrice(
        costPrice,
        ivaPorcentajeMinorista,
        otrosImpuestosMinorista,
        newGain,
      );
      setValue("retailPrice", newFinal, { shouldValidate: true });
    };

    const handleMinoristaFinalPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newFinal = e.target.value === "" ? 0 : Number.parseFloat(e.target.value);
      setValue("retailPrice", newFinal, { shouldValidate: true });
      const { costPrice, ivaPorcentajeMinorista, otrosImpuestosMinorista } = getValues();
      const newGain = calculateGainPercentage(
        costPrice,
        newFinal,
        ivaPorcentajeMinorista,
        otrosImpuestosMinorista,
      );
      setValue("gananciaPorcentajeMinorista", newGain, { shouldValidate: true });
    };

    const handleMayoristaGainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newGain = e.target.value === "" ? null : Number.parseFloat(e.target.value);
      setValue("gananciaPorcentajeMayorista", newGain, { shouldValidate: true });
      const { costPrice, ivaPorcentajeMayorista, otrosImpuestosMayorista } = getValues();
      const newFinal = calculateFinalPrice(
        costPrice,
        ivaPorcentajeMayorista,
        otrosImpuestosMayorista,
        newGain,
      );
      setValue("wholesalePrice", newFinal, { shouldValidate: true });
    };

    const handleMayoristaFinalPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newFinal = e.target.value === "" ? null : Number.parseFloat(e.target.value);
      setValue("wholesalePrice", newFinal, { shouldValidate: true });
      const { costPrice, ivaPorcentajeMayorista, otrosImpuestosMayorista } = getValues();
      const newGain = calculateGainPercentage(
        costPrice,
        newFinal,
        ivaPorcentajeMayorista,
        otrosImpuestosMayorista,
      );
      setValue("gananciaPorcentajeMayorista", newGain, { shouldValidate: true });
    };

    return (
      <div className="space-y-6 ">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <FormField
            control={control}
            name="costPrice"
            render={({ field }) => (
              <FormItem className="w-full sm:w-2/3">
                <FormLabel>Precio Costo</FormLabel>
                <FormControl>
                  <Input
                    className="h-10"
                    type="number"
                    placeholder="Costo base"
                    {...field}
                    onChange={(e) => handleNullableNumberChange(e, field)}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="currency"
            render={({ field }) => (
              <FormItem className="w-full sm:w-1/3">
                <FormLabel>Moneda</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Moneda" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ARS">$ ARS</SelectItem>
                    <SelectItem value="USD">U$S USD</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div className="flex flex-col md:flex-row gap-x-6 gap-y-4">
          <div className="space-y-4 p-4 border rounded-md w-full md:w-1/2">
            <h3 className="text-lg font-semibold mb-2 border-b pb-1">Precio Mayorista</h3>
            <FormField
              control={control}
              name="ivaPorcentajeMayorista"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IVA (%)</FormLabel>
                  <FormControl>
                    <Input
                      className="h-9"
                      type="number"
                      placeholder="21"
                      {...field}
                      onChange={(e) => handleNullableNumberChange(e, field)}
                      value={field.value ?? 21}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="otrosImpuestosMayorista"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Otros Impuestos ($)</FormLabel>
                  <FormControl>
                    <Input
                      className="h-9"
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => handleNullableNumberChange(e, field)}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="gananciaPorcentajeMayorista"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ganancia (%)</FormLabel>
                  <FormControl>
                    <Input
                      className={cn(
                        "h-9",
                        field.value != null && field.value < 0 && "text-red-600 font-semibold",
                      )}
                      type="number"
                      placeholder="%"
                      {...field}
                      onChange={handleMayoristaGainChange}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="wholesalePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-base">Precio Final ($)</FormLabel>
                  <FormControl>
                    <Input
                      className="h-10 font-bold text-lg"
                      type="number"
                      placeholder="Calculado"
                      {...field}
                      onChange={handleMayoristaFinalPriceChange}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4 p-4 border rounded-md w-full md:w-1/2">
            <h3 className="text-lg font-semibold mb-2 border-b pb-1">Precio Minorista</h3>
            <FormField
              control={control}
              name="ivaPorcentajeMinorista"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IVA (%)</FormLabel>
                  <FormControl>
                    <Input
                      className="h-9"
                      type="number"
                      placeholder="21"
                      {...field}
                      onChange={(e) => handleNullableNumberChange(e, field)}
                      value={field.value ?? 21}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="otrosImpuestosMinorista"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Otros Impuestos ($)</FormLabel>
                  <FormControl>
                    <Input
                      className="h-9"
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => handleNullableNumberChange(e, field)}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="gananciaPorcentajeMinorista"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ganancia (%)</FormLabel>
                  <FormControl>
                    <Input
                      className={cn(
                        "h-9",
                        field.value != null && field.value < 0 && "text-red-600 font-semibold",
                      )}
                      type="number"
                      placeholder="%"
                      {...field}
                      onChange={handleMinoristaGainChange}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="retailPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-base">Precio Final ($)</FormLabel>
                  <FormControl>
                    <Input
                      className="h-10 font-bold text-lg"
                      type="number"
                      placeholder="Calculado"
                      {...field}
                      onChange={handleMinoristaFinalPriceChange}
                      value={field.value ?? 0}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderMultimediaFields = () => (
    <div className="flex flex-col gap-4">
      <FormField
        control={control}
        name="imageUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Imagen Principal</FormLabel>
            <FormControl>
              <UploadButton
                onChange={(url: string | null) => setValue("imageUrl", url ? url.toString() : null)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderLegalFields = () => (
    <div className="flex flex-wrap gap-4">
      <FormField
        control={control}
        name="licensePlate"
        render={({ field }) => (
          <FormItem className="w-full md:w-[calc(50%-0.5rem)]">
            <FormLabel>Patente</FormLabel>
            <FormControl>
              <Input className="h-10" placeholder="Opcional" {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const hasErrorsInForm = Object.keys(errors).length > 0;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        {hasErrorsInForm && (
          <Alert variant="destructive">
            <AlertTitle>Error en el formulario</AlertTitle>
            <AlertDescription>
              Hay campos con errores. Por favor, revisa la información ingresada.
            </AlertDescription>
          </Alert>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabValue)}
          className="w-full"
        >
          <TabsList className="flex w-full justify-around mb-4 h-auto flex-wrap">
            {TABS_ORDER.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="capitalize text-xs px-1 py-2 h-full flex-1 min-w-fit"
              >
                {tab === "identificacion" ? "Unidades" : tab}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="producto">{renderProductoFields()}</TabsContent>
          <TabsContent value="identificacion">{renderIdentificacionFields()}</TabsContent>
          <TabsContent value="precios">{renderPreciosFields()}</TabsContent>
          <TabsContent value="multimedia">{renderMultimediaFields()}</TabsContent>
          <TabsContent value="legal">{renderLegalFields()}</TabsContent>
        </Tabs>

        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreviousTab}
            disabled={activeTab === TABS_ORDER[0] || isSubmitting}
          >
            Anterior
          </Button>
          {activeTab !== TABS_ORDER[TABS_ORDER.length - 1] ? (
            <Button type="button" onClick={handleNextTab} disabled={isSubmitting}>
              Siguiente
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitButtonLabel || "Guardar"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
