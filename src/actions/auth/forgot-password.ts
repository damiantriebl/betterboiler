// /actions/forgotPasswordAction.ts
"use server";

import { z } from "zod";
import { forgotPasswordSchema } from "@/zod/AuthZod";
import { authClient } from "@/auth-client";
import type { serverMessage } from "@/types/ServerMessageType";

export async function forgotPasswordAction(
  prevState: { success: string | false; error: string | false },
  formData: FormData,
): Promise<serverMessage> {
  const email = formData.get("email");

  const validation = forgotPasswordSchema.safeParse({ email });
  if (!validation.success) {
    return { error: "Email inválido.", success: false };
  }

  const { error } = await authClient.forgetPassword({
    email: validation.data.email,
    redirectTo: "/reset-password",
  });

  if (error) {
    if (error.message === "USER_NOT_FOUND") {
      return {
        error: "Usuario no encontrado. No existe ninguna cuenta registrada con este email.",
        success: false,
      };
    }
    return { error: error.message || "Ocurrió un error inesperado.", success: false };
  }

  return {
    success:
      "Si existe una cuenta con este email, recibirás un enlace para restablecer tu contraseña.",
    error: false,
  };
}
