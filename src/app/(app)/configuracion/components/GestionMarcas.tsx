"use client";

import { useState } from "react";
import ListaElementos from "./ListaElementos";

interface Marca {
  id: string;
  nombre: string;
  posicion: number;
}

export default function GestionMarcas() {
  const [marcas, setMarcas] = useState<Marca[]>([
    { id: "1", nombre: "Honda", posicion: 1 },
    { id: "2", nombre: "Yamaha", posicion: 2 },
    // Aquí irían tus marcas reales
  ]);

  const handleAgregar = () => {
    // Implementar lógica para agregar
  };

  const handleEditar = (marca: Marca) => {
    // Implementar lógica para editar
  };

  const handleEliminar = (id: string) => {
    // Implementar lógica para eliminar
  };

  return (
    <ListaElementos
      elementos={marcas}
      titulo="Marcas"
      onAgregar={handleAgregar}
      onEditar={handleEditar}
      onEliminar={handleEliminar}
    />
  );
} 