import { useAuth } from "@/_core/hooks/useAuth";
import { TermsAcceptanceModal } from "@/components/TermsAcceptanceModal";
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
import { DashboardLayoutSkeleton } from "./skeletons/DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { MenuBadge } from "./MenuBadge";
import { LanguageSelector } from "./LanguageSelector";
import { trpc } from "@/lib/trpc";

import {
  BookOpen,
  ClipboardCheck,
  FileText,
  Briefcase,
  BarChart3,
  AlertCircle,
  Settings,
  Inbox,
  UserCog,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Target,
  FileSignature,
  ShieldCheck,
  Building2,
  Scale,
  GraduationCap,
  PieChart,
  Bell,
  Shield,
} from "lucide-react";

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
      {
        label: "Trabajadores",
        path: "/employees",
        description: "Catálogo de trabajadores y expedientes digitales",
      },
      {
        label: "Departamentos",
        path: "/departments",
        description: "Catálogo de departamentos organizacionales",
      },
      {
        label: "Puestos",
        path: "/positions",
        description: "Catálogo de puestos y descripciones de trabajo",
      },
      {
        label: "Perfiles de Puesto",
        path: "/job-profile-management",
        description:
          "Gestión de perfiles de puesto con competencias y funciones",
      },
      {
        label: "Entrevistas de Salida",
        path: "/exit-interviews",
        description: "Proceso confidencial de baja y análisis de rotación",
      },
      {
        label: "Dashboard Organizacional",
        path: "/organization/dashboard",
        description: "Estadísticas visuales de empleados",
      },
      {
        label: "Organigrama",
        path: "/organization/chart",
        description: "Visualización de la estructura organizacional",
      },
      {
        label: "Cambios Organizacionales",
        path: "/organization/changes",
        description: "Historial de cambios organizacionales",
      },
      {
        label: "Dashboard de Rotación",
        path: "/employees/turnover",
        description: "Análisis de rotación de personal",
      },
      {
        label: "Reconocimientos",
        path: "/talent/recognitions",
        description: "Sistema de reconocimientos y felicitaciones corporativas",
      },
      {
        label: "Evaluación 360°",
        path: "/performance-evaluation-360",
        description:
          "Evaluación de desempeño 360° con Nine Box y Leadership Pipeline",
      },
      {
        label: "📊 Centro de Retención (unificado)",
        path: "/retention-hub",
        description:
          "Vista unificada: rotación, empleados en riesgo, intervenciones y análisis predictivo",
      },
      {
        label: "Análisis de Retención",
        path: "/retention-analytics",
        description:
          "Análisis predictivo de rotación basado en tendencias de competencias",
      },
      {
        label: "Dashboard de Talento",
        path: "/talent-dashboard",
        description:
          "Vista ejecutiva unificada de Nine Box Matrix, Alertas de Riesgo y Métricas de Reportes",
      },
      {
        label: "Planes de Intervención",
        path: "/intervention-plans",
        description:
          "Planes de acción personalizados para empleados en riesgo crítico con mentores y seguimiento trimestral",
      },
      {
        label: "Alertas Tempranas",
        path: "/risk-alerts",
        description: "Sistema de alertas automáticas de riesgo psicosocial",
      },
      {
        label: "Reportes Automáticos",
        path: "/scheduled-reports",
        description:
          "Dashboards ejecutivos mensuales con métricas NMX-025 y NOM-035",
      },
      {
        label: "Integración con Sistemas de RH",
        path: "/hr-integration",
        description:
          "Importar/exportar empleados desde CONTPAQi, Aspel NOI, SAP HCM, Oracle HCM y Nomipaq",
      },
      {
        label: "Catálogo de Empresas Cliente",
        path: "/client-companies",
        description:
          "Gestiona las empresas para las que emites constancias DC-3 (multi-empresa)",
      },
      {
        label: "Reclutamiento",
        path: "/recruitment",
        description:
          "Gestión de vacantes y candidatos con filtro de escolaridad",
      },
      {
        label: "Vencimientos de Contratos",
        path: "/contract-expiration-dashboard",
        description:
          "Dashboard consolidado de contratos próximos a vencer con exportación Excel",
      },
      {
        label: "Gestión de Vacaciones",
        path: "/vacation-management",
        description:
          "Solicitudes con saldo LFT automático, flujo de aprobación y notificación a RH",
      },
      {
        label: "Calendario de Vacaciones",
        path: "/vacation-calendar",
        description:
          "Vista Gantt y mensual de períodos aprobados y pendientes por departamento",
      },
      {
        label: "Tabla de Antigüedad",
        path: "/vacation-seniority",
        description:
          "Configura los días de vacaciones por años de servicio (LFT y política interna)",
      },
    ],
  },
  {
    icon: GraduationCap,
    label: "Capacitación y Desarrollo",
    description: "Gestión de cursos, evaluaciones y certificaciones",
    roles: ["admin", "instructor", "student"],
    submenu: [
      {
        label: "Cursos",
        path: "/courses",
        description: "Catálogo de cursos y programas de capacitación",
      },
      {
        label: "Recursos",
        path: "/resources",
        description: "Material didáctico y recursos de capacitación",
      },
      {
        label: "Evaluaciones y Exámenes",
        path: "/assessments",
        description: "Gestión de evaluaciones en línea con banco de preguntas",
      },
      {
        label: "Banco de Preguntas",
        path: "/question-bank",
        description: "Administración del banco de preguntas para exámenes",
      },
      {
        label: "Certificados e.firma SAT",
        path: "/efirma-sat",
        description: "Gestión de certificados digitales del SAT",
      },
      {
        label: "Certificados de Capacitación",
        path: "/training-certificates",
        description:
          "Genera certificados oficiales de capacitación con cumplimiento STPS y RED CONOCER",
      },
      {
        label: "Dashboard de Capacitación",
        path: "/training-dashboard",
        description: "Estadísticas y métricas de capacitación",
      },
      {
        label: "📋 Programa Anual de Capacitación",
        path: "/training/annual-plan",
        description:
          "PAC: planificación anual de cursos con fechas, responsables, presupuesto y exportación PDF",
      },
      {
        label: "Notificaciones Automáticas",
        path: "/notifications-dashboard",
        description: "Gestión de plantillas y envío automático",
      },
      {
        label: "Competencias",
        path: "/competencies-dashboard",
        description: "Dashboard de competencias por trabajador",
      },
      {
        label: "Matriz de Habilidades",
        path: "/skills-matrix",
        description: "Matriz de habilidades del personal",
      },
      {
        label: "Nine Box Grid",
        path: "/talent/nine-box-grid",
        description: "Matriz 9-box de evaluación de talento",
      },
      {
        label: "Evaluación de Competencias",
        path: "/competency-evaluation",
        description: "Evaluación de competencias y desempeño",
      },
      {
        label: "DNC Consolidada",
        path: "/dnc-dashboard",
        description: "Detección de Necesidades de Capacitación",
      },
      {
        label: "Catálogo de Competencias",
        path: "/competencies-manager",
        description: "Administración del catálogo de competencias",
      },
    ],
  },
  {
    icon: ClipboardCheck,
    label: "Encuestas NOM-035",
    description:
      "Cuestionarios de identificación y análisis de riesgos psicosociales",
    roles: ["admin", "committee"],
    submenu: [
      {
        label: "Cuestionario Interactivo (72 preguntas)",
        path: "/nom035/questionnaire",
        description: "Cuestionario completo NOM-035",
      },
      {
        label: "Guía I - ATS",
        path: "/surveys/guide-i",
        description: "Acontecimientos traumáticos severos",
      },
      {
        label: "Guía II - Identificación",
        path: "/surveys/guide-ii",
        description:
          "Identificación de factores de riesgo (16-50 trabajadores)",
      },
      {
        label: "Guía III - Evaluación",
        path: "/surveys/guide-iii",
        description: "Evaluación del entorno organizacional (50+ trabajadores)",
      },
      {
        label: "Tamaño de Muestra",
        path: "/surveys/sample-size",
        description: "Cálculo del tamaño de muestra",
      },
      {
        label: "Dashboard Tokens",
        path: "/surveys/tokens-dashboard",
        description: "Gestión de tokens de acceso",
      },
      {
        label: "Gestión de Tokens",
        path: "/surveys/token-management",
        description: "Generación y administración de tokens anónimos",
      },
      {
        label: "Tokens Anónimos",
        path: "/surveys/anonymous-tokens",
        description: "Generación masiva de tokens para acceso sin login",
      },
      {
        label: "Periodos de Aplicación",
        path: "/surveys/periods",
        description: "Configuración de periodos de aplicación",
      },
      {
        label: "Envío Masivo",
        path: "/surveys/mass-email",
        description: "Envío masivo de invitaciones",
      },
      {
        label: "Panel de Administración",
        path: "/surveys/nom035-admin",
        description: "Panel administrativo de encuestas",
      },
      {
        label: "📊 Dictamen Extendido (Categoría/Dominio/Dimensión)",
        path: "/nom035/detailed-report",
        description:
          "Análisis NOM-035 por Categoría, Dominio y Dimensión con plan de intervención",
      },
      {
        label: "Análisis de Sentimiento",
        path: "/surveys/sentiment-analysis",
        description: "Dashboard de análisis de sentimiento con IA",
      },
      {
        label: "✨ IA Psicosocial — Forge LLM",
        path: "/psychosocial-ai",
        description:
          "Análisis de texto, reportes ejecutivos y planes de intervención con IA",
      },
      {
        label: "⚖️ Documentos Técnico-Jurídicos",
        path: "/legal-doc-generator",
        description:
          "Generación IA de Investigación de Caso y Dictamen NOM-035",
      },
      {
        label: "Correlación Sentimiento-Casos",
        path: "/sentiment-cases-correlation",
        description:
          "Visualiza la relación entre sentimiento y casos generados",
      },
      {
        label: "Análisis Predictivo de Rotación",
        path: "/predictive-turnover",
        description:
          "Predicciones de rotación con recomendaciones de retención",
      },
      {
        label: "Precisión del Modelo Predictivo",
        path: "/predictive-correlation",
        description: "Métricas de precisión y matriz de confusión",
      },
      {
        label: "Evolución del Modelo",
        path: "/model-evolution",
        description: "Tendencias temporales de precisión",
      },
      {
        label: "Configuración de Umbrales",
        path: "/model-thresholds-config",
        description: "Ajustar pesos del modelo predictivo",
      },
      {
        label: "Alertas de Rendimiento",
        path: "/model-performance-alerts",
        description: "Monitoreo automático de métricas del modelo",
      },
      {
        label: "A/B Testing de Umbrales",
        path: "/threshold-ab-testing",
        description: "Comparar configuraciones para optimizar el modelo",
      },
      {
        label: "Historial de Reentrenamiento",
        path: "/model-retraining-history",
        description: "Registro de ajustes automáticos del modelo",
      },
      {
        label: "Impacto de Intervenciones",
        path: "/retention-interventions",
        description: "Efectividad de acciones de retención",
      },
      {
        label: "Predicción de Efectividad",
        path: "/intervention-prediction",
        description: "Simula intervenciones y predice su probabilidad de éxito",
      },
      {
        label: "Compensación y Nómina",
        path: "/payroll-compensation",
        description:
          "Análisis de brecha salarial y correlación con riesgo de rotación",
      },
      {
        label: "Dashboard Consolidado",
        path: "/retention-consolidated",
        description:
          "Vista unificada de riesgo, recomendaciones y análisis salarial",
      },
      {
        label: "Tendencias Salariales",
        path: "/salary-trends",
        description: "Análisis histórico y proyecciones de mercado",
      },
      {
        label: "Alertas de Ofertas Externas",
        path: "/external-offer-alerts",
        description: "Empleados clave en riesgo de recibir ofertas externas",
      },
      {
        label: "Planificador Presupuestario",
        path: "/budget-planner",
        description: "Simula y optimiza ajustes salariales múltiples",
      },
      {
        label: "Análisis de Equidad Salarial",
        path: "/salary-equity",
        description: "NMX-R-025-SCFI-2015 - Igualdad laboral",
      },
      {
        label: "Análisis de Clima Laboral",
        path: "/climate-analysis",
        description: "Satisfacción organizacional y correlaciones",
      },
      {
        label: "Planes de Carrera",
        path: "/career-planning",
        description: "Desarrollo profesional y rutas de crecimiento",
      },
    ],
  },
  {
    icon: ShieldCheck,
    label: "Prevención de Riesgos Psicosociales",
    description: "Identificación, análisis y prevención de factores de riesgo",
    roles: ["admin", "committee"],
    submenu: [
      {
        label: "Gestión de Casos",
        path: "/cases",
        description: "Seguimiento de casos de riesgo psicosocial",
      },
      {
        label: "Gestión de Casos Manuales",
        path: "/cases-management",
        description: "Crear y gestionar casos manualmente",
      },
      {
        label: "Métricas de Casos",
        path: "/cases/metrics",
        description: "Análisis y tendencias de casos",
      },
      {
        label: "Análisis Predictivo",
        path: "/predictive-analytics",
        description: "Identificación temprana de empleados en riesgo",
      },
      {
        label: "Análisis de Causas Raíz",
        path: "/root-cause-analysis",
        description: "Identificación de patrones con IA en casos cerrados",
      },
      {
        label: "Seguimiento de Recomendaciones",
        path: "/recommendations-tracking",
        description:
          "Monitoreo de implementación y efectividad de recomendaciones",
      },
      {
        label: "Investigación",
        path: "/cases/investigations",
        description: "Cuestionarios de mobbing y burnout",
      },
      {
        label: "Protocolo de Violencia Laboral",
        path: "/cases/workplace-violence",
        description: "Gestión de casos de violencia laboral",
      },
      {
        label: "Buzón de Quejas",
        path: "/mailbox",
        description: "Buzón de quejas y denuncias anónimas",
      },
      {
        label: "Buzón Comunicación Interna",
        path: "/mailbox-internal",
        description:
          "Sugerencias, quejas, felicitaciones y solicitudes de capacitación",
      },
      {
        label: "Mis Mensajes",
        path: "/my-mailbox",
        description: "Historial de tus mensajes al buzón interno",
      },
      {
        label: "📬 Buzón NOM-035",
        path: "/buzon-comunicacion",
        description:
          "Quejas/Denuncias, Felicitaciones, Solicitudes DNC y Sugerencias con folio de seguimiento",
      },
      {
        label: "🔍 Consultar Folio (Buzón)",
        path: "/buzon/consulta",
        description:
          "Portal público para consultar el estado de una solicitud usando el folio generado",
      },
      {
        label: "🧠 Expediente Clínico Psicométrico",
        path: "/clinical-records",
        description:
          "Historia clínica, evaluaciones y notas de sesión (acceso restringido a personal clínico)",
      },
      {
        label: "Análisis de Riesgos",
        path: "/risk-analysis",
        description: "Reportes de análisis de riesgos psicosociales",
      },
      {
        label: "Acciones Correctivas",
        path: "/surveys/corrective-actions",
        description: "Plan de acciones para mitigar riesgos",
      },
      {
        label: "Alertas Tempranas",
        path: "/alerts",
        description: "Dashboard de alertas críticas",
      },
      {
        label: "Sistema de Alertas",
        description: "Gestión y análisis de alertas",
        submenu: [
          {
            label: "🔔 Centro de Alertas (unificado)",
            path: "/alerts-central",
            description:
              "Vista unificada: alertas activas, métricas, configuración e IA predictiva",
          },
          {
            label: "Histórico de Alertas",
            path: "/alert-history",
            description: "Registro completo de alertas",
          },
          {
            label: "Historial de Notificaciones",
            path: "/notifications/history",
            description: "Registro de notificaciones push",
          },
          {
            label: "Configuración de Umbrales",
            path: "/alert-thresholds",
            description: "Configurar umbrales de alertas",
          },
          {
            label: "Configuración de Reportes",
            path: "/alert-reports-config",
            description: "Frecuencia de reportes automáticos",
          },
        ],
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
          {
            label: "Miembros del Comité",
            path: "/committee",
            description: "Gestión de miembros del comité",
          },
          {
            label: "Programa de Capacitación",
            path: "/committee/training",
            description: "Programas de capacitación del comité",
          },
          {
            label: "Gestión de Capacitaciones",
            path: "/committee-trainings-management",
            description: "Administrar catálogo de capacitaciones",
          },
          {
            label: "Mis Capacitaciones",
            path: "/my-committee-trainings",
            description: "Ver y completar mis capacitaciones asignadas",
          },
          {
            label: "Dashboard de Evaluaciones",
            path: "/training-evaluations",
            description: "Análisis de calidad y efectividad de capacitaciones",
          },
          {
            label: "Alertas Inteligentes con IA",
            path: "/intelligent-alerts",
            description: "Detección proactiva de patrones de riesgo emergentes",
          },
          {
            label: "Dashboard de ROI de Capacitaciones",
            path: "/training-roi",
            description: "Análisis financiero y retorno de inversión",
          },
          {
            label: "Benchmarking Sectorial",
            path: "/benchmarking",
            description: "Comparación con promedios del sector/industria",
          },
          {
            label: "Planes de Acción Correctiva",
            path: "/corrective-action-plans",
            description: "Workflow completo con firma digital y evidencias",
          },
          {
            label: "Análisis de Impacto de Intervenciones",
            path: "/intervention-impact",
            description:
              "Mide efectividad de acciones correctivas y correlación con reducción de casos",
          },
          {
            label: "Historial de Reportes Compartidos",
            path: "/shared-reports-history",
            description:
              "Rastreo de reportes compartidos por canal, fecha y destinatarios",
          },
          {
            label: "Acta Constitutiva",
            path: "/committee/constitutive-act",
            description: "Documento de constitución del comité",
          },
          {
            label: "Bases de Funcionamiento",
            path: "/committee-operating-rules",
            description: "Reglamento interno del comité con versionado",
          },
          {
            label: "Auditoría de Firmas",
            path: "/signature-audit",
            description: "Historial completo de firmas digitales del sistema",
          },
          {
            label: "Métricas de Aprobaciones",
            path: "/approval-metrics",
            description: "Análisis de eficiencia del proceso de aprobación",
          },
          {
            label: "Calendario de Deadlines",
            path: "/approval-calendar",
            description: "Visualiza fechas límite de aprobaciones",
          },
          {
            label: "Cumplimiento de Plazos",
            path: "/deadline-compliance",
            description: "Dashboard de cumplimiento y cuellos de botella",
          },
          {
            label: "Aceptación de Cargo",
            path: "/committee/position-acceptance",
            description: "Documento de aceptación de cargo",
          },
          {
            label: "Actas de Reunión",
            path: "/committee-minutes",
            description: "Gestión de actas de reuniones del comité",
          },
          {
            label: "Catálogo de Destinatarios",
            path: "/committee/minute-recipients",
            description: "Gestión de destinatarios para el envío de minutas",
          },
          {
            label: "Panel de Despachos",
            path: "/committee/dispatches",
            description: "Trazabilidad global de envíos de minutas",
          },
          {
            label: "Reportes Anuales",
            path: "/committee-annual-reports",
            description: "Reportes anuales del comité NOM-035",
          },
          {
            label: "Seguimiento de Acuerdos",
            path: "/agreements-dashboard",
            description: "Dashboard de seguimiento de acuerdos",
          },
        ],
      },
      {
        label: "Cumplimiento NOM-035",
        path: "/compliance",
        description: "Checklist de cumplimiento normativo",
      },
      {
        label: "Verificación Numerales 7 y 8",
        path: "/compliance/numerals",
        description: "Verificación automática de obligaciones",
      },
      {
        label: "Historial de Reportes",
        path: "/compliance/reports-history",
        description: "Consulta y re-descarga de reportes",
      },
      {
        label: "Políticas",
        path: "/nom035/policies",
        description: "Políticas de prevención de riesgos",
      },
      {
        label: "Matriz de Acciones y Evidencias",
        path: "/nom035-matrix",
        description:
          "Planes de intervención, seguimiento de acciones y evidencias de cumplimiento",
      },
      {
        label: "Dashboard de Cumplimiento",
        path: "/nom035-compliance",
        description:
          "Semáforos, KPIs, gráficos de avance y alertas de acciones vencidas",
      },
      {
        label: "Reporte de Bitácora",
        path: "/audit-log-report",
        description:
          "Historial completo de cambios de estado y responsables — auditoría interna",
      },
      {
        label: "Comité NOM-035",
        path: "/committee-module",
        description:
          "Integrantes, convocatorias, actas digitales con firma y seguimiento de acuerdos",
      },
      {
        label: "Visitas de Verificación STPS",
        path: "/stps-inspections",
        description:
          "Registro de visitas de inspección STPS con checklist NOM-035 y expediente de respuesta",
      },
      {
        label: "Constancias DC-3 STPS",
        path: "/dc3-manager",
        description:
          "Gestión de constancias de capacitación DC-3: importar desde Excel, exportar para SIRCE-STPS",
      },
      {
        label: "Dashboard DC-3",
        path: "/dc3-dashboard",
        description:
          "Estadísticas de constancias emitidas por mes, empresa y área temática con gráficas interactivas",
      },
      {
        label: "Firmantes DC-3",
        path: "/dc3-signers",
        description:
          "Catálogo de firmantes autorizados para constancias DC-3 (instructor, patrón, rep. trabajadores)",
      },
      {
        label: "Catálogo de Formatos",
        path: "/format-catalog",
        description:
          "Versiones oficiales de formatos DC-3 y otros documentos normativos. La versión activa define la nomenclatura del folio en el PDF.",
      },
      {
        label: "Historial SIRCE",
        path: "/sirce-history",
        description:
          "Registro de todos los archivos XML exportados para el Sistema de Registro de Constancias de Empresas (SIRCE-STPS) con opción de re-descarga.",
      },
      {
        label: "Sincronización Google Calendar",
        path: "/google-calendar",
        description:
          "Exporta reuniones del comité, vencimientos de contratos y fechas límite a Google Calendar",
      },
      {
        label: "Comunicación Interna",
        path: "/internal-comms",
        description:
          "Tablero de avisos, comunicados con acuse de recibo digital y canal de sugerencias anónimas",
      },
      {
        label: "Carpeta de Evidencias STPS",
        path: "/evidences-folder",
        description: "Carpeta de evidencias NOM-035 organizada por numerales",
      },
      {
        label: "Carpeta de Evidencias NMX-025",
        path: "/nmx025-evidences-folder",
        description:
          "Carpeta de evidencias de Igualdad Laboral y No Discriminación",
      },
      {
        label: "Tendencias Departamentales",
        path: "/departmental-trends",
        description:
          "Heat map de concentración de casos y niveles de riesgo por departamento",
      },
      {
        label: "Encuestas Post-Caso",
        path: "/post-case-surveys",
        description:
          "Seguimiento 30/60/90 días y medición de efectividad de intervenciones",
      },
      {
        label: "Informe Numeral 7.5",
        path: "/reports/regulatory",
        description: "Informe de identificación y análisis",
      },
      {
        label: "Cumplimiento por Numeral",
        path: "/compliance/nom035",
        description:
          "Dashboard de cumplimiento NOM-035 con indicadores de semáforo",
      },
    ],
  },
  {
    icon: Scale,
    label: "Igualdad Laboral y No Discriminación",
    description: "Cumplimiento NMX-025-SCFI-2015",
    roles: ["admin"],
    submenu: [
      {
        label: "Política de Igualdad",
        path: "/equality/policy",
        description: "Política institucional de igualdad laboral",
      },
      {
        label: "Indicadores de Brecha Salarial",
        path: "/equality/salary-gap",
        description: "Análisis de brecha salarial por género",
      },
      {
        label: "Acciones Afirmativas",
        path: "/equality/affirmative-actions",
        description: "Programas para promover la igualdad",
      },
      {
        label: "Quejas y Denuncias",
        path: "/equality/complaints",
        description: "Sistema de atención a quejas",
      },
      {
        label: "Comité de Igualdad",
        path: "/equality/committee",
        description: "Comité responsable de la política",
      },
    ],
  },
  {
    icon: PieChart,
    label: "Reportes y Análisis",
    description: "Dashboards, reportes normativos y exportaciones",
    roles: ["admin", "instructor"],
    submenu: [
      {
        label: "Gráficas de Tendencias",
        path: "/trends",
        description: "Evolución temporal de casos y cumplimiento",
      },
      {
        label: "Reportes Normativos",
        path: "/reports/regulatory",
        description: "Reportes para cumplimiento NOM-035 y NMX-025",
      },
      {
        label: "Histórico de Alertas",
        path: "/alert-history",
        description: "Registro de alertas para auditoría",
      },
      {
        label: "Análisis Predictivo",
        path: "/alerts/predictive",
        description: "Predicción de alertas basada en datos históricos",
      },
      {
        label: "Reportes Ejecutivos",
        path: "/executive-reports",
        description: "Generación de reportes ejecutivos en PDF",
      },
      {
        label: "Reporte Ejecutivo Consolidado",
        path: "/executive-report",
        description:
          "KPIs globales NOM-035: empleados, capacitación, vacaciones, casos y buzón",
      },
      {
        label: "📊 Panel KPIs Ejecutivos",
        path: "/kpi-dashboard",
        description:
          "Métricas clave: rotación, % capacitado, bienestar y tendencias históricas",
      },
      {
        label: "🏢 Comparativo por Sucursal",
        path: "/branch-comparative",
        description:
          "Comparativa de rotación, capacitación y riesgo NOM-035 entre sucursales exportable a Excel",
      },
    ],
  },
  {
    icon: Settings,
    label: "Administración",
    description: "Configuración del sistema y gestión de usuarios",
    roles: ["admin"],
    submenu: [
      {
        label: "Usuarios",
        path: "/users",
        description: "Gestión de usuarios y permisos",
      },
      {
        label: "Sucursales",
        path: "/branches",
        description: "Gestión de sucursales y centros de trabajo",
      },
      {
        label: "Gestión de Departamentos",
        path: "/department-management",
        description: "Administrar departamentos organizacionales",
      },
      {
        label: "Métricas de Departamentos",
        path: "/department-metrics",
        description: "Estadísticas de rotación, crecimiento y distribución",
      },
      {
        label: "Configuración Algoritmo",
        path: "/algorithm-config",
        description: "Ajustar pesos del algoritmo predictivo",
      },
      {
        label: "Gestión de Rotación",
        path: "/admin/turnover-management",
        description: "Registrar manualmente empleados que rotaron",
      },
      {
        label: "Efectividad del Algoritmo",
        path: "/algorithm-effectiveness",
        description:
          "Análisis de precisión y comparativa predicciones vs realidad",
      },

      {
        label: "Roles y Permisos",
        path: "/administrative/roles-permissions",
        description: "Administración de roles y matriz de permisos",
      },
      {
        label: "Permisos Personalizados",
        path: "/administrative/custom-permissions",
        description: "Asignar permisos específicos por usuario",
      },
      {
        label: "Auditoría de Permisos",
        path: "/administrative/permission-audit",
        description: "Historial de cambios de roles y permisos",
      },
      {
        label: "Configuración SMTP",
        path: "/administrative/smtp-config",
        description: "Configurar servidor de correo electrónico",
      },
      {
        label: "Configuración",
        path: "/settings",
        description: "Configuración general del sistema",
      },
      {
        label: "Preferencias de Notificaciones",
        path: "/settings/notifications",
        description: "Personalizar tipos y frecuencia de notificaciones",
      },
      {
        label: "Historial de Notificaciones",
        path: "/notifications/history",
        description: "Auditoría completa de notificaciones enviadas",
      },
      {
        label: "Catálogo de Formatos",
        path: "/document-formats",
        description: "Nomenclatura de folios para documentos",
      },
      {
        label: "Plantillas de Reportes",
        path: "/report-templates",
        description: "Plantillas personalizables HTML/CSS",
      },
      {
        label: "Auditoría de Documentos",
        path: "/document-audit",
        description: "Registro de accesos y descargas",
      },
      {
        label: "Alertas de Seguridad",
        path: "/security-alerts",
        description: "Monitoreo de actividad sospechosa",
      },
      {
        label: "Monitoreo de Jobs",
        path: "/job-monitoring",
        description: "Historial y ejecución manual de jobs automáticos",
      },
      {
        label: "Estado de Jobs (Sprint 54)",
        path: "/admin/jobs",
        description:
          "Estado en tiempo real: notificaciones enviadas, omitidas y errores por job",
      },
      {
        label: "Configuración de Reportes",
        path: "/report-configuration",
        description: "Gestionar reportes ejecutivos automatizados",
      },
      {
        label: "Visitas por Empresa",
        path: "/company-visits",
        description: "Contador de visitas y páginas más visitadas por empresa",
      },
      {
        label: "Importación Masiva",
        path: "/admin/import",
        description:
          "Importar datos masivamente desde Excel (empleados, cursos, departamentos)",
      },
      {
        label: "Informes de Errores",
        path: "/bug-reports",
        description: "Reporte y seguimiento de errores del sistema",
      },
      {
        label: "Peticiones de Mejora",
        path: "/feature-requests",
        description:
          "Solicitudes de nuevas funcionalidades con indicador de % implementadas",
      },
      {
        label: "⚡ Core Web Vitals",
        path: "/web-vitals",
        description:
          "Dashboard de métricas de rendimiento: LCP, CLS, INP, FCP, TTFB",
      },
    ],
  },
  {
    icon: Shield,
    label: "Super Administrador",
    description: "Gestión global de empresas y usuarios del sistema",
    roles: ["super_admin"],
    submenu: [
      {
        label: "Panel Super Admin",
        path: "/super-admin",
        description:
          "Gestión de empresas, usuarios cross-tenant y estadísticas globales",
      },
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
  // Un solo useAuth() para todo el componente — evitar llamadas duplicadas al hook
  const { loading, user, isUnauthenticated, logout } = useAuth();
  const { isConnected, lastAlert, requestNotificationPermission } =
    useWebSocket();
  const [location] = useLocation();
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);

  // Verificar si el usuario ya aceptó los términos
  const { data: termsStatus } = trpc.terms.hasAccepted.useQuery(undefined, {
    enabled: !!user,
  });

  useEffect(() => {
    if (termsStatus !== undefined) {
      setTermsAccepted(termsStatus.accepted);
    }
  }, [termsStatus]);

  // Solicitar permiso para notificaciones al montar
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Mostrar alerta cuando se reciba una nueva
  useEffect(() => {
    if (lastAlert) {
      alert(
        `⚠️ ALERTA CRÍTICA NOM-035\n\n${lastAlert.description}\n\nValor actual: ${lastAlert.currentValue}\nUmbral: ${lastAlert.threshold}`
      );
    }
  }, [lastAlert]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  // CORRECCIÓN CICLO INFINITO: redirect con throttle anti-ciclo en useEffect,
  // nunca en render. Solo redirigir si hay un 401 explícito (isUnauthenticated),
  // no por timeout o error de red (cold start Cloud Run).
  const dashRedirectedRef = useRef(false);
  useEffect(() => {
    if (loading || user) {
      if (user) dashRedirectedRef.current = false;
      return;
    }
    if (!isUnauthenticated) return; // error de red/timeout — NO redirigir
    if (typeof window === "undefined") return;
    const currentPath = window.location.pathname;
    const isInAuthFlow =
      currentPath.includes("/oauth/callback") ||
      currentPath.includes("/manus-oauth/") ||
      currentPath === "/login-error" ||
      currentPath === "/login";
    if (isInAuthFlow) return;
    const lastRedirect = sessionStorage.getItem("_last_login_redirect");
    const now = Date.now();
    if (lastRedirect && now - parseInt(lastRedirect, 10) < 3000) return;
    if (dashRedirectedRef.current) return;
    dashRedirectedRef.current = true;
    sessionStorage.setItem("_last_login_redirect", String(now));
    window.location.href = getLoginUrl(currentPath);
  }, [loading, user, isUnauthenticated]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    // Mostrar spinner mientras se ejecuta el redirect en el useEffect
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const showTermsModal =
    !!user && termsStatus !== undefined && !termsStatus?.accepted;

  return (
    <>
      <TermsAcceptanceModal
        open={showTermsModal}
        onAccepted={() => setTermsAccepted(true)}
      />
      <SidebarProvider
        style={
          {
            "--sidebar-width": `${sidebarWidth}px`,
          } as CSSProperties
        }
      >
        <DashboardLayoutContent
          setSidebarWidth={setSidebarWidth}
          user={user}
          logout={logout}
        >
          {children}
        </DashboardLayoutContent>
      </SidebarProvider>
    </>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  // Recibir user/logout del padre para evitar un segundo useAuth() que compita
  user: ReturnType<typeof useAuth>["user"];
  logout: ReturnType<typeof useAuth>["logout"];
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
  user,
  logout,
}: DashboardLayoutContentProps) {
  // user y logout vienen del componente padre (DashboardLayout) para evitar
  // un segundo suscriptor de auth.me que compita y cause ciclo infinito de login
  const [location, setLocation] = useLocation();

  // Obtener contadores dinámicos para badges
  const { data: counters } = trpc.menuCounters.getAll.useQuery(undefined, {
    refetchInterval: 2 * 60 * 1000, // Actualizar cada 2 minutos (reducido de 1 min)
    staleTime: 1 * 60 * 1000, // 1 minuto - contadores cambian frecuentemente
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
    enabled: !!user, // ANTI-CICLO: no ejecutar sin sesión activa (evita UNAUTHORIZED que dispara redirect)
  });

  // Obtener contador de encuestas urgentes (enviadas >5 días sin respuesta)
  const { data: urgentSurveys } =
    trpc.postCaseSurveys.getUrgentPendingCount.useQuery(undefined, {
      refetchInterval: 5 * 60 * 1000, // Actualizar cada 5 minutos
      staleTime: 3 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      enabled: !!user, // ANTI-CICLO: no ejecutar sin sesión activa
    });
  const urgentSurveysCount = urgentSurveys?.count ?? 0;

  // Estado del sistema de correo (badge en enlace SMTP del menú)
  const { data: emailStatus } = trpc.smtpConfig.getEmailStatus.useQuery(
    undefined,
    {
      refetchInterval: 5 * 60 * 1000,
      staleTime: 3 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      enabled: user?.role === "admin",
    }
  );
  const emailStatusBadge =
    emailStatus?.status === "paused"
      ? "Pausado"
      : emailStatus?.status === "no_smtp"
        ? "Sin SMTP"
        : null;

  // Cola de correos pendientes (badge de alerta en menú SMTP)
  const { data: emailQueuePending } = trpc.smtpConfig.getEmailQueue.useQuery(
    { status: "pending", limit: 100 },
    {
      refetchInterval: 5 * 60 * 1000,
      staleTime: 3 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      enabled: user?.role === "admin",
    }
  );
  const pendingEmailCount = emailQueuePending?.total ?? 0;

  // Obtener contador de reconocimientos no leídos
  const { data: recognitionsCount } = trpc.recognitions.getUnreadCount.useQuery(
    undefined,
    {
      refetchInterval: 2 * 60 * 1000, // Actualizar cada 2 minutos (reducido de 1 min)
      staleTime: 1 * 60 * 1000, // 1 minuto - reconocimientos cambian frecuentemente
      gcTime: 5 * 60 * 1000, // 5 minutos en cache
      enabled: !!user, // ANTI-CICLO: no ejecutar sin sesión activa
    }
  );
  const { data: mailboxUnread } = trpc.internalMailbox.getUnreadCount.useQuery(
    undefined,
    {
      refetchInterval: 2 * 60 * 1000,
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      enabled: !!user, // ANTI-CICLO: no ejecutar sin sesión activa
    }
  );
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [openSubmenus, setOpenSubmenus] = useState<string[]>(() => {
    // Cargar estado de localStorage
    const saved = localStorage.getItem("open-submenus");
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
    localStorage.setItem("open-submenus", JSON.stringify(openSubmenus));
  }, [openSubmenus]);

  // Expansión automática del menú que contiene la ruta activa
  useEffect(() => {
    if (!location || location === "/") return;

    // Buscar menú principal que contiene la ruta activa
    menuItems.forEach((item, index) => {
      const itemKey = `menu-${index}`;

      // Verificar si la ruta activa está en submenús de nivel 1
      if (item.submenu) {
        const hasActiveSubmenu = item.submenu.some(
          (sub: any) => sub.path === location
        );
        if (hasActiveSubmenu && !openSubmenus.includes(itemKey)) {
          setOpenSubmenus(prev => [...prev, itemKey]);
        }

        // Verificar si la ruta activa está en submenús de nivel 2
        item.submenu.forEach((subItem: any, subIndex: number) => {
          if ("submenu" in subItem && subItem.submenu) {
            const hasActiveNestedSubmenu = subItem.submenu.some(
              (nested: any) => nested.path === location
            );
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
          <SidebarHeader className="h-auto justify-center pb-1">
            <div className="flex items-center gap-3 px-2 pt-3 transition-all w-full">
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
            {!isCollapsed && (
              <div className="px-2 pb-2 pt-1">
                <div className="relative">
                  <svg
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar módulo..."
                    value={sidebarSearch}
                    onChange={e => setSidebarSearch(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 text-xs bg-muted/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            )}
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems
                .filter(item => {
                  if (!item.roles.includes(user?.role || "student"))
                    return false;
                  if (!sidebarSearch.trim()) return true;
                  const q = sidebarSearch.toLowerCase();
                  // Buscar en el label del menú principal
                  if (item.label.toLowerCase().includes(q)) return true;
                  // Buscar en submenús de nivel 1
                  if ("submenu" in item && item.submenu) {
                    return item.submenu.some((sub: any) => {
                      if (sub.label?.toLowerCase().includes(q)) return true;
                      // Buscar en submenús de nivel 2
                      if ("submenu" in sub && sub.submenu) {
                        return sub.submenu.some((nested: any) =>
                          nested.label?.toLowerCase().includes(q)
                        );
                      }
                      return false;
                    });
                  }
                  return false;
                })
                .map((item, index) => {
                  const itemKey = `menu-${index}`;
                  const isActive = item.path ? location === item.path : false;
                  const hasSubmenu = "submenu" in item && item.submenu;
                  const isSubmenuOpen = openSubmenus.includes(itemKey);
                  const isSubmenuItemActive =
                    hasSubmenu &&
                    item.submenu?.some((sub: any) => sub.path === location);

                  return (
                    <div key={itemKey}>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={isActive || isSubmenuItemActive}
                          onClick={() =>
                            hasSubmenu
                              ? toggleSubmenu(itemKey, true)
                              : item.path && setLocation(item.path)
                          }
                          tooltip={(item as any).description || item.label}
                          className={`h-10 transition-all font-normal`}
                        >
                          <item.icon
                            className={`h-4 w-4 ${isActive || isSubmenuItemActive ? "text-primary" : ""}`}
                          />
                          <span>{item.label}</span>
                          {/* Badges dinámicos */}
                          {item.label ===
                            "Prevención de Riesgos Psicosociales" &&
                            counters?.cases && (
                              <MenuBadge
                                count={
                                  counters.cases.open +
                                  counters.cases.investigating
                                }
                                variant="danger"
                              />
                            )}{" "}
                          {item.label === "Cumplimiento Normativo" &&
                            urgentSurveysCount > 0 && (
                              <MenuBadge
                                count={urgentSurveysCount}
                                variant="danger"
                              />
                            )}{" "}
                          {item.label === "Capacitación y Desarrollo" &&
                            counters?.courses && (
                              <MenuBadge
                                count={counters.courses.published}
                                variant="info"
                              />
                            )}
                          {hasSubmenu && (
                            <div className="ml-auto">
                              {isSubmenuOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </div>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {hasSubmenu && isSubmenuOpen && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item.submenu?.map(
                            (subItem: any, subIndex: number) => {
                              const subItemKey =
                                subItem.path || `submenu-${index}-${subIndex}`;
                              const isSubActive = subItem.path
                                ? location === subItem.path
                                : false;
                              const hasNestedSubmenu =
                                "submenu" in subItem && subItem.submenu;
                              const isNestedSubmenuOpen =
                                openSubmenus.includes(subItemKey);
                              const isNestedSubmenuItemActive =
                                hasNestedSubmenu &&
                                subItem.submenu?.some(
                                  (nested: any) => nested.path === location
                                );

                              return (
                                <div key={subItemKey}>
                                  <SidebarMenuItem>
                                    <SidebarMenuButton
                                      isActive={
                                        isSubActive || isNestedSubmenuItemActive
                                      }
                                      onClick={() =>
                                        hasNestedSubmenu
                                          ? toggleSubmenu(subItemKey)
                                          : subItem.path &&
                                            setLocation(subItem.path)
                                      }
                                      tooltip={
                                        subItem.description || subItem.label
                                      }
                                      className="h-9 text-sm font-normal"
                                    >
                                      <span>{subItem.label}</span>
                                      {/* Badges en submenús */}
                                      {subItem.label === "Casos" &&
                                        counters?.cases && (
                                          <MenuBadge
                                            count={counters.cases.open}
                                            variant="danger"
                                          />
                                        )}
                                      {subItem.label === "Buzón" &&
                                        counters?.mailbox && (
                                          <MenuBadge
                                            count={counters.mailbox.pending}
                                            variant="danger"
                                          />
                                        )}
                                      {subItem.label ===
                                        "Encuestas Post-Caso" &&
                                        urgentSurveysCount > 0 && (
                                          <MenuBadge
                                            count={urgentSurveysCount}
                                            variant="danger"
                                          />
                                        )}
                                      {subItem.label === "Reconocimientos" &&
                                        recognitionsCount &&
                                        recognitionsCount.count > 0 && (
                                          <MenuBadge
                                            count={recognitionsCount.count}
                                            variant="info"
                                          />
                                        )}
                                      {subItem.label === "Mis Mensajes" &&
                                        mailboxUnread &&
                                        mailboxUnread.count > 0 && (
                                          <MenuBadge
                                            count={mailboxUnread.count}
                                            variant="danger"
                                          />
                                        )}
                                      {subItem.label ===
                                        "Configuración SMTP" && (
                                        <span className="ml-auto flex items-center gap-1 shrink-0">
                                          {pendingEmailCount > 0 && (
                                            <span
                                              className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none bg-blue-600 text-white"
                                              title={`${pendingEmailCount} correos en cola`}
                                            >
                                              {pendingEmailCount > 99
                                                ? "99+"
                                                : pendingEmailCount}
                                            </span>
                                          )}
                                          {emailStatusBadge && (
                                            <span
                                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold leading-none uppercase tracking-wide ${
                                                emailStatus?.status === "paused"
                                                  ? "bg-amber-400 text-white"
                                                  : "bg-red-500 text-white"
                                              }`}
                                            >
                                              {emailStatusBadge}
                                            </span>
                                          )}
                                        </span>
                                      )}
                                      {hasNestedSubmenu && (
                                        <div className="ml-auto">
                                          {isNestedSubmenuOpen ? (
                                            <ChevronDown className="h-3 w-3" />
                                          ) : (
                                            <ChevronRight className="h-3 w-3" />
                                          )}
                                        </div>
                                      )}
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                  {hasNestedSubmenu && isNestedSubmenuOpen && (
                                    <div className="ml-6 mt-1 space-y-1">
                                      {subItem.submenu?.map(
                                        (
                                          nestedItem: any,
                                          nestedIndex: number
                                        ) => {
                                          const nestedItemKey =
                                            nestedItem.path ||
                                            `nested-${index}-${subIndex}-${nestedIndex}`;
                                          const isNestedActive = nestedItem.path
                                            ? location === nestedItem.path
                                            : false;
                                          return (
                                            <SidebarMenuItem
                                              key={nestedItemKey}
                                            >
                                              <SidebarMenuButton
                                                isActive={isNestedActive}
                                                onClick={() =>
                                                  nestedItem.path &&
                                                  setLocation(nestedItem.path)
                                                }
                                                tooltip={
                                                  nestedItem.description ||
                                                  nestedItem.label
                                                }
                                                className="h-8 text-xs font-normal"
                                              >
                                                <span>{nestedItem.label}</span>
                                              </SidebarMenuButton>
                                            </SidebarMenuItem>
                                          );
                                        }
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                          )}
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
        <footer className="border-t bg-muted/30 px-6 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>
                © {new Date().getFullYear()} Plataforma NOM-035 STPS 2018.
              </span>
              <span>Todos los derechos reservados.</span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/legal"
                className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
              >
                Aviso Legal y Privacidad
              </a>
              <span className="text-muted-foreground/50">|</span>
              <a
                href="/legal#terminos"
                className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
              >
                Términos de Uso
              </a>
              <span className="text-muted-foreground/50">|</span>
              <span>NOM-035-STPS-2018 • LFPDPPP</span>
            </div>
          </div>
        </footer>
      </SidebarInset>
    </>
  );
}
