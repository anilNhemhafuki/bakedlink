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
                {/* <span className="hidden lg:inline ml-2">
                  {language === "en" ? "English" : "नेपाली"}
                </span> */}
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
          <NotificationDropdown />

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
