// src/components/header.tsx
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation, Link } from "wouter";
import { useCompanyBranding } from "@/hooks/use-company-branding";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

// UI Components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// Icons
import {
  Menu,
  Globe,
  LogOut,
  User,
  Settings,
  Calendar,
  Bell,
  HelpCircle,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

// Sub-components
import ProfileEditor from "./profile-editor";
import NotificationDropdown from "./notification-dropdown";

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

  const { theme, setTheme } = useTheme(); // ← Moved outside inner function

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
    <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700/60 px-4 py-3.5 shadow-sm flex-shrink-0">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-105"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {getPageTitle()}
            </h1>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Date Display */}
          <div className="hidden lg:block">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
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
                <Globe className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLanguage("en")}>
                🇺🇸 <span className="ml-1">English</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("ne")}>
                🇳🇵 <span className="ml-1">नेपाली</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <NotificationDropdown />

          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                {theme === "light" && (
                  <Sun className="h-5 w-5 text-yellow-600" />
                )}
                {theme === "dark" && <Moon className="h-5 w-5 text-blue-400" />}
                {theme === "system" && (
                  <Monitor className="h-5 w-5 text-gray-700" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2 h-4 w-4" />
                Light Mode
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2 h-4 w-4" />
                Dark Mode
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Monitor className="mr-2 h-4 w-4" />
                System Preference
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Help / Info */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <HelpCircle className="h-5 w-5 text-gray-700 dark:text-gray-300" />
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

          {/* User Profile or Actions */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium hidden md:inline text-gray-700 dark:text-gray-200">
                    {user.firstName || user.email?.split("@")[0]}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Settings className="mr-3 h-4 w-4 text-gray-500" />

                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
