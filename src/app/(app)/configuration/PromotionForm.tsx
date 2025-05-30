"use client";

import { getEnabledBankCards } from "@/actions/bank-cards/get-bank-cards";
import {
  createBankingPromotion,
  getBankingPromotionDetails,
  updateBankingPromotion,
} from "@/actions/banking-promotions/manage-banking-promotions";
import { BankCardSelector } from "@/components/custom/BankCardSelector";
import { DaySelector } from "@/components/custom/DaySelector";
import { Spinner } from "@/components/custom/Spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { BankCard } from "@/types/bank-cards";
import type { Bank, BankingPromotionDisplay } from "@/types/banking-promotions";
import type { PaymentMethod } from "@/types/payment-methods";
import {
  extractBankAndCardFromBankCardId,
  findBankCardId,
  groupBankCardsByBank,
} from "@/utils/banking-utils";
import { bankingPromotionSchema } from "@/zod/banking-promotion-schemas";
import type { Day } from "@/zod/banking-promotion-schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Building, CalendarIcon, CreditCard, Percent, Plus, Trash } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";

interface PromotionFormProps {
  paymentMethods: PaymentMethod[];
  bankCards: BankCard[];
  promotion?: BankingPromotionDisplay;
  organizationId: string;
  onSuccess?: (promotion?: BankingPromotionDisplay, isUpdated?: boolean) => void;
  onCancel?: () => void;
}

type FormValues = {
  name: string;
  description?: string;
  paymentMethodId: string;
  bankCardId: string;
  bankId: string | null;
  cardId: string | null;
  rateValue?: number;
  isDiscount: boolean;
  minAmount?: number;
  maxAmount?: number;
  isEnabled: boolean;
  startDate?: Date;
  endDate?: Date;
  activeDays: Day[];
  installmentPlans: {
    id?: number;
    installments: number;
    interestRate: number;
    isEnabled: boolean;
  }[];
};

export default function PromotionForm({
  paymentMethods,
  bankCards,
  promotion,
  organizationId,
  onSuccess,
  onCancel,
}: PromotionFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Track if we're editing an existing promotion
  const isEditing = !!promotion;

  // Track the selected payment method to control conditional fields
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(
    promotion?.paymentMethodId ? String(promotion.paymentMethodId) : "",
  );

  // Calculate initial values for editing mode
  const hasDiscount = promotion?.discountRate != null && promotion.discountRate > 0;
  const initialRateValue = hasDiscount
    ? (promotion?.discountRate ?? undefined)
    : (promotion?.surchargeRate ?? undefined);
  const initialIsDiscount = hasDiscount;

  // Extract bankId and cardId from the existing promotion if editing
  const { bankId: initialBankId, cardId: initialCardId } = promotion?.bankCardId
    ? extractBankAndCardFromBankCardId(bankCards, promotion.bankCardId)
    : { bankId: null, cardId: null };

  // Convert bankCards to BankWithCards for our selector
  const banksWithCards = groupBankCardsByBank(bankCards);

  // Set up form with defaults
  const form = useForm<FormValues>({
    resolver: zodResolver(bankingPromotionSchema),
    defaultValues: {
      name: promotion?.name || "",
      description: promotion?.description || "",
      paymentMethodId: promotion ? String(promotion.paymentMethodId) : "",
      bankCardId: "", // We'll calculate this based on bankId and cardId
      bankId: initialBankId ? String(initialBankId) : null,
      cardId: initialCardId ? String(initialCardId) : null,
      rateValue: initialRateValue,
      isDiscount: initialIsDiscount,
      minAmount: promotion?.minAmount ?? undefined,
      maxAmount: promotion?.maxAmount ?? undefined,
      isEnabled: promotion?.isEnabled ?? true,
      startDate: promotion?.startDate ?? undefined,
      endDate: promotion?.endDate ?? undefined,
      activeDays: promotion?.activeDays || [],
      installmentPlans:
        promotion?.installmentPlans?.map((plan) => ({
          id: plan.id,
          installments: plan.installments,
          interestRate: plan.interestRate,
          isEnabled: plan.isEnabled,
        })) || [],
    },
  });

  // Configurar useFieldArray para installmentPlans
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "installmentPlans",
  });

  // Watch values for conditional rendering
  const watchIsDiscount = form.watch("isDiscount");
  const watchPaymentMethodId = form.watch("paymentMethodId");
  const watchBankId = form.watch("bankId");
  const watchCardId = form.watch("cardId");

  // Check if payment method is credit card
  const isCreditCard =
    !!selectedPaymentMethod &&
    paymentMethods.some(
      (method) => method.id.toString() === selectedPaymentMethod && method.type === "credit",
    );

  // Update selected payment method when it changes
  useEffect(() => {
    if (watchPaymentMethodId) {
      setSelectedPaymentMethod(watchPaymentMethodId);
    }
  }, [watchPaymentMethodId]);

  // Update bankCardId when bankId or cardId changes
  useEffect(() => {
    const bankIdNum = watchBankId ? Number.parseInt(watchBankId) : null;
    const cardIdNum = watchCardId ? Number.parseInt(watchCardId) : null;

    const bankCardId = findBankCardId(bankCards, bankIdNum, cardIdNum);

    // Update bankCardId in the form
    if (bankCardId) {
      form.setValue("bankCardId", String(bankCardId));
    } else if (bankIdNum === null && cardIdNum === null) {
      form.setValue("bankCardId", "all");
    } else {
      // If we have a bank but no card, or unable to find a matching bankCard
      form.setValue("bankCardId", "");
    }
  }, [watchBankId, watchCardId, bankCards, form]);

  // Reset form when promotion prop changes (for editing)
  useEffect(() => {
    if (promotion) {
      const hasDiscount = promotion.discountRate != null && promotion.discountRate > 0;
      const initialRate = hasDiscount
        ? (promotion.discountRate as number)
        : (promotion.surchargeRate as number);
      const { bankId: initBankId, cardId: initCardId } = extractBankAndCardFromBankCardId(
        bankCards,
        promotion.bankCardId,
      );
      form.reset({
        name: promotion.name,
        description: promotion.description ?? "",
        paymentMethodId: String(promotion.paymentMethodId),
        bankCardId: "",
        bankId: initBankId ? String(initBankId) : null,
        cardId: initCardId ? String(initCardId) : null,
        rateValue: initialRate,
        isDiscount: hasDiscount,
        minAmount: promotion.minAmount ?? undefined,
        maxAmount: promotion.maxAmount ?? undefined,
        isEnabled: promotion.isEnabled,
        startDate: promotion.startDate ?? undefined,
        endDate: promotion.endDate ?? undefined,
        activeDays: promotion.activeDays || [],
        installmentPlans:
          promotion.installmentPlans?.map((plan) => ({
            id: plan.id,
            installments: plan.installments,
            interestRate: plan.interestRate,
            isEnabled: plan.isEnabled,
          })) ?? [],
      });
    } else {
      form.reset({
        name: "",
        description: undefined,
        paymentMethodId: "",
        bankCardId: "",
        bankId: null,
        cardId: null,
        rateValue: undefined,
        isDiscount: true,
        minAmount: undefined,
        maxAmount: undefined,
        isEnabled: true,
        startDate: undefined,
        endDate: undefined,
        activeDays: [],
        installmentPlans: [],
      });
    }
  }, [promotion, bankCards, form]);

  // Handle form submission
  const onSubmit = (data: FormValues) => {
    // Map raw installment plans
    const installmentPlans = data.installmentPlans.map((plan) => ({
      id: plan.id,
      installments: plan.installments,
      interestRate: plan.interestRate,
      isEnabled: plan.isEnabled,
    }));
    // Derive discount/surcharge from raw rateValue and isDiscount
    const rawRate = data.rateValue;
    const isDisc = data.isDiscount;
    let discountRate: number | null = null;
    let surchargeRate: number | null = null;
    if (rawRate !== undefined && rawRate !== null) {
      const num = Number(rawRate);
      if (!Number.isNaN(num)) {
        if (isDisc) {
          discountRate = num;
        } else {
          surchargeRate = num;
        }
      }
    }

    startTransition(async () => {
      try {
        // Logging final computed rates
        console.log("Computed rates for submission:", { discountRate, surchargeRate });

        // For new promotion
        if (!isEditing) {
          const values = data;
          const result = await createBankingPromotion({
            name: values.name,
            description: values.description,
            paymentMethodId: Number.parseInt(values.paymentMethodId),
            bankId: values.bankId ? Number.parseInt(values.bankId) : null,
            cardId: values.cardId ? Number.parseInt(values.cardId) : null,
            discountRate,
            surchargeRate,
            minAmount: values.minAmount,
            maxAmount: values.maxAmount,
            isEnabled: values.isEnabled,
            startDate: values.startDate,
            endDate: values.endDate,
            activeDays: values.activeDays,
            installmentPlans,
            organizationId,
          });

          if (result.success && result.data) {
            toast({
              title: "Promoción creada",
              description: "La promoción se ha creado correctamente.",
            });

            // Obtener el método de pago seleccionado
            const selectedMethod = paymentMethods.find(
              (m) => m.id.toString() === values.paymentMethodId,
            );

            // Obtener banco y tarjeta si están seleccionados
            const createdBankId = values.bankId ? Number.parseInt(values.bankId) : null;
            const createdCardId = values.cardId ? Number.parseInt(values.cardId) : null;

            const bank: Bank | null = createdBankId
              ? {
                  id: createdBankId,
                  name: banksWithCards.find((b) => b.bank.id === createdBankId)?.bank.name || "",
                }
              : null;

            const card: BankCard | null =
              createdCardId && createdBankId
                ? bankCards.find(
                    (bc) => bc.id === findBankCardId(bankCards, createdBankId, createdCardId),
                  ) || null
                : null;

            // Crear el objeto de promoción con installmentPlans vacío (se cargarán al recargar)
            const newPromotion: BankingPromotionDisplay = {
              ...result.data,
              paymentMethod: selectedMethod || {
                id: 0,
                name: "",
                type: "credit",
                description: "",
              },
              bank,
              bankCard: card,
              activeDays: (result.data.activeDays || []) as Day[],
              installmentPlans: installmentPlans.map((plan) => {
                const planIdStr = String(plan.id || "");
                let finalId: number;

                if (planIdStr.startsWith("temp-")) {
                  finalId = result.data.id || 0; // Usar el ID de la promoción para nuevos planes
                } else {
                  finalId = Number.parseInt(planIdStr) || 0;
                }

                return {
                  id: finalId,
                  bankingPromotionId: result.data.id,
                  installments: plan.installments,
                  interestRate: plan.interestRate,
                  isEnabled: plan.isEnabled,
                };
              }),
            };
            console.log("Nueva promoción con planes de cuotas:", newPromotion);

            onSuccess?.(newPromotion, false);
          } else {
            toast({
              title: "Error al crear",
              description: result.message,
              variant: "destructive",
            });
            onSuccess?.();
          }
        }
        // For updating existing promotion
        else if (promotion) {
          // Get current promotion details for manual comparison via server action
          const currentPromoDetails = await getBankingPromotionDetails(String(promotion.id));

          if (currentPromoDetails.success && currentPromoDetails.data) {
            console.log("Current promotion (server action):", currentPromoDetails.data);
            console.log(
              "Updating with discountRate:",
              discountRate,
              "surchargeRate:",
              surchargeRate,
            );
          }

          const result = await updateBankingPromotion({
            id: promotion.id,
            name: data.name,
            description: data.description,
            paymentMethodId: Number.parseInt(data.paymentMethodId),
            bankId: data.bankId ? Number.parseInt(data.bankId) : null,
            cardId: data.cardId ? Number.parseInt(data.cardId) : null,
            discountRate,
            surchargeRate,
            minAmount: data.minAmount,
            maxAmount: data.maxAmount,
            isEnabled: data.isEnabled,
            startDate: data.startDate,
            endDate: data.endDate,
            activeDays: data.activeDays,
            installmentPlans: data.installmentPlans,
            organizationId,
          });

          console.log("Update result:", result);

          if (result.success) {
            toast({
              title: "Promoción actualizada",
              description: "La promoción se ha actualizado correctamente.",
            });

            // Obtener el método de pago seleccionado
            const selectedMethod = paymentMethods.find(
              (m) => m.id.toString() === data.paymentMethodId,
            );

            // Obtener banco y tarjeta si están seleccionados
            const updatedBankId = data.bankId ? Number.parseInt(data.bankId) : null;
            const updatedCardId = data.cardId ? Number.parseInt(data.cardId) : null;

            const bank: Bank | null = updatedBankId
              ? {
                  id: updatedBankId,
                  name: banksWithCards.find((b) => b.bank.id === updatedBankId)?.bank.name || "",
                }
              : null;

            const card: BankCard | null =
              updatedCardId && updatedBankId
                ? bankCards.find(
                    (bc) => bc.id === findBankCardId(bankCards, updatedBankId, updatedCardId),
                  ) || null
                : null;

            // Mapping de los planes de instalación actualizados (usar datos originales del formulario)
            const updatedInstallmentPlans = data.installmentPlans.map((plan) => {
              return {
                id: plan.id || -Date.now(), // Para nuevos planes sin id
                bankingPromotionId: promotion.id,
                installments: plan.installments,
                interestRate: plan.interestRate,
                isEnabled: plan.isEnabled,
              };
            });

            // Crear el objeto de promoción actualizado con los valores correctos
            const updatedPromotion: BankingPromotionDisplay = {
              ...promotion,
              name: data.name,
              description: data.description || null,
              paymentMethodId: Number.parseInt(data.paymentMethodId),
              bankId: updatedBankId,
              bankCard: card || promotion.bankCard,
              discountRate: discountRate, // Usar el valor calculado
              surchargeRate: surchargeRate, // Usar el valor calculado
              minAmount: data.minAmount || null,
              maxAmount: data.maxAmount || null,
              isEnabled: data.isEnabled,
              startDate: data.startDate || null,
              endDate: data.endDate || null,
              activeDays: data.activeDays as Day[],
              paymentMethod: selectedMethod || promotion.paymentMethod,
              bank: bank || promotion.bank,
              installmentPlans: updatedInstallmentPlans,
            };

            console.log("Promoción actualizada:", updatedPromotion);

            onSuccess?.(updatedPromotion, true);
          } else {
            toast({
              title: "Error al actualizar",
              description: result.message,
              variant: "destructive",
            });
            onSuccess?.();
          }
        }
      } catch (error: unknown) {
        console.error("Error al guardar promoción:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido al guardar la promoción";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    });
  };

  // Add a new installment plan
  const addInstallmentPlan = () => {
    append({
      installments: 3, // Default: 3 installments
      interestRate: 0, // Default: 0% interest
      isEnabled: true,
    });
  };

  // Remove an installment plan
  const removeInstallmentPlan = (index: number) => {
    remove(index);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <Card>
              <CardHeader>
                <CardTitle>Detalles básicos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Nombre */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la promoción</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 3 cuotas sin interés" {...field} />
                      </FormControl>
                      <FormDescription>
                        Un nombre corto y descriptivo para identificar esta promoción.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Descripción */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción (opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe los detalles de esta promoción..."
                          className="resize-none"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Método de pago */}
                <FormField
                  control={form.control}
                  name="paymentMethodId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Método de pago</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un método de pago" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method.id} value={method.id.toString()}>
                              {method.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        El método de pago al que aplica esta promoción.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Banco y Tarjeta (separados) */}
                {isCreditCard && (
                  <>
                    <FormField
                      control={form.control}
                      name="bankId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Banco y Tarjeta</FormLabel>
                          <FormControl>
                            <BankCardSelector
                              banksWithCards={banksWithCards}
                              selectedBankId={field.value ? Number.parseInt(field.value) : null}
                              selectedCardId={
                                form.watch("cardId")
                                  ? Number.parseInt(form.watch("cardId") || "")
                                  : null
                              }
                              onSelectBank={(bankId) => {
                                form.setValue("bankId", bankId ? String(bankId) : null);
                                form.setValue("cardId", null);
                              }}
                              onSelectCard={(cardId, bankId) => {
                                form.setValue("cardId", cardId ? String(cardId) : null);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Selecciona un banco y una tarjeta específica o "Todos los bancos" para
                            aplicar a cualquiera.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Campo oculto para cardId */}
                    <input type="hidden" {...form.register("cardId", { required: false })} />

                    {/* Campo oculto para bankCardId (requerido por el schema) */}
                    <input type="hidden" {...form.register("bankCardId", { required: false })} />
                  </>
                )}

                {/* Fechas (Inicio/Fin) */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha de inicio</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PP")
                                ) : (
                                  <span>Seleccionar fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>Opcional. Cuándo comienza la promoción.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha de fin</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PP")
                                ) : (
                                  <span>Seleccionar fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>Opcional. Cuándo termina la promoción.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Selector de días de la semana */}
                <FormField
                  control={form.control}
                  name="activeDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <DaySelector
                          value={field.value}
                          onChange={field.onChange}
                          className="mt-2"
                        />
                      </FormControl>
                      <FormDescription>
                        Días de la semana en que aplica esta promoción. Si no se selecciona ninguno,
                        aplica todos los días.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Habilitado */}
                <FormField
                  control={form.control}
                  name="isEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Promoción activa</FormLabel>
                        <FormDescription>
                          Determina si esta promoción está activa actualmente.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* RIGHT COLUMN */}
            <Card>
              <CardHeader>
                <CardTitle>Términos financieros</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Descuento o Recargo with Switch */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <FormField
                      control={form.control}
                      name="isDiscount"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-2">
                          <FormLabel className="text-base">
                            {field.value ? "Descuento" : "Recargo"}
                          </FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <span>Recargo</span>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                              <span>Descuento</span>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="rateValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {watchIsDiscount
                            ? "Porcentaje de descuento (%)"
                            : "Porcentaje de recargo (%)"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={
                              watchIsDiscount
                                ? "Ej: 10 para 10% de descuento"
                                : "Ej: 5 para 5% de recargo"
                            }
                            {...field}
                            value={field.value === undefined ? "" : field.value}
                            onChange={(e) => {
                              const value = e.target.value
                                ? Number.parseFloat(e.target.value)
                                : undefined;
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          {watchIsDiscount
                            ? "Porcentaje de descuento a aplicar sobre el precio final."
                            : "Porcentaje de recargo a aplicar sobre el precio final."}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Monto mínimo y máximo */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto mínimo</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ej: 10000"
                            {...field}
                            value={field.value === undefined ? "" : field.value}
                            onChange={(e) => {
                              const value = e.target.value
                                ? Number.parseFloat(e.target.value)
                                : undefined;
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>Monto mínimo para aplicar la promoción.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto máximo</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ej: 100000"
                            {...field}
                            value={field.value === undefined ? "" : field.value}
                            onChange={(e) => {
                              const value = e.target.value
                                ? Number.parseFloat(e.target.value)
                                : undefined;
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>Monto máximo para aplicar la promoción.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Planes de cuotas (solo para tarjetas de crédito) */}
                {isCreditCard && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Planes de cuotas</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addInstallmentPlan}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Agregar plan
                      </Button>
                    </div>

                    {fields.map((field, index) => (
                      <Card key={field.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-sm font-medium">Plan {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeInstallmentPlan(index)}
                            >
                              <Trash className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`installmentPlans.${index}.installments`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Cuotas</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      placeholder="Ej: 3"
                                      {...field}
                                      value={field.value ?? ""}
                                      onChange={(e) => {
                                        const value = e.target.value
                                          ? Number.parseInt(e.target.value, 10)
                                          : 0;
                                        field.onChange(Number.isNaN(value) ? 0 : value);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`installmentPlans.${index}.interestRate`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Interés (%)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      placeholder="Ej: 10"
                                      {...field}
                                      value={field.value ?? ""}
                                      onChange={(e) => {
                                        const value = e.target.value
                                          ? Number.parseFloat(e.target.value)
                                          : 0;
                                        field.onChange(Number.isNaN(value) ? 0 : value);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name={`installmentPlans.${index}.isEnabled`}
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 mt-2">
                                <FormControl>
                                  <Switch
                                    checked={field.value ?? false}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="!mt-0">Plan habilitado</FormLabel>
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    ))}

                    {fields.length === 0 && (
                      <p className="text-center text-muted-foreground text-sm border rounded-md p-4">
                        No hay planes de cuotas configurados. Haga clic en "Agregar plan" para crear
                        uno.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end space-x-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending && <Spinner className="mr-2 h-4 w-4" />}
              {isEditing ? "Actualizar promoción" : "Crear promoción"}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
