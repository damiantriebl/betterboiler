"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Day = "lunes" | "martes" | "miércoles" | "jueves" | "viernes" | "sábado" | "domingo";

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
    "miércoles": "M",
    "jueves": "J",
    "viernes": "V",
    "sábado": "S",
    "domingo": "D"
};

interface DaySelectorProps {
    value: Day[];
    onChange: (days: Day[]) => void;
    className?: string;
}

export function DaySelector({ value = [], onChange, className }: DaySelectorProps) {
    const [selectedDays, setSelectedDays] = useState<Day[]>(value);

    useEffect(() => {
        setSelectedDays(value);
    }, [value]);

    const handleDayToggle = (day: Day) => {
        const newSelectedDays = selectedDays.includes(day)
            ? selectedDays.filter(d => d !== day)
            : [...selectedDays, day];

        setSelectedDays(newSelectedDays);
        onChange(newSelectedDays);
    };

    const isAllSelected = selectedDays.length === 0 || selectedDays.length === DAYS_OF_WEEK.length;

    const handleSelectAll = () => {
        // If all are selected or none are selected (which means all days), clear the selection
        if (isAllSelected) {
            setSelectedDays([]);
            onChange([]);
        } else {
            // Otherwise select all days
            setSelectedDays([]);
            onChange([]);
        }
    };

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Días activos</div>
                <Badge
                    variant="outline"
                    className={cn(
                        "cursor-pointer hover:bg-primary/10",
                        isAllSelected && "bg-primary/10"
                    )}
                    onClick={handleSelectAll}
                >
                    {isAllSelected ? "Todos los días" : "Selección personalizada"}
                </Badge>
            </div>

            <div className="flex justify-between gap-1 mt-1">
                {DAYS_OF_WEEK.map((day) => {
                    const isSelected = selectedDays.length === 0 || selectedDays.includes(day);

                    return (
                        <div key={day} className="flex flex-col items-center">
                            <Badge
                                variant="outline"
                                className={cn(
                                    "w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-colors",
                                    isSelected
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                        : "hover:bg-primary/10"
                                )}
                                onClick={() => handleDayToggle(day)}
                            >
                                {SHORT_DAYS[day]}
                            </Badge>
                            <div
                                className={cn(
                                    "w-2 h-2 rounded-full mt-1 transition-colors",
                                    isSelected ? "bg-primary" : "bg-muted"
                                )}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
} 