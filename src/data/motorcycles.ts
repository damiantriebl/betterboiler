import { Motorcycle, EstadoVenta } from "@/types/BikesType";

export const marcas = [
  "Honda",
  "Yamaha",
  "Kawasaki",
  "Suzuki",
  "BMW",
  "KTM",
  "Ducati",
  "Benelli",
  "Royal Enfield",
  "Bajaj",
] as const;
export const tipos = [
  "Sport",
  "Naked",
  "Adventure",
  "Cruiser",
  "Scooter",
  "Street",
  "Touring",
] as const;
export const colores = [
  "Negro",
  "Rojo",
  "Azul",
  "Blanco",
  "Gris",
  "Verde",
  "Amarillo",
  "Naranja",
] as const;
export const ubicaciones = [
  "Buenos Aires",
  "Córdoba",
  "Rosario",
  "Mendoza",
  "La Plata",
  "Mar del Plata",
  "San Miguel de Tucumán",
] as const;
export const estadosVenta = Object.values(EstadoVenta);

const modelos = {
  Honda: ["CB 190R", "XR 150L", "CRF 250L", "CB 300R", "CBR 650R", "Africa Twin", "CB 1000R"],
  Yamaha: ["FZ 25", "MT-03", "MT-07", "YZF R3", "Tracer 900 GT", "XTZ 250", "YBR 125"],
  Kawasaki: ["Ninja 400", "Z400", "Versys 650", "Z900", "Ninja 1000SX", "Vulcan S"],
  Suzuki: ["Gixxer 250", "V-Strom 650", "GSX-R750", "Burgman 200", "GSX-S750"],
  BMW: ["G 310 R", "F 750 GS", "R 1250 GS", "S 1000 RR", "F 900 XR"],
  KTM: ["Duke 200", "Duke 390", "390 Adventure", "790 Duke", "1290 Super Duke"],
  Ducati: ["Monster 797", "Panigale V2", "Multistrada 950", "Scrambler Icon"],
  Benelli: ["TNT 300", "Leoncino 500", "TRK 502", "Imperiale 400"],
  "Royal Enfield": ["Classic 350", "Himalayan", "Continental GT 650", "Meteor 350"],
  Bajaj: ["Dominar 400", "Rouser NS 200", "Rouser RS 200"],
} as const;

// Función determinista para generar un número basado en índices
const getNumberFromIndices = (i: number, j: number, k: number, base: number) => {
  return base + ((i * 100 + j * 10 + k) % 1000);
};

// Función determinista para seleccionar un elemento de un array
const selectFromArray = <T>(arr: readonly T[], index: number): T => {
  return arr[index % arr.length];
};

// Función para determinar el estado de venta basado en índices
const getEstadoVenta = (brandIndex: number, modelIndex: number, yearIndex: number): EstadoVenta => {
  // Usamos una fórmula diferente para mejor distribución
  const value = (brandIndex * 13 + modelIndex * 17 + yearIndex * 23) % 20;

  // Distribuimos en rangos de 20:
  // 8/20 = 40% stock
  // 4/20 = 20% vendido
  // 3/20 = 15% pausado
  // 3/20 = 15% reservado
  // 2/20 = 10% procesando
  if (value < 8) return EstadoVenta.STOCK;
  if (value < 12) return EstadoVenta.VENDIDO;
  if (value < 15) return EstadoVenta.PAUSADO;
  if (value < 18) return EstadoVenta.RESERVADO;
  return EstadoVenta.PROCESANDO;
};

export const motorcycles: Motorcycle[] = [];

let id = 1;
Object.entries(modelos).forEach(([marca, modelosList], brandIndex) => {
  modelosList.forEach((modelo, modelIndex) => {
    const años = [2021, 2022, 2023, 2024];
    años.forEach((año, yearIndex) => {
      const cilindrada = parseInt(modelo.match(/\d+/)?.[0] || "250");
      const precio =
        cilindrada * 15000 + getNumberFromIndices(brandIndex, modelIndex, yearIndex, 500000);
      const kilometraje =
        año === 2024 ? 0 : getNumberFromIndices(brandIndex, modelIndex, yearIndex, 1000);

      motorcycles.push({
        id: id.toString(),
        marca,
        modelo,
        año,
        precio: Math.round(precio),
        cilindrada,
        tipo: selectFromArray(tipos, (brandIndex + modelIndex + yearIndex) % tipos.length),
        color: selectFromArray(colores, (brandIndex + modelIndex) % colores.length),
        kilometraje,
        estado: año === 2024 ? "Nuevo" : "Usado",
        transmision: modelIndex % 5 === 0 ? "Automática" : "Manual",
        disponibilidad: (brandIndex + modelIndex + yearIndex) % 10 !== 0,
        ubicacion: selectFromArray(ubicaciones, (brandIndex + yearIndex) % ubicaciones.length),
        imagenUrl: `/motos/${marca.toLowerCase()}-${modelo.toLowerCase().replace(/\s+/g, "-")}.jpg`,
        estadoVenta: getEstadoVenta(brandIndex, modelIndex, yearIndex),
      });
      id++;
    });
  });
});
