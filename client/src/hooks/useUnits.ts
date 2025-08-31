// src/hooks/useUnits.ts

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export const useUnits = () => {
  return useQuery({
    queryKey: ["units"], // Consistent key for better cache management
    queryFn: async () => {
      try {
        const rawResponse = await apiRequest("GET", "/api/units");
        console.log("[useUnits] Raw API Response:", rawResponse);

        // Case 1: Already an array (most likely if apiRequest returns .data)
        if (Array.isArray(rawResponse)) {
          console.log("[useUnits] Using direct array:", rawResponse);
          return rawResponse;
        }

        // Case 2: Standard format { success: true, data: [...] }
        if (rawResponse?.success === true && Array.isArray(rawResponse.data)) {
          console.log("[useUnits] Using response.data:", rawResponse.data);
          return rawResponse.data;
        }

        // Case 3: { units: [...] }
        if (rawResponse && Array.isArray(rawResponse.units)) {
          console.log("[useUnits] Using response.units:", rawResponse.units);
          return rawResponse.units;
        }

        // Case 4: { data: { units: [...] } }
        if (rawResponse?.data?.units && Array.isArray(rawResponse.data.units)) {
          console.log(
            "[useUnits] Using response.data.units:",
            rawResponse.data.units,
          );
          return rawResponse.data.units;
        }

        // Unexpected format - always return empty array as fallback
        console.warn(
          "[useUnits] Unexpected response format, returning empty array:",
          rawResponse,
        );
        return [];
      } catch (error) {
        console.error("[useUnits] Failed to fetch units:", error);
        // Return empty array on error instead of throwing
        return [];
      }
    },
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false, // Optional: disable auto-refetch on tab focus
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