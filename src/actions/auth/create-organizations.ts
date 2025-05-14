"use server";

import type { serverMessage } from "@/app/(auth)/forgot-password/page";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function createOrganization(
  prevState: { success: string | false; error: string | false },
  formData: FormData,
): Promise<serverMessage> {
  const name = formData.get("name") as string | null;
  const logo = formData.get("logo") as string | null;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!name) return { error: "Formato invalido", success: false };

  const slug = name.toLowerCase().replace(/ /g, "-");

  try {
    const newOrganization = await prisma.organization.create({
      data: {
        name,
        logo: logo || "",
        slug,
      },
    });
    console.log("new organization", newOrganization);
    revalidatePath("/root");
    return { success: "Organización creada con éxito.", error: false };
  } catch (error) {
    return {
      error: (error as Error).message || "Ocurrió un error inesperado.",
      success: false,
    };
  }
}
