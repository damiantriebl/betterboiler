"use server";

import type { BrandForCombobox } from "@/app/(app)/stock/new/types";
import prisma from "@/lib/prisma";
import type { ColorConfig, ColorType } from "@/types/ColorType";
import type { Brand, Model, MotoColor, Supplier } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import { getOrganizationIdFromSession } from "../util";

// Types
export interface BranchData {
  id: number;
  nombre: string;
}

export interface FormDataResult {
  availableBrands: BrandForCombobox[];
  availableColors: ColorConfig[];
  availableBranches: BranchData[];
  suppliers: Supplier[];
}

export interface MotoEnProgresoData {
  id: number;
  chassisNumber: string | null;
  brandName: string | null;
  modelName: string | null;
}

// Core data fetching functions
export async function getBranches(): Promise<BranchData[]> {
  const org = await getOrganizationIdFromSession();

  if (!org.organizationId) {
    console.error("[getBranches] No organizationId found.");
    return [];
  }

  try {
    const branchesFromDb = await prisma.branch.findMany({
      where: { organizationId: org.organizationId },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return branchesFromDb.map((branch) => ({
      id: branch.id,
      nombre: branch.name,
    }));
  } catch (error) {
    console.error("Error en getBranches:", error);
    return [];
  }
}

export async function getMotosEnProgreso(): Promise<MotoEnProgresoData[]> {
  const org = await getOrganizationIdFromSession();

  if (!org.organizationId) {
    console.error("[getMotosEnProgreso] No organizationId found.");
    return [];
  }

  try {
    const motorcycles = await prisma.motorcycle.findMany({
      where: {
        organizationId: org.organizationId,
        state: "PROCESANDO",
      },
      include: {
        brand: {
          select: { name: true },
        },
        model: {
          select: { name: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    return motorcycles.map((motorcycle) => ({
      id: motorcycle.id,
      chassisNumber: motorcycle.chassisNumber ?? "N/A",
      brandName: motorcycle.brand?.name ?? "N/A",
      modelName: motorcycle.model?.name ?? "N/A",
    }));
  } catch (error) {
    console.error("Error en getMotosEnProgreso:", error);
    return [];
  }
}

export async function getFormData(): Promise<FormDataResult> {
  noStore();
  const org = await getOrganizationIdFromSession();

  if (!org.organizationId) {
    throw new Error("Usuario no autenticado o sin organización.");
  }

  try {
    const [brandsData, colorsData, branchesResult, suppliers] = await Promise.all([
      getBrandsData(org.organizationId),
      getColorsData(org.organizationId),
      getBranches(),
      getSuppliersData(org.organizationId),
    ]);

    return {
      availableBrands: brandsData,
      availableColors: colorsData,
      availableBranches: branchesResult,
      suppliers,
    };
  } catch (error) {
    console.error("Error fetching form data:", error);
    throw new Error("No se pudieron cargar los datos necesarios para el formulario.");
  }
}

// Helper functions for specific data types
async function getBrandsData(organizationId: string): Promise<BrandForCombobox[]> {
  const brandsData = await prisma.organizationBrand.findMany({
    where: { organizationId },
    include: {
      brand: {
        select: {
          id: true,
          name: true,
          models: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { order: "asc" },
  });

  return brandsData.map((orgBrand) => ({
    id: orgBrand.brand.id,
    name: orgBrand.brand.name,
    models: orgBrand.brand.models.map((model) => ({ id: model.id, name: model.name })),
    color: orgBrand.color,
  }));
}

async function getColorsData(organizationId: string): Promise<ColorConfig[]> {
  const colorsData = await prisma.motoColor.findMany({
    where: { organizationId },
    select: { id: true, name: true, colorOne: true, colorTwo: true, type: true },
    orderBy: { name: "asc" },
  });

  return colorsData.map((color) => ({
    id: color.id.toString(),
    name: color.name,
    type: color.type as ColorType,
    colorOne: color.colorOne,
    colorTwo: color.colorTwo ?? undefined,
  }));
}

async function getSuppliersData(organizationId: string): Promise<Supplier[]> {
  // Use the unified suppliers function
  const { getSuppliers } = await import("@/actions/suppliers/suppliers-unified");
  const result = await getSuppliers();
  return result.success ? result.suppliers : [];
}

// Convenience functions for specific use cases
export async function getFormDataBasic(): Promise<
  Pick<FormDataResult, "availableBranches" | "availableColors">
> {
  const org = await getOrganizationIdFromSession();

  if (!org.organizationId) {
    throw new Error("Usuario no autenticado o sin organización.");
  }

  try {
    const [colorsData, branchesResult] = await Promise.all([
      getColorsData(org.organizationId),
      getBranches(),
    ]);

    return {
      availableColors: colorsData,
      availableBranches: branchesResult,
    };
  } catch (error) {
    console.error("Error fetching basic form data:", error);
    throw new Error("No se pudieron cargar los datos básicos del formulario.");
  }
}

export async function getBrandsWithModels(): Promise<BrandForCombobox[]> {
  const org = await getOrganizationIdFromSession();

  if (!org.organizationId) {
    return [];
  }

  try {
    return await getBrandsData(org.organizationId);
  } catch (error) {
    console.error("Error fetching brands with models:", error);
    return [];
  }
}
