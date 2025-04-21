// Definición del tipo Motorcycle (antigua, para referencia histórica)
// En nuevas partes del código usar el modelo Motorcycle de @prisma/client
export type Motorcycle = {
  id: string;
  marca: string;
  modelo: string;
  año: number;
  precio: number;
  cilindrada: number;
  tipo: "Sport" | "Naked" | "Adventure" | "Cruiser" | "Scooter" | "Street" | "Touring";
  color: string;
  kilometraje: number;
  estado: "Nuevo" | "Usado";
  transmision: "Manual" | "Automática";
  disponibilidad: boolean;
  ubicacion: string;
  imagenUrl: string;
  estadoVenta: string; // Este campo debe usar valores de MotorcycleState
};

// Exportar solamente MotorcycleState desde Prisma como fuente única de verdad
export { MotorcycleState } from '@prisma/client';
