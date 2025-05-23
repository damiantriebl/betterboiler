"use server";

import { auth } from "@/auth";
import type { Session } from "@/auth";
import { headers } from "next/headers";

interface FullSessionResult {
  session: Session | null;
  error?: string;
}

export async function getSession(): Promise<FullSessionResult> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      console.error("❌ No session found.");
      return {
        session: null,
        error: "No se encontró la sesión.",
      };
    }
    return {
      session,
    };
  } catch (error) {
    console.error("❌ Error in getSession:", error);
    return {
      session: null,
      error: `Error al obtener la sesión: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
