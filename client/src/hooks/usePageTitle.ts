import { useEffect } from "react";
import { useLocation } from "wouter";

const BASE_TITLE = "NOM-035 STPS";

const ROUTE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/consolidated-dashboard": "Dashboard Ejecutivo",
  "/alerts-dashboard": "Alertas",
  "/employees": "Empleados",
  "/employees/new": "Nuevo Empleado",
  "/positions": "Puestos",
  "/competencies": "Competencias",
  "/annual-training-plan": "Plan Anual de Capacitación",
  "/training-dashboard": "Dashboard de Capacitación",
  "/surveys": "Encuestas NOM-035",
  "/psychometric": "Evaluaciones Psicométricas",
  "/exit-interviews": "Entrevistas de Salida",
  "/cases": "Casos y Seguimiento",
  "/corrective-actions": "Acciones Correctivas",
  "/vacation-management": "Gestión de Vacaciones",
  "/vacation-calendar": "Calendario de Vacaciones",
  "/turnover-dashboard": "Dashboard de Rotación",
  "/legal-documents": "Documentos Legales",
  "/executive-report": "Reporte Ejecutivo",
  "/kpi-dashboard": "KPI Dashboard",
  "/report-configuration": "Configuración de Reportes",
  "/internal-mailbox": "Buzón Interno",
  "/my-mailbox": "Mis Mensajes",
  "/committee": "Comité NOM-035",
  "/legal": "Aviso de Privacidad",
  "/settings": "Configuración",
  "/admin": "Administración",
  "/super-admin": "Super Administrador",
  "/profile": "Mi Perfil",
};

/**
 * Hook que actualiza el título de la pestaña del navegador según la ruta activa.
 * Formato: "Módulo | NOM-035 STPS"
 */
export function usePageTitle(customTitle?: string) {
  const [location] = useLocation();

  useEffect(() => {
    let title: string;

    if (customTitle) {
      title = `${customTitle} | ${BASE_TITLE}`;
    } else {
      // Buscar coincidencia exacta primero, luego por prefijo
      const exactMatch = ROUTE_TITLES[location];
      if (exactMatch) {
        title = `${exactMatch} | ${BASE_TITLE}`;
      } else {
        // Buscar por prefijo (ej: /employees/123 → Empleados)
        const prefixMatch = Object.entries(ROUTE_TITLES).find(
          ([route]) => route !== "/" && location.startsWith(route)
        );
        if (prefixMatch) {
          title = `${prefixMatch[1]} | ${BASE_TITLE}`;
        } else {
          title = `Plataforma de Capacitación | ${BASE_TITLE}`;
        }
      }
    }

    document.title = title;
  }, [location, customTitle]);
}
