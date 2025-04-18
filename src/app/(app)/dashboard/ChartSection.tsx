"use client";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { mockSales } from "./mockSale";

type ChartData = {
  label: string | number;
  quantity: number;
  total: number;
};

type ChartType = "brands" | "displacement" | "types";

interface ChartSectionProps {
  type: ChartType;
  title?: string;
}

const getTitleByType = (type: ChartType) => {
  switch (type) {
    case "brands":
      return "Marca más Vendida";
    case "displacement":
      return "Cilindrada más Vendida";
    case "types":
      return "Tipos de Motos más Vendidos";
  }
};

const formatLabel = (type: ChartType, label: string | number) => {
  if (type === "displacement") return `${label}cc`;
  return label;
};

function getChartData(type: ChartType): { mes: ChartData[]; anio: ChartData[] } {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const adjustedSales = mockSales.map((s) => {
    const date = new Date(s.date);
    date.setFullYear(thisYear);
    return { ...s, date: date.toISOString() };
  });

  const filterBy = (mode: "mes" | "anio") => {
    const filtered = adjustedSales.filter((s) => {
      const d = new Date(s.date);
      return mode === "mes"
        ? d.getMonth() === thisMonth && d.getFullYear() === thisYear
        : d.getFullYear() === thisYear;
    });

    const grouped = filtered.reduce<Record<string | number, number>>((acc, s) => {
      let key: string | number;
      switch (type) {
        case "brands":
          key = s.bike.brand;
          break;
        case "displacement":
          key = s.bike.displacement;
          break;
        case "types":
          key = s.bike.type;
          break;
      }
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const total = Object.values(grouped).reduce((sum, q) => sum + q, 0);

    return Object.entries(grouped)
      .map(([label, quantity]) => ({
        label: type === "displacement" ? parseInt(label) : label,
        quantity,
        total,
      }))
      .sort((a, b) => b.quantity - a.quantity);
  };

  return {
    mes: filterBy("mes"),
    anio: filterBy("anio"),
  };
}

export default function ChartSection({ type, title }: ChartSectionProps) {
  const [filtro, setFiltro] = useState<"mes" | "anio">("mes");
  const data = getChartData(type)[filtro];

  return (
    <Card className="w-full space-y-3 py-10 px-8 flex flex-col gap-4">
      <h2 className="text-xl font-semibold mb-4">{title || getTitleByType(type)}</h2>
      <select
        value={filtro}
        onChange={(e) => setFiltro(e.target.value as "mes" | "anio")}
        className="mb-4 border p-1 rounded"
        aria-label="Seleccionar período"
      >
        <option value="mes">Este Mes</option>
        <option value="anio">Este Año</option>
      </select>

      <div className="max-h-[26rem] overflow-y-auto space-y-2 pr-1">
        {data.map(({ label, quantity, total }) => {
          const pct = (quantity / total) * 100;
          return (
            <div key={label} className="px-2">
              <div className="text-sm mb-1">{formatLabel(type, label)}</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gray-800 h-2 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
