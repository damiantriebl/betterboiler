export type ColorType = 'SOLIDO' | 'BITONO' | 'PATRON';

export interface ColorConfig {
    id: string; // ID de string usado internamente (quizás para dnd-kit)
    dbId?: number; // <-- AÑADIR ID numérico opcional de la BD
    nombre: string;
    tipo: ColorType;
    color1?: string; // Valor Hex para el primer color (o único color)
    color2?: string; // Valor Hex para el segundo color (en bitono)
    order?: number; // ¿Es opcional aquí?
} 