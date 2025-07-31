
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export const useUnits = () => {
  return useQuery({
    queryKey: ["/api/units"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/units");
        console.log("Units API response in useUnits:", response);
        
        // Handle the consistent API response format
        if (response?.success && Array.isArray(response.data)) {
          console.log("Using response.data:", response.data);
          return response.data;
        }
        
        // Fallback for direct array response (backward compatibility)
        if (Array.isArray(response)) {
          console.log("Using direct array response:", response);
          return response;
        }

        console.warn("Unexpected units response format:", response);
        return [];
      } catch (error) {
        console.error("Failed to fetch units:", error);
        throw error;
      }
    },
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in memory for 10 minutes
  });
};

export const useActiveUnits = () => {
  const { data: units = [], ...rest } = useUnits();
  
  const activeUnits = Array.isArray(units) 
    ? units.filter((unit: any) => unit.isActive !== false)
    : [];
    
  return {
    data: activeUnits,
    ...rest
  };
};
