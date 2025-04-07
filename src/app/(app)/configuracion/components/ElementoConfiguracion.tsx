"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Edit2, Trash2 } from "lucide-react";

interface ElementoConfiguracionProps {
  elemento: {
    id: string;
    nombre: string;
    posicion: number;
  };
  onEditar: () => void;
  onEliminar: () => void;
}

export default function ElementoConfiguracion({
  elemento,
  onEditar,
  onEliminar
}: ElementoConfiguracionProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium">{elemento.nombre}</span>
          <span className="text-sm text-muted-foreground ml-2">
            (Posición: {elemento.posicion})
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEditar}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button variant="destructive" size="sm" onClick={onEliminar}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
} 