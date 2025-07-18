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
  });

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout fails on server, clear local state
      queryClient.setQueryData(["/api/auth/user"], null);
    }
  };

  return {
    user: data,
    isLoading,
    isAuthenticated: !!data,
    error,
    refetch,
    logout,
  };
}