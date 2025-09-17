import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormControl } from "@/components/ui/form";
import { useUnits, useUnitsByType } from "@/hooks/useUnits";

export interface UnitSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  filterByType?: string; // weight, volume, count
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function UnitSelector({
  value,
  onValueChange,
  placeholder = "Select unit",
  filterByType,
  required = false,
  disabled = false,
  className
}: UnitSelectorProps) {
  const { data: allUnits = [], isLoading, error } = useUnits();
  const { data: filteredUnits = [] } = useUnitsByType(filterByType || "");

  // Use filtered units if filterByType is provided, otherwise use all units
  const unitsToShow = filterByType ? filteredUnits : allUnits.filter((unit: any) => unit.isActive !== false);

  console.log("UnitSelector - Units to show:", unitsToShow);
  console.log("UnitSelector - Loading:", isLoading);
  console.log("UnitSelector - Error:", error);

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled || isLoading}
      required={required}
    >
      <FormControl>
        <SelectTrigger className={className}>
          <SelectValue placeholder={isLoading ? "Loading units..." : placeholder} />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {isLoading ? (
          <SelectItem value="loading" disabled>
            Loading units...
          </SelectItem>
        ) : error ? (
          <SelectItem value="error" disabled>
            Error loading units
          </SelectItem>
        ) : unitsToShow.length === 0 ? (
          <SelectItem value="none" disabled>
            {filterByType ? `No ${filterByType} units available` : "No units available"}
          </SelectItem>
        ) : (
          unitsToShow.map((unit: any) => (
            <SelectItem key={unit.id} value={unit.id.toString()}>
              {unit.name} ({unit.abbreviation})
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

export function UnitDisplay({ 
  unitId, 
  units, 
  showAbbreviation = true,
  fallbackText = "No unit"
}: {
  unitId?: number | string;
  units?: any[];
  showAbbreviation?: boolean;
  fallbackText?: string;
}) {
  const { data: allUnits = [] } = useUnits();
  const unitsToUse = units || allUnits;
  
  if (!unitId) {
    return <span className="text-gray-400">{fallbackText}</span>;
  }
  
  const unit = unitsToUse.find((u: any) => u.id.toString() === unitId.toString());
  
  if (!unit) {
    return <span className="text-gray-400">Unknown unit (ID: {unitId})</span>;
  }
  
  return (
    <span className="text-gray-600">
      {showAbbreviation ? (unit.abbreviation || unit.name) : unit.name}
    </span>
  );
}

export function UnitBadge({ 
  unitId, 
  units,
  className = ""
}: {
  unitId?: number | string;
  units?: any[];
  className?: string;
}) {
  const { data: allUnits = [] } = useUnits();
  const unitsToUse = units || allUnits;
  
  if (!unitId) return null;
  
  const unit = unitsToUse.find((u: any) => u.id.toString() === unitId.toString());
  
  if (!unit) return null;
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ${className}`}>
      {unit.abbreviation}
    </span>
  );
}