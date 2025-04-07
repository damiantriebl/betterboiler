"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import ElementoConfiguracion from "./ElementoConfiguracion";

interface ElementoBase {
  id: string;
  nombre: string;
  posicion: number;
}

interface ListaElementosProps<T extends ElementoBase> {
  elementos: T[];
  titulo: string;
  onAgregar: () => void;
  onEditar: (elemento: T) => void;
  onEliminar: (id: string) => void;
}

export default function ListaElementos<T extends ElementoBase>({
  elementos,
  titulo,
  onAgregar,
  onEditar,
  onEliminar
}: ListaElementosProps<T>) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{titulo}</h3>
        <Button onClick={onAgregar} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Agregar
        </Button>
      </div>
      
      <div className="grid gap-2">
        {elementos.sort((a, b) => a.posicion - b.posicion).map((elemento) => (
          <ElementoConfiguracion
            key={elemento.id}
            elemento={elemento}
            onEditar={() => onEditar(elemento)}
            onEliminar={() => onEliminar(elemento.id)}
          />
        ))}
      </div>
    </div>
  );
} 