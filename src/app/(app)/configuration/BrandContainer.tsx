// src/app/(app)/configuracion/BrandContainer.tsx
import type React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";

// --- Props con edición inline para Renombrar/Duplicar ---
interface BrandContainerProps {
  id: number; // ID de OrganizationBrand
  children: React.ReactNode;
  brandName: string; // Nombre actual (para mostrar y comparar)
  brandColor: string;
  onDelete?: () => void;
  renderColorButton: () => React.ReactNode;
  dragAttributes: Record<string, unknown>;
  dragListeners: DraggableSyntheticListeners;
  // Añadir props para renombrado/duplicado
  isRenamingDuplicate: boolean;
  newNameDuplicate: string;
  onNameClick: () => void; // Para iniciar el modo de edición
  onRenameDuplicateNameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRenameDuplicateKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onRenameDuplicateBlur: () => void;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  isPending?: boolean;
  isDragging?: boolean;
}

export default function BrandContainer({
  id,
  children,
  brandName,
  brandColor,
  onDelete,
  renderColorButton,
  dragAttributes,
  dragListeners,
  isRenamingDuplicate,
  newNameDuplicate,
  onNameClick,
  onRenameDuplicateNameChange,
  onRenameDuplicateKeyDown,
  onRenameDuplicateBlur,
  renameInputRef,
  isPending,
  isDragging,
}: BrandContainerProps) {
  return (
    <Card className="w-full flex flex-col border-l-4" style={{ borderLeftColor: brandColor }}>
      <CardHeader className="flex flex-row items-center justify-between p-3 bg-muted/30 rounded-t-lg border-b">
        <div className="flex items-center gap-2 flex-grow min-w-0">
          {/* Botón para Drag */}
          <Button
            variant="ghost"
            size="icon"
            className="cursor-grab h-7 w-7"
            {...dragAttributes}
            {...dragListeners}
            aria-label="Mover marca"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </Button>
          {/* Nombre de la marca (Clickeable para Renombrar/Duplicar) */}
          <div className="flex-grow min-w-0 flex items-center flex-row gap-3">
            {isRenamingDuplicate ? (
              <Input
                ref={renameInputRef}
                value={newNameDuplicate}
                onChange={onRenameDuplicateNameChange}
                onKeyDown={onRenameDuplicateKeyDown}
                onBlur={onRenameDuplicateBlur}
                className="h-8 text-sm font-semibold bg-background"
                autoFocus
                aria-label={`Nuevo nombre para reemplazar ${brandName}`}
              />
            ) : (
              <CardTitle
                className="text-base font-semibold truncate cursor-pointer hover:text-primary"
                onClick={onNameClick} // Llamar a handler para iniciar renombrado/duplicado
                title={`Reemplazar marca ${brandName} (requiere nuevo nombre)`}
              >
                {brandName}
              </CardTitle>
            )}
            {renderColorButton()}
          </div>
        </div>

        {/* Controles (Color, Borrar - Botón duplicado se quitó) */}
        <div className="flex items-center gap-1 ml-auto">
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-7 w-7 text-destructive"
              aria-label="Eliminar asociación de marca"
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3 flex-grow">{children}</CardContent>
    </Card>
  );
}
