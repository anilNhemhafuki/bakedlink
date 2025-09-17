
import React, { createContext, useContext, ReactNode } from 'react';
import { useUnits } from '@/hooks/useUnits';

interface Unit {
  id: number;
  name: string;
  abbreviation: string;
  type: string;
  isActive: boolean;
}

interface UnitsContextType {
  units: Unit[];
  isLoading: boolean;
  error: any;
  getUnitById: (id: number | string) => Unit | undefined;
  getUnitsByType: (type: string) => Unit[];
  getActiveUnits: () => Unit[];
}

const UnitsContext = createContext<UnitsContextType | undefined>(undefined);

interface UnitsProviderProps {
  children: ReactNode;
}

export function UnitsProvider({ children }: UnitsProviderProps) {
  const { data: units = [], isLoading, error } = useUnits();

  const getUnitById = (id: number | string): Unit | undefined => {
    return units.find((unit: Unit) => unit.id.toString() === id.toString());
  };

  const getUnitsByType = (type: string): Unit[] => {
    return units.filter((unit: Unit) => unit.type === type && unit.isActive);
  };

  const getActiveUnits = (): Unit[] => {
    return units.filter((unit: Unit) => unit.isActive);
  };

  const value: UnitsContextType = {
    units,
    isLoading,
    error,
    getUnitById,
    getUnitsByType,
    getActiveUnits,
  };

  return (
    <UnitsContext.Provider value={value}>
      {children}
    </UnitsContext.Provider>
  );
}

export function useUnitsContext(): UnitsContextType {
  const context = useContext(UnitsContext);
  if (context === undefined) {
    throw new Error('useUnitsContext must be used within a UnitsProvider');
  }
  return context;
}

// Helper hook for easy access to formatted unit display
export function useUnitDisplay() {
  const { getUnitById } = useUnitsContext();
  
  const formatUnitDisplay = (unitId?: number | string, showAbbreviation = true): string => {
    if (!unitId) return 'No unit';
    
    const unit = getUnitById(unitId);
    if (!unit) return `Unknown unit (${unitId})`;
    
    return showAbbreviation ? unit.abbreviation : unit.name;
  };

  return { formatUnitDisplay, getUnitById };
}
