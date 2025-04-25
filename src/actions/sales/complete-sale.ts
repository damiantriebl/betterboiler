"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { MotorcycleState } from "@prisma/client";

export async function completeSale(saleId: string, clientId: string) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });

        if (!session?.user?.id) {
            throw new Error("No autorizado");
        }

        const sale = await prisma.motorcycle.update({
            where: {
                id: Number(saleId),
            },
            data: {
                state: MotorcycleState.VENDIDO,
                sellerId: session.user.id,
                clientId: clientId,
                soldAt: new Date(),
            },
        });

        revalidatePath("/sales");
        return sale;
    } catch (error) {
        console.error("Error al completar la venta:", error);
        throw error;
    }
} 