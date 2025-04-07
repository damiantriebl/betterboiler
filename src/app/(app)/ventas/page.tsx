'use client';

import { Card } from "@/components/ui/card";
import { motorcycles } from "@/data/motorcycles";
import MotorcycleTable from "./MotorcycleTable";
import FilterSection from "./FilterSection";
import { useState, useEffect } from "react";
import { Motorcycle, EstadoVenta } from "@/types/types";

export default function VentasPage() {
    const [filteredData, setFilteredData] = useState<Motorcycle[]>([]);
    const [filters, setFilters] = useState({
        search: "",
        marca: "todas",
        tipo: "todos",
        ubicacion: "todas",
        estadosVenta: [EstadoVenta.STOCK] as EstadoVenta[]
    });
    const [key, setKey] = useState(0);

    // Aplicar filtros iniciales al cargar la página
    useEffect(() => {
        handleFilterChange("estadosVenta", [EstadoVenta.STOCK]);
    }, []);

    const handleFilterChange = (filterType: string, value: string | EstadoVenta[]) => {
        const newFilters = { ...filters, [filterType]: value };
        setFilters(newFilters);

        let filtered = [...motorcycles];

        // Filtrar por búsqueda
        if (newFilters.search) {
            const searchTerm = newFilters.search.toLowerCase();
            filtered = filtered.filter(moto =>
                moto.marca.toLowerCase().includes(searchTerm) ||
                moto.modelo.toLowerCase().includes(searchTerm)
            );
        }

        // Filtrar por marca
        if (newFilters.marca !== "todas") {
            filtered = filtered.filter(moto => moto.marca === newFilters.marca);
        }

        // Filtrar por tipo
        if (newFilters.tipo !== "todos") {
            filtered = filtered.filter(moto => moto.tipo === newFilters.tipo);
        }

        // Filtrar por ubicación
        if (newFilters.ubicacion !== "todas") {
            filtered = filtered.filter(moto => moto.ubicacion === newFilters.ubicacion);
        }

        // Filtrar por estados de venta
        if (newFilters.estadosVenta.length > 0) {
            filtered = filtered.filter(moto =>
                (newFilters.estadosVenta as EstadoVenta[]).includes(moto.estadoVenta)
            );
        }

        setFilteredData(filtered);
        setKey(prev => prev + 1);
    };

    return (
        <main className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Catálogo de Motos</h1>
                <p className="text-muted-foreground">
                    Explora nuestra amplia selección de motocicletas disponibles
                </p>
            </div>

            <Card className="p-6">
                <FilterSection filters={filters} onFilterChange={handleFilterChange} />
                <MotorcycleTable key={key} initialData={filteredData} />
            </Card>
        </main>
    );
} 