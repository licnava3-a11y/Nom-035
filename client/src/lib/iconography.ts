/**
 * Estándar de Iconografía del Sistema NOM-035
 * 
 * Este archivo define el mapeo estándar de iconos para mantener consistencia visual
 * en todo el sistema. Todos los iconos provienen de Lucide React.
 * 
 * Uso:
 * import { ICONS } from '@/lib/iconography';
 * <ICONS.actions.create className="h-4 w-4" />
 */

import {
  // Acciones CRUD
  Plus,
  Edit,
  Trash2,
  Save,
  Eye,
  Download,
  Upload,
  Search,
  Filter,
  
  // Estados
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  HelpCircle,
  Clock,
  Loader2,
  
  // Navegación
  Home,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  
  // Documentos
  FileText,
  FileSpreadsheet,
  FileCheck,
  FileKey,
  Image,
  
  // Usuarios
  User,
  Users,
  Shield,
  UserCog,
  GraduationCap,
  
  // Datos y Métricas
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Sparkles,
  
  // Comunicación
  Mail,
  Phone,
  MessageSquare,
  Bell,
  BellOff,
  Send,
  
  // Fechas
  Calendar,
  
  // Organizacional
  Building2,
  Network,
  Briefcase,
  
  // Configuración
  Settings,
  RefreshCw,
  RotateCcw,
  
  // Otros comunes
  Play,
  BookOpen,
  ClipboardCheck,
  Receipt,
  DollarSign,
  MapPin,
  
  type LucideIcon,
} from 'lucide-react';

/**
 * Mapeo estándar de iconos por categoría
 */
export const ICONS = {
  /**
   * Acciones principales (CRUD y operaciones comunes)
   */
  actions: {
    create: Plus,           // Crear/Agregar nuevo elemento
    edit: Edit,            // Editar elemento existente
    delete: Trash2,        // Eliminar elemento
    save: Save,            // Guardar cambios
    view: Eye,             // Ver detalles
    download: Download,    // Descargar archivo
    upload: Upload,        // Subir archivo
    search: Search,        // Buscar elementos
    filter: Filter,        // Filtrar resultados
    refresh: RefreshCw,    // Actualizar/Refrescar
    undo: RotateCcw,       // Deshacer acción
    send: Send,            // Enviar (email, formulario)
    play: Play,            // Reproducir/Iniciar
  },
  
  /**
   * Estados y alertas
   */
  status: {
    success: CheckCircle2,      // Operación exitosa
    error: XCircle,             // Error crítico
    warning: AlertTriangle,     // Advertencia importante
    alert: AlertCircle,         // Alerta general
    info: Info,                 // Información general
    help: HelpCircle,           // Ayuda contextual
    pending: Clock,             // En espera/Pendiente
    loading: Loader2,           // Cargando (animado)
  },
  
  /**
   * Navegación
   */
  navigation: {
    home: Home,                 // Inicio
    back: ArrowLeft,            // Regresar (navegación principal)
    forward: ArrowRight,        // Avanzar (navegación principal)
    previous: ChevronLeft,      // Anterior (paginación)
    next: ChevronRight,         // Siguiente (paginación)
    external: ExternalLink,     // Enlace externo
  },
  
  /**
   * Documentos y archivos
   */
  documents: {
    generic: FileText,          // Documento genérico
    spreadsheet: FileSpreadsheet, // Excel/Hoja de cálculo
    verified: FileCheck,        // Documento verificado
    signed: FileKey,            // Documento firmado
    image: Image,               // Archivo de imagen
  },
  
  /**
   * Usuarios y roles
   */
  users: {
    single: User,               // Usuario individual
    multiple: Users,            // Múltiples usuarios
    committee: Shield,          // Comité/Autoridad
    admin: Shield,              // Administrador
    settings: UserCog,          // Configuración de usuario
    instructor: GraduationCap,  // Instructor/Capacitador
  },
  
  /**
   * Datos y métricas
   */
  data: {
    chart: BarChart3,           // Gráfico de barras
    trendUp: TrendingUp,        // Tendencia ascendente
    trendDown: TrendingDown,    // Tendencia descendente
    activity: Activity,         // Actividad/Pulso
    target: Target,             // Objetivo/Meta
    ai: Sparkles,               // Funciones de IA
  },
  
  /**
   * Comunicación
   */
  communication: {
    email: Mail,                // Correo electrónico
    phone: Phone,               // Teléfono
    message: MessageSquare,     // Mensaje/Chat
    notification: Bell,         // Notificación activa
    notificationOff: BellOff,   // Notificación silenciada
  },
  
  /**
   * Fechas y tiempo
   */
  datetime: {
    calendar: Calendar,         // Calendario/Fecha
    clock: Clock,               // Reloj/Hora
  },
  
  /**
   * Organizacional
   */
  organization: {
    building: Building2,        // Edificio/Empresa
    department: Network,        // Departamento/Red
    position: Briefcase,        // Puesto de trabajo
  },
  
  /**
   * Configuración y herramientas
   */
  tools: {
    settings: Settings,         // Configuración general
    security: Shield,           // Seguridad/Protección
  },
  
  /**
   * Otros iconos comunes
   */
  misc: {
    checklist: ClipboardCheck,  // Lista de verificación
    book: BookOpen,             // Libro/Curso
    receipt: Receipt,           // Recibo/Factura
    money: DollarSign,          // Dinero/Presupuesto
    location: MapPin,           // Ubicación/Mapa
  },
} as const;

/**
 * Tamaños estándar de iconos según contexto
 */
export const ICON_SIZES = {
  xs: 'h-3 w-3',      // Extra pequeño (badges, inline text)
  sm: 'h-4 w-4',      // Pequeño (botones, acciones inline)
  md: 'h-5 w-5',      // Mediano (headers de sección)
  lg: 'h-6 w-6',      // Grande (títulos principales)
  xl: 'h-8 w-8',      // Extra grande (iconos decorativos)
  '2xl': 'h-12 w-12', // Muy grande (estados vacíos, landing pages)
} as const;

/**
 * Colores semánticos para iconos según estado
 */
export const ICON_COLORS = {
  success: 'text-green-600',
  error: 'text-destructive',
  warning: 'text-yellow-600',
  info: 'text-blue-600',
  neutral: 'text-muted-foreground',
  active: 'text-foreground',
  primary: 'text-primary',
} as const;

/**
 * Helper para obtener clases de icono con tamaño y color
 * 
 * @example
 * getIconClasses('sm', 'success') // 'h-4 w-4 text-green-600'
 */
export function getIconClasses(
  size: keyof typeof ICON_SIZES = 'sm',
  color?: keyof typeof ICON_COLORS
): string {
  const sizeClass = ICON_SIZES[size];
  const colorClass = color ? ICON_COLORS[color] : '';
  return `${sizeClass} ${colorClass}`.trim();
}

/**
 * Type helper para iconos de Lucide
 */
export type IconComponent = LucideIcon;
