import prisma from "@/lib/prisma";

/**
 * Devuelve las marcas asociadas a una organización.
 * @param organizationId string
 */
export async function getOrganizationBrands(organizationId: string) {
  // TODO: Implementar lógica real según tu modelo de datos
  // Esto es solo un placeholder para evitar errores de importación
  return prisma.organizationBrand.findMany({
    where: { organizationId },
    include: { brand: true },
  });
} 