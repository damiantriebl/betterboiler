import { getRootBrands } from "@/actions/root/global-brand-actions"; // Import the real action
import type { Brand, Model } from "@prisma/client"; // Use real Prisma types
// src/app/root/global-brands/page.tsx
import React from "react";
import ManageGlobalBrands from "./components/ManageGlobalBrands"; // Ajusta el path si es necesario
// TODO: Importar la acción real
// import { getRootBrands } from '@/actions/root/brand-actions';

// Placeholder types if prisma types are unavailable
// type Brand = { id: number; name: string; order?: number };
// type Model = { id: number; name: string; brandId: number; order?: number };

export default async function GlobalBrandsPage() {
  // Fetch initial data using the real action
  const initialBrands = await getRootBrands();
  // Type assertion might be needed if getRootBrands can return something other than Brand[]
  // For now, assume it returns (Brand & { models: Model[] })[] or similar based on include

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Gestión Global de Marcas y Modelos</h1>
      <p className="mb-4 text-muted-foreground">
        Administra las marcas y modelos disponibles globalmente en la plataforma.
      </p>
      <ManageGlobalBrands initialGlobalBrands={initialBrands} />
    </div>
  );
}
