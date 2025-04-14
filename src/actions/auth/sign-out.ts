"use server";

import { auth } from "@/auth"; // Asegúrate que la ruta a tu config de auth es correcta
import { redirect } from 'next/navigation';

export async function signOutAction() {
    try {
        // Llama al método signOut de tu librería de autenticación
        // El método exacto puede variar (ej: signOut(), auth.signOut(), etc.)
        // Asumiendo que tu librería tiene un método signOut en el objeto auth exportado
        await auth.signOut();

        // Nota: auth.signOut() a menudo maneja la redirección internamente.
        // Si no lo hace, puedes descomentar la siguiente línea:
        // redirect('/sign-in');

    } catch (error) {
        // Manejar errores específicos si es necesario
        console.error("Error al cerrar sesión:", error);
        // Podrías lanzar un error o devolver un objeto de error
        // throw new Error("No se pudo cerrar la sesión.");
        // O simplemente redirigir por si acaso
        redirect('/sign-in');
    }
} 