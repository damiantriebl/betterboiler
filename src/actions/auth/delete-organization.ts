"use server";

import prisma from "@/lib/prisma";

export async function deleteOrganization(id: string) {
  await prisma.$transaction([
    prisma.user.updateMany({
      where: { organizationId: id },
      data: { organizationId: null },
    }),
    prisma.organization.delete({
      where: { id },
    }),
  ]);
}
