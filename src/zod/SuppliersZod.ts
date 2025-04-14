import { z } from "zod";

// Keep Spanish enum values as they are likely used in Select components
const IVAStatus = z.enum(["Responsable Inscripto", "Monotributista", "Exento", "Consumidor Final", "Otro"]);
const InvoiceType = z.enum(["Factura A", "Factura B", "Factura C", "Recibo X", "Otro"]);
const SupplierStatus = z.enum(["activo", "inactivo"]).default("activo");

// Schema for the Supplier Form (using Spanish field names to match the form)
export const supplierSchema = z.object({
    // Basic Identification
    legalName: z.string().min(1, "La razón social es requerida"),
    commercialName: z.string().optional(),
    taxIdentification: z.string().min(1, "La identificación tributaria es requerida"),

    // Fiscal Data
    vatCondition: IVAStatus,
    voucherType: InvoiceType,
    grossIncome: z.string().optional(),
    localTaxRegistration: z.string().optional(),

    // Contact Info
    contactName: z.string().optional(),
    contactPosition: z.string().optional(),
    landlineNumber: z.string().optional(),
    mobileNumber: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal('')),
    website: z.string().url("URL inválida").optional().or(z.literal('')),

    // Addresses
    legalAddress: z.string().optional(),
    commercialAddress: z.string().optional(),
    deliveryAddress: z.string().optional(),

    // Banking Information
    bank: z.string().optional(),
    accountTypeNumber: z.string().optional(),
    cbu: z.string().optional(),
    bankAlias: z.string().optional(),
    swiftBic: z.string().optional(),

    // Commercial Conditions
    paymentCurrency: z.string().optional(),
    paymentMethods: z.array(z.string()).optional(),
    paymentTermDays: z.coerce.number().int().positive().optional().nullable(),
    creditLimit: z.coerce.number().positive().optional().nullable(),
    returnPolicy: z.string().optional(),
    discountsConditions: z.string().optional(),

    // Logistics Information
    shippingMethods: z.string().optional(),
    shippingCosts: z.string().optional(),
    deliveryTimes: z.string().optional(),
    transportConditions: z.string().optional(),

    // Additional Information
    itemsCategories: z.string().optional(),
    certifications: z.string().optional(),
    commercialReferences: z.string().optional(),
    status: SupplierStatus,
    notesObservations: z.string().optional(),
});

// Export the inferred type
export type SupplierFormData = z.infer<typeof supplierSchema>;
