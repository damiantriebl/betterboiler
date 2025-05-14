import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings } from "lucide-react";

// Usar los tipos manuales definidos en MotorcycleTable
type ManualColumnId =
  | "brandModel"
  | "chassisId"
  | "year"
  | "displacement"
  | "branch"
  | "state"
  | "price"
  | "actions";

interface ManualColumnDefinition {
  id: ManualColumnId;
  label: string;
  // No necesita defaultVisible aquí
}

interface ColumnSelectorProps {
  columns: ManualColumnDefinition[]; // Aceptar el tipo manual
  visibleColumns: ManualColumnId[]; // Usar el ID manual
  onColumnToggle: (columnId: ManualColumnId) => void; // Usar el ID manual
}

export function ColumnSelector({ columns, visibleColumns, onColumnToggle }: ColumnSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto h-8">
          <Settings className="h-4 w-4 mr-2" />
          Columnas
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={visibleColumns.includes(column.id)}
            onCheckedChange={() => onColumnToggle(column.id)}
            disabled={column.id === "actions"} // Mantener acciones siempre visible
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
