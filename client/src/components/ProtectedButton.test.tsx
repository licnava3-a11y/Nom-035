import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ProtectedButton } from './ProtectedButton';
import * as usePermissionsModule from '../hooks/usePermissions';

/**
 * Tests de integración para ProtectedButton
 * Valida que los botones se oculten/deshabiliten correctamente según permisos del usuario
 */

// Mock del hook usePermissions
const mockUsePermissions = vi.spyOn(usePermissionsModule, 'usePermissions');

describe('ProtectedButton - Integración con sistema de permisos', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Usuario Admin', () => {
    beforeEach(() => {
      mockUsePermissions.mockReturnValue({
        hasPermission: () => true,
        hasAllPermissions: () => true,
        hasAnyPermission: () => true,
        isAdmin: () => true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canView: true,
        canExport: true,
        canApprove: true,
      });
    });

    it('debe mostrar botón de crear cuando admin tiene permiso', () => {
      render(
        <ProtectedButton permission="can_create">
          Crear Empleado
        </ProtectedButton>
      );
      
      expect(screen.getByText('Crear Empleado')).toBeInTheDocument();
      expect(screen.getByText('Crear Empleado')).not.toBeDisabled();
    });

    it('debe mostrar botón de editar cuando admin tiene permiso', () => {
      render(
        <ProtectedButton permission="can_edit">
          Editar
        </ProtectedButton>
      );
      
      expect(screen.getByText('Editar')).toBeInTheDocument();
      expect(screen.getByText('Editar')).not.toBeDisabled();
    });

    it('debe mostrar botón de eliminar cuando admin tiene permiso', () => {
      render(
        <ProtectedButton permission="can_delete">
          Eliminar
        </ProtectedButton>
      );
      
      expect(screen.getByText('Eliminar')).toBeInTheDocument();
      expect(screen.getByText('Eliminar')).not.toBeDisabled();
    });
  });

  describe('Usuario Regular (sin permisos de escritura)', () => {
    beforeEach(() => {
      mockUsePermissions.mockReturnValue({
        hasPermission: (permission: string) => ['can_view', 'can_export'].includes(permission),
        hasAllPermissions: (permissions: string[]) => permissions.every(p => ['can_view', 'can_export'].includes(p)),
        hasAnyPermission: (permissions: string[]) => permissions.some(p => ['can_view', 'can_export'].includes(p)),
        isAdmin: () => false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canView: true,
        canExport: true,
        canApprove: false,
      });
    });

    it('debe ocultar botón de crear cuando usuario no tiene permiso y hideIfNoPermission=true', () => {
      render(
        <ProtectedButton permission="can_create" hideIfNoPermission={true}>
          Crear Empleado
        </ProtectedButton>
      );
      
      expect(screen.queryByText('Crear Empleado')).not.toBeInTheDocument();
    });

    it('debe deshabilitar botón de editar cuando usuario no tiene permiso y hideIfNoPermission=false', () => {
      render(
        <ProtectedButton permission="can_edit" hideIfNoPermission={false}>
          Editar
        </ProtectedButton>
      );
      
      const button = screen.getByText('Editar');
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
    });

    it('debe mostrar botón de ver cuando usuario tiene permiso can_view', () => {
      render(
        <ProtectedButton permission="can_view">
          Ver Detalles
        </ProtectedButton>
      );
      
      expect(screen.getByText('Ver Detalles')).toBeInTheDocument();
      expect(screen.getByText('Ver Detalles')).not.toBeDisabled();
    });

    it('debe mostrar botón de exportar cuando usuario tiene permiso can_export', () => {
      render(
        <ProtectedButton permission="can_export">
          Exportar
        </ProtectedButton>
      );
      
      expect(screen.getByText('Exportar')).toBeInTheDocument();
      expect(screen.getByText('Exportar')).not.toBeDisabled();
    });
  });

  describe('Usuario Instructor', () => {
    beforeEach(() => {
      mockUsePermissions.mockReturnValue({
        hasPermission: (permission: string) => ['can_create', 'can_edit', 'can_view', 'can_export'].includes(permission),
        hasAllPermissions: (permissions: string[]) => permissions.every(p => ['can_create', 'can_edit', 'can_view', 'can_export'].includes(p)),
        hasAnyPermission: (permissions: string[]) => permissions.some(p => ['can_create', 'can_edit', 'can_view', 'can_export'].includes(p)),
        isAdmin: () => false,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canView: true,
        canExport: true,
        canApprove: false,
      });
    });

    it('debe mostrar botón de crear curso cuando instructor tiene permiso', () => {
      render(
        <ProtectedButton permission="can_create">
          Crear Curso
        </ProtectedButton>
      );
      
      expect(screen.getByText('Crear Curso')).toBeInTheDocument();
      expect(screen.getByText('Crear Curso')).not.toBeDisabled();
    });

    it('debe ocultar botón de eliminar cuando instructor no tiene permiso', () => {
      render(
        <ProtectedButton permission="can_delete" hideIfNoPermission={true}>
          Eliminar
        </ProtectedButton>
      );
      
      expect(screen.queryByText('Eliminar')).not.toBeInTheDocument();
    });
  });

  describe('Usuario Committee (miembro de comité)', () => {
    beforeEach(() => {
      mockUsePermissions.mockReturnValue({
        hasPermission: (permission: string) => ['can_view', 'can_approve'].includes(permission),
        hasAllPermissions: (permissions: string[]) => permissions.every(p => ['can_view', 'can_approve'].includes(p)),
        hasAnyPermission: (permissions: string[]) => permissions.some(p => ['can_view', 'can_approve'].includes(p)),
        isAdmin: () => false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canView: true,
        canExport: false,
        canApprove: true,
      });
    });

    it('debe mostrar botón de aprobar cuando committee tiene permiso', () => {
      render(
        <ProtectedButton permission="can_approve">
          Aprobar Minuta
        </ProtectedButton>
      );
      
      expect(screen.getByText('Aprobar Minuta')).toBeInTheDocument();
      expect(screen.getByText('Aprobar Minuta')).not.toBeDisabled();
    });

    it('debe ocultar botón de crear cuando committee no tiene permiso', () => {
      render(
        <ProtectedButton permission="can_create" hideIfNoPermission={true}>
          Crear
        </ProtectedButton>
      );
      
      expect(screen.queryByText('Crear')).not.toBeInTheDocument();
    });
  });

  describe('Múltiples permisos requeridos', () => {
    beforeEach(() => {
      mockUsePermissions.mockReturnValue({
        hasPermission: (permission: string) => ['can_edit', 'can_view'].includes(permission),
        hasAllPermissions: (permissions: string[]) => permissions.every(p => ['can_edit', 'can_view'].includes(p)),
        hasAnyPermission: (permissions: string[]) => permissions.some(p => ['can_edit', 'can_view'].includes(p)),
        isAdmin: () => false,
        canCreate: false,
        canEdit: true,
        canDelete: false,
        canView: true,
        canExport: false,
        canApprove: false,
      });
    });

    it('debe mostrar botón cuando usuario tiene todos los permisos requeridos', () => {
      render(
        <ProtectedButton permissions={['can_edit', 'can_view']}>
          Editar y Ver
        </ProtectedButton>
      );
      
      expect(screen.getByText('Editar y Ver')).toBeInTheDocument();
      expect(screen.getByText('Editar y Ver')).not.toBeDisabled();
    });

    it('debe ocultar botón cuando usuario no tiene todos los permisos requeridos', () => {
      render(
        <ProtectedButton permissions={['can_edit', 'can_delete']} hideIfNoPermission={true}>
          Editar y Eliminar
        </ProtectedButton>
      );
      
      expect(screen.queryByText('Editar y Eliminar')).not.toBeInTheDocument();
    });
  });
});
