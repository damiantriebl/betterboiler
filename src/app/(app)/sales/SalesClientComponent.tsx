"use client"; // <-- ¡Importante! Este es el Client Component

import { useState } from "react";
import { Card } from "@/components/ui/card";
import MotorcycleTable from "./MotorcycleTable"; // Asegúrate que MotorcycleTable esté en la misma carpeta
import FilterSection from "./FilterSection"; // Asegúrate que FilterSection esté en la misma carpeta
// Asegúrate de que los tipos se importen correctamente
import { MotorcycleWithDetails } from "@/actions/sales/get-motorcycles";
import { Motorcycle as OldMotorcycleType, EstadoVenta } from "@/types/BikesType";

// Definir las props que espera este componente
interface SalesClientComponentProps {
  initialData: MotorcycleWithDetails[];
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
  const [filteredData, setFilteredData] = useState<MotorcycleWithDetails[]>(initialData);
  const [key, setKey] = useState(0); // Para refrescar la tabla si es necesario

  const handleFilterChange = (filterType: string, value: string | EstadoVenta[]) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);

    // Lógica de filtrado sobre los datos iniciales (recibidos como prop)
    let filtered = [...initialData];

    if (newFilters.search) {
      const searchTerm = newFilters.search.toLowerCase();
      filtered = filtered.filter(
        (moto) =>
          moto.brand.name.toLowerCase().includes(searchTerm) ||
          moto.model.name.toLowerCase().includes(searchTerm) ||
          (moto.chassisNumber && moto.chassisNumber.toLowerCase().includes(searchTerm)), // Añadir chequeo por si es null/undefined
      );
    }
    if (newFilters.marca !== "todas") {
      filtered = filtered.filter((moto) => moto.brand.name === newFilters.marca);
    }
    // Ajustar filtro 'tipo' si es necesario (ejemplo usando model.name)
    // if (newFilters.tipo !== "todos") {
    //    filtered = filtered.filter(moto => moto.model.name === newFilters.tipo);
    // }
    if (newFilters.ubicacion !== "todas") {
      filtered = filtered.filter((moto) => moto.branch.name === newFilters.ubicacion);
    }
    // Ajustar filtro 'estadosVenta'
    if (newFilters.estadosVenta.length > 0) {
      const estadosPermitidos = newFilters.estadosVenta as string[]; // Asumiendo que EstadoVenta son strings compatibles
      filtered = filtered.filter((moto) => estadosPermitidos.includes(moto.state));
    }

    setFilteredData(filtered);
    setKey((prev) => prev + 1);
  };

  // Lógica de transformación de datos para MotorcycleTable
  const tableData: OldMotorcycleType[] = filteredData.map((moto) => ({
    id: moto.id.toString(),
    marca: moto.brand.name,
    modelo: moto.model.name,
    año: moto.year,
    // Usar model.name o un campo específico si existe. Forzar tipo si es necesario
    tipo: moto.model.name as OldMotorcycleType["tipo"],
    cilindrada: moto.displacement ?? 0,
    estado: moto.mileage > 0 ? "Usado" : "Nuevo",
    ubicacion: moto.branch.name,
    estadoVenta: moto.state as EstadoVenta, // Puede requerir ajuste de tipo
    precio: moto.retailPrice,
    color: moto.color.nombre,
    // Usar model.name o un campo específico. Forzar tipo si es necesario
    transmision: moto.model.name as OldMotorcycleType["transmision"],
    disponibilidad: moto.state === "AVAILABLE", // Asume 'AVAILABLE' como estado disponible
    imagenUrl: moto.imageUrl ?? "", // Usar string vacío como fallback
    acciones: [], // Definir acciones si son necesarias
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
