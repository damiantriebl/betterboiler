"use server";

import { auth } from "@/auth";
import { headers } from "next/headers";

export async function getOrganizationIdFromSession(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.organizationId ?? null;
}
