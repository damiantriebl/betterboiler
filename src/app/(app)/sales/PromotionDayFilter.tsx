"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BankingPromotionDisplay } from "@/types/banking-promotions";
import {
  filterPromotionsByDay,
  getCurrentDayOfWeek,
  isPromotionActiveOnDay,
} from "@/utils/promotion-utils";
import type { Day } from "@/zod/banking-promotion-schemas";
import { useCallback, useEffect, useState } from "react";

interface PromotionDayFilterProps {
  promotions: BankingPromotionDisplay[];
  onFilteredPromotionsChange: (promotions: BankingPromotionDisplay[]) => void;
  currentDay?: Day; // Día actual opcional (si lo recibimos del servidor)
}

const DAYS_MAP: Record<Day, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miércoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sábado: "Sábado",
  domingo: "Domingo",
};

export function PromotionDayFilter({
  promotions,
  onFilteredPromotionsChange,
  currentDay,
}: PromotionDayFilterProps) {
  // Usar currentDay si está disponible, sino usar getCurrentDayOfWeek del lado del cliente
  const today = currentDay || getCurrentDayOfWeek();
  const [selectedDay, setSelectedDay] = useState<Day | "all">("all");

  // Filter promotions based on selected day - ahora usando la función client-side
  const filterPromotions = useCallback(() => {
    if (selectedDay === "all") {
      onFilteredPromotionsChange(promotions);
    } else {
      const filtered = filterPromotionsByDay(promotions, selectedDay);
      onFilteredPromotionsChange(filtered);
    }
  }, [selectedDay, promotions, onFilteredPromotionsChange]);

  // Re-filter when dependencies change
  useEffect(() => {
    filterPromotions();
  }, [filterPromotions]);

  // Count how many promotions are active for each day
  const dayPromotionCounts = Object.entries(DAYS_MAP).map(([dayKey, dayLabel]) => {
    const day = dayKey as Day;
    const count = promotions.filter((promotion) => isPromotionActiveOnDay(promotion, day)).length;

    return {
      day,
      label: dayLabel,
      count,
      isToday: day === today,
    };
  });

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Promociones por Día</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="dayFilter">Filtrar por día</Label>
          <Select
            value={selectedDay}
            onValueChange={(value) => setSelectedDay(value as Day | "all")}
          >
            <SelectTrigger id="dayFilter">
              <SelectValue placeholder="Seleccione un día" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los días</SelectItem>
              {Object.entries(DAYS_MAP).map(([dayKey, dayLabel]) => (
                <SelectItem key={dayKey} value={dayKey}>
                  {dayLabel} {dayKey === today && "(Hoy)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Resumen de promociones</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {dayPromotionCounts.map(({ day, label, count, isToday }) => (
              <Badge
                key={day}
                variant={selectedDay === day ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedDay(day)}
              >
                {label}: {count} {isToday && "🌟"}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
