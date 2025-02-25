// /actions/sign-in.ts
"use server";

import { authClient } from "@/auth-client";
import { serverMessage } from "@/schemas/setverMessage";
import { redirect } from "next/navigation";

export async function signInAction(
    prevState: { success: string | false; error: string | false },
    formData: FormData
  ): Promise<serverMessage> {
    console.log('funciona desde el server', formData)
    const email = formData.get("email") as string;

    const password = formData.get("password") as string;
    if (!email || !password) {
        return { error: "Datos del formulario inválidos", success: false };
    }

    try {
        await authClient.signIn.email({ email, password });
        return { success: "Ingreso exitoso.", error: false };
    } catch (error) {
        console.error(error);
        return { error: "Usuario o contraseña incorrectos.", success: false };
    }
}