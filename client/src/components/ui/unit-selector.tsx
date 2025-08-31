import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormControl } from "@/components/ui/form";
import { useUnits } from "@/hooks/useUnits";

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
  const { data: units = [], isLoading } = useUnits();

  const filteredUnits = filterByType 
    ? units.filter((unit: any) => unit.type === filterByType)
    : units;

  const activeUnits = filteredUnits.filter((unit: any) => unit.isActive !== false);

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled || isLoading}
      required={required}
    >
      <FormControl>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {isLoading ? (
          <SelectItem value="loading" disabled>
            Loading units...
          </SelectItem>
        ) : activeUnits.length === 0 ? (
          <SelectItem value="none" disabled>
            No units available
          </SelectItem>
        ) : (
          activeUnits.map((unit: any) => (
            <SelectItem key={unit.id} value={unit.id.toString()}>
              {unit.name} ({unit.abbreviation})
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

export function UnitDisplay({ unitId, units, showAbbreviation = true }: {
  unitId?: number | string;
  units?: any[];
  showAbbreviation?: boolean;
}) {
  const { data: allUnits = [] } = useUnits();
  const unitsToUse = units || allUnits;
  
  if (!unitId) return <span className="text-gray-400">No unit</span>;
  
  const unit = unitsToUse.find((u: any) => u.id.toString() === unitId.toString());
  
  if (!unit) return <span className="text-gray-400">Unknown unit</span>;
  
  return (
    <span className="text-gray-600">
      {showAbbreviation ? unit.abbreviation : unit.name}
    </span>
  );
}