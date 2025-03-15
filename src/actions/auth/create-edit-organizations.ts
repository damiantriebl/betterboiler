"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { serverMessage } from "@/schemas/serverMessage";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid"; // Importamos UUID

export async function createOrUpdateOrganization(
    prevState: { success: string | false; error: string | false },
    formData: FormData
): Promise<serverMessage> {
    const id = formData.get("id") as string | null;
    const name = formData.get("name") as string | null;
    const logo = formData.get("logo") as string | null;

    if (!name) return { error: "El nombre es requerido.", success: false };

    try {
        if (id) {
            // 🔹 Si hay ID, actualizamos la organización existente
            const updatedOrganization = await prisma.organization.update({
                where: { id },
                data: { name, logo: logo || null },
            });

            console.log("Organización actualizada", updatedOrganization);
            revalidatePath("/root");
            return { success: "Organización actualizada con éxito.", error: false };
        } else {
            // 🔹 Si no hay ID, creamos una nueva organización asegurando un `slug` único
            let slug = name.toLowerCase().replace(/ /g, "-");

            // Verificar si el `slug` ya existe
            let exists = await prisma.organization.findUnique({ where: { slug } });

            if (exists) {
                // Si existe, agregar un UUID corto al final para hacerla única
                slug = `${slug}-${uuidv4().slice(0, 8)}`;
            }

            const newOrganization = await prisma.organization.create({
                data: { name, logo: logo || "", slug },
            });

            console.log("Nueva organización creada", newOrganization);
            revalidatePath("/root");
            return { success: "Organización creada con éxito.", error: false };
        }
    } catch (error) {
        return {
            error: (error as Error).message || "Ocurrió un error inesperado.",
            success: false,
        };
    }
}
