import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 8 }: TableSkeletonProps) {
  return (
    <div className="space-y-4">
      {/* Skeleton de controles arriba de la tabla */}
      <div className="flex items-center justify-between p-4 bg-muted/50 gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-20" />
        </div>
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Skeleton de la tabla */}
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-full" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  {colIndex === 0 ? (
                    // Columna de marca/modelo (más grande)
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ) : colIndex === 1 ? (
                    // Columna de chasis
                    <Skeleton className="h-5 w-32" />
                  ) : colIndex === 5 ? (
                    // Columna de estado (badge)
                    <Skeleton className="h-6 w-20 rounded-full" />
                  ) : colIndex === 6 ? (
                    // Columna de precio (múltiples líneas)
                    <div className="flex flex-col gap-1 items-end">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  ) : colIndex === 7 ? (
                    // Columna de acciones (botones)
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                  ) : (
                    // Otras columnas normales
                    <Skeleton className="h-5 w-16" />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Skeleton de la paginación */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}
