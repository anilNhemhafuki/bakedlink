// src/components/header.tsx
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation, Link } from "wouter";
import { useCompanyBranding } from "@/hooks/use-company-branding";
import { useToast } from "@/hooks/use-toast";

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
  UserCircle,
  Settings,
  Calendar,
  Bell,
  HelpCircle,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

// Sub-components
import ProfileEditor from "./profile-editor";
import NotificationDropdown from "./notification-dropdown";
import { InstallPrompt } from "./install-prompt";

interface HeaderProps {
  onMenuClick?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Header({
  onMenuClick,
  isCollapsed = false,
  onToggleCollapse,
}: HeaderProps) {
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
      "/": "Dashboard",
      "/products": "Products Management",
      "/inventory": "Inventory Management",
      "/stock": "Stock & Ingredients",
      "/orders": "Orders Management",
      "/production": "Production Planning",
      "/parties": "Parties Management",
      "/customers": "Customer Management",
      "/assets": "Assets Management",
      "/expenses": "Expenses & Income",
      "/reports": "Reports & Analytics",
      "/day-book": "Day Book",
      "/transactions": "Transactions",
      "/billing": "Billing & Subscription",
      "/settings": "System Settings",
      "/notifications": "Notifications",
      "/admin/users": "User Management",
      "/admin/login-logs": "Audit Logs",
      "/category-management": "Category Management",
      "/sales": "Sales Management",
      "/purchases": "Purchase Management",
      "/ingredients": "Ingredients",
      "/units": "Measuring Units",
      "/unit-conversion": "Unit Conversions",
      "/staff": "Staff Directory",
      "/attendance": "Attendance Management",
      "/salary": "Salary Management",
      "/leave-requests": "Leave Requests",
      "/recipes": "Recipe Management",
      "/branches": "Branch Management",
      "/label-printing": "Label Printing",
      "/purchase-returns": "Purchase Returns",
      "/sales-returns": "Sales Returns",
      "/security-logs": "Security Logs",
      "/system-config": "System Configuration",
      "/system-health": "System Health",
      "/database": "Database Manager",
      "/api-docs": "API Documentation",
      "/monitoring": "System Monitoring",
      "/performance": "Performance Metrics",
      "/expire-products": "Expired Products",
      "/landing": "Landing Page",
      "/not-found": "Page Not Found",
      "/login-logs": "Login Logs", // if you have a direct route
      "/api-docs": "API Documentation",
      "/expire-products": "Expired Products",
      "/landing": "Landing Page",
      "/not-found": "Page Not Found",
      "/login-logs": "Login Logs", // if you have a direct route
    };

    return pathTitles[location] || "Dashboard";
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 py-3.5 shadow-sm flex-shrink-0">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden hover:bg-gray-100 transition-all duration-200 hover:scale-105 text-gray-700"
            data-testid="button-mobile-menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Desktop Sidebar Collapse/Expand Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="hidden lg:flex hover:bg-gray-100 transition-all duration-200 hover:scale-105 text-gray-700"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            data-testid="button-toggle-sidebar-desktop"
          >
            {isCollapsed ? (
              <Menu className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getPageTitle()}
            </h1>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Date Display */}
          <div className="hidden lg:block">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg">
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

          {/* Help / Info */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <HelpCircle className="h-5 w-5 " />
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

          {/* Enhanced User Profile Dropdown */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center p-2 hover:bg-gray-100 rounded-full transition-all"
                >
                  <div className="w-8 h-8  rounded-full flex items-center justify-center">
                    {user?.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt="Profile"
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <UserCircle className="h-5 w-5 text-primary-foreground" />
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-80 bg-white backdrop-blur-md border border-gray-200/50 shadow-2xl"
              >
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                      {user?.profileImageUrl ? (
                        <img
                          src={user.profileImageUrl}
                          alt="Profile"
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                      ) : (
                        <UserCircle className="h-6 w-6 text-primary-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {user?.firstName
                          ? `${user.firstName} ${user.lastName || ""}`.trim()
                          : user?.email || "User"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${
                        user?.role === "super_admin"
                          ? "bg-purple-100 text-purple-800"
                          : user?.role === "admin"
                            ? "bg-blue-100 text-blue-800"
                            : user?.role === "manager"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 bg-current rounded-full mr-1.5 animate-pulse"></span>
                      {user?.role === "super_admin"
                        ? "Super Admin"
                        : user?.role === "admin"
                          ? "Administrator"
                          : user?.role === "manager"
                            ? "Manager"
                            : user?.role === "supervisor"
                              ? "Supervisor"
                              : user?.role === "marketer"
                                ? "Marketer"
                                : "Staff"}
                    </span>
                    <div className="text-xs text-gray-400">Online</div>
                  </div>
                </div>

                {/* Profile Editor */}
                <div className="p-2">
                  <ProfileEditor user={user} />
                </div>

                <DropdownMenuItem asChild>
                  <Link
                    href="/settings"
                    className="flex items-center w-full px-3 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="mr-3 h-4 w-4 text-gray-500" />
                    <span className="text-sm">Settings</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1" />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 cursor-pointer px-3 py-2 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span className="text-sm">Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
