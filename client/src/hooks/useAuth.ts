// src/hooks/useAuth.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { getQueryFn, apiRequest } from "@/lib/queryClient";

/**
 * Custom hook to manage authentication state
 */
export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60,    // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,  // Don't refetch on every mount
    refetchInterval: false, // Disable automatic polling
  });

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
    } catch (err) {
      console.warn("Network error during logout (proceeding anyway):", err);
    } finally {
      // Clear auth state
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });

      // Optionally redirect or refresh
      window.location.href = "/login"; // preferred over reload for SPA
    }
  };


  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    refetch,
    logout,
  };
}