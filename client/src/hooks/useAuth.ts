// src/hooks/useAuth.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { getQueryFn, apiRequest } from "@/lib/queryClient";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch (err) {
      console.warn("Network error during logout (proceeding anyway):", err);
    } finally {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      window.location.reload();
    }
  };

  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.log("[useAuth] State:", {
      user: data,
      isLoading,
      isAuthenticated: !!data,
    });
  }

  return {
    user: data,
    isLoading,
    isAuthenticated: !!data,
    error,
    refetch,
    logout,
  };
}
