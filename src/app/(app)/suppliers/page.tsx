// src/app/(app)/suppliers/page.tsx
// Quitar "use client"; esta página ahora obtiene datos del servidor

import React from 'react';
import { getSuppliers } from '@/actions/suppliers/manage-suppliers'; // Importar la acción
import SuppliersClientComponent from './SuppliersClientComponent'; // Importar el nuevo componente cliente

// --- Eliminar Datos de Ejemplo --- 
// const initialSupplieresData: Supplier[] = [...];

export default async function SuppliersPage() { // Convertir a async function
    // Llamar a la acción para obtener proveedores reales
    const initialSuppliersData = await getSuppliers();

    // Renderizar solo el componente cliente, pasando los datos iniciales
    return (
        <SuppliersClientComponent initialData={initialSuppliersData} />
    );
} 