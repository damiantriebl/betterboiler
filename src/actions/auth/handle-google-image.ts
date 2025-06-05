"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

export async function shouldUseGoogleImage(userId: string) {
  try {
    // Buscar el usuario en la DB para verificar si tiene imagen personalizada
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        profileOriginal: true,
        profileCrop: true,
      },
    });

    if (!user) {
      console.log("❌ [GOOGLE IMAGE] User not found in DB");
      return { useGoogle: false, reason: "user_not_found" };
    }

    // Si tiene imagen personalizada, NO usar la de Google
    const hasCustomImage = user.profileOriginal || user.profileCrop;

    if (hasCustomImage) {
      console.log("🎭 [GOOGLE IMAGE] User has custom image, keeping it");
      return { useGoogle: false, reason: "custom_image_exists" };
    }

    // Si NO tiene imagen personalizada, SÍ usar la de Google
    console.log("📸 [GOOGLE IMAGE] No custom image found, can use Google image");
    return { useGoogle: true, reason: "no_custom_image" };
  } catch (error) {
    console.error("💥 [GOOGLE IMAGE] Error checking image preference:", error);
    return { useGoogle: false, reason: "error" };
  }
}

export async function handleGoogleImageAfterLogin() {
  try {
    // Obtener la sesión actual
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      console.log("❌ [GOOGLE IMAGE] No session found");
      return { success: false, reason: "no_session" };
    }

    const result = await shouldUseGoogleImage(session.user.id);

    console.log("🔍 [GOOGLE IMAGE] Decision:", {
      userId: session.user.id,
      shouldUseGoogle: result.useGoogle,
      reason: result.reason,
    });

    return {
      success: true,
      shouldUseGoogle: result.useGoogle,
      reason: result.reason,
    };
  } catch (error) {
    console.error("💥 [GOOGLE IMAGE] Error handling Google image:", error);
    return { success: false, reason: "error" };
  }
}
