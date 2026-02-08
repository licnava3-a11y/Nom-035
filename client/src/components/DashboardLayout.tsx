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
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

import { BookOpen, ClipboardCheck, FileText, Briefcase, BarChart3, AlertCircle, Settings, Inbox, UserCog, ClipboardList, ChevronDown, ChevronRight, Target, FileSignature, ShieldCheck, Building2, Scale, GraduationCap, PieChart } from "lucide-react";

// Nueva arquitectura jerárquica con 8 menús principales
const hierarchicalMenuItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/",
    roles: ["admin", "instructor", "student", "committee"],
  },
  {
    icon: Building2,
    label: "Empresa",
    roles: ["admin"],
    submenu: [
      { label: "Datos Generales", path: "/company/general" },
      { label: "Datos del Reporte de la Encuesta", path: "/company/survey-report" },
      { label: "Logo", path: "/company/logo" },
      { label: "Representante Legal", path: "/company/legal-representative" },
      { label: "Firma Digital", path: "/company/digital-signature" },
    ],
  },
  {
    icon: Users,
    label: "Gestión de Talento",
    roles: ["admin"],
    submenu: [
      { label: "Trabajadores", path: "/employees" },
      { label: "Puestos", path: "/job-positions" },
      { label: "Competencias", path: "/competencies-dashboard" },
      { label: "Matriz de Habilidades", path: "/skills-matrix" },
      { label: "Evaluación de Competencias", path: "/competency-evaluation" },
      { label: "DNC Consolidada", path: "/dnc-dashboard" },
      { label: "Catálogo de Competencias", path: "/competencies-manager" },
    ],
  },
  {
    icon: GraduationCap,
    label: "Capacitación y Desarrollo",
    roles: ["admin", "instructor", "student"],
    submenu: [
      { label: "Cursos", path: "/courses" },
      { label: "Evaluaciones", path: "/evaluations" },
      { label: "Recursos", path: "/resources" },
    ],
  },
  {
    icon: ShieldCheck,
    label: "Prevención de Riesgos Psicosociales",
    roles: ["admin", "committee"],
    submenu: [
      {
        label: "Encuestas",
        submenu: [
          { label: "Guía I - ATS", path: "/surveys/guide-i" },
          { label: "Guía II - Identificación", path: "/surveys/guide-ii" },
          { label: "Guía III - Evaluación", path: "/surveys/guide-iii" },
          { label: "Tamaño de Muestra", path: "/surveys/sample-size" },
          { label: "Dashboard Tokens", path: "/surveys/tokens-dashboard" },
          { label: "Periodos de Aplicación", path: "/surveys/periods" },
        ],
      },
              { 
                label: "Informe de identificación y análisis de factores de riesgo psicosocial (Numeral 7.5)", 
                path: "/company/survey-report",
                description: "Informe según Numeral 7.5 NOM-035: Resultados de identificación de factores de riesgo psicosocial"
              },
      { label: "Casos", path: "/cases" },
      { label: "Buzón", path: "/mailbox" },
      { label: "Comité", path: "/committee" },
      { label: "Acciones Correctivas", path: "/surveys/corrective-actions" },
      { label: "Minutas de Reunión", path: "/meeting-minutes" },
      { label: "Cumplimiento NOM-035", path: "/compliance" },
      { label: "Panel de Administración", path: "/surveys/nom035-admin" },
    ],
  },
  {
    icon: Scale,
    label: "Igualdad Laboral y No Discriminación",
    roles: ["admin"],
    submenu: [
      { label: "Política de Igualdad", path: "/equality/policy" },
      { label: "Indicadores de Brecha Salarial", path: "/equality/salary-gap" },
      { label: "Acciones Afirmativas", path: "/equality/affirmative-actions" },
      { label: "Quejas y Denuncias", path: "/equality/complaints" },
      { label: "Comité de Igualdad", path: "/equality/committee" },
    ],
  },
  {
    icon: PieChart,
    label: "Reportes y Análisis",
    roles: ["admin", "instructor"],
    submenu: [
      { label: "Dashboard Ejecutivo", path: "/reports/executive" },
      { label: "Reportes Normativos", path: "/reports/regulatory" },
      { label: "Análisis de Competencias", path: "/reports/competencies" },
      { label: "Exportaciones", path: "/reports/exports" },
    ],
  },
  {
    icon: Settings,
    label: "Administración",
    roles: ["admin"],
    submenu: [
      { label: "Usuarios", path: "/users" },
      { label: "Configuración", path: "/settings" },
    ],
  },
];

// Mantener compatibilidad con código existente
const menuItems = hierarchicalMenuItems;

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
  const [openSubmenus, setOpenSubmenus] = useState<string[]>(() => {
    // Cargar estado de localStorage
    const saved = localStorage.getItem('open-submenus');
    return saved ? JSON.parse(saved) : [];
  });
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  // Patrón de acordeón: solo un menú principal expandido a la vez
  const toggleSubmenu = (itemKey: string, isMainMenu: boolean = false) => {
    setOpenSubmenus(prev => {
      if (prev.includes(itemKey)) {
        // Si ya está abierto, cerrarlo
        return prev.filter(p => p !== itemKey);
      } else {
        // Si es menú principal, cerrar otros menús principales (patrón acordeón)
        if (isMainMenu) {
          const mainMenuKeys = menuItems.map((_, index) => `menu-${index}`);
          const newOpen = prev.filter(p => !mainMenuKeys.includes(p));
          return [...newOpen, itemKey];
        }
        // Si es submenú, solo agregarlo
        return [...prev, itemKey];
      }
    });
  };

  // Persistir estado en localStorage
  useEffect(() => {
    localStorage.setItem('open-submenus', JSON.stringify(openSubmenus));
  }, [openSubmenus]);

  // Expansión automática del menú que contiene la ruta activa
  useEffect(() => {
    if (!location || location === '/') return;

    // Buscar menú principal que contiene la ruta activa
    menuItems.forEach((item, index) => {
      const itemKey = `menu-${index}`;
      
      // Verificar si la ruta activa está en submenús de nivel 1
      if (item.submenu) {
        const hasActiveSubmenu = item.submenu.some((sub: any) => sub.path === location);
        if (hasActiveSubmenu && !openSubmenus.includes(itemKey)) {
          setOpenSubmenus(prev => [...prev, itemKey]);
        }

        // Verificar si la ruta activa está en submenús de nivel 2
        item.submenu.forEach((subItem: any, subIndex: number) => {
          if ('submenu' in subItem && subItem.submenu) {
            const hasActiveNestedSubmenu = subItem.submenu.some((nested: any) => nested.path === location);
            const subItemKey = `submenu-${index}-${subIndex}`;
            if (hasActiveNestedSubmenu) {
              setOpenSubmenus(prev => {
                const newOpen = [...prev];
                if (!newOpen.includes(itemKey)) newOpen.push(itemKey);
                if (!newOpen.includes(subItemKey)) newOpen.push(subItemKey);
                return newOpen;
              });
            }
          }
        });
      }
    });
  }, [location]);

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
              {menuItems.filter(item => item.roles.includes(user?.role || "student")).map((item, index) => {
                const itemKey = `menu-${index}`;
                const isActive = item.path ? location === item.path : false;
                const hasSubmenu = 'submenu' in item && item.submenu;
                const isSubmenuOpen = openSubmenus.includes(itemKey);
                const isSubmenuItemActive = hasSubmenu && item.submenu?.some((sub: any) => sub.path === location);
                
                return (
                  <div key={itemKey}>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isActive || isSubmenuItemActive}
                        onClick={() => hasSubmenu ? toggleSubmenu(itemKey, true) : (item.path && setLocation(item.path))}
                        tooltip={(item as any).description || item.label}
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
                        {item.submenu?.map((subItem: any, subIndex: number) => {
                          const subItemKey = subItem.path || `submenu-${index}-${subIndex}`;
                          const isSubActive = subItem.path ? location === subItem.path : false;
                          const hasNestedSubmenu = 'submenu' in subItem && subItem.submenu;
                          const isNestedSubmenuOpen = openSubmenus.includes(subItemKey);
                          const isNestedSubmenuItemActive = hasNestedSubmenu && subItem.submenu?.some((nested: any) => nested.path === location);
                          
                          return (
                            <div key={subItemKey}>
                              <SidebarMenuItem>
                                <SidebarMenuButton
                                  isActive={isSubActive || isNestedSubmenuItemActive}
                                  onClick={() => hasNestedSubmenu ? toggleSubmenu(subItemKey) : (subItem.path && setLocation(subItem.path))}
                                  tooltip={subItem.label}
                                  className="h-9 text-sm font-normal"
                                >
                                  <span>{subItem.label}</span>
                                  {hasNestedSubmenu && (
                                    <div className="ml-auto">
                                      {isNestedSubmenuOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    </div>
                                  )}
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                              {hasNestedSubmenu && isNestedSubmenuOpen && (
                                <div className="ml-6 mt-1 space-y-1">
                                  {subItem.submenu?.map((nestedItem: any, nestedIndex: number) => {
                                    const nestedItemKey = nestedItem.path || `nested-${index}-${subIndex}-${nestedIndex}`;
                                    const isNestedActive = nestedItem.path ? location === nestedItem.path : false;
                                    return (
                                      <SidebarMenuItem key={nestedItemKey}>
                                        <SidebarMenuButton
                                          isActive={isNestedActive}
                                          onClick={() => nestedItem.path && setLocation(nestedItem.path)}
                                          tooltip={nestedItem.label}
                                          className="h-8 text-xs font-normal"
                                        >
                                          <span>{nestedItem.label}</span>
                                        </SidebarMenuButton>
                                      </SidebarMenuItem>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
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
