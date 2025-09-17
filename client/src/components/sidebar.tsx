import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyBranding } from "@/hooks/use-company-branding";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Building2,
  Receipt,
  BarChart3,
  Bell,
  ShoppingCart,
  ArrowLeftRight,
  CreditCard,
  ShoppingBag,
  Building,
  UtensilsCrossed,
  Cookie,
  Boxes,
  Factory,
  Printer,
  Sprout,
  Users,
  Handshake,
  Clock,
  DollarSign,
  CalendarX,
  Calendar,
  UserCog,
  Shield,
  Ruler,
  Settings,
  Database,
  Code,
  Heart,
  Lock,
  TrendingUp,
  Gauge,
  Home,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isOpen = true, onToggle }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { branding } = useCompanyBranding();
  const {
    canAccessSidebarItem,
    isSuperAdmin,
    isAdmin,
    isManager,
    canManageUsers,
    canManageStaff,
    canViewFinance,
    canManageBranches,
  } = useRoleAccess();

  // Sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [openSections, setOpenSections] = useState<string[]>([
    "core",
    "Finance",
  ]);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem("sidebar-collapsed");
    if (savedState !== null) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Save collapsed state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", JSON.stringify(isCollapsed));
    // Dispatch custom event for same-page updates
    window.dispatchEvent(new CustomEvent("sidebar-toggle"));
  }, [isCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleSection = (section: string) => {
    if (isCollapsed) return; // Don't allow section toggle when collapsed
    setOpenSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section],
    );
  };

  // Helper function to get Lucide icon component from string identifier
  const getIconComponent = (iconString: string) => {
    const iconMap: { [key: string]: any } = {
      'fas fa-tachometer-alt': Home,
      'fas fa-bell': Bell,
      'fas fa-shopping-cart': ShoppingCart,
      'fas fa-exchange-alt': ArrowLeftRight,
      'fas fa-cash-register': CreditCard,
      'fas fa-shopping-bag': ShoppingBag,
      'fas fa-receipt': Receipt,
      'fas fa-building': Building,
      'fas fa-utensils': UtensilsCrossed,
      'fas fa-cookie-bite': Cookie,
      'fas fa-boxes': Boxes,
      'fas fa-industry': Factory,
      'fas fa-print': Printer,
      'fas fa-seedling': Sprout,
      'fas fa-users': Users,
      'fas fa-handshake': Handshake,
      'fas fa-clock': Clock,
      'fas fa-money-bill-wave': DollarSign,
      'fas fa-calendar-times': CalendarX,
      'fas fa-calendar-alt': Calendar,
      'fas fa-chart-bar': BarChart3,
      'fas fa-file-invoice-dollar': Receipt,
      'fas fa-users-cog': UserCog,
      'fas fa-users-cog text-base': UserCog,
      'fas fa-shield-alt': Shield,
      'fas fa-shield-alt text-base': Shield,
      'fas fa-ruler': Ruler,
      'fas fa-ruler text-base': Ruler,
      'fas fa-cogs': Settings,
      'fas fa-cogs text-base': Settings,
      'fas fa-database': Database,
      'fas fa-database text-base': Database,
      'fas fa-code': Code,
      'fas fa-code text-base': Code,
      'fas fa-heartbeat': Heart,
      'fas fa-heartbeat text-base': Heart,
      'fas fa-lock': Lock,
      'fas fa-lock text-base': Lock,
      'fas fa-chart-line': TrendingUp,
      'fas fa-chart-line text-base': TrendingUp,
      'fas fa-tachometer-alt text-base': Gauge,
    };
    
    return iconMap[iconString] || Home;
  };

  const getNavigationSections = () => {
    const allSections = [
      {
        id: "core",
        items: [
          {
            name: "Dashboard",
            href: "/",
            resource: "dashboard",
            icon: "fas fa-tachometer-alt",
          },
          {
            name: "Notifications",
            href: "/notifications",
            resource: "dashboard",
            icon: "fas fa-bell",
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
          {
            name: "Assets",
            href: "/assets",
            icon: "fas fa-building",
            resource: "assets",
          },
        ],
      },
      {
        id: "Stock",
        title: "Product & Inventory",
        items: [
          {
            name: "Recipes",
            href: "/recipes",
            icon: "fas fa-utensils",
            resource: "products",
          },
          {
            name: "Products",
            href: "/products",
            icon: "fas fa-cookie-bite",
            resource: "products",
          },
          {
            name: "Stock & Ingredients",
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
            name: "Label Printing",
            href: "/label-printing",
            icon: "fas fa-print",
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
        ],
      },
      {
        id: "Staff",
        title: "Staff Management",
        items: [
          {
            name: "Staff Directory",
            href: "/staff",
            icon: "fas fa-users",
            resource: "staff",
          },
          {
            name: "Attendance",
            href: "/attendance",
            icon: "fas fa-clock",
            resource: "staff",
          },
          {
            name: "Salary Management",
            href: "/salary",
            icon: "fas fa-money-bill-wave",
            resource: "staff",
          },
          {
            name: "Leave Requests",
            href: "/leave-requests",
            icon: "fas fa-calendar-times",
            resource: "staff",
          },
          {
            name: "Staff Schedules",
            href: "/staff-schedules",
            icon: "fas fa-calendar-alt",
            resource: "staff",
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
            href: "/admin/users",
            icon: "fas fa-users-cog text-base",
            resource: "users",
          },
          {
            name: "Audit Logs",
            href: "/admin/login-logs",
            icon: "fas fa-shield-alt text-base",
            resource: "admin",
          },
          {
            name: "Measuring Units",
            href: "/units",
            icon: "fas fa-ruler text-base",
            resource: "settings",
          },
        ],
      },
      // Super Admin only sections
      ...(isSuperAdmin()
        ? [
            {
              id: "developer",
              title: "Developer Tools",
              items: [
                {
                  name: "System Configuration",
                  href: "/system-config",
                  icon: "fas fa-cogs text-base",
                  resource: "system",
                },
                {
                  name: "Database Manager",
                  href: "/database",
                  icon: "fas fa-database text-base",
                  resource: "database",
                },
                {
                  name: "API Documentation",
                  href: "/api-docs",
                  icon: "fas fa-code text-base",
                  resource: "api",
                },
                {
                  name: "System Health",
                  href: "/system-health",
                  icon: "fas fa-heartbeat text-base",
                  resource: "monitoring",
                },
              ],
            },
            {
              id: "security",
              title: "Security & Monitoring",
              items: [
                {
                  name: "Security Logs",
                  href: "/security-logs",
                  icon: "fas fa-lock text-base",
                  resource: "security",
                },
                {
                  name: "System Monitoring",
                  href: "/monitoring",
                  icon: "fas fa-chart-line text-base",
                  resource: "monitoring",
                },
                {
                  name: "Performance Metrics",
                  href: "/performance",
                  icon: "fas fa-tachometer-alt text-base",
                  resource: "performance",
                },
              ],
            },
          ]
        : []),
    ];

    // Super Admin sees ALL sections without filtering
    if (isSuperAdmin()) {
      return allSections.concat(
        canManageBranches()
          ? [
              {
                id: "branches",
                title: "Branch Management",
                items: [
                  {
                    name: "Branches",
                    href: "/branches",
                    icon: "fas fa-building",
                    resource: "branches",
                  },
                ],
              },
            ]
          : [],
      );
    }

    // Filter sections based on user role for non-super-admin users
    return allSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          canAccessSidebarItem(item.resource, "read"),
        ),
      }))
      .filter((section) => section.items.length > 0) // Remove empty sections
      .concat(
        canManageBranches()
          ? [
              {
                id: "branches",
                title: "Branch Management",
                items: [
                  {
                    name: "Branches",
                    href: "/branches",
                    icon: "fas fa-building",
                    resource: "branches",
                  },
                ],
              },
            ]
          : [],
      );
  };

  const navigationSections = getNavigationSections();

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  const renderMenuItem = (item: any, isSubItem = false) => {
    const active = isActive(item.href);
    const IconComponent = getIconComponent(item.icon);

    const menuContent = (
      <Link
        key={item.name}
        href={item.href}
        className={`sidebar-item flex items-center transition-all duration-300 text-sm font-medium relative overflow-hidden
                ${isCollapsed ? "justify-center px-2 py-3" : isSubItem ? "space-x-3 px-3 py-2 ml-4" : "space-x-3 px-3 py-3"}
                rounded-xl
                ${
                  active
                    ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                    : "text-gray-700 hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 hover:text-primary hover:scale-102 hover:shadow-md"
                } group ${active ? "active" : ""}`}
        aria-label={item.name}
        data-testid={`link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <IconComponent
          className={`text-base transition-all duration-300 ${
            active
              ? "text-primary-foreground scale-110"
              : "text-gray-500 group-hover:text-primary group-hover:scale-110 group-hover:rotate-3"
          } ${isCollapsed ? "text-lg w-5 h-5" : "w-4 h-4"}`}
        />
        {!isCollapsed && (
          <span className="font-medium transition-transform duration-300 group-hover:translate-x-1 whitespace-nowrap">
            {item.name}
          </span>
        )}
        {active && (
          <div
            className={`absolute ${isCollapsed ? "right-1 top-1" : "right-2"} w-2 h-2 bg-primary-foreground/60 rounded-full animate-pulse`}
          ></div>
        )}
      </Link>
    );

    // Wrap with tooltip when collapsed
    if (isCollapsed) {
      return (
        <Tooltip key={item.name}>
          <TooltipTrigger asChild>{menuContent}</TooltipTrigger>
          <TooltipContent side="right" className="ml-2" sideOffset={8}>
            <p className="font-medium">{item.name}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return menuContent;
  };

  return (
    <TooltipProvider>
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
          bg-white/95 backdrop-blur-md
          shadow-xl border-r border-gray-200/60
          flex-shrink-0
          transform transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0 opacity-100" : "-translate-x-full lg:translate-x-0 opacity-95 lg:opacity-100"}
          ${isCollapsed ? "w-20" : "w-64"}
          before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/0 before:to-transparent before:opacity-0
          before:transition-opacity before:duration-300 hover:before:opacity-0
        `}
      >
        {/* Dynamic Company Header */}
        <div
          className={`px-4 lg:px-6 py-2.5 flex-shrink-0 relative overflow-hidden border-b border-gray-200 ${isCollapsed ? "px-2" : ""}`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-50"></div>
          <Link href="/" className="flex items-center group relative z-10">
            <div
              className={`bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center
                          shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300
                          group-hover:shadow-xl group-hover:bg-white/20 relative overflow-hidden
                          before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent
                          before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-300
                          ${isCollapsed ? "w-12 h-12" : "w-12 h-12"}`}
            >
              {branding.companyLogo ? (
                <img
                  src={branding.companyLogo}
                  alt="Company Logo"
                  className={`object-contain transition-transform duration-300 group-hover:scale-110 ${isCollapsed ? "w-6 h-6" : "w-8 h-8"}`}
                />
              ) : (
                <i
                  className={`fas fa-bread-slice text-orange-500 transition-all duration-300 group-hover:text-orange-700 ${isCollapsed ? "text-xl" : "text-2xl"}`}
                ></i>
              )}
            </div>
            {!isCollapsed && (
              <div className="text-orange-500 transition-all duration-300 group-hover:translate-x-1 ml-4">
                <h1 className="text-xl font-bold tracking-tight group-hover:text-orange-700 transition-colors duration-300">
                  {branding.companyName}
                </h1>
              </div>
            )}
          </Link>
        </div>

        {/* Toggle Button */}
        <div
          className={`flex ${isCollapsed ? "justify-center px-2" : "justify-end px-4"} py-2 border-b border-gray-200/30`}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 
                       focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            data-testid="button-toggle-sidebar"
          >
            {isCollapsed ? (
              <ChevronsRight className="h-4 w-4 text-gray-600 transition-transform duration-200 hover:scale-110" />
            ) : (
              <ChevronsLeft className="h-4 w-4 text-gray-600 transition-transform duration-200 hover:scale-110" />
            )}
          </Button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full" type="scroll">
            <div className={`py-4 space-y-2 ${isCollapsed ? "px-2" : "px-4"}`}>
              <nav className="space-y-1" role="navigation" aria-label="Main navigation">
                {/* Render top-level items directly without Collapsible */}
                {navigationSections
                  .filter(
                    (section) => section.id === "core", // Add other top-level sections here if needed
                  )
                  .flatMap((section) =>
                    section.items
                      .filter(
                        (item) =>
                          isSuperAdmin() ||
                          canAccessSidebarItem(item.resource, "read"),
                      )
                      .map((item) => renderMenuItem(item)),
                  )}

                {/* Render remaining grouped sections */}
                {navigationSections
                  .filter((section) => section.id !== "core")
                  .map((section) => (
                    <div key={section.id} className="mb-3">
                      {isCollapsed ? (
                        // When collapsed, show items directly without grouping
                        <div className="space-y-1">
                          {section.items
                            .filter(
                              (item) =>
                                isSuperAdmin() ||
                                canAccessSidebarItem(item.resource, "read"),
                            )
                            .map((item) => renderMenuItem(item))}
                        </div>
                      ) : (
                        // When expanded, show with collapsible sections
                        <Collapsible
                          open={openSections.includes(section.id)}
                          onOpenChange={() => toggleSection(section.id)}
                        >
                          <CollapsibleTrigger
                            className="flex items-center w-full px-3 py-3 text-left text-sm font-semibold
                                                                 text-gray-800 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100/50 
                                                                 hover:text-gray-900 rounded-xl transition-all duration-300 group
                                                                 hover:shadow-sm hover:scale-102 relative overflow-hidden
                                                                 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2"
                            aria-expanded={openSections.includes(section.id)}
                            aria-controls={`section-${section.id}`}
                            data-testid={`button-toggle-${section.id}`}
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
                          <CollapsibleContent 
                            className="mt-1 space-y-1" 
                            id={`section-${section.id}`}
                          >
                            {section.items
                              .filter(
                                (item) =>
                                  isSuperAdmin() ||
                                  canAccessSidebarItem(item.resource, "read"),
                              )
                              .map((item) => renderMenuItem(item, true))}
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  ))}
              </nav>
            </div>
          </ScrollArea>
        </div>
      </aside>
    </TooltipProvider>
  );
}
