"use client";

import { useState } from "react";
import ListaElementos from "./ListaElementos";

interface Modelo {
  id: string;
  nombre: string;
  posicion: number;
  marcaId: string;
}

interface GestionModelosProps {
  marcaId?: string; // ID de la marca seleccionada
}

export default function GestionModelos({ marcaId }: GestionModelosProps) {
  const [modelos, setModelos] = useState<Modelo[]>([
    { id: "1", nombre: "CBR 600RR", posicion: 1, marcaId: "1" },
    { id: "2", nombre: "Wave", posicion: 2, marcaId: "1" },
    // Aquí irían tus modelos reales
  ]);

  // Filtrar modelos por marca seleccionada
  const modelosFiltrados = marcaId 
    ? modelos.filter(modelo => modelo.marcaId === marcaId)
    : [];

  const handleAgregar = () => {
    // Implementar lógica para agregar
  };

  const handleEditar = (modelo: Modelo) => {
    // Implementar lógica para editar
  };

  const handleEliminar = (id: string) => {
    // Implementar lógica para eliminar
  };

  return (
    <ListaElementos
      elementos={modelosFiltrados}
      titulo="Modelos"
      onAgregar={handleAgregar}
      onEditar={handleEditar}
      onEliminar={handleEliminar}
    />
  );
} 