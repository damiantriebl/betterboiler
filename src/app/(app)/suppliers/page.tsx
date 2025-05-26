// src/app/(app)/suppliers/page.tsx
// Quitar "use client"; esta página ahora obtiene datos del servidor

import { getSuppliers } from "@/actions/suppliers/suppliers-unified"; // Importar la acción
import React from "react";
import SuppliersClientComponent from "./SuppliersClientComponent"; // Importar el nuevo componente cliente

// --- Eliminar Datos de Ejemplo ---
// const initialSupplieresData: Supplier[] = [...];

export default async function SuppliersPage() {
  // Convertir a async function
  // Llamar a la acción para obtener proveedores reales
  const suppliersResult = await getSuppliers();

  // Renderizar solo el componente cliente, pasando los datos iniciales
  return <SuppliersClientComponent initialData={suppliersResult.suppliers} />;
}
