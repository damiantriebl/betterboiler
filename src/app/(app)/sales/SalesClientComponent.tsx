"use client"; // <-- ¡Importante! Este es el Client Component

import { useState } from "react";
import { Card } from "@/components/ui/card";
import MotorcycleTable from "./MotorcycleTable"; // Asegúrate que MotorcycleTable esté en la misma carpeta
import FilterSection from "./FilterSection"; // Asegúrate que FilterSection esté en la misma carpeta
// Asegúrate de que los tipos se importen correctamente
import type { MotorcycleTableRowData } from "@/actions/sales/get-motorcycles";
import { type Motorcycle as OldMotorcycleType, EstadoVenta } from "@/types/BikesType";

// Definir las props que espera este componente
interface SalesClientComponentProps {
  initialData: MotorcycleTableRowData[];
}

export default function SalesClientComponent({ initialData }: SalesClientComponentProps) {
  // --- Toda la lógica de estado y manejo de filtros va aquí ---
  const [filters, setFilters] = useState({
    search: "",
    marca: "todas",
    tipo: "todos", // Asegúrate que el filtro inicial coincida con lo esperado
    ubicacion: "todas",
    estadosVenta: [] as EstadoVenta[], // Inicializar vacío o con un estado por defecto si prefieres
  });
  // Usar los datos iniciales recibidos para el estado filtrado inicial
  const [filteredData, setFilteredData] = useState<MotorcycleTableRowData[]>(initialData);
  const [key, setKey] = useState(0); // Para refrescar la tabla si es necesario

  const handleFilterChange = (filterType: string, value: string | EstadoVenta[]) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);

    let filtered = [...initialData];

    if (newFilters.search) {
      const searchTerm = newFilters.search.toLowerCase();
      filtered = filtered.filter(
        (moto) =>
          // Use optional chaining for potentially null relations
          moto.brand?.name.toLowerCase().includes(searchTerm) ||
          moto.model?.name.toLowerCase().includes(searchTerm) ||
          // Removed chassisNumber check as it's not in the type
          false
      );
    }
    if (newFilters.marca !== "todas") {
      // Use optional chaining
      filtered = filtered.filter((moto) => moto.brand?.name === newFilters.marca);
    }
    if (newFilters.ubicacion !== "todas") {
      // Use optional chaining
      filtered = filtered.filter((moto) => moto.branch?.name === newFilters.ubicacion);
    }
    if (newFilters.estadosVenta.length > 0) {
      const estadosPermitidos = newFilters.estadosVenta as string[];
      // Use estadoVenta (correct field name)
      filtered = filtered.filter((moto) => estadosPermitidos.includes(moto.estadoVenta));
    }

    setFilteredData(filtered);
    setKey((prev) => prev + 1);
  };

  // Lógica de transformación de datos para MotorcycleTable
  const tableData: OldMotorcycleType[] = filteredData.map((moto) => ({
    id: moto.id.toString(),
    // Handle potentially null relations with fallback
    marca: moto.brand?.name ?? "N/A",
    modelo: moto.model?.name ?? "N/A",
    año: moto.year,
    tipo: moto.model?.name as OldMotorcycleType["tipo"] ?? "N/A",
    cilindrada: moto.displacement ?? 0,
    estado: moto.mileage > 0 ? "Usado" : "Nuevo",
    ubicacion: moto.branch?.name ?? "N/A",
    // Use estadoVenta
    estadoVenta: moto.estadoVenta,
    precio: moto.retailPrice,
    // Handle potentially null color
    color: moto.color?.name ?? "N/A",
    transmision: moto.model?.name as OldMotorcycleType["transmision"] ?? "N/A",
    // Use EstadoVenta.STOCK for comparison
    disponibilidad: moto.estadoVenta === EstadoVenta.STOCK,
    imagenUrl: "", // Assuming imageUrl is not in MotorcycleTableRowData
    acciones: [],
    kilometraje: moto.mileage,
  }));

  // El JSX que renderiza la UI del cliente
  return (
    <Card className="p-6">
      <FilterSection filters={filters} onFilterChange={handleFilterChange} />
      {/* Pasar los datos transformados y la key a la tabla */}
      <MotorcycleTable key={key} initialData={tableData} />
    </Card>
  );
}
