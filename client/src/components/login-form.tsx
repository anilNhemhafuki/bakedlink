import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCompanyBranding } from "@/hooks/use-company-branding";
import LoginFooter from "@/components/login-footer";
import Client_Logo from "@/public/image/bakedLink_2.png";
import { Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
  onSuccess: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { branding } = useCompanyBranding();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/login", loginData);
      console.log("Login response:", response);

      if (response && response.user) {
        toast({
          title: "Success",
          description: "Logged in successfully",
        });
        // Invalidate auth query to trigger re-fetch
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        // Give a moment for the query to refetch
        setTimeout(() => {
          onSuccess();
        }, 200);
      } else {
        throw new Error("No user data received");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: error?.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 transition-all duration-300">
      <div className="w-full max-w-md space-y-8">
        <Card className="transition-all duration-300 hover:shadow-lg bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <div className="flex items-center justify-center w-30 h-30 rounded-xl mx-auto">
              <img
                src={Client_Logo}
                alt="Mero BakerSoft Logo"
                className="h-30 w-30 object-contain rounded"
                loading="lazy"
              />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Professional Bakery Management System
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) =>
                    setLoginData({ ...loginData, email: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 hover:scale-105 active:scale-95"
                disabled={isLoading}
                style={{ backgroundColor: branding.themeColor }}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <LoginFooter />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
