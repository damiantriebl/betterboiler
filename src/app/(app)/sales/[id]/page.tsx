"use client";

import { getEnabledBankingPromotions } from "@/actions/banking-promotions/get-banking-promotions";
import { getClients } from "@/actions/clients/get-clients";
import { createCurrentAccount } from "@/actions/current-accounts/create-current-account";
import { recordCurrentAccountPayment } from "@/actions/current-accounts/record-current-account-payment";
import { getOrganizationIdFromSession } from "@/actions/getOrganizationIdFromSession";
import { completeSale } from "@/actions/sales/complete-sale";
import { getMotorcycleById } from "@/actions/sales/get-motorcycle-by-id";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useToast } from "@/hooks/use-toast";
import type { BankingPromotionDisplay } from "@/types/banking-promotions";
import { getCurrentDayOfWeek } from "@/utils/promotion-utils";
import type { CreateCurrentAccountInput, RecordPaymentInput } from "@/zod/current-account-schemas";
import type { Client } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { use } from "react";

// NEW IMPORTS
import { getOrganizationPaymentMethods } from "@/actions/payment-methods/get-payment-methods";
import type { OrganizationPaymentMethodDisplay } from "@/types/payment-methods";

import ConfirmMotorcycleStep from "./ConfirmMotorcycleStep";
import ConfirmationStep from "./ConfirmationStep";
import PaymentMethodStep from "./PaymentMethodStep";
import SelectClientStep from "./SelectClientStep";
// Import our components
import Stepper from "./Stepper";
import {
  arePromotionsCompatible,
  calculateFinalPrice,
  getAvailableInstallmentPlans,
  getBestRatesByInstallment,
} from "./utils";

import type { MotorcycleWithRelations } from "@/actions/sales/get-motorcycle-by-id";
// Import types
import type { SaleProcessState } from "./types";

// For TypeScript with Next.js params
type PageParams = {
  id: string;
};

// Helper functions for installment calculation (podrían estar en utils.ts)
function getPeriodsPerYearCA(frequency: string): number {
  // Renombrado para evitar conflicto si ya existe en utils
  const FreqMap = { WEEKLY: 52, BIWEEKLY: 26, MONTHLY: 12, QUARTERLY: 4, ANNUALLY: 1 };
  return FreqMap[frequency as keyof typeof FreqMap] || 12;
}

function calculateInstallmentWithInterestCA(
  principal: number,
  annualRateDecimal: number, // ej: 0.30 para 30%
  installments: number,
  paymentFrequency: string,
): number {
  if (principal <= 0 || installments <= 0) return 0;
  if (annualRateDecimal === 0) {
    return Number.parseFloat((principal / installments).toFixed(2)); // Redondear a 2 decimales
  }

  const periodsPerYear = getPeriodsPerYearCA(paymentFrequency);
  const ratePerPeriod = annualRateDecimal / periodsPerYear;

  if (ratePerPeriod === 0 && annualRateDecimal !== 0) {
    return Number.parseFloat((principal / installments).toFixed(2));
  }
  if (ratePerPeriod === -1) {
    return 0;
  }

  const pmt =
    (principal * (ratePerPeriod * Math.pow(1 + ratePerPeriod, installments))) /
    (Math.pow(1 + ratePerPeriod, installments) - 1);

  if (isNaN(pmt) || !isFinite(pmt)) {
    return Number.parseFloat((principal / installments).toFixed(2)); // Fallback si el cálculo falla
  }
  return Number.parseFloat(pmt.toFixed(2)); // Redondear a 2 decimales
}

export default function SalesPage({ params }: { params: Promise<PageParams> }) {
  // Properly unwrap the params Promise with React.use()
  const { id } = use(params);
  const searchParams = useSearchParams();
  const isReserved = searchParams.get("reserved") === "true";
  const reservationAmount = searchParams.get("amount") ? Number(searchParams.get("amount")) : 0;
  const reservationCurrency = searchParams.get("currency") || "USD";
  const initialClientIdFromReservation = searchParams.get("clientId") || null;

  const { toast } = useToast();
  const router = useRouter();

  // State for organization ID
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [orgIdError, setOrgIdError] = useState<string | null>(null); // For errors fetching orgId

  // NEW STATE for organization payment methods
  const [organizationPaymentMethods, setOrganizationPaymentMethods] = useState<
    OrganizationPaymentMethodDisplay[]
  >([]);
  const [loadingOrgPaymentMethods, setLoadingOrgPaymentMethods] = useState(true);

  // Local state (non-persistent)
  const [moto, setMoto] = useState<MotorcycleWithRelations | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMoto, setLoadingMoto] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // State for banking promotions
  const [availablePromotions, setAvailablePromotions] = useState<BankingPromotionDisplay[]>([]);
  const [applicablePromotions, setApplicablePromotions] = useState<BankingPromotionDisplay[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState(true);

  // Hook useTransition
  const [isTransitionPending, startTransition] = useTransition();

  const steps = ["Confirmar Moto", "Método de Pago", "Seleccionar Cliente", "Confirmación"];

  // Persistent state with Local Storage
  const localStorageKey = `saleProcess-${id}`;

  const initialSaleState: SaleProcessState = {
    currentStep: 0,
    selectedClientId: isReserved ? initialClientIdFromReservation : null,
    buyerData: {
      nombre: "",
      apellido: "",
      dni: "",
      telefono: "",
      email: "",
      direccion: "",
    },
    paymentData: {
      metodoPago: "",
      cuotas: 1,
      banco: "",
      isMayorista: false,
      discountType: "none",
      discountValue: 0,
      selectedPromotions: [],
      downPayment: 0,
      currentAccountInstallments: 12,
      currentAccountFrequency: "MONTHLY",
      annualInterestRate: 0,
      currentAccountStartDate: new Date().toISOString().split("T")[0],
      currentAccountNotes: "",
    },
    showClientTable: false,
  };

  // Use a custom initializer to ensure we merge with initialSaleState
  const getSavedState = () => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        const parsedState = JSON.parse(saved) as Partial<SaleProcessState>;

        return {
          ...initialSaleState,
          ...parsedState,
          paymentData: {
            ...initialSaleState.paymentData,
            ...(parsedState.paymentData || {}),
            selectedPromotions: parsedState.paymentData?.selectedPromotions || [],
          },
        };
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
    }

    return initialSaleState;
  };

  const [saleState, setSaleState] = useLocalStorage<SaleProcessState>(
    localStorageKey,
    initialSaleState,
    { initializer: getSavedState },
  );

  // Derive selectedClient from persistent state
  const selectedClient = clients.find((c) => c.id === saleState.selectedClientId) || null;

  // Map selected promotion ids to objects
  const selectedPromotions = (saleState.paymentData.selectedPromotions || [])
    .map((id) => applicablePromotions.find((p) => p.id === id))
    .filter((p): p is BankingPromotionDisplay => p !== undefined);

  // Compute union of installments with best interest
  const availableInstallmentPlans = getAvailableInstallmentPlans(selectedPromotions);

  // Get organization ID
  useEffect(() => {
    const getOrgId = async () => {
      try {
        const result = await getOrganizationIdFromSession();
        if (result.organizationId) {
          setOrganizationId(result.organizationId);
        } else {
          setOrgIdError(result.error || "Failed to retrieve organization ID.");
          console.error("Failed to get organization ID:", result.error);
          toast({
            variant: "destructive",
            title: "Error de Configuración",
            description:
              "No se pudo obtener el ID de la organización. Algunas funcionalidades pueden no estar disponibles.",
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setOrgIdError(errorMessage);
        console.error("Error fetching organizationId:", error);
        toast({
          variant: "destructive",
          title: "Error Crítico",
          description: `Error al obtener ID de organización: ${errorMessage}`,
        });
      }
    };

    getOrgId();
  }, [toast]);

  // NEW EFFECT to load organization-specific payment methods
  useEffect(() => {
    if (!organizationId) {
      // If organizationId is null (still fetching or failed), don't attempt to load payment methods.
      // We can set loading to false if we know there was an orgIdError.
      if (orgIdError) {
        setLoadingOrgPaymentMethods(false);
        setOrganizationPaymentMethods([]);
      }
      return;
    }

    const loadOrgPaymentMethods = async () => {
      setLoadingOrgPaymentMethods(true);
      try {
        const methods = await getOrganizationPaymentMethods(organizationId);
        // Filter for enabled methods before setting state
        const enabledMethods = methods.filter((method) => method.isEnabled);
        setOrganizationPaymentMethods(enabledMethods);
      } catch (error) {
        console.error("Error loading organization payment methods:", error);
        toast({
          variant: "destructive",
          title: "Error de Carga",
          description:
            "No se pudieron cargar los métodos de pago configurados para su organización.",
        });
        setOrganizationPaymentMethods([]); // Set to empty array on error to prevent issues downstream
      } finally {
        setLoadingOrgPaymentMethods(false);
      }
    };

    loadOrgPaymentMethods();
  }, [organizationId, orgIdError, toast]);

  // Effect to load motorcycle and clients
  useEffect(() => {
    const loadMotorcycle = async () => {
      try {
        setLoadingMoto(true);
        const motorcycle = await getMotorcycleById(id);
        if (motorcycle) {
          setMoto(motorcycle);
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo encontrar la moto seleccionada.",
          });
        }
      } catch (error) {
        console.error("Error loading motorcycle:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Ocurrió un error al cargar los datos de la moto.",
        });
      } finally {
        setLoadingMoto(false);
      }
    };

    const loadClients = async () => {
      try {
        setLoadingClients(true);
        const clientsList = await getClients();
        setClients(clientsList);

        // If coming from a reservation with client ID, update buyer data
        if (isReserved && saleState.selectedClientId) {
          const reservedClientData = clientsList.find((c) => c.id === saleState.selectedClientId);
          if (reservedClientData) {
            if (!saleState.buyerData.nombre && !saleState.buyerData.email) {
              setSaleState((prevState) => ({
                ...prevState,
                buyerData: {
                  nombre: reservedClientData.firstName,
                  apellido: reservedClientData.lastName || "",
                  dni: reservedClientData.taxId || "",
                  telefono: reservedClientData.phone || reservedClientData.mobile || "",
                  email: reservedClientData.email,
                  direccion: reservedClientData.address || "",
                },
              }));
            }
          }
        }
      } catch (error) {
        console.error("Error loading clients:", error);
      } finally {
        setLoadingClients(false);
      }
    };

    loadMotorcycle();
    loadClients();
  }, [
    id,
    isReserved,
    toast,
    saleState.selectedClientId,
    saleState.buyerData.nombre,
    saleState.buyerData.email,
    setSaleState,
  ]);

  // Load banking promotions when organizationId is available
  useEffect(() => {
    if (!organizationId) return;

    const loadPromotions = async () => {
      try {
        setLoadingPromotions(true);
        const orgId = organizationId;
        if (orgId) {
          const promotionsData = await getEnabledBankingPromotions(orgId);
          const typedPromotions = promotionsData as unknown as BankingPromotionDisplay[];
          setAvailablePromotions(typedPromotions);
        }
        setLoadingPromotions(false);
      } catch (error) {
        console.error("Error loading promotions:", error);
        setLoadingPromotions(false);
      }
    };

    loadPromotions();
  }, [organizationId]);

  // Filter applicable promotions when payment method changes
  useEffect(() => {
    if (!moto || availablePromotions.length === 0) return;

    try {
      // Filter promotions based on payment method, bank, and card
      const filtered = availablePromotions.filter((promotion) => {
        if (!promotion) return false;

        // Check if promotion is active for current day
        const currentDay = getCurrentDayOfWeek();

        // If no days specified or includes current day
        const activeDays = promotion.activeDays as unknown as string[];
        const activeForToday = !activeDays?.length || activeDays.includes(currentDay);

        if (!activeForToday) return false;

        // Check start and end dates
        const now = new Date();
        if (promotion.startDate && new Date(promotion.startDate) > now) return false;
        if (promotion.endDate && new Date(promotion.endDate) < now) return false;

        // Check payment method
        if (!promotion.paymentMethod) return false;

        // Map interface payment methods to database types
        const methodMap: Record<string, string> = {
          efectivo: "cash",
          transferencia: "transfer",
          tarjeta: "credit", // Map to both 'credit' and 'debit'
          mercadopago: "mercadopago",
          todopago: "todopago",
          qr: "qr",
          cheque: "check",
          rapipago: "rapipago",
        };

        const paymentMethodType = methodMap[saleState.paymentData.metodoPago];

        // If payment method is card, allow both credit and debit
        if (saleState.paymentData.metodoPago === "tarjeta") {
          if (
            promotion.paymentMethod.type !== "credit" &&
            promotion.paymentMethod.type !== "debit"
          ) {
            return false;
          }

          // Check bank and card type for cards
          if (promotion.bankId && saleState.paymentData.banco) {
            return promotion.bankId.toString() === saleState.paymentData.banco;
          }

          if (promotion.cardId && saleState.paymentData.tarjetaTipo) {
            const cardMap: Record<string, number> = {
              visa: 1,
              mastercard: 2,
              amex: 3,
            };
            const cardId = cardMap[saleState.paymentData.tarjetaTipo];
            return promotion.cardId === cardId;
          }
        } else {
          // For other payment methods, check direct match with type
          return promotion.paymentMethod.type === paymentMethodType;
        }

        // If passed all filters, it's applicable
        return true;
      });

      setApplicablePromotions(filtered);
    } catch (error) {
      console.error("Error filtering promotions:", error);
      setApplicablePromotions([]);
    }
  }, [
    availablePromotions,
    saleState.paymentData.metodoPago,
    saleState.paymentData.banco,
    saleState.paymentData.tarjetaTipo,
    moto,
  ]);

  // Event handlers
  const handleEditInfo = () => {
    console.log("Edit motorcycle information");
    // Here you could navigate to an edit page or open a modal
  };

  const handleSelectClient = (client: Client) => {
    setSaleState((prevState) => ({
      ...prevState,
      selectedClientId: client.id,
      showClientTable: false,
      buyerData: {
        nombre: client.firstName,
        apellido: client.lastName || "",
        dni: client.taxId || "",
        telefono: client.phone || client.mobile || "",
        email: client.email,
        direccion: client.address || "",
      },
    }));
  };

  const handleCancelClientSelection = () => {
    setSaleState((prevState) => ({
      ...prevState,
      selectedClientId: null,
      showClientTable: true,
      buyerData: initialSaleState.buyerData,
    }));
  };

  const handlePaymentDataChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    // Process value based on field type
    let processedValue: string | number | boolean = value;

    // Convert numeric values
    if (name === "cuotas" || name === "exchangeRate" || name === "discountValue") {
      processedValue = value === "" ? 0 : Number.parseFloat(value);
    }

    setSaleState((prev) => ({
      ...prev,
      paymentData: {
        ...prev.paymentData,
        [name]: processedValue,
      },
    }));

    // Reset bank and cuotas if payment method changed, but keep selected promotions
    if (name === "metodoPago" && value !== "tarjeta") {
      setSaleState((prev) => ({
        ...prev,
        paymentData: {
          ...prev.paymentData,
          banco: "",
          tarjetaTipo: "",
          cuotas: 1,
          // Keep selected promotions
          selectedPromotions: prev.paymentData.selectedPromotions || [],
        },
      }));
    }
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setSaleState((prev) => ({
      ...prev,
      paymentData: {
        ...prev.paymentData,
        [name]: checked,
      },
    }));
  };

  // NEW: Handler for date changes
  const handleDateChange = (name: string, date: Date | undefined) => {
    setSaleState((prev) => ({
      ...prev,
      paymentData: {
        ...prev.paymentData,
        [name]: date ? date.toISOString() : null, // Store as ISO string or null
      },
    }));
  };

  const handlePromotionSelection = (promotionId: number) => {
    setSaleState((prev) => {
      const prevIds = prev.paymentData.selectedPromotions || [];
      const isSelected = prevIds.includes(promotionId);

      if (isSelected) {
        return {
          ...prev,
          paymentData: {
            ...prev.paymentData,
            selectedPromotions: prevIds.filter((id) => id !== promotionId),
          },
        };
      }

      // Adding new promotion
      const newPromo = applicablePromotions.find((p) => p.id === promotionId);
      if (!newPromo) return prev;
      const existingPromos = applicablePromotions.filter((p) => prevIds.includes(p.id));
      let newIds = [...prevIds, promotionId];

      // If tarjeta, auto-adjust conflicting promos for the selected cuotas
      if (prev.paymentData.metodoPago === "tarjeta") {
        const cuotas = prev.paymentData.cuotas;
        const allPromos = [...existingPromos, newPromo];

        // Promotions that support this cuota and those that don't
        const promosWithCuotas = allPromos.filter((p) =>
          p.installmentPlans?.some((pl) => pl.isEnabled && pl.installments === cuotas),
        );
        const promosWithoutCuotas = allPromos.filter(
          (p) => !p.installmentPlans?.some((pl) => pl.isEnabled && pl.installments === cuotas),
        );

        // Determine best interest rate among promos that support this cuota
        const rates = promosWithCuotas.map(
          (p) => p.installmentPlans!.find((pl) => pl.installments === cuotas)!.interestRate,
        );
        const bestRate = Math.min(...rates);

        // Keep promos without this cuota, and among those with it only the best-rate ones
        newIds = [
          ...promosWithoutCuotas.map((p) => p.id),
          ...promosWithCuotas
            .filter(
              (p) =>
                p.installmentPlans!.find((pl) => pl.installments === cuotas)!.interestRate ===
                bestRate,
            )
            .map((p) => p.id),
        ];

        toast({
          title: "Promociones ajustadas",
          description: "Solo se mantienen las promos con mejor tasa para las cuotas seleccionadas.",
          variant: "default",
        });
      }

      return {
        ...prev,
        paymentData: {
          ...prev.paymentData,
          selectedPromotions: newIds,
        },
      };
    });
  };

  const handleNext = async () => {
    // Validate current step
    if (saleState.currentStep === 0) {
      // Step 0: Confirm motorcycle - nothing to validate
      setSaleState((prev) => ({ ...prev, currentStep: prev.currentStep + 1 }));
    } else if (saleState.currentStep === 1) {
      // Step 1: Payment Method
      if (!saleState.paymentData.metodoPago) {
        toast({
          title: "Método de Pago Requerido",
          description: "Por favor, seleccione un método de pago para continuar.",
          variant: "destructive",
        });
        return;
      }

      // Basic validation for payment data
      if (saleState.paymentData.metodoPago === "tarjeta") {
        // Validate card details
        if (!saleState.paymentData.tarjetaNumero) {
          toast({
            title: "Datos de Tarjeta Incompletos",
            description: "Por favor, ingrese el número de tarjeta.",
            variant: "destructive",
          });
          return;
        }
        if (!saleState.paymentData.tarjetaVencimiento) {
          toast({
            title: "Datos de Tarjeta Incompletos",
            description: "Por favor, ingrese la fecha de vencimiento.",
            variant: "destructive",
          });
          return;
        }
        if (!saleState.paymentData.tarjetaCVV) {
          toast({
            title: "Datos de Tarjeta Incompletos",
            description: "Por favor, ingrese el código de seguridad (CVV).",
            variant: "destructive",
          });
          return;
        }
        if (!saleState.paymentData.tarjetaTipo) {
          toast({
            title: "Datos de Tarjeta Incompletos",
            description: "Por favor, seleccione el tipo de tarjeta.",
            variant: "destructive",
          });
          return;
        }
      } else if (saleState.paymentData.metodoPago === "transferencia") {
        // Validate bank transfer
        if (!saleState.paymentData.transferenciaCBU) {
          toast({
            title: "Datos de Transferencia Incompletos",
            description: "Por favor, ingrese el CBU/CVU.",
            variant: "destructive",
          });
          return;
        }
        if (!saleState.paymentData.transferenciaTitular) {
          toast({
            title: "Datos de Transferencia Incompletos",
            description: "Por favor, ingrese el nombre del titular.",
            variant: "destructive",
          });
          return;
        }
      } else if (saleState.paymentData.metodoPago === "cheque") {
        // Validate check details
        if (!saleState.paymentData.chequeNumero) {
          toast({
            title: "Datos de Cheque Incompletos",
            description: "Por favor, ingrese el número de cheque.",
            variant: "destructive",
          });
          return;
        }
        if (!saleState.paymentData.chequeFecha) {
          toast({
            title: "Datos de Cheque Incompletos",
            description: "Por favor, ingrese la fecha del cheque.",
            variant: "destructive",
          });
          return;
        }
        if (!saleState.paymentData.chequeEmisor) {
          toast({
            title: "Datos de Cheque Incompletos",
            description: "Por favor, ingrese el nombre del emisor.",
            variant: "destructive",
          });
          return;
        }
      } else if (saleState.paymentData.metodoPago === "cuenta_corriente") {
        // Validate current account data
        if (
          !saleState.paymentData.currentAccountInstallments ||
          saleState.paymentData.currentAccountInstallments < 1
        ) {
          toast({
            title: "Datos de Cuenta Corriente Incompletos",
            description: "Por favor, ingrese la cantidad de cuotas (mínimo 1).",
            variant: "destructive",
          });
          return;
        }

        if (!saleState.paymentData.currentAccountFrequency) {
          toast({
            title: "Datos de Cuenta Corriente Incompletos",
            description: "Por favor, seleccione la frecuencia de pago.",
            variant: "destructive",
          });
          return;
        }

        if (!saleState.paymentData.currentAccountStartDate) {
          toast({
            title: "Datos de Cuenta Corriente Incompletos",
            description: "Por favor, seleccione la fecha de inicio.",
            variant: "destructive",
          });
          return;
        }

        // Validar que el pago inicial no sea mayor al precio total
        if (
          saleState.paymentData.downPayment !== undefined &&
          saleState.paymentData.downPayment > (moto?.retailPrice || 0)
        ) {
          toast({
            title: "Error en Pago Inicial",
            description: "El pago inicial no puede ser mayor al precio total de la moto.",
            variant: "destructive",
          });
          return;
        }
      }

      // All validations passed
      setSaleState((prev) => ({ ...prev, currentStep: prev.currentStep + 1 }));
    } else if (saleState.currentStep === 2) {
      // Step 2: Select Client
      if (!saleState.selectedClientId) {
        toast({
          title: "Cliente Requerido",
          description: "Por favor, seleccione un cliente para continuar.",
          variant: "destructive",
        });
        return;
      }

      setSaleState((prev) => ({ ...prev, currentStep: prev.currentStep + 1 }));
    } else if (saleState.currentStep === 3) {
      // Step 3: Confirmation - Complete sale
      try {
        setLoading(true);

        const finalPrice = calculateFinalPrice(
          moto?.retailPrice || 0,
          saleState.paymentData.discountType,
          saleState.paymentData.discountValue,
          selectedPromotions,
        );

        const result = await completeSale(id, saleState.selectedClientId ?? "");

        if (result) {
          if (saleState.paymentData.metodoPago === "cuenta_corriente") {
            try {
              console.log("🔍 [sales/page] Iniciando proceso de creación de cuenta corriente");
              // El organizationId es necesario para la cuenta corriente
              const sessionResult = await getOrganizationIdFromSession(); // Get the SessionResult object
              console.log("🔍 [sales/page] OrganizationID session result obtenido:", sessionResult);

              if (!sessionResult.organizationId) {
                // Check the property
                console.error(
                  "❌ [sales/page] Error: No se pudo obtener el ID de la organización para la cuenta corriente",
                );
                throw new Error(
                  "No se pudo obtener el ID de la organización para la cuenta corriente.",
                );
              }
              const currentOrganizationId = sessionResult.organizationId; // Extract the string ID

              const principalAmount = finalPrice - (Number(saleState.paymentData.downPayment) || 0);
              const calculatedInstallmentAmt = calculateInstallmentWithInterestCA(
                principalAmount,
                Number(saleState.paymentData.annualInterestRate || 0) / 100, // Convertir % a decimal
                Number(saleState.paymentData.currentAccountInstallments || 12),
                saleState.paymentData.currentAccountFrequency || "MONTHLY",
              );

              const currentAccountData: CreateCurrentAccountInput = {
                clientId: saleState.selectedClientId ?? "",
                motorcycleId: moto?.id || 0,
                totalAmount: finalPrice,
                downPayment: Number(saleState.paymentData.downPayment || 0),
                numberOfInstallments: Number(
                  saleState.paymentData.currentAccountInstallments || 12,
                ),
                installmentAmount: calculatedInstallmentAmt,
                paymentFrequency: saleState.paymentData.currentAccountFrequency || "MONTHLY",
                startDate: saleState.paymentData.currentAccountStartDate
                  ? new Date(saleState.paymentData.currentAccountStartDate).toISOString()
                  : new Date().toISOString(),
                status: "ACTIVE",
                interestRate: Number(saleState.paymentData.annualInterestRate || 0),
                reminderLeadTimeDays: 3,
                notes:
                  saleState.paymentData.currentAccountNotes ||
                  `Cuenta corriente creada para la moto ${moto?.brand?.name} ${moto?.model?.name} (${moto?.year})`,
                organizationId: currentOrganizationId,
              };

              console.log("🔍 [sales/page] Datos preparados para crear la cuenta corriente:", {
                clientId: currentAccountData.clientId,
                motorcycleId: currentAccountData.motorcycleId,
                totalAmount: currentAccountData.totalAmount,
                paymentFrequency: currentAccountData.paymentFrequency,
                organizationId: currentAccountData.organizationId,
              });

              // Create the current account
              console.log("🔍 [sales/page] Llamando a createCurrentAccount...");
              const currentAccountResult = await createCurrentAccount(currentAccountData);
              console.log(
                "🔍 [sales/page] Resultado de createCurrentAccount:",
                currentAccountResult,
              );

              if (currentAccountResult.success && currentAccountResult.data) {
                console.log(
                  "✅ [sales/page] Cuenta corriente creada con éxito:",
                  currentAccountResult.data.id,
                );

                // Si hay un pago inicial (downPayment), registrarlo como un pago en el historial
                if (saleState.paymentData.downPayment && saleState.paymentData.downPayment > 0) {
                  try {
                    console.log(
                      "🔍 [sales/page] Registrando pago inicial:",
                      saleState.paymentData.downPayment,
                    );
                    const paymentDataInput: RecordPaymentInput = {
                      currentAccountId: currentAccountResult.data.id,
                      amountPaid: Number(saleState.paymentData.downPayment || 0),
                      paymentDate: new Date().toISOString(),
                      paymentMethod: "efectivo", // Por defecto asumimos efectivo para el adelanto
                      transactionReference: `Pago inicial (Venta ID: ${id})`,
                      notes: "Pago inicial al momento de la venta (Cuota 0)",
                      isDownPayment: true, // Mark this as a down payment
                    };

                    const paymentResult = await recordCurrentAccountPayment(paymentDataInput);

                    if (paymentResult.success) {
                      console.log(
                        "✅ [sales/page] Pago inicial registrado correctamente",
                        paymentResult.data,
                      );
                    } else {
                      console.error(
                        "❌ [sales/page] Error al registrar el pago inicial:",
                        paymentResult.error,
                      );
                    }
                  } catch (paymentError) {
                    console.error(
                      "❌ [sales/page] Error al registrar el pago inicial:",
                      paymentError,
                    );
                  }
                }

                toast({
                  title: "Cuenta Corriente Creada",
                  description: "Se ha creado correctamente la cuenta corriente para esta venta.",
                });

                // Redirect to current accounts page after successful current account creation
                console.log(
                  "🔍 [sales/page] Redirigiendo a /current-accounts después de crear la cuenta corriente",
                );
                setTimeout(() => {
                  router.push("/current-accounts");
                }, 1500); // Small delay to allow the user to see the success toast
                return; // Skip the default navigation
              } else {
                console.error(
                  "❌ [sales/page] Error al crear cuenta corriente:",
                  currentAccountResult.error,
                );
                toast({
                  title: "Advertencia",
                  description:
                    "Venta completada, pero hubo un problema al crear la cuenta corriente: " +
                    (currentAccountResult.error || "Error desconocido"),
                  variant: "destructive",
                });
              }
            } catch (error) {
              console.error("❌ [sales/page] Error al crear cuenta corriente:", error);
              toast({
                title: "Advertencia",
                description:
                  "Venta completada, pero hubo un problema al crear la cuenta corriente.",
                variant: "destructive",
              });
            }
          }

          // Success
          toast({
            title: "Venta Completada",
            description: "La venta se ha completado con éxito.",
          });

          // Navigate based on reservation status
          if (isReserved) {
            router.push("/reservations");
          } else {
            router.push("/sales");
          }
        } else {
          // Error
          toast({
            title: "Error",
            description: "No se pudo completar la venta. Intente nuevamente.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error completing sale:", error);
        toast({
          title: "Error",
          description: "Ocurrió un error al completar la venta. Por favor, intente nuevamente.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (saleState.currentStep === 0) return;
    setSaleState((prevState) => ({ ...prevState, currentStep: prevState.currentStep - 1 }));
  };

  // Render step content
  const renderStepContent = () => {
    switch (saleState.currentStep) {
      case 0: // Confirm Motorcycle
        return (
          <ConfirmMotorcycleStep
            moto={moto!}
            isReserved={isReserved}
            reservationAmount={reservationAmount}
            reservationCurrency={reservationCurrency}
            onEditInfo={handleEditInfo}
          />
        );

      case 1: // Payment Method
        return (
          <PaymentMethodStep
            moto={moto!}
            isReserved={isReserved}
            reservationAmount={reservationAmount}
            reservationCurrency={reservationCurrency}
            paymentData={saleState.paymentData}
            organizationPaymentMethods={organizationPaymentMethods}
            loadingOrgPaymentMethods={loadingOrgPaymentMethods}
            applicablePromotions={applicablePromotions}
            loadingPromotions={loadingPromotions}
            availableInstallmentPlans={availableInstallmentPlans}
            onPaymentDataChange={handlePaymentDataChange}
            onPromotionSelection={handlePromotionSelection}
            onCheckboxChange={handleCheckboxChange}
            onDateChange={handleDateChange}
          />
        );

      case 2: // Select Client
        return (
          <SelectClientStep
            clients={clients}
            selectedClient={selectedClient}
            loadingClients={loadingClients}
            isReserved={isReserved}
            onSelectClient={handleSelectClient}
            onCancelClientSelection={handleCancelClientSelection}
          />
        );

      case 3: // Confirmation
        return (
          <ConfirmationStep
            loading={loading}
            moto={moto!}
            isReserved={isReserved}
            reservationAmount={reservationAmount}
            buyerData={saleState.buyerData}
            paymentData={saleState.paymentData}
          />
        );

      default:
        return null;
    }
  };

  // Loading state for motorcycle
  if (loadingMoto) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Main component return
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Proceso de Venta</CardTitle>
        </CardHeader>
        <CardContent>
          <Stepper currentStep={saleState.currentStep} steps={steps} />
          <div className="min-h-[400px]">{renderStepContent()}</div>
          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={handleBack} disabled={saleState.currentStep === 0}>
              Anterior
            </Button>
            <Button
              onClick={handleNext}
              disabled={saleState.currentStep === steps.length - 1 && loading}
              className={saleState.currentStep === 2 ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {saleState.currentStep === 2 ? "Confirmar Venta" : "Siguiente"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
