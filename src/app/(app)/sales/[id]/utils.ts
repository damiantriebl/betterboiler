import { type BankingPromotionDisplay } from "@/types/banking-promotions";

/**
 * Format price with currency symbol
 * @param price - The price to format
 * @param currency - The currency (default: "USD")
 */
export const formatPrice = (price: number, currency: string = "USD"): string => {
  // This would normally be imported from @/lib/utils but we're extracting it here
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
};

/**
 * Calculate remaining amount after a reservation
 * @param totalPrice - Total price of the motorcycle
 * @param totalCurrency - Currency of the total price
 * @param reservationAmount - Amount of the reservation
 * @param reservationCurrency - Currency of the reservation
 * @param exchangeRate - Exchange rate between currencies
 */
export const calculateRemainingAmount = (
  totalPrice: number,
  totalCurrency: string,
  reservationAmount: number,
  reservationCurrency: string,
  exchangeRate?: number
): number => {
  if (totalCurrency === reservationCurrency) {
    return totalPrice - reservationAmount;
  }

  if (!exchangeRate) {
    console.warn("No se proporcionó tipo de cambio para la conversión");
    return totalPrice;
  }

  if (totalCurrency === "USD" && reservationCurrency === "ARS") {
    // Convertir la reserva en ARS a USD
    const reservationInUSD = reservationAmount / exchangeRate;
    return totalPrice - reservationInUSD;
  } else if (totalCurrency === "ARS" && reservationCurrency === "USD") {
    // Convertir la reserva en USD a ARS
    const reservationInARS = reservationAmount * exchangeRate;
    return totalPrice - reservationInARS;
  }

  return totalPrice;
};

/**
 * Check if two promotions have compatible installment plans
 * @param promotion1 - First promotion
 * @param promotion2 - Second promotion
 */
export const arePromotionsCompatible = (
  promotion1: BankingPromotionDisplay, 
  promotion2: BankingPromotionDisplay
): boolean => {
  // Si alguna promoción no tiene planes de cuotas, son compatibles
  if (!promotion1.installmentPlans?.length || !promotion2.installmentPlans?.length) {
    return true;
  }

  // Obtener los planes habilitados
  const enabledPlans1 = promotion1.installmentPlans.filter(plan => plan && plan.isEnabled);
  const enabledPlans2 = promotion2.installmentPlans.filter(plan => plan && plan.isEnabled);

  // Si alguna promoción no tiene planes habilitados, son compatibles
  if (!enabledPlans1.length || !enabledPlans2.length) {
    return true;
  }

  // Verificar si hay al menos un plan con el mismo número de cuotas
  return enabledPlans1.some(plan1 =>
    enabledPlans2.some(plan2 => plan1.installments === plan2.installments)
  );
};

/**
 * Get common installment plans between selected promotions
 * @param promotions - List of selected promotions
 */
export const getCommonInstallmentPlans = (promotions: BankingPromotionDisplay[]): number[] => {
  if (!promotions.length) return [];

  // Obtener planes habilitados de la primera promoción
  const firstPromoPlans = promotions[0].installmentPlans
    ?.filter(plan => plan && plan.isEnabled)
    ?.map(plan => plan.installments) || [];

  // Si solo hay una promoción, devolver sus planes
  if (promotions.length === 1) return firstPromoPlans;

  // Comparar con el resto de promociones
  return firstPromoPlans.filter(installments =>
    promotions.every(promo =>
      promo.installmentPlans
        ?.filter(plan => plan && plan.isEnabled)
        ?.some(plan => plan.installments === installments)
    )
  );
};

/**
 * Calculate final price with all discounts and promotions
 * @param originalPrice - Original price of the product
 * @param discountType - Type of manual discount
 * @param discountValue - Value of manual discount
 * @param promotions - Applied banking promotions
 */
export const calculateFinalPrice = (
  originalPrice: number,
  discountType: 'percentage' | 'fixed' | 'none',
  discountValue: number,
  promotions: BankingPromotionDisplay[] = []
): number => {
  let price = originalPrice;

  // Apply manual discount
  if (discountType === 'percentage' && discountValue > 0) {
    price = price * (1 - discountValue / 100);
  } else if (discountType === 'fixed' && discountValue > 0) {
    price = price - discountValue;
  }

  // Apply banking promotions
  if (promotions && promotions.length > 0) {
    promotions.forEach(promotion => {
      if (!promotion) return;

      if (promotion.discountRate) {
        price = price * (1 - promotion.discountRate / 100);
      } else if (promotion.surchargeRate) {
        price = price * (1 + promotion.surchargeRate / 100);
      }
    });
  }

  return Math.max(0, price); // Ensure price is not negative
};

/**
 * Get merged installment plans across promotions: union of installment counts with lowest interest per count
 */
export const getAvailableInstallmentPlans = (
  promotions: BankingPromotionDisplay[]
): { installments: number; interestRate: number }[] => {
  const planMap: Record<number, number[]> = {};
  promotions.forEach((promo) => {
    promo.installmentPlans
      ?.filter((plan) => plan && plan.isEnabled)
      .forEach((plan) => {
        if (!planMap[plan.installments]) planMap[plan.installments] = [];
        planMap[plan.installments].push(plan.interestRate);
      });
  });
  return Object.entries(planMap)
    .map(([installments, rates]) => ({
      installments: Number(installments),
      interestRate: Math.min(...rates),
    }))
    .sort((a, b) => a.installments - b.installments);
};

/**
 * Get best interest rate per installment count from selected promotions
 */
export const getBestRatesByInstallment = (
  promotions: BankingPromotionDisplay[]
): Record<number, number> => {
  const ratesMap: Record<number, number[]> = {};
  promotions.forEach((promo) => {
    promo.installmentPlans
      ?.filter((plan) => plan && plan.isEnabled)
      .forEach((plan) => {
        if (!ratesMap[plan.installments]) ratesMap[plan.installments] = [];
        ratesMap[plan.installments].push(plan.interestRate);
      });
  });
  const bestRates: Record<number, number> = {};
  for (const [inst, rates] of Object.entries(ratesMap)) {
    bestRates[Number(inst)] = Math.min(...rates);
  }
  return bestRates;
}; 