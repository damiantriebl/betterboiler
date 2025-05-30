interface DisplayDataProps {
  label: string;
  value: string | number | string[] | null | undefined;
  className?: string;
  variant?: "flex" | "grid";
}
export function DisplayData({ label, value, className = "", variant = "flex" }: DisplayDataProps) {
  const displayValue =
    value === null ||
    value === undefined ||
    (Array.isArray(value) && value.length === 0) ||
    value === "" ? (
      <span className="text-muted-foreground italic">N/A</span>
    ) : Array.isArray(value) ? (
      value.join(", ")
    ) : (
      value
    );
  const baseClasses = "py-1 border-b border-dashed last:border-b-0";
  const variantClasses =
    variant === "grid" ? "grid grid-cols-3 gap-2" : "flex gap-2 items-baseline";
  const labelClasses =
    variant === "grid" ? "font-medium text-sm col-span-1" : "font-medium text-sm w-1/3 flex-none";
  const valueClasses = variant === "grid" ? "text-sm col-span-2" : "text-sm flex-grow";
  return (
    <div className={`${baseClasses} ${variantClasses} ${className}`}>
      {" "}
      <span className={labelClasses}>{label}:</span>{" "}
      <span className={valueClasses}>{displayValue}</span>{" "}
    </div>
  );
}
