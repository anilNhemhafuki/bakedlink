import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyBranding } from "@/hooks/use-company-branding";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown, ChevronRight, Settings, User, LogOut } from "lucide-react";
import { Receipt } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import ProfileEditor from "./profile-editor";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isOpen = true, onToggle }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { branding } = useCompanyBranding();
  const { canAccessSidebarItem } = useRoleAccess();
  const { toast } = useToast();
  const [openSections, setOpenSections] = useState<string[]>([
    "core",
    "Finance",
  ]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section],
    );
  };

  const navigationSections = [
    {
      id: "core",
      items: [
        { name: "Dashboard", href: "/", resource: "dashboard" },
        {
          name: "Notifications",
          href: "/notifications",
          resource: "notifications",
        },
      ],
    },

    {
      id: "Finance",
      title: "Finance",
      items: [
        {
          name: "Day Book",
          href: "/day-book",
          icon: "fas fa-shopping-cart",
          resource: "sales",
        },
        {
          name: "Transactions",
          href: "/transactions",
          icon: "fas fa-exchange-alt",
          resource: "sales",
        },
        {
          name: "Orders",
          href: "/orders",
          icon: "fas fa-shopping-cart",
          resource: "orders",
        },
        {
          name: "Sales",
          href: "/sales",
          icon: "fas fa-cash-register",
          resource: "sales",
        },
        {
          name: "Purchases",
          href: "/purchases",
          icon: "fas fa-shopping-bag",
          resource: "purchases",
        },
        {
          name: "Income & Expenses",
          href: "/expenses",
          icon: "fas fa-receipt",
          resource: "expenses",
        },
      ],
    },

    {
      id: "Stock",
      title: "Stock",
      items: [
        {
          name: "Products",
          href: "/products",
          icon: "fas fa-cookie-bite",
          resource: "products",
        },
        {
          name: "Stock",
          href: "/stock",
          icon: "fas fa-boxes",
          resource: "inventory",
        },
        {
          name: "Production",
          href: "/production",
          icon: "fas fa-industry",
          resource: "production",
        },
        {
          name: "Ingredients",
          href: "/ingredients",
          icon: "fas fa-seedling",
          resource: "inventory",
        },
      ],
    },

    {
      id: "management",
      title: "Management",
      items: [
        {
          name: "Customers",
          href: "/customers",
          icon: "fas fa-users",
          resource: "customers",
        },
        {
          name: "Parties",
          href: "/parties",
          icon: "fas fa-handshake",
          resource: "parties",
        },
        {
          name: "Assets",
          href: "/assets",
          icon: "fas fa-building",
          resource: "assets",
        },
      ],
    },
    {
      id: "reports",
      title: "Reports & Analytics",
      items: [
        {
          name: "Reports",
          href: "/reports",
          icon: "fas fa-chart-bar",
          resource: "reports",
        },
        {
          name: "Billing & Subscription",
          href: "/billing",
          icon: "fas fa-file-invoice-dollar",
          resource: "billing",
        },
      ],
    },
    {
      id: "administration",
      title: "Administration",
      items: [
        {
          name: "User Management",
          href: "/users",
          icon: "fas fa-users-cog text-base",
          resource: "users",
        },
        {
          name: "Login Logs",
          href: "/login-logs",
          icon: "fas fa-shield-alt text-base",
          resource: "users",
        },
        {
          name: "Category Management",
          href: "/categories",
          icon: "fas fa-tags text-base",
          resource: "settings",
        },
        {
          name: "Measuring Units",
          href: "/units",
          icon: "fas fa-ruler text-base",
          resource: "settings",
        },
        {
          name: "Unit Conversion",
          href: "/unit-conversion",
          icon: "fas fa-exchange-alt text-base",
          resource: "settings",
        },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-10 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`h-screen flex flex-col
          fixed inset-y-0 left-0 z-50 
          w-64 bg-white/95 backdrop-blur-md
          shadow-xl border-r border-gray-200/60
          flex-shrink-0
          transform transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0 opacity-100" : "-translate-x-full lg:translate-x-0 opacity-95 lg:opacity-100"}
          before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/0 before:to-transparent before:opacity-0 
          before:transition-opacity before:duration-300 hover:before:opacity-0
        `}
      >
        {/* Dynamic Company Header */}
        <div className="px-4 lg:px-6 py-2 flex-shrink-0  relative overflow-hidden border-b border-gray-200">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-50"></div>
          <Link
            href="/"
            className="flex items-center space-x-4 group relative z-10"
          >
            <div
              className="w-14 h-14 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center 
                          shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 
                          group-hover:shadow-xl group-hover:bg-white/20 relative overflow-hidden
                          before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent
                          before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-300"
            >
              {branding.companyLogo ? (
                <img
                  src={branding.companyLogo}
                  alt="Company Logo"
                  className="w-8 h-8 object-contain transition-transform duration-300 group-hover:scale-110"
                />
              ) : (
                <i className="fas fa-bread-slice text-orange-500 text-2xl transition-all duration-300 group-hover:text-orange-700"></i>
              )}
            </div>
            <div className="text-orange-500 transition-all duration-300 group-hover:translate-x-1">
              <h1 className="text-xl font-bold tracking-tight group-hover:text-orange-700 transition-colors duration-300">
                {branding.companyName}
              </h1>
            </div>
          </Link>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-4 py-4 space-y-2">
              <nav className="space-y-1">
                {/* Render top-level items directly without Collapsible */}
                {navigationSections
                  .filter(
                    (section) => section.id === "core", // Add other top-level sections here if needed
                  )
                  .flatMap((section) =>
                    section.items
                      .filter((item) =>
                        canAccessSidebarItem(item.resource, "read"),
                      )
                      .map((item) => {
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={`sidebar-item flex items-center space-x-3 px-3 py-3 rounded-xl 
                                    transition-all duration-300 text-sm font-medium relative overflow-hidden 
                                    ${
                                      active
                                        ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                                        : "text-gray-700 hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 hover:text-primary hover:scale-102 hover:shadow-md"
                                    } group ${active ? "active" : ""}`}
                          >
                            <i
                              className={`${item.icon} text-base transition-all duration-300 ${
                                active
                                  ? "text-primary-foreground scale-110"
                                  : "text-gray-500 group-hover:text-primary group-hover:scale-110 group-hover:rotate-3"
                              }`}
                            ></i>
                            <span className="font-medium transition-transform duration-300 group-hover:translate-x-1">
                              {item.name}
                            </span>
                            {active && (
                              <div className="absolute right-2 w-2 h-2 bg-primary-foreground/60 rounded-full animate-pulse"></div>
                            )}
                          </Link>
                        );
                      }),
                  )}

                {/* Render remaining grouped sections inside Collapsible */}
                {navigationSections
                  .filter((section) => section.id !== "core")
                  .map((section) => (
                    <div key={section.id} className="mb-3">
                      <Collapsible
                        open={openSections.includes(section.id)}
                        onOpenChange={() => toggleSection(section.id)}
                      >
                        <CollapsibleTrigger
                          className="flex items-center w-full px-3 py-3 text-left text-sm font-semibold 
                                                               text-gray-800 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100/50 
                                                               hover:text-gray-900 rounded-xl transition-all duration-300 group 
                                                               hover:shadow-sm hover:scale-102 relative overflow-hidden"
                        >
                          <span
                            className="text-xs uppercase tracking-wider font-bold text-gray-600 group-hover:text-gray-800 
                                         transition-all duration-300 group-hover:tracking-wide"
                          >
                            {section.title}
                          </span>
                          <div className="ml-auto transition-transform duration-300 group-hover:scale-110">
                            {openSections.includes(section.id) ? (
                              <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-primary transition-all duration-300 group-hover:rotate-180" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary transition-all duration-300 group-hover:rotate-12" />
                            )}
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-1 space-y-1">
                          {section.items
                            .filter((item) =>
                              canAccessSidebarItem(item.resource, "read"),
                            )
                            .map((item) => {
                              const active = isActive(item.href);
                              return (
                                <Link
                                  key={item.name}
                                  href={item.href}
                                  className={`sidebar-item flex items-center space-x-3 px-3 py-2 ml-4 rounded-xl 
                                          transition-all duration-300 text-sm relative overflow-hidden animate-fade-in-up
                                          ${
                                            active
                                              ? "bg-gradient-to-r from-primary/90 to-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                                              : "text-gray-600 hover:bg-gradient-to-r hover:from-primary/8 hover:to-primary/3 hover:text-primary hover:scale-102 hover:shadow-sm"
                                          } group ${active ? "active" : ""}`}
                                  style={{
                                    animationDelay: `${section.items.indexOf(item) * 50}ms`,
                                  }}
                                >
                                  <i
                                    className={`${item.icon} text-base transition-all duration-300 ${
                                      active
                                        ? "text-primary-foreground scale-110"
                                        : "text-gray-400 group-hover:text-primary group-hover:scale-110 group-hover:rotate-6"
                                    }`}
                                  ></i>
                                  <span className="font-medium transition-transform duration-300 group-hover:translate-x-1">
                                    {item.name}
                                  </span>
                                  {active && (
                                    <div className="absolute right-2 w-1.5 h-1.5 bg-primary-foreground/70 rounded-full animate-pulse"></div>
                                  )}
                                </Link>
                              );
                            })}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  ))}
              </nav>
            </div>
          </ScrollArea>
        </div>

        {/* Enhanced User Profile with Dropdown */}
        <div className="flex-shrink-0 p-1 border-t border-gray-200/60 bg-gradient-to-r from-white to-gray-50/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                className="flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-white rounded-2xl p-2 
                            border border-gray-100/60 hover:shadow-xl hover:shadow-primary/10 
                            transition-all duration-400 hover:scale-102 glass-effect group cursor-pointer"
              >
                <div
                  className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl 
                             flex items-center justify-center shadow-lg transition-all duration-300 
                             group-hover:scale-110 group-hover:rotate-3 relative overflow-hidden"
                >
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 
                               group-hover:opacity-100 transition-opacity duration-300"
                  ></div>
                  {user?.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt="Profile"
                      className="w-10 h-10 rounded-xl object-cover relative z-10"
                    />
                  ) : (
                    <i
                      className="fas fa-user text-primary-foreground text-base relative z-10 
                                 transition-transform duration-300 group-hover:scale-110"
                    ></i>
                  )}
                </div>
                <div className="flex-1 min-w-0 transition-transform duration-300 group-hover:translate-x-1">
                  <p className="text-sm font-semibold text-gray-900 truncate transition-colors duration-300 group-hover:text-primary">
                    {user?.firstName
                      ? `${user.firstName} ${user.lastName || ""}`.trim()
                      : user?.email || "User"}
                  </p>
                  <p className="text-xs text-gray-500 capitalize flex items-center transition-colors duration-300 group-hover:text-gray-700">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 flex-shrink-0 animate-pulse"></span>
                    <span className="truncate">{user?.role || "Staff"}</span>
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-all duration-300 group-hover:translate-x-1" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56 mr-2">
              <div className="px-3 py-2 border-b">
                <p className="text-sm font-medium">
                  {user?.firstName
                    ? `${user.firstName} ${user.lastName || ""}`.trim()
                    : user?.email || "User"}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <span className="inline-block text-xs px-2 py-1 rounded-full mt-1 bg-primary/10 text-primary">
                  {user?.role || "staff"}
                </span>
              </div>
              <div className="p-2">
                <ProfileEditor user={user} />
              </div>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={async () => {
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
                }}
                className="text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
