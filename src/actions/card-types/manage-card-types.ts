"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CardType } from "@/types/bank-cards"; // Assuming CardType is defined here

// Zod schema for validation
const createCardTypeSchema = z.object({
    name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
    type: z.enum(["credit", "debit"], { required_error: "Debe seleccionar un tipo (crédito o débito)." }),
    logoUrl: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')) // Allow empty string or valid URL
});

// Use the same FormState type defined in the modal component
type FormState = {
    success: boolean;
    message?: string | null;
    fieldErrors?: {
        name?: string[];
        type?: string[];
        logoUrl?: string[];
    } | null;
    data?: CardType | null;
};

// Modify the action signature to match FormState
export async function createCardType(
    prevState: FormState, // Use the refined type
    formData: FormData
): Promise<FormState> { // Ensure return type matches FormState
    const validatedFields = createCardTypeSchema.safeParse({
        name: formData.get('name'),
        type: formData.get('type'),
        logoUrl: formData.get('logoUrl') || undefined
    });

    if (!validatedFields.success) {
        console.error("Validation Error:", validatedFields.error.flatten().fieldErrors);
        return {
            success: false,
            message: "Error de validación. Verifique los campos.", // Use message field
            fieldErrors: validatedFields.error.flatten().fieldErrors,
            data: null
        };
    }

    const { name, type, logoUrl } = validatedFields.data;

    try {
        const existingCardType = await prisma.cardType.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } }
        });

        if (existingCardType) {
            return {
                success: false,
                message: `Ya existe un tipo de tarjeta llamado '${name}'.`, // Use message field
                fieldErrors: null,
                data: null
            };
        }

        const newCardType = await prisma.cardType.create({
            data: {
                name,
                type,
                logoUrl: logoUrl || null,
            },
        });

        revalidatePath('/configuration');

        return { 
            success: true, 
            message: `Tipo de tarjeta '${newCardType.name}' creado correctamente.`,
            data: newCardType as CardType, // Assert type if necessary, ensure structure matches
            fieldErrors: null
        };

    } catch (error: any) {
        console.error("Error creating card type:", error);
        return {
            success: false,
            message: error.message || "Error desconocido al crear el tipo de tarjeta.", // Use message field
            fieldErrors: null,
            data: null
        };
    }
} 