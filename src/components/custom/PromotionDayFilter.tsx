"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Day } from "@/zod/banking-promotion-schemas";
import { getCurrentDayOfWeek } from "@/utils/promotion-utils";

// Days of the week in Spanish (matches the schema definition)
const DAYS_OF_WEEK: Day[] = [
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
    "domingo"
];

const SHORT_DAYS: Record<Day, string> = {
    "lunes": "L",
    "martes": "M",
    "miércoles": "X",
    "jueves": "J",
    "viernes": "V",
    "sábado": "S",
    "domingo": "D"
};

// Readable day names for display
const DAY_NAMES: Record<Day, string> = {
    "lunes": "Lunes",
    "martes": "Martes",
    "miércoles": "Miércoles",
    "jueves": "Jueves",
    "viernes": "Viernes",
    "sábado": "Sábado",
    "domingo": "Domingo"
};

interface PromotionDayFilterProps {
    onDayChange: (day: Day | null) => void;
    className?: string;
}

export function PromotionDayFilter({ onDayChange, className }: PromotionDayFilterProps) {
    const today = getCurrentDayOfWeek();
    const [selectedDay, setSelectedDay] = useState<Day | null>(today);

    const handleDayClick = (day: Day) => {
        if (selectedDay === day) {
            // If the day is already selected, unselect it (show all days)
            setSelectedDay(null);
            onDayChange(null);
        } else {
            setSelectedDay(day);
            onDayChange(day);
        }
    };

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Filtrar por día</span>

                {selectedDay === null ? (
                    <Badge variant="outline" className="ml-2">Todos los días</Badge>
                ) : (
                    <Badge className="ml-2 bg-primary">{DAY_NAMES[selectedDay]}</Badge>
                )}
            </div>

            <div className="flex gap-1 mt-1 overflow-x-auto pb-1 hide-scrollbar">
                {DAYS_OF_WEEK.map((day) => {
                    const isSelected = selectedDay === day;
                    const isToday = day === today;

                    return (
                        <Button
                            key={day}
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            className={cn(
                                "rounded-full px-3 transition-colors relative",
                                isToday && !isSelected && "border-primary text-primary"
                            )}
                            onClick={() => handleDayClick(day)}
                        >
                            <span className="hidden sm:inline">{DAY_NAMES[day]}</span>
                            <span className="inline sm:hidden">{SHORT_DAYS[day]}</span>

                            {isToday && (
                                <span
                                    className={cn(
                                        "absolute -top-1 -right-1 w-2 h-2 rounded-full",
                                        isSelected ? "bg-primary-foreground" : "bg-primary"
                                    )}
                                />
                            )}
                        </Button>
                    );
                })}

                {selectedDay !== null && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full px-3"
                        onClick={() => handleDayClick(selectedDay)}
                    >
                        Mostrar todos
                    </Button>
                )}
            </div>
        </div>
    );
} 