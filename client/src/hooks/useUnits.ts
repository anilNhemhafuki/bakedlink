import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface Unit {
  id: number;
  name: string;
  abbreviation: string;
  type: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const useUnits = () => {
  return useQuery({
    queryKey: ["units"],
    queryFn: async (): Promise<Unit[]> => {
      try {
        console.log("Fetching units from API...");
        const response = await apiRequest("GET", "/api/units");
        console.log("Units API response:", response);

        // Handle different response formats
        if (response?.success && response?.data) {
          console.log("Using response.data:", response.data);
          return Array.isArray(response.data) ? response.data : [];
        }

        if (response?.data) {
          console.log("Using response.data (fallback):", response.data);
          return Array.isArray(response.data) ? response.data : [];
        }

        // If response is directly an array
        if (Array.isArray(response)) {
          console.log("Response is direct array:", response);
          return response;
        }

        console.warn("Unexpected units response format:", response);
        return [];
      } catch (error) {
        console.error("Error fetching units:", error);
        if (isUnauthorizedError(error)) {
          throw error; // Re-throw auth errors for proper handling
        }
        
        // Return fallback units for offline mode
        console.log("Using fallback units due to error");
        return [
          { id: 1, name: "Kilogram", abbreviation: "kg", type: "weight", isActive: true },
          { id: 2, name: "Gram", abbreviation: "g", type: "weight", isActive: true },
          { id: 3, name: "Liter", abbreviation: "L", type: "volume", isActive: true },
          { id: 4, name: "Milliliter", abbreviation: "ml", type: "volume", isActive: true },
          { id: 5, name: "Piece", abbreviation: "pcs", type: "count", isActive: true },
          { id: 6, name: "Box", abbreviation: "box", type: "count", isActive: true },
          { id: 7, name: "Bag", abbreviation: "bag", type: "count", isActive: true },
          { id: 8, name: "Packet", abbreviation: "pkt", type: "count", isActive: true }
        ];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Ensure we always have a fallback
    placeholderData: [],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        return false; // Don't retry auth errors
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Active units filter hook
export const useActiveUnits = () => {
  const { data: units = [], ...rest } = useUnits();

  // Ensure units is always an array before filtering
  const safeUnits = Array.isArray(units) ? units : [];
  const activeUnits = safeUnits.filter((unit: Unit) => unit.isActive !== false);

  return {
    data: activeUnits,
    ...rest,
  };
};

// Get unit by ID helper
export const useUnitById = (unitId: number | string | undefined) => {
  const { data: units = [] } = useUnits();
  
  if (!unitId) return null;
  
  return units.find((unit: Unit) => 
    unit.id.toString() === unitId.toString()
  ) || null;
};

// Get units by type helper
export const useUnitsByType = (type: string) => {
  const { data: units = [], ...rest } = useUnits();
  
  const filteredUnits = units.filter((unit: Unit) => 
    unit.type === type && unit.isActive !== false
  );
  
  return {
    data: filteredUnits,
    ...rest,
  };
};