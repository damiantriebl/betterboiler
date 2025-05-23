import { useMemo } from "react";
import type { MotorcycleWithFullDetails } from "@/types/motorcycle";
import { MotorcycleState } from "@prisma/client";

interface UseMotorcycleTableDataProps {
  motorcycles: MotorcycleWithFullDetails[];
  filters: {
    search: string;
    marca: string;
    tipo: string;
    ubicacion: string;
    estadosVenta: MotorcycleState[];
    years: number[];
  };
  sortConfig: {
    key: string | null;
    direction: "asc" | "desc" | null;
  };
  currentPage: number;
  pageSize: number;
}

export function useMotorcycleTableData({
  motorcycles,
  filters,
  sortConfig,
  currentPage,
  pageSize,
}: UseMotorcycleTableDataProps) {
  // 🚀 OPTIMIZACIÓN 1: Memoizar datos para filtros
  const filterOptions = useMemo(() => {
    const brands = [...new Set(motorcycles.map((m) => m.brand?.name).filter(Boolean))].sort() as string[];
    const models = [...new Set(motorcycles.map((m) => m.model?.name).filter(Boolean))].sort() as string[];
    const branches = [...new Set(motorcycles.map((m) => m.branch?.name).filter(Boolean))].sort() as string[];
    const years = [...new Set(motorcycles.map((m) => m.year).filter((y) => typeof y === "number"))].sort((a, b) => b - a) as number[];
    
    return {
      availableBrands: brands,
      availableModels: models,
      availableBranches: branches,
      availableYears: years,
    };
  }, [motorcycles]);

  // 🚀 OPTIMIZACIÓN 2: Memoizar filtrado
  const filteredData = useMemo(() => {
    let filtered = [...motorcycles];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (moto) =>
          moto.brand?.name?.toLowerCase().includes(search) ||
          moto.model?.name?.toLowerCase().includes(search) ||
          moto.chassisNumber?.toLowerCase().includes(search),
      );
    }
    if (filters.marca !== "todas") {
      filtered = filtered.filter((moto) => moto.brand?.name === filters.marca);
    }
    if (filters.tipo !== "todos") {
      filtered = filtered.filter((moto) => moto.model?.name === filters.tipo);
    }
    if (filters.ubicacion !== "todas") {
      filtered = filtered.filter((moto) => moto.branch?.name === filters.ubicacion);
    }
    if (
      filters.estadosVenta.length > 0 &&
      filters.estadosVenta.length < Object.values(MotorcycleState).length
    ) {
      filtered = filtered.filter((moto) => filters.estadosVenta.includes(moto.state));
    }
    if (filters.years.length > 0) {
      filtered = filtered.filter((moto) => filters.years.includes(moto.year));
    }

    return filtered;
  }, [motorcycles, filters]);

  // 🚀 OPTIMIZACIÓN 3: Memoizar ordenamiento
  const sortedData = useMemo(() => {
    const { key, direction } = sortConfig;

    if (!key || !direction) return filteredData;

        return [...filteredData].sort((a, b) => {      const aValue = a[key as keyof MotorcycleWithFullDetails];      const bValue = b[key as keyof MotorcycleWithFullDetails];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return direction === "asc" ? -1 : 1;
      if (bValue == null) return direction === "asc" ? 1 : -1;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        return direction === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [filteredData, sortConfig]);

  // 🚀 OPTIMIZACIÓN 4: Memoizar paginación
  const paginationData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);
    const totalPages = Math.ceil(sortedData.length / pageSize);
    
    return {
      paginatedData,
      totalPages,
      totalItems: sortedData.length,
      startIndex: startIndex + 1,
      endIndex: Math.min(startIndex + pageSize, sortedData.length),
    };
  }, [sortedData, currentPage, pageSize]);

  return {
    ...filterOptions,
    ...paginationData,
  };
} 