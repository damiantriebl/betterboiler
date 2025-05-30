import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportFiltersProps {
  branchId: string;
  brandId: string;
  onBranchChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onClearFilters: () => void;
  branches?: Array<{ id: number; name: string }>;
  brands?: Array<{ id: number; name: string }>;
  isLoadingBranches?: boolean;
}

export function ReportFilters({
  branchId,
  brandId,
  onBranchChange,
  onBrandChange,
  onClearFilters,
  branches = [],
  brands = [],
  isLoadingBranches = false,
}: ReportFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <Select value={branchId} onValueChange={onBranchChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Sucursal" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id.toString()}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={brandId} onValueChange={onBrandChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Marca" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {brands.map((brand) => (
            <SelectItem key={brand.id} value={brand.id.toString()}>
              {brand.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button onClick={onClearFilters}>Limpiar Filtros</Button>
    </div>
  );
}
