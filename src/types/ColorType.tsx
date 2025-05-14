export type ColorType = "SOLIDO" | "BITONO" | "PATRON";

export interface ColorConfig {
  id: string; // ID de string usado internamente (quizás para dnd-kit)
  dbId?: number; // <-- AÑADIR ID numérico opcional de la BD
  name: string;
  type: ColorType;
  colorOne?: string;
  colorTwo?: string;
  order?: number; // ¿Es opcional aquí?
  isGlobal?: boolean; // Indica si es un color global predefinido
}
