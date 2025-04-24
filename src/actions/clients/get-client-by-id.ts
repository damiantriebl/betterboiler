"use server";

import { cache } from 'react';
import prisma from "@/lib/prisma";

/**
 * Obtiene los detalles de un cliente por su ID.
 * @param clientId El ID del cliente a buscar.
 * @returns El objeto Client o null si no se encuentra.
 */
export const getClientById = cache(async (clientId: string) => {
  if (!clientId) {
    console.error("[Action getClientById] No client ID provided.");
    return null;
  }

  console.log(`[Action getClientById] Fetching client with ID: ${clientId}`);

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      console.warn(`[Action getClientById] Client not found for ID: ${clientId}`);
      return null;
    }

    console.log("[Action getClientById] Client found:", client);
    return client;
  } catch (error) {
    console.error(`[Action getClientById] Error fetching client ID ${clientId}:`, error);
    return null;
  }
});
