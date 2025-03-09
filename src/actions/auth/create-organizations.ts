// /actions/reset-password.ts
"use server";

import { z } from "zod";
import { auth } from "@/auth"; // path to your Better Auth server instance
import { headers } from "next/headers";
import { revalidatePath } from 'next/cache';


import { serverMessage } from "@/app/(auth)/forgot-password/page";
import prisma from "@/lib/prisma";

export async function createOrganization(prevState: { success: string | false; error: string | false; }, formData: FormData): Promise<serverMessage> {
  const name = formData.get("name") as string | null;
  const logo = formData.get("logo") as string | null;
  const session = await auth.api.getSession({
    headers: await headers() // you need to pass the headers object.
  })

  if (!name) {
    return { error: "Formato invalido", success: false };
  }
  const slug = name.toLowerCase().replace(/ /g, "-");
  try {
    const newOrganization = await auth.api.createOrganization({
      body: {
        name,
        slug,
        logo: logo ?? ""
      },

      headers: await headers(),
    });

    console.log("Organización creada:", newOrganization);
    const updatedSession = await prisma.session.update({
      where: { token: session?.session.token },
      data: { activeOrganizationId: newOrganization?.id },
    });
    revalidatePath('/root');

    return {
      success: "Organización creada con éxito.",
      error: false,
    };
  } catch (error) {
    return { error: (error as Error).message || "Ocurrió un error inesperado.", success: false };
  }
  return {
    success: "Organización creada con éxito.",
    error: false,
  };
}
