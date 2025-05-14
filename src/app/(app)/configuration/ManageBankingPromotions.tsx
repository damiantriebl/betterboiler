"use client";

import {
  deleteBankingPromotion,
  toggleBankingPromotion,
} from "@/actions/banking-promotions/manage-banking-promotions";
import { Spinner } from "@/components/custom/Spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BankCardDisplay } from "@/types/bank-cards";
import type { Bank, BankingPromotionDisplay } from "@/types/banking-promotions";
import type { PaymentMethod } from "@/types/payment-methods";
import { PercentIcon, Plus, ToggleLeft, ToggleRight, Trash2, Wallet } from "lucide-react";
import { useCallback, useOptimistic, useState, useTransition } from "react";
import PromotionForm from "./PromotionForm";
import PromotionsCalculator from "./PromotionsCalculator";

interface ManageBankingPromotionsProps {
  promotions: BankingPromotionDisplay[];
  paymentMethods: PaymentMethod[];
  bankCards: BankCardDisplay[];
  organizationId: string;
}

export default function ManageBankingPromotions({
  promotions: initialPromotions,
  paymentMethods,
  bankCards,
  organizationId,
}: ManageBankingPromotionsProps) {
  const { toast } = useToast();
  const [promotions, setPromotions] = useState<BankingPromotionDisplay[]>(initialPromotions);

  // Añadir estado optimístico
  const [optimisticPromotions, updateOptimisticPromotions] = useOptimistic(
    promotions,
    (
      state,
      update:
        | BankingPromotionDisplay[]
        | ((prev: BankingPromotionDisplay[]) => BankingPromotionDisplay[]),
    ) => {
      if (typeof update === "function") {
        return update(state);
      }
      return update;
    },
  );

  const [isPending, startTransition] = useTransition();

  // Dialog state for adding/editing promotions
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<BankingPromotionDisplay | undefined>(
    undefined,
  );

  // Delete confirmation state
  const [deletingPromotion, setDeletingPromotion] = useState<BankingPromotionDisplay | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState("all");

  // Formatear los filtros para usar el estado optimista
  const filteredPromotions = optimisticPromotions.filter((promotion) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return promotion.isEnabled;
    if (activeTab === "inactive") return !promotion.isEnabled;
    if (activeTab === "credit") return promotion.paymentMethod.type === "credit";
    if (activeTab === "cash") return promotion.paymentMethod.type === "cash";
    return true;
  });

  // Handle opening edit dialog
  const handleEditPromotion = (promotion: BankingPromotionDisplay) => {
    setEditingPromotion(promotion);
    setIsDialogOpen(true);
  };

  // Handle opening add dialog
  const handleAddPromotion = () => {
    setEditingPromotion(undefined);
    setIsDialogOpen(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingPromotion(undefined);
  };

  // Handle form submission success - mejor manejo de actualización
  const handleFormSuccess = (newPromotion?: BankingPromotionDisplay, isEditing = false) => {
    setIsDialogOpen(false);

    if (newPromotion) {
      console.log("Promoción recibida en handleFormSuccess:", newPromotion);

      if (isEditing) {
        // Actualizar la promoción existente en el estado
        const updatedPromotions = promotions.map((promo) =>
          promo.id === newPromotion.id ? newPromotion : promo,
        );
        setPromotions(updatedPromotions);
        // Solo actualizamos optimisticPromotions después del estado real
        updateOptimisticPromotions(updatedPromotions);
      } else {
        // Añadir nueva promoción al estado evitando duplicación
        // Primero actualizamos el estado real
        const updatedPromotions = [...promotions, newPromotion];
        setPromotions(updatedPromotions);
        // Luego actualizamos el estado optimista con exactamente el mismo array
        updateOptimisticPromotions(updatedPromotions);
      }
    }

    toast({
      title: "Éxito",
      description: "Los cambios en promociones han sido guardados.",
    });
  };

  // Handle toggle promotion status - actualización optimista mejorada
  const handleTogglePromotion = (id: number, currentStatus: boolean) => {
    startTransition(async () => {
      try {
        // Cambio: primero modificamos el estado real
        const updatedPromotions = promotions.map((promo) =>
          promo.id === id ? { ...promo, isEnabled: !currentStatus } : promo,
        );

        // Luego actualizamos el estado optimista
        setPromotions(updatedPromotions);
        updateOptimisticPromotions(updatedPromotions);

        const result = await toggleBankingPromotion(id, !currentStatus);

        if (!result.success) {
          // Revertir ambos estados si falla
          const revertedPromotions = promotions.map((promo) =>
            promo.id === id ? { ...promo, isEnabled: currentStatus } : promo,
          );
          setPromotions(revertedPromotions);
          updateOptimisticPromotions(revertedPromotions);

          toast({
            title: "Error",
            description: result.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Estado actualizado",
            description: result.message,
          });
        }
      } catch (error: any) {
        // Revertir ambos estados si falla
        const revertedPromotions = promotions.map((promo) =>
          promo.id === id ? { ...promo, isEnabled: currentStatus } : promo,
        );
        setPromotions(revertedPromotions);
        updateOptimisticPromotions(revertedPromotions);

        toast({
          title: "Error",
          description: error.message || "Ha ocurrido un error al cambiar el estado",
          variant: "destructive",
        });
      }
    });
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (!deletingPromotion) return;

    startTransition(async () => {
      try {
        // Primero actualizamos el estado local (optimista)
        const updatedPromotions = promotions.filter((promo) => promo.id !== deletingPromotion.id);
        setPromotions(updatedPromotions);
        updateOptimisticPromotions(updatedPromotions);

        const result = await deleteBankingPromotion(deletingPromotion.id);

        if (!result.success) {
          // Si falla, restauramos el estado original
          setPromotions(promotions);
          updateOptimisticPromotions(promotions);

          toast({
            title: "Error",
            description: result.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Promoción eliminada",
            description: result.message,
          });
        }
      } catch (error: any) {
        // Si falla, restauramos el estado original
        setPromotions(promotions);
        updateOptimisticPromotions(promotions);

        toast({
          title: "Error",
          description: error.message || "Ha ocurrido un error al eliminar la promoción",
          variant: "destructive",
        });
      } finally {
        setIsDeleteDialogOpen(false);
        setDeletingPromotion(null);
      }
    });
  };

  // Modificado para usar descuentos/recargos
  const formatPromotionConditions = (promotion: BankingPromotionDisplay) => {
    const conditions = [];

    // More detailed debug information
    console.log(`Formatting conditions for promotion ${promotion.id}:`, {
      name: promotion.name,
      discountRate: {
        value: promotion.discountRate,
        type: typeof promotion.discountRate,
      },
      surchargeRate: {
        value: promotion.surchargeRate,
        type: typeof promotion.surchargeRate,
      },
    });

    // Check if discount rate is present and greater than zero
    if (
      promotion.discountRate &&
      typeof promotion.discountRate === "number" &&
      promotion.discountRate > 0
    ) {
      conditions.push(`${promotion.discountRate}% de descuento`);
    }

    // Check if surcharge rate is present and greater than zero
    if (
      promotion.surchargeRate &&
      typeof promotion.surchargeRate === "number" &&
      promotion.surchargeRate > 0
    ) {
      conditions.push(`${promotion.surchargeRate}% de recargo`);
    }

    const installments = promotion.installmentPlans.filter((p) => p.isEnabled);
    if (installments.length > 0) {
      const noInterestPlans = installments.filter((p) => p.interestRate === 0);
      if (noInterestPlans.length > 0) {
        conditions.push(
          `${noInterestPlans.map((p) => p.installments).join(", ")} cuotas sin interés`,
        );
      }

      const interestPlans = installments.filter((p) => p.interestRate > 0);
      if (interestPlans.length > 0) {
        conditions.push(
          `${interestPlans.map((p) => `${p.installments}x (${p.interestRate}%)`).join(", ")} con interés`,
        );
      }
    }

    return conditions.length > 0 ? conditions.join(", ") : "Sin condiciones especiales";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Promociones bancarias</h2>

        <Button onClick={handleAddPromotion}>
          <Plus className="mr-2 h-4 w-4" /> Agregar promoción
        </Button>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="active">Activas</TabsTrigger>
          <TabsTrigger value="inactive">Inactivas</TabsTrigger>
          <TabsTrigger value="credit">Tarjetas de crédito</TabsTrigger>
          <TabsTrigger value="cash">Efectivo</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Lista de promociones</h3>
              <span className="text-sm text-muted-foreground">
                {filteredPromotions.length} promociones
              </span>
            </div>

            <ScrollArea className="h-[600px] pr-4">
              {filteredPromotions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  No hay promociones {activeTab !== "all" && `(filtro: ${activeTab})`}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPromotions.map((promotion) => (
                    <Card key={promotion.id} className={promotion.isEnabled ? "" : "opacity-60"}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base font-medium">{promotion.name}</CardTitle>
                          <div className="flex space-x-1">
                            <Toggle
                              aria-label="Toggle promotion"
                              size="sm"
                              variant="outline"
                              pressed={promotion.isEnabled}
                              onPressedChange={() =>
                                handleTogglePromotion(promotion.id, promotion.isEnabled)
                              }
                              disabled={isPending}
                            >
                              {promotion.isEnabled ? (
                                <ToggleRight className="h-4 w-4 text-green-500" />
                              ) : (
                                <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Toggle>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPromotion(promotion)}
                            >
                              <PercentIcon className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeletingPromotion(promotion);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="outline">{promotion.paymentMethod.name}</Badge>

                          {promotion.card && (
                            <Badge variant="outline" className="border-blue-200">
                              {promotion.card.name}
                            </Badge>
                          )}

                          {promotion.bank && (
                            <Badge variant="outline" className="border-amber-200">
                              {promotion.bank.name}
                            </Badge>
                          )}
                        </div>

                        <CardDescription className="mt-2 text-sm">
                          {formatPromotionConditions(promotion)}
                        </CardDescription>

                        {promotion.description && (
                          <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
                            {promotion.description}
                          </div>
                        )}
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="text-xs text-muted-foreground grid grid-cols-2 gap-2">
                          {promotion.minAmount && (
                            <div>
                              <span className="font-medium">Mín:</span>{" "}
                              {formatCurrency(promotion.minAmount)}
                            </div>
                          )}

                          {promotion.maxAmount && (
                            <div>
                              <span className="font-medium">Máx:</span>{" "}
                              {formatCurrency(promotion.maxAmount)}
                            </div>
                          )}

                          {promotion.startDate && (
                            <div>
                              <span className="font-medium">Desde:</span>{" "}
                              {formatDate(new Date(promotion.startDate))}
                            </div>
                          )}

                          {promotion.endDate && (
                            <div>
                              <span className="font-medium">Hasta:</span>{" "}
                              {formatDate(new Date(promotion.endDate))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <PromotionsCalculator promotions={optimisticPromotions.filter((p) => p.isEnabled)} />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Promotion Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingPromotion(undefined);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>{editingPromotion ? "Editar Promoción" : "Nueva Promoción"}</DialogTitle>
          <PromotionForm
            paymentMethods={paymentMethods}
            bankCards={bankCards}
            promotion={editingPromotion}
            organizationId={organizationId}
            onSuccess={handleFormSuccess}
            onCancel={handleDialogClose}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Eliminará permanentemente la promoción
              <span className="font-medium block mt-1">"{deletingPromotion?.name}"</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              {isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
