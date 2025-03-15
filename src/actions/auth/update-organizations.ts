"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { serverMessage } from "@/schemas/serverMessage";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function updateOrganization(
    prevState: { success: string | false; error: string | false },
    formData: FormData
): Promise<serverMessage> {
    const id = formData.get("id") as string | null;
    const name = formData.get("name") as string | null;
    const logo = formData.get("logo") as string | null;

    if (!id || !name) return { error: "Datos inválidos", success: false };

    try {
        const updatedOrganization = await prisma.organization.update({
            where: { id },
            data: {
                name,
                logo: logo || null,
            },
        });

        console.log("Organización actualizada", updatedOrganization);
        revalidatePath("/root");
        return { success: "Organización actualizada con éxito.", error: false };
    } catch (error) {
        return {
            error: (error as Error).message || "Ocurrió un error inesperado.",
            success: false,
        };
    }
}
