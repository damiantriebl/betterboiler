export type Motorcycle = {
    id: string;
    marca: string;
    modelo: string;
    año: number;
    precio: number;
    cilindrada: number;
    tipo: 'Sport' | 'Naked' | 'Adventure' | 'Cruiser' | 'Scooter' | 'Street' | 'Touring';
    color: string;
    kilometraje: number;
    estado: 'Nuevo' | 'Usado';
    transmision: 'Manual' | 'Automática';
    disponibilidad: boolean;
    ubicacion: string;
    imagenUrl: string;
    estadoVenta: EstadoVenta;
}

export enum EstadoVenta {
    STOCK = "STOCK",
    VENDIDO = "VENDIDO",
    PAUSADO = "PAUSADO",
    RESERVADO = "RESERVADO",
    PROCESANDO = "PROCESANDO",
    ELIMINADO = "ELIMINADO"
} 