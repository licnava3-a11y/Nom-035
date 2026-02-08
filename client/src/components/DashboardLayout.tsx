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
import { MenuBadge } from "./MenuBadge";
import { trpc } from "@/lib/trpc";

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
    path: "/company",
    description: "Configuración general de la empresa: datos, logo, representantes legales y firmas digitales",
    roles: ["admin"],
  },
  {
    icon: Users,
    label: "Gestión de Talento",
    description: "Administración de empleados, puestos, departamentos y estructura organizacional",
    roles: ["admin"],
    submenu: [
      { label: "Trabajadores", path: "/employees", description: "Catálogo de trabajadores y expedientes digitales" },
      { label: "Puestos", path: "/job-positions", description: "Catálogo de puestos y descripciones de trabajo" },
      { label: "Competencias", path: "/competencies-dashboard", description: "Dashboard de competencias por trabajador y departamento" },
      { label: "Matriz de Habilidades", path: "/skills-matrix", description: "Matriz de habilidades y competencias del personal" },
      { label: "Evaluación de Competencias", path: "/competency-evaluation", description: "Evaluación de competencias y desempeño" },
      { label: "DNC Consolidada", path: "/dnc-dashboard", description: "Detección de Necesidades de Capacitación consolidada" },
      { label: "Catálogo de Competencias", path: "/competencies-manager", description: "Administración del catálogo de competencias organizacionales" },
    ],
  },
  {
    icon: GraduationCap,
    label: "Capacitación y Desarrollo",
    description: "Gestión de cursos, instructores y programas de capacitación",
    roles: ["admin", "instructor", "student"],
    submenu: [
      { label: "Cursos", path: "/courses", description: "Catálogo de cursos y programas de capacitación" },
      { label: "Evaluaciones", path: "/evaluations", description: "Evaluaciones de aprendizaje y certificaciones" },
      { label: "Recursos", path: "/resources", description: "Material didáctico y recursos de capacitación" },
    ],
  },
  {
    icon: ClipboardCheck,
    label: "Encuestas NOM-035",
    description: "Guías de Referencia I, II y III para evaluación de factores de riesgo psicosocial",
    roles: ["admin", "committee"],
    submenu: [
      { label: "Guía I - ATS", path: "/surveys/guide-i", description: "Cuestionario para identificar trabajadores expuestos a acontecimientos traumáticos severos" },
      { label: "Guía II - Identificación", path: "/surveys/guide-ii", description: "Cuestionario de identificación de factores de riesgo (centros de trabajo con 16-50 trabajadores)" },
      { label: "Guía III - Evaluación", path: "/surveys/guide-iii", description: "Cuestionario de evaluación del entorno organizacional (centros de trabajo con más de 50 trabajadores)" },
      { label: "Tamaño de Muestra", path: "/surveys/sample-size", description: "Cálculo del tamaño de muestra para aplicación de encuestas" },
      { label: "Dashboard Tokens", path: "/surveys/tokens-dashboard", description: "Gestión de tokens de acceso para encuestas" },
      { label: "Periodos de Aplicación", path: "/surveys/periods", description: "Configuración de periodos de aplicación de encuestas" },
      { label: "Envío Masivo", path: "/surveys/mass-email", description: "Envío masivo de invitaciones por correo electrónico" },
      { label: "Panel de Administración", path: "/surveys/nom035-admin", description: "Panel administrativo para configuración de encuestas" },
    ],
  },
  {
    icon: ShieldCheck,
    label: "Prevención de Riesgos Psicosociales",
    description: "Cumplimiento NOM-035-STPS-2018: Identificación y prevención de factores de riesgo",
    roles: ["admin", "committee"],
    submenu: [
      { 
        label: "Informe de identificación y análisis (Numeral 7.5)", 
        path: "/company/survey-report",
        description: "Informe según Numeral 7.5 NOM-035: Resultados de identificación de factores de riesgo psicosocial"
      },
      { 
        label: "Casos", 
        description: "Seguimiento de casos de riesgo psicosocial identificados",
        submenu: [
          { label: "Gestión de Casos", path: "/cases", description: "Seguimiento de casos de riesgo psicosocial identificados" },
          { label: "Investigación", path: "/cases/investigations", description: "Cuestionarios de mobbing y burnout para investigación de casos" },
        ]
      },
      { label: "Buzón", path: "/mailbox", description: "Buzón de quejas y denuncias anónimas" },
      { 
        label: "Comité", 
        description: "Comité de seguridad y salud en el trabajo",
        submenu: [
          { label: "Miembros del Comité", path: "/committee", description: "Gestión de miembros del comité NOM-035" },
          { label: "Acta Constitutiva", path: "/committee/constitutive-act", description: "Documento formal de constitución del comité" },
          { label: "Bases de Funcionamiento", path: "/committee/operating-rules", description: "Reglamento interno del comité" },
          { label: "Aceptación de Cargo", path: "/committee/position-acceptance", description: "Documento formal de aceptación de cargo con responsabilidades" },
        ]
      },
      { label: "Acciones Correctivas", path: "/surveys/corrective-actions", description: "Plan de acciones para mitigar factores de riesgo identificados" },
      { label: "Minutas de Reunión", path: "/meeting-minutes", description: "Registro de minutas de reuniones del comité" },
      { label: "Cumplimiento NOM-035", path: "/compliance", description: "Checklist de cumplimiento normativo NOM-035-STPS-2018" },
      { label: "Políticas", path: "/nom035/policies", description: "Políticas de prevención de riesgos psicosociales" },
      { label: "Carpeta de Evidencias", path: "/nom035/evidence-folder", description: "Repositorio centralizado de documentación para cumplimiento normativo" },
      { label: "Alertas Tempranas", path: "/alerts", description: "Dashboard de alertas: casos próximos a vencer, encuestas pendientes y acciones sin seguimiento" },
    ],
  },
  {
    icon: Scale,
    label: "Igualdad Laboral y No Discriminación",
    description: "Cumplimiento NMX-025-SCFI-2015: Igualdad laboral y no discriminación",
    roles: ["admin"],
    submenu: [
      { label: "Política de Igualdad", path: "/equality/policy", description: "Política institucional de igualdad laboral y no discriminación (Requisito 4.1.1)" },
      { label: "Indicadores de Brecha Salarial", path: "/equality/salary-gap", description: "Análisis de brecha salarial por género y puesto (Requisito 4.2.1)" },
      { label: "Acciones Afirmativas", path: "/equality/affirmative-actions", description: "Programas y acciones para promover la igualdad (Requisito 4.3.1)" },
      { label: "Quejas y Denuncias", path: "/equality/complaints", description: "Sistema de atención a quejas por discriminación (Requisito 4.3.2)" },
      { label: "Comité de Igualdad", path: "/equality/committee", description: "Comité responsable de la implementación de la política (Requisito 4.4.1)" },
    ],
  },
  {
    icon: PieChart,
    label: "Reportes y Análisis",
    description: "Dashboards, reportes normativos y exportaciones",
    roles: ["admin", "instructor"],
    submenu: [
{ label: "Reportes Normativos", path: "/reports/regulatory", description: "Reportes para cumplimiento normativo NOM-035 y NMX-025" },
      { label: "Análisis de Competencias", path: "/reports/competencies", description: "Análisis de brechas de competencias y DNC" },
      { label: "Exportaciones", path: "/reports/exports", description: "Exportación de datos en Excel, Word y PDF" },
    ],
  },
  {
    icon: Settings,
    label: "Administración",
    description: "Configuración del sistema y gestión de usuarios",
    roles: ["admin"],
    submenu: [
      { label: "Usuarios", path: "/users", description: "Gestión de usuarios y permisos de acceso" },
      { label: "Configuración", path: "/settings", description: "Configuración general del sistema y parámetros SMTP" },
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
  
  // Obtener contadores dinámicos para badges
  const { data: counters } = trpc.menuCounters.getAll.useQuery(undefined, {
    refetchInterval: 60000, // Actualizar cada minuto
  });
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
                        {/* Badges dinámicos */}
                        {item.label === "Prevención de Riesgos Psicosociales" && counters?.cases && (
                          <MenuBadge count={counters.cases.open + counters.cases.investigating} variant="danger" />
                        )}
                        {item.label === "Encuestas NOM-035" && counters?.surveys && (
                          <MenuBadge count={counters.surveys.expiringSoon} variant="warning" />
                        )}
                        {item.label === "Capacitación y Desarrollo" && counters?.courses && (
                          <MenuBadge count={counters.courses.published} variant="info" />
                        )}
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
                                  tooltip={subItem.description || subItem.label}
                                  className="h-9 text-sm font-normal"
                                >
                                  <span>{subItem.label}</span>
                                  {/* Badges en submenús */}
                                  {subItem.label === "Casos" && counters?.cases && (
                                    <MenuBadge count={counters.cases.open} variant="danger" />
                                  )}
                                  {subItem.label === "Buzón" && counters?.mailbox && (
                                    <MenuBadge count={counters.mailbox.pending} variant="danger" />
                                  )}
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
                                          tooltip={nestedItem.description || nestedItem.label}
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
