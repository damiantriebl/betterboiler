import { type MotorcycleWithDetails } from "@/types/motorcycle";

// Define the AmortizationScheduleEntry interface
export interface AmortizationScheduleEntry {
    installmentNumber: number;
    capitalAtPeriodStart: number;
    interestForPeriod: number;
    amortization: number;
    calculatedInstallmentAmount: number;
    capitalAtPeriodEnd: number;
}

// Tipo para los datos de pago
export interface PaymentData {
    metodoPago: string;
    cuotas: number;
    isMayorista: boolean;
    discountType: 'discount' | 'surcharge';
    discountValue: number;
    downPayment: number;
    currentAccountInstallments: number;
    currentAccountFrequency: string;
    annualInterestRate: number;
}

// Tipo para los detalles de cuotas
export interface InstallmentDetails {
    installmentAmount: number;
    totalPayment?: number;
    totalInterest?: number;
    currency?: string;
    schedule?: AmortizationScheduleEntry[]; // Usa el tipo definido arriba
    warning?: string;
}

// Props para el componente QuotePDFDocument
export interface QuotePDFProps {
    motorcycle: MotorcycleWithDetails | null;
    paymentData: PaymentData;
    activeTab: string;
    basePrice: number;
    modifierAmount: number;
    finalPrice: number;
    financedAmount: number;
    installmentDetails: InstallmentDetails;
    totalWithFinancing: number;
    formatAmount: (amount: number) => string;
    organizationLogo?: any;
} 