// src/hooks/useUnits.ts

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export const useUnits = () => {
  return useQuery({
    queryKey: ["units"],
    queryFn: async () => {
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
        // Return empty array for other errors to prevent crashes
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Ensure we always have a fallback
    placeholderData: [],
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Optional: Active units filter
export const useActiveUnits = () => {
  const { data: units = [], ...rest } = useUnits();

  // Ensure units is always an array before filtering
  const safeUnits = Array.isArray(units) ? units : [];
  const activeUnits = safeUnits.filter((unit) => unit.isActive !== false);

  return {
    data: activeUnits,
    ...rest,
  };
};