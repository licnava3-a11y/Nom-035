import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, PanelLeft, Users } from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

import { BookOpen, ClipboardCheck, FileText, Briefcase, BarChart3, AlertCircle, Settings, Inbox, UserCog, ClipboardList, ChevronDown, ChevronRight, Target, FileSignature } from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", roles: ["admin", "instructor", "student", "committee"] },
  { icon: BookOpen, label: "Cursos", path: "/courses", roles: ["admin", "instructor", "student"] },
  { icon: ClipboardCheck, label: "Evaluaciones", path: "/evaluations", roles: ["admin", "instructor", "student"] },
  { 
    icon: ClipboardList, 
    label: "Encuestas NOM-035", 
    path: "/surveys", 
    roles: ["admin", "committee"],
    submenu: [
      { label: "Guía I - ATS", path: "/surveys/guide-i" },
      { label: "Guía II - Identificación", path: "/surveys/guide-ii" },
      { label: "Guía III - Evaluación", path: "/surveys/guide-iii" },
      { label: "Tamaño de Muestra", path: "/surveys/sample-size", badge: true },
      { label: "Dashboard Tokens", path: "/surveys/tokens-dashboard" },
      { label: "Dashboard", path: "/surveys/dashboard" },
      { label: "Acciones Correctivas", path: "/surveys/corrective-actions" },
      { label: "Panel de Administración", path: "/surveys/admin-panel" },
    ]
  },
  { icon: AlertCircle, label: "Casos", path: "/cases", roles: ["admin", "committee"] },
  { icon: Inbox, label: "Buzón", path: "/mailbox", roles: ["admin", "committee"] },
  { icon: Users, label: "Comité", path: "/committee", roles: ["admin"] },
  { icon: FileText, label: "Recursos", path: "/resources", roles: ["admin", "instructor", "student", "committee"] },
  { icon: Briefcase, label: "Puestos", path: "/job-positions", roles: ["admin", "instructor"] },
  { icon: UserCog, label: "Trabajadores", path: "/employees", roles: ["admin"] },
  { icon: Target, label: "Competencias", path: "/competencies-dashboard", roles: ["admin"] },
  { icon: ClipboardList, label: "Matriz de Habilidades", path: "/skills-matrix", roles: ["admin"] },
  { icon: ClipboardCheck, label: "Evaluación de Competencias", path: "/competency-evaluation", roles: ["admin"] },
  { icon: Target, label: "DNC Consolidada", path: "/dnc-dashboard", roles: ["admin"] },
  { icon: Settings, label: "Catálogo de Competencias", path: "/competencies-manager", roles: ["admin"] },
  { icon: FileSignature, label: "Minutas de Reunión", path: "/meeting-minutes", roles: ["admin", "committee"] },
  { icon: BarChart3, label: "Reportes", path: "/reports", roles: ["admin", "instructor"] },
  { icon: Users, label: "Usuarios", path: "/users", roles: ["admin"] },
  { icon: Settings, label: "Configuración", path: "/settings", roles: ["admin"] },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<string[]>([]);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  const toggleSubmenu = (path: string) => {
    setOpenSubmenus(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  };

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      // Cleanup: always remove event listeners and reset styles
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (document.body) {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate">
                    NOM-035 STPS
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    Plataforma de Capacitación
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.filter(item => item.roles.includes(user?.role || "student")).map(item => {
                const isActive = location === item.path;
                const hasSubmenu = 'submenu' in item && item.submenu;
                const isSubmenuOpen = openSubmenus.includes(item.path);
                const isSubmenuItemActive = hasSubmenu && item.submenu?.some(sub => location === sub.path);
                
                return (
                  <div key={item.path}>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isActive || isSubmenuItemActive}
                        onClick={() => hasSubmenu ? toggleSubmenu(item.path) : setLocation(item.path)}
                        tooltip={item.label}
                        className={`h-10 transition-all font-normal`}
                      >
                        <item.icon
                          className={`h-4 w-4 ${isActive || isSubmenuItemActive ? "text-primary" : ""}`}
                        />
                        <span>{item.label}</span>
                        {hasSubmenu && (
                          <div className="ml-auto">
                            {isSubmenuOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </div>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {hasSubmenu && isSubmenuOpen && (
                      <div className="ml-6 mt-1 space-y-1">
                        {item.submenu?.map(subItem => {
                          const isSubActive = location === subItem.path;
                          return (
                            <SidebarMenuItem key={subItem.path}>
                              <SidebarMenuButton
                                isActive={isSubActive}
                                onClick={() => setLocation(subItem.path)}
                                tooltip={subItem.label}
                                className="h-9 text-sm font-normal"
                              >
                                <span>{subItem.label}</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
            <NotificationsDropdown />
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
