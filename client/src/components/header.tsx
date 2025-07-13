import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation, Link } from "wouter";
import { useCompanyBranding } from "@/hooks/use-company-branding";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  Globe,
  LogOut,
  User,
  Settings,
  Calendar,
  Bell,
  HelpCircle,
} from "lucide-react";
import ProfileEditor from "./profile-editor";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { branding } = useCompanyBranding();
  const { t, language, setLanguage } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      toast({
        title: "Search",
        description: `Searching for: ${searchQuery}`,
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPageTitle = () => {
    const pathTitles: Record<string, string> = {
      "/": t("dashboard"),
      "/products": t("products"),
      "/inventory": t("inventory"),
      "/stock": t("stock"),
      "/orders": t("orders"),
      "/production": t("production"),
      "/parties": t("parties"),
      "/customers": t("customers"),
      "/assets": t("assets"),
      "/expenses": t("expenses"),
      "/reports": t("reports"),
      "/day-book": t("dayBook"),
      "/transactions": t("transactions"),
      "/billing": t("billing"),
      "/settings": t("settings"),
      "/notifications": t("notifications"),
      "/admin/users": t("userManagement"),
      "/admin/login-logs": t("loginLogs"),
      "/category-management": t("categoryManagement"),
      "/sales": t("sales"),
      "/purchases": t("purchases"),
      "/ingredients": t("ingredients"),
      "/units": t("units"),
      "/unit-conversion": t("unitConversions"),
    };

    return pathTitles[location] || t("dashboard");
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-200/60 px-4 py-3.5 shadow-sm flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden hover:bg-gray-100 transition-all duration-200 hover:scale-105"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getPageTitle()}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Page title and date */}
          <div className="hidden lg:block">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  {getCurrentDate()}
                </span>
              </div>
            </div>
          </div>

          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <Globe className="h-5 w-5" />
                <span className="hidden lg:inline ml-2">
                  {language === "en" ? "English" : "नेपाली"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLanguage("en")}>
                <span className="mr-2">🇺🇸</span> English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("ne")}>
                <span className="mr-2">🇳🇵</span> नेपाली
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative p-2">
                <Bell className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  3
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <DropdownMenuItem className="p-4 flex flex-col items-start">
                  <div className="flex items-center w-full">
                    <div className="h-2 w-2 bg-red-500 rounded-full mr-2"></div>
                    <span className="font-medium">Low Stock Alert</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      2 min ago
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Flour inventory is running low (5kg remaining)
                  </p>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-4 flex flex-col items-start">
                  <div className="flex items-center w-full">
                    <div className="h-2 w-2 bg-blue-500 rounded-full mr-2"></div>
                    <span className="font-medium">New Order</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      1 hour ago
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Order #1234 received from John Doe
                  </p>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-4 flex flex-col items-start">
                  <div className="flex items-center w-full">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="font-medium">Production Complete</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      3 hours ago
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Chocolate cake batch completed successfully
                  </p>
                </DropdownMenuItem>
              </div>
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={() => (window.location.href = "/notifications")}
                >
                  View All Notifications
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Info Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <HelpCircle className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <span className="mr-2">📚</span> Support Guide
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span className="mr-2">✨</span> What's New?
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span className="mr-2">⌨️</span> Keyboard Shortcuts
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span className="mr-2">💬</span> Give Feedback
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span className="mr-2">📧</span> Send us a message
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
