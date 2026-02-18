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
import { useWebSocket } from "@/hooks/useWebSocket";
import { LayoutDashboard, LogOut, PanelLeft, Users } from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { AlertBadge } from "./AlertBadge";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { MenuBadge } from "./MenuBadge";
import { LanguageSelector } from "./LanguageSelector";
import { trpc } from "@/lib/trpc";

import { BookOpen, ClipboardCheck, FileText, Briefcase, BarChart3, AlertCircle, Settings, Inbox, UserCog, ClipboardList, ChevronDown, ChevronRight, Target, FileSignature, ShieldCheck, Building2, Scale, GraduationCap, PieChart, Bell } from "lucide-react";

// Nueva arquitectura jerárquica optimizada con 9 menús principales
const hierarchicalMenuItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/",
    roles: ["admin", "instructor", "student", "committee"],
  },
  {
    icon: BarChart3,
    label: "Dashboard Ejecutivo",
    path: "/consolidated-dashboard",
    roles: ["admin"],
  },
  {
    icon: Bell,
    label: "Alertas",
    path: "/alerts-dashboard",
    roles: ["admin"],
  },
  {
    icon: Building2,
    label: "Empresa",
    path: "/company",
    description: "Configuración general de la empresa",
    roles: ["admin"],
  },
  {
    icon: Users,
    label: "Gestión de Talento",
    description: "Administración de empleados y estructura organizacional",
    roles: ["admin"],
    submenu: [
      { label: "Trabajadores", path: "/employees", description: "Catálogo de trabajadores y expedientes digitales" },
      { label: "Departamentos", path: "/departments", description: "Catálogo de departamentos organizacionales" },
      { label: "Puestos", path: "/positions", description: "Catálogo de puestos y descripciones de trabajo" },
      { label: "Dashboard Organizacional", path: "/organization/dashboard", description: "Estadísticas visuales de empleados" },
      { label: "Organigrama", path: "/organization/chart", description: "Visualización de la estructura organizacional" },
      { label: "Cambios Organizacionales", path: "/organization/changes", description: "Historial de cambios organizacionales" },
      { label: "Dashboard de Rotación", path: "/employees/turnover", description: "Análisis de rotación de personal" },
      { label: "Reconocimientos", path: "/talent/recognitions", description: "Sistema de reconocimientos y felicitaciones corporativas" },
      { label: "Importación Masiva", path: "/admin/import", description: "Importar datos desde Excel" },
    ],
  },
  {
    icon: GraduationCap,
    label: "Capacitación y Desarrollo",
    description: "Gestión de cursos, evaluaciones y certificaciones",
    roles: ["admin", "instructor", "student"],
    submenu: [
      { label: "Cursos", path: "/courses", description: "Catálogo de cursos y programas de capacitación" },
      { label: "Recursos", path: "/resources", description: "Material didáctico y recursos de capacitación" },
      { label: "Evaluaciones y Exámenes", path: "/assessments", description: "Gestión de evaluaciones en línea con banco de preguntas" },
      { label: "Banco de Preguntas", path: "/question-bank", description: "Administración del banco de preguntas para exámenes" },
      { label: "Certificados e.firma SAT", path: "/efirma-sat", description: "Gestión de certificados digitales del SAT" },
      { label: "Certificados de Capacitación", path: "/training-certificates", description: "Genera certificados oficiales de capacitación con cumplimiento STPS y RED CONOCER" },
      { label: "Dashboard de Capacitación", path: "/training-dashboard", description: "Estadísticas y métricas de capacitación" },
      { label: "Notificaciones Automáticas", path: "/notifications-dashboard", description: "Gestión de plantillas y envío automático" },
      { label: "Competencias", path: "/competencies-dashboard", description: "Dashboard de competencias por trabajador" },
      { label: "Matriz de Habilidades", path: "/skills-matrix", description: "Matriz de habilidades del personal" },
      { label: "Nine Box Grid", path: "/talent/nine-box-grid", description: "Matriz 9-box de evaluación de talento" },
      { label: "Evaluación de Competencias", path: "/competency-evaluation", description: "Evaluación de competencias y desempeño" },
      { label: "DNC Consolidada", path: "/dnc-dashboard", description: "Detección de Necesidades de Capacitación" },
      { label: "Catálogo de Competencias", path: "/competencies-manager", description: "Administración del catálogo de competencias" },
    ],
  },
  {
    icon: ClipboardCheck,
    label: "Encuestas NOM-035",
    description: "Cuestionarios de identificación y análisis de riesgos psicosociales",
    roles: ["admin", "committee"],
    submenu: [
      { label: "Cuestionario Interactivo (72 preguntas)", path: "/nom035/questionnaire", description: "Cuestionario completo NOM-035" },
      { label: "Guía I - ATS", path: "/surveys/guide-i", description: "Acontecimientos traumáticos severos" },
      { label: "Guía II - Identificación", path: "/surveys/guide-ii", description: "Identificación de factores de riesgo (16-50 trabajadores)" },
      { label: "Guía III - Evaluación", path: "/surveys/guide-iii", description: "Evaluación del entorno organizacional (50+ trabajadores)" },
      { label: "Tamaño de Muestra", path: "/surveys/sample-size", description: "Cálculo del tamaño de muestra" },
      { label: "Dashboard Tokens", path: "/surveys/tokens-dashboard", description: "Gestión de tokens de acceso" },
      { label: "Gestión de Tokens", path: "/surveys/token-management", description: "Generación y administración de tokens anónimos" },
      { label: "Tokens Anónimos", path: "/surveys/anonymous-tokens", description: "Generación masiva de tokens para acceso sin login" },
      { label: "Periodos de Aplicación", path: "/surveys/periods", description: "Configuración de periodos de aplicación" },
      { label: "Envío Masivo", path: "/surveys/mass-email", description: "Envío masivo de invitaciones" },
      { label: "Panel de Administración", path: "/surveys/nom035-admin", description: "Panel administrativo de encuestas" },
      { label: "Análisis de Sentimiento", path: "/surveys/sentiment-analysis", description: "Dashboard de análisis de sentimiento con IA" },
      { label: "Correlación Sentimiento-Casos", path: "/sentiment-cases-correlation", description: "Visualiza la relación entre sentimiento y casos generados" },
      { label: "Análisis Predictivo de Rotación", path: "/predictive-turnover", description: "Predicciones de rotación con recomendaciones de retención" },
      { label: "Precisión del Modelo Predictivo", path: "/predictive-correlation", description: "Métricas de precisión y matriz de confusión" },
    ],
  },
  {
    icon: ShieldCheck,
    label: "Prevención de Riesgos Psicosociales",
    description: "Identificación, análisis y prevención de factores de riesgo",
    roles: ["admin", "committee"],
    submenu: [
      { label: "Gestión de Casos", path: "/cases", description: "Seguimiento de casos de riesgo psicosocial" },
      { label: "Gestión de Casos Manuales", path: "/cases-management", description: "Crear y gestionar casos manualmente" },
      { label: "Métricas de Casos", path: "/cases/metrics", description: "Análisis y tendencias de casos" },
      { label: "Análisis Predictivo", path: "/predictive-analytics", description: "Identificación temprana de empleados en riesgo" },
      { label: "Análisis de Causas Raíz", path: "/root-cause-analysis", description: "Identificación de patrones con IA en casos cerrados" },
      { label: "Seguimiento de Recomendaciones", path: "/recommendations-tracking", description: "Monitoreo de implementación y efectividad de recomendaciones" },
      { label: "Investigación", path: "/cases/investigations", description: "Cuestionarios de mobbing y burnout" },
      { label: "Protocolo de Violencia Laboral", path: "/cases/workplace-violence", description: "Gestión de casos de violencia laboral" },
      { label: "Buzón de Quejas", path: "/mailbox", description: "Buzón de quejas y denuncias anónimas" },
      { label: "Análisis de Riesgos", path: "/risk-analysis", description: "Reportes de análisis de riesgos psicosociales" },
      { label: "Acciones Correctivas", path: "/surveys/corrective-actions", description: "Plan de acciones para mitigar riesgos" },
      { label: "Alertas Tempranas", path: "/alerts", description: "Dashboard de alertas críticas" },
      { 
        label: "Sistema de Alertas", 
        description: "Gestión y análisis de alertas",
        submenu: [
          { label: "Histórico de Alertas", path: "/alert-history", description: "Registro completo de alertas" },
          { label: "Dashboard de Métricas", path: "/alert-metrics", description: "Análisis avanzado con gráficas" },
          { label: "Historial de Notificaciones", path: "/notification-history", description: "Registro de notificaciones push" },
          { label: "Configuración de Umbrales", path: "/alert-thresholds", description: "Configurar umbrales de alertas" },
          { label: "Configuración de Reportes", path: "/alert-reports-config", description: "Frecuencia de reportes automáticos" },
        ]
      },
    ],
  },
  {
    icon: FileText,
    label: "Cumplimiento Normativo",
    description: "Verificación de cumplimiento NOM-035 y documentación",
    roles: ["admin", "committee"],
    submenu: [
      { 
        label: "Comité de Seguridad", 
        description: "Gestión del comité de seguridad y salud",
        submenu: [
          { label: "Miembros del Comité", path: "/committee", description: "Gestión de miembros del comité" },
          { label: "Programa de Capacitación", path: "/committee/training", description: "Programas de capacitación del comité" },
          { label: "Gestión de Capacitaciones", path: "/committee-trainings-management", description: "Administrar catálogo de capacitaciones" },
         { label: "Mis Capacitaciones", path: "/my-committee-trainings", description: "Ver y completar mis capacitaciones asignadas" },
      { label: "Dashboard de Evaluaciones", path: "/training-evaluations", description: "Análisis de calidad y efectividad de capacitaciones" },
          { label: "Alertas Inteligentes con IA", path: "/intelligent-alerts", description: "Detección proactiva de patrones de riesgo emergentes" },
          { label: "Dashboard de ROI de Capacitaciones", path: "/training-roi", description: "Análisis financiero y retorno de inversión" },
          { label: "Benchmarking Sectorial", path: "/benchmarking", description: "Comparación con promedios del sector/industria" },
          { label: "Planes de Acción Correctiva", path: "/corrective-action-plans", description: "Workflow completo con firma digital y evidencias" },
          { label: "Análisis de Impacto de Intervenciones", path: "/intervention-impact", description: "Mide efectividad de acciones correctivas y correlación con reducción de casos" },
          { label: "Historial de Reportes Compartidos", path: "/shared-reports-history", description: "Rastreo de reportes compartidos por canal, fecha y destinatarios" },
          { label: "Acta Constitutiva", path: "/committee/constitutive-act", description: "Documento de constitución del comité" },
          { label: "Bases de Funcionamiento", path: "/committee/operating-rules", description: "Reglamento interno del comité" },
          { label: "Aceptación de Cargo", path: "/committee/position-acceptance", description: "Documento de aceptación de cargo" },
          { label: "Gestión de Minutas", path: "/committee-minutes-management", description: "CRUD completo de minutas de comité" },
          { label: "Seguimiento de Acuerdos", path: "/agreements-dashboard", description: "Dashboard de seguimiento de acuerdos" },
          { label: "Minutas de Reunión", path: "/meeting-minutes", description: "Registro de minutas de reuniones" },
        ]
      },
      { label: "Cumplimiento NOM-035", path: "/compliance", description: "Checklist de cumplimiento normativo" },
      { label: "Verificación Numerales 7 y 8", path: "/compliance/numerals", description: "Verificación automática de obligaciones" },
      { label: "Historial de Reportes", path: "/compliance/reports-history", description: "Consulta y re-descarga de reportes" },
      { label: "Políticas", path: "/nom035/policies", description: "Políticas de prevención de riesgos" },
      { label: "Carpeta de Evidencias STPS", path: "/evidences-folder", description: "Carpeta de evidencias NOM-035 organizada por numerales" },
      { label: "Carpeta de Evidencias NMX-025", path: "/nmx025-evidences-folder", description: "Carpeta de evidencias de Igualdad Laboral y No Discriminación" },
      { label: "Tendencias Departamentales", path: "/departmental-trends", description: "Heat map de concentración de casos y niveles de riesgo por departamento" },
      { label: "Encuestas Post-Caso", path: "/post-case-surveys", description: "Seguimiento 30/60/90 días y medición de efectividad de intervenciones" },
      { label: "Informe Numeral 7.5", path: "/reports/regulatory", description: "Informe de identificación y análisis" },
      { label: "Cumplimiento por Numeral", path: "/compliance/nom035", description: "Dashboard de cumplimiento NOM-035 con indicadores de semáforo" },
    ],
  },
  {
    icon: Scale,
    label: "Igualdad Laboral y No Discriminación",
    description: "Cumplimiento NMX-025-SCFI-2015",
    roles: ["admin"],
    submenu: [
      { label: "Política de Igualdad", path: "/equality/policy", description: "Política institucional de igualdad laboral" },
      { label: "Indicadores de Brecha Salarial", path: "/equality/salary-gap", description: "Análisis de brecha salarial por género" },
      { label: "Acciones Afirmativas", path: "/equality/affirmative-actions", description: "Programas para promover la igualdad" },
      { label: "Quejas y Denuncias", path: "/equality/complaints", description: "Sistema de atención a quejas" },
      { label: "Comité de Igualdad", path: "/equality/committee", description: "Comité responsable de la política" },
    ],
  },
  {
    icon: PieChart,
    label: "Reportes y Análisis",
    description: "Dashboards, reportes normativos y exportaciones",
    roles: ["admin", "instructor"],
    submenu: [
      { label: "Reportes STPS", path: "/stps-reports", description: "Generación de formatos oficiales DC-2, DC-3 y DC-4" },
      { label: "Gráficas de Tendencias", path: "/trends", description: "Evolución temporal de casos y cumplimiento" },
      { label: "Reportes Normativos", path: "/reports/regulatory", description: "Reportes para cumplimiento NOM-035 y NMX-025" },
      { label: "Histórico de Alertas", path: "/alert-history", description: "Registro de alertas para auditoría" },
      { label: "Análisis Predictivo", path: "/alerts/predictive", description: "Predicción de alertas basada en datos históricos" },
      { label: "Reportes Ejecutivos", path: "/executive-reports", description: "Generación de reportes ejecutivos en PDF" },
    ],
  },
  {
    icon: Settings,
    label: "Administración",
    description: "Configuración del sistema y gestión de usuarios",
    roles: ["admin"],
    submenu: [
      { label: "Usuarios", path: "/users", description: "Gestión de usuarios y permisos" },
      { label: "Gestión de Departamentos", path: "/department-management", description: "Administrar departamentos organizacionales" },
      { label: "Métricas de Departamentos", path: "/department-metrics", description: "Estadísticas de rotación, crecimiento y distribución" },
      { label: "Configuración Algoritmo", path: "/algorithm-config", description: "Ajustar pesos del algoritmo predictivo" },
      { label: "Efectividad del Algoritmo", path: "/algorithm-effectiveness", description: "Análisis de precisión y comparativa predicciones vs realidad" },
      { label: "Métricas de WhatsApp", path: "/whatsapp-metrics", description: "Seguimiento de conversiones y normativas solicitadas" },
      { label: "Pipeline de Leads", path: "/leads-pipeline", description: "Gestión de oportunidades de venta con Kanban" },
      { label: "Gestión de Vendedores", path: "/salespeople-management", description: "Administrar equipo de ventas y distribución de leads" },
      { label: "Dashboard Comparativo", path: "/sales-comparative", description: "Métricas comparativas y ranking de vendedores" },
      { label: "Roles y Permisos", path: "/administrative/roles-permissions", description: "Administración de roles y matriz de permisos" },
      { label: "Permisos Personalizados", path: "/administrative/custom-permissions", description: "Asignar permisos específicos por usuario" },
      { label: "Auditoría de Permisos", path: "/administrative/permission-audit", description: "Historial de cambios de roles y permisos" },
      { label: "Configuración SMTP", path: "/administrative/smtp-config", description: "Configurar servidor de correo electrónico" },
      { label: "Configuración", path: "/settings", description: "Configuración general del sistema" },
      { label: "Preferencias de Notificaciones", path: "/settings/notifications", description: "Personalizar tipos y frecuencia de notificaciones" },
      { label: "Historial de Notificaciones", path: "/notifications/history", description: "Auditoría completa de notificaciones enviadas" },
      { label: "Catálogo de Formatos", path: "/document-formats", description: "Nomenclatura de folios para documentos" },
      { label: "Plantillas de Reportes", path: "/report-templates", description: "Plantillas personalizables HTML/CSS" },
      { label: "Auditoría de Documentos", path: "/document-audit", description: "Registro de accesos y descargas" },
      { label: "Alertas de Seguridad", path: "/security-alerts", description: "Monitoreo de actividad sospechosa" },
      { label: "Monitoreo de Jobs", path: "/job-monitoring", description: "Historial y ejecución manual de jobs automáticos" },
      { label: "Configuración de Reportes", path: "/report-configuration", description: "Gestionar reportes ejecutivos automatizados" },
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
  const { isConnected, lastAlert, requestNotificationPermission } = useWebSocket();
  const [location] = useLocation();

  // Solicitar permiso para notificaciones al montar
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Mostrar alerta cuando se reciba una nueva
  useEffect(() => {
    if (lastAlert) {
      alert(`⚠️ ALERTA CRÍTICA NOM-035\n\n${lastAlert.description}\n\nValor actual: ${lastAlert.currentValue}\nUmbral: ${lastAlert.threshold}`);
    }
  }, [lastAlert]);

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
    refetchInterval: 2 * 60 * 1000, // Actualizar cada 2 minutos (reducido de 1 min)
    staleTime: 1 * 60 * 1000, // 1 minuto - contadores cambian frecuentemente
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
  });
  
  // Obtener contador de reconocimientos no leídos
  const { data: recognitionsCount } = trpc.recognitions.getUnreadCount.useQuery(undefined, {
    refetchInterval: 2 * 60 * 1000, // Actualizar cada 2 minutos (reducido de 1 min)
    staleTime: 1 * 60 * 1000, // 1 minuto - reconocimientos cambian frecuentemente
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
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
                                  {subItem.label === "Reconocimientos" && recognitionsCount && recognitionsCount.count > 0 && (
                                    <MenuBadge count={recognitionsCount.count} variant="info" />
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
            <div className="flex items-center justify-between gap-2 mb-2">
              <NotificationsDropdown />
            </div>
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
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <AlertBadge />
              <NotificationsDropdown />
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
