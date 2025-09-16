// src/hooks/useAuth.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { getQueryFn, apiRequest } from "@/lib/queryClient";

/**
 * Custom hook to manage authentication state
 */
export function useAuth() {
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery<User | null>({
    queryKey: ["auth", "user"],
    queryFn: getQueryFn<User | null>({ on401: "returnNull" }),
    retry: false,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
    } catch (err) {
      console.warn("Network error during logout (proceeding anyway):", err);
    } finally {
      queryClient.setQueryData(["auth", "user"], null);
      queryClient.removeQueries({ queryKey: ["auth", "user"] });
      window.location.href = "/login";
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
