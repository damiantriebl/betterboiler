"use server";

import prisma from "@/lib/prisma";
import { clientSchema, ClientFormData } from "@/zod/ClientsZod";
import { revalidatePath } from "next/cache";

// Create a new client
type CreateClientInput = ClientFormData;
export async function createClient(data: CreateClientInput) {
  const parsed = clientSchema.safeParse(data);
  if (!parsed.success) throw parsed.error;

  const newClient = await prisma.client.create({ data: parsed.data });
  revalidatePath("/(app)/clients");
  return newClient;
}

// Update an existing client
export async function updateClient(id: string, data: Partial<ClientFormData>) {
  const parsed = clientSchema.partial().safeParse(data);
  if (!parsed.success) throw parsed.error;

  const updatedClient = await prisma.client.update({ where: { id }, data: parsed.data });
  revalidatePath("/(app)/clients");
  return updatedClient;
}

// Delete a client
export async function deleteClient(id: string) {
  const deletedClient = await prisma.client.delete({ where: { id } });
  revalidatePath("/(app)/clients");
  return deletedClient;
}

// Get all clients
export async function getClients() {
  return prisma.client.findMany({ orderBy: { firstName: "asc" } });
}

// Get a client by ID
export async function getClientById(id: string) {
  return prisma.client.findUnique({ where: { id } });
}
