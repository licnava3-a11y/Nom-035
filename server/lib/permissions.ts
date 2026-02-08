/**
 * Sistema de Permisos Granulares NOM-035
 * 
 * Este módulo implementa el sistema de roles y permisos para controlar
 * el acceso a los diferentes módulos del sistema según el rol del usuario.
 */

import { getDb } from '../db';
import { rolePermissions, userPermissions, users } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Módulos del sistema
 */
export const MODULES = [
  'employees',    // Gestión de empleados
  'surveys',      // Encuestas NOM-035
  'cases',        // Casos de riesgo psicosocial
  'courses',      // Cursos de capacitación
  'reports',      // Reportes y análisis
  'committee',    // Comité de atención
  'company',      // Datos de la empresa
  'admin'         // Administración del sistema
] as const;

export type Module = typeof MODULES[number];

/**
 * Acciones disponibles
 */
export const ACTIONS = ['view', 'create', 'edit', 'delete'] as const;
export type Action = typeof ACTIONS[number];

/**
 * Roles del sistema
 */
export const ROLES = [
  'admin',
  'director',
  'responsable_nom035',
  'supervisor',
  'jefe_area',
  'recursos_humanos',
  'demo'
] as const;

export type Role = typeof ROLES[number];

/**
 * Estructura de permisos
 */
export interface Permission {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface ModulePermissions {
  [module: string]: Permission;
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Obtiene los permisos completos de un usuario
 * Combina los permisos del rol con los overrides específicos del usuario
 */
export async function getUserPermissions(userId: number): Promise<ModulePermissions> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Obtener usuario para conocer su rol
  const userResults = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = userResults[0];

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  const userRole = user.role as Role;

  // Obtener permisos del rol
  const rolePerms = await db
    .select()
    .from(rolePermissions)
    .where(eq(rolePermissions.role, userRole));

  // Obtener overrides de permisos del usuario
  const userPerms = await db
    .select()
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));

  // Construir objeto de permisos
  const permissions: ModulePermissions = {};

  // Inicializar con permisos del rol
  for (const perm of rolePerms) {
    permissions[perm.module] = {
      canView: perm.canView,
      canCreate: perm.canCreate,
      canEdit: perm.canEdit,
      canDelete: perm.canDelete,
    };
  }

  // Aplicar overrides de usuario (tienen prioridad)
  for (const perm of userPerms) {
    permissions[perm.module] = {
      canView: perm.canView,
      canCreate: perm.canCreate,
      canEdit: perm.canEdit,
      canDelete: perm.canDelete,
    };
  }

  return permissions;
}

/**
 * Verifica si un usuario tiene un permiso específico en un módulo
 */
export async function checkPermission(
  userId: number,
  module: Module,
  action: Action
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  const modulePerms = permissions[module];

  if (!modulePerms) {
    return false;
  }

  switch (action) {
    case 'view':
      return modulePerms.canView;
    case 'create':
      return modulePerms.canCreate;
    case 'edit':
      return modulePerms.canEdit;
    case 'delete':
      return modulePerms.canDelete;
    default:
      return false;
  }
}

/**
 * Verifica si un usuario tiene alguno de los roles especificados
 */
export async function hasRole(userId: number, roles: Role[]): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const userResults = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = userResults[0];

  if (!user) {
    return false;
  }

  return roles.includes(user.role as Role);
}

/**
 * Verifica si un usuario tiene acceso completo (admin o director)
 */
export async function isAdmin(userId: number): Promise<boolean> {
  return hasRole(userId, ['admin', 'director']);
}

// ============================================================================
// HELPERS DE FORMATO
// ============================================================================

/**
 * Convierte el nombre del rol a formato legible
 */
export function getRoleDisplayName(role: Role): string {
  const roleNames: Record<Role, string> = {
    admin: 'Administrador',
    director: 'Director',
    responsable_nom035: 'Responsable NOM-035',
    supervisor: 'Supervisor',
    jefe_area: 'Jefe de Área',
    recursos_humanos: 'Recursos Humanos',
    demo: 'Demo (Solo Lectura)',
  };

  return roleNames[role] || role;
}

/**
 * Convierte el nombre del módulo a formato legible
 */
export function getModuleDisplayName(module: Module): string {
  const moduleNames: Record<Module, string> = {
    employees: 'Gestión de Empleados',
    surveys: 'Encuestas NOM-035',
    cases: 'Casos de Riesgo Psicosocial',
    courses: 'Cursos de Capacitación',
    reports: 'Reportes y Análisis',
    committee: 'Comité de Atención',
    company: 'Datos de la Empresa',
    admin: 'Administración del Sistema',
  };

  return moduleNames[module] || module;
}

/**
 * Convierte el nombre de la acción a formato legible
 */
export function getActionDisplayName(action: Action): string {
  const actionNames: Record<Action, string> = {
    view: 'Ver',
    create: 'Crear',
    edit: 'Editar',
    delete: 'Eliminar',
  };

  return actionNames[action] || action;
}
