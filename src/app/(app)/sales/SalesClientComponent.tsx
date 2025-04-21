"use client"; // <-- ¡Importante! Este es el Client Component

import { useState } from "react";
import { Card } from "@/components/ui/card";
import MotorcycleTable from "./MotorcycleTable"; // Asegúrate que MotorcycleTable esté en la misma carpeta
import FilterSection from "./FilterSection"; // Asegúrate que FilterSection esté en la misma carpeta
// Asegúrate de que los tipos se importen correctamente
import type { Motorcycle, MotorcycleState, Brand, Model, Sucursal } from "@prisma/client";
// Eliminar la importación del tipo antiguo y enum si ya no se usan aquí
// import { type Motorcycle as OldMotorcycleType, EstadoVenta } from "@/types/BikesType";

// Tipo extendido para incluir relaciones
type MotorcycleWithRelations = Motorcycle & {
  brand?: Brand | null;
  model?: Model | null;
  branch?: Sucursal | null;
  reservation?: {
    id: number;
    amount: number;
    clientId: string;
    status: string;
  } | null;
};

// Definir las props que espera este componente
interface SalesClientComponentProps {
  initialData: MotorcycleWithRelations[]; // Usar el tipo más específico
  clients?: Client[]; // Usar el tipo más específico
}

export default function SalesClientComponent({
  initialData,
  clients = [],
}: SalesClientComponentProps) {
  console.log("SalesClientComponent initialData:", initialData); // Log para debug

  // --- Toda la lógica de estado y manejo de filtros va aquí ---
  const [filters, setFilters] = useState({
    search: "",
    marca: "todas",
    tipo: "todos", // Asegúrate que el filtro inicial coincida con lo esperado
    ubicacion: "todas",
    estadosVenta: [] as MotorcycleState[], // <-- Usar MotorcycleState[]
  });
  // Usar los datos iniciales recibidos para el estado filtrado inicial
  const [filteredData, setFilteredData] = useState<MotorcycleWithRelations[]>(initialData); // Usar el tipo más específico
  const [key, setKey] = useState(0); // Para refrescar la tabla si es necesario

  const handleFilterChange = (filterType: string, value: string | MotorcycleState[]) => {
    // <-- Recibir MotorcycleState[]
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);

    let filtered = [...initialData];

    // --- Lógica de Filtrado (usando campos de MotorcycleTableRowData) ---
    if (newFilters.search) {
      const searchTerm = newFilters.search.toLowerCase();
      filtered = filtered.filter(
        (moto) =>
          moto.brand?.name.toLowerCase().includes(searchTerm) ||
          moto.model?.name.toLowerCase().includes(searchTerm) ||
          moto.chassisNumber?.toLowerCase().includes(searchTerm) || // Buscar también por chasis
          false,
      );
    }
    if (newFilters.marca !== "todas") {
      filtered = filtered.filter((moto) => moto.brand?.name === newFilters.marca);
    }
    // Añadir filtro por tipo si existe en el modelo de datos y filtros
    // if (newFilters.tipo !== "todos") {
    //   filtered = filtered.filter((moto) => /* lógica filtro tipo */);
    // }
    if (newFilters.ubicacion !== "todas") {
      filtered = filtered.filter((moto) => moto.branch?.name === newFilters.ubicacion);
    }
    // Filtrar usando MotorcycleState[]
    if (Array.isArray(newFilters.estadosVenta) && newFilters.estadosVenta.length > 0) {
      // No es necesario castear a string[], ya son MotorcycleState[]
      filtered = filtered.filter((moto) =>
        (newFilters.estadosVenta as MotorcycleState[]).includes(moto.state),
      );
    }
    // --- Fin Lógica de Filtrado ---

    setFilteredData(filtered);
    setKey((prev) => prev + 1);
  };

  // El JSX que renderiza la UI del cliente
  return (
    <Card className="p-6">
      <FilterSection filters={filters} onFilterChange={handleFilterChange} />
      {/* Pasar motorcycles con relaciones a MotorcycleTable */}
      <MotorcycleTable key={key} initialData={filteredData} clients={clients} />
    </Card>
  );
}
