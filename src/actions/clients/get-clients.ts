"use server";

import prisma from "@/lib/prisma";

export const getClients = async () => {
  return await prisma.client.findMany();
}; 