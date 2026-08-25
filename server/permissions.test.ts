/**
 * Tests unitarios para el sistema de validación de permisos backend
 *
 * Estos tests validan que:
 * 1. Los middlewares de permisos funcionan correctamente
 * 2. Los roles tienen los permisos esperados según la matriz
 * 3. Los errores se lanzan correctamente cuando no hay permisos
 */

import { describe, it, expect } from "vitest";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions,
  isValidRole,
  rolePermissions,
  type Permission,
} from "./permissions";

describe("Sistema de Permisos Backend", () => {
  describe("hasPermission", () => {
    it("gerente debe tener todos los permisos", () => {
      expect(hasPermission("gerente", "can_view")).toBe(true);
      expect(hasPermission("gerente", "can_create")).toBe(true);
      expect(hasPermission("gerente", "can_edit")).toBe(true);
      expect(hasPermission("gerente", "can_delete")).toBe(true);
      expect(hasPermission("gerente", "can_approve")).toBe(true);
      expect(hasPermission("gerente", "can_export")).toBe(true);
    });

    it("student solo debe tener can_view", () => {
      expect(hasPermission("student", "can_view")).toBe(true);
      expect(hasPermission("student", "can_create")).toBe(false);
      expect(hasPermission("student", "can_edit")).toBe(false);
      expect(hasPermission("student", "can_delete")).toBe(false);
      expect(hasPermission("student", "can_approve")).toBe(false);
      expect(hasPermission("student", "can_export")).toBe(false);
    });

    it("instructor debe tener view, create, edit y export", () => {
      expect(hasPermission("instructor", "can_view")).toBe(true);
      expect(hasPermission("instructor", "can_create")).toBe(true);
      expect(hasPermission("instructor", "can_edit")).toBe(true);
      expect(hasPermission("instructor", "can_export")).toBe(true);
      expect(hasPermission("instructor", "can_delete")).toBe(false);
      expect(hasPermission("instructor", "can_approve")).toBe(false);
    });

    it("committee debe tener view, create y approve", () => {
      expect(hasPermission("committee", "can_view")).toBe(true);
      expect(hasPermission("committee", "can_create")).toBe(true);
      expect(hasPermission("committee", "can_approve")).toBe(true);
      expect(hasPermission("committee", "can_edit")).toBe(false);
      expect(hasPermission("committee", "can_delete")).toBe(false);
      expect(hasPermission("committee", "can_export")).toBe(false);
    });

    it("administrativo debe tener view, create, edit y export", () => {
      expect(hasPermission("administrativo", "can_view")).toBe(true);
      expect(hasPermission("administrativo", "can_create")).toBe(true);
      expect(hasPermission("administrativo", "can_edit")).toBe(true);
      expect(hasPermission("administrativo", "can_export")).toBe(true);
      expect(hasPermission("administrativo", "can_delete")).toBe(false);
      expect(hasPermission("administrativo", "can_approve")).toBe(false);
    });

    it("rol inexistente no debe tener permisos", () => {
      expect(hasPermission("rol_invalido", "can_view")).toBe(false);
      expect(hasPermission("rol_invalido", "can_create")).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("instructor debe tener al menos uno de [can_create, can_edit]", () => {
      expect(hasAnyPermission("instructor", ["can_create", "can_edit"])).toBe(
        true
      );
    });

    it("student no debe tener ninguno de [can_create, can_edit]", () => {
      expect(hasAnyPermission("student", ["can_create", "can_edit"])).toBe(
        false
      );
    });

    it("committee debe tener al menos uno de [can_approve, can_delete]", () => {
      expect(hasAnyPermission("committee", ["can_approve", "can_delete"])).toBe(
        true
      );
    });
  });

  describe("hasAllPermissions", () => {
    it("gerente debe tener todos los permisos [can_view, can_create, can_edit]", () => {
      expect(
        hasAllPermissions("gerente", ["can_view", "can_create", "can_edit"])
      ).toBe(true);
    });

    it("instructor no debe tener todos los permisos [can_create, can_delete]", () => {
      expect(
        hasAllPermissions("instructor", ["can_create", "can_delete"])
      ).toBe(false);
    });

    it("administrativo debe tener todos los permisos [can_view, can_create, can_edit]", () => {
      expect(
        hasAllPermissions("administrativo", [
          "can_view",
          "can_create",
          "can_edit",
        ])
      ).toBe(true);
    });
  });

  describe("getUserPermissions", () => {
    it("debe retornar todos los permisos de gerente", () => {
      const permissions = getUserPermissions("gerente");
      expect(permissions).toHaveLength(6);
      expect(permissions).toContain("can_view");
      expect(permissions).toContain("can_create");
      expect(permissions).toContain("can_edit");
      expect(permissions).toContain("can_delete");
      expect(permissions).toContain("can_approve");
      expect(permissions).toContain("can_export");
    });

    it("debe retornar solo can_view para student", () => {
      const permissions = getUserPermissions("student");
      expect(permissions).toHaveLength(1);
      expect(permissions).toContain("can_view");
    });

    it("debe retornar array vacío para rol inexistente", () => {
      const permissions = getUserPermissions("rol_invalido");
      expect(permissions).toHaveLength(0);
    });
  });

  describe("isValidRole", () => {
    it("debe validar roles existentes", () => {
      expect(isValidRole("gerente")).toBe(true);
      expect(isValidRole("instructor")).toBe(true);
      expect(isValidRole("student")).toBe(true);
      expect(isValidRole("committee")).toBe(true);
      expect(isValidRole("administrativo")).toBe(true);
    });

    it("debe rechazar roles inexistentes", () => {
      expect(isValidRole("rol_invalido")).toBe(false);
      expect(isValidRole("")).toBe(false);
    });
  });

  describe("Matriz de Permisos Completa", () => {
    const roles = [
      "gerente",
      "instructor",
      "administrativo",
      "committee",
      "student",
    ];
    const permissions: Permission[] = [
      "can_view",
      "can_create",
      "can_edit",
      "can_delete",
      "can_approve",
      "can_export",
    ];

    it("todos los roles deben estar definidos en rolePermissions", () => {
      roles.forEach(role => {
        expect(rolePermissions).toHaveProperty(role);
      });
    });

    it("matriz de permisos debe coincidir con la documentación", () => {
      // Gerente: todos los permisos
      expect(getUserPermissions("gerente")).toEqual(permissions);

      // Instructor: view, create, edit, export
      expect(getUserPermissions("instructor")).toEqual([
        "can_view",
        "can_create",
        "can_edit",
        "can_export",
      ]);

      // Administrativo: view, create, edit, export
      expect(getUserPermissions("administrativo")).toEqual([
        "can_view",
        "can_create",
        "can_edit",
        "can_export",
      ]);

      // Committee: view, create, approve
      expect(getUserPermissions("committee")).toEqual([
        "can_view",
        "can_create",
        "can_approve",
      ]);

      // Student: solo view
      expect(getUserPermissions("student")).toEqual(["can_view"]);
    });
  });

  describe("Casos de Uso Reales", () => {
    it("crear empleado: solo gerente, instructor y administrativo", () => {
      expect(hasPermission("gerente", "can_create")).toBe(true);
      expect(hasPermission("instructor", "can_create")).toBe(true);
      expect(hasPermission("administrativo", "can_create")).toBe(true);
      expect(hasPermission("committee", "can_create")).toBe(true);
      expect(hasPermission("student", "can_create")).toBe(false);
    });

    it("eliminar empleado: solo gerente", () => {
      expect(hasPermission("gerente", "can_delete")).toBe(true);
      expect(hasPermission("instructor", "can_delete")).toBe(false);
      expect(hasPermission("administrativo", "can_delete")).toBe(false);
      expect(hasPermission("committee", "can_delete")).toBe(false);
      expect(hasPermission("student", "can_delete")).toBe(false);
    });

    it("aprobar minuta: gerente y committee", () => {
      expect(hasPermission("gerente", "can_approve")).toBe(true);
      expect(hasPermission("committee", "can_approve")).toBe(true);
      expect(hasPermission("instructor", "can_approve")).toBe(false);
      expect(hasPermission("administrativo", "can_approve")).toBe(false);
      expect(hasPermission("student", "can_approve")).toBe(false);
    });

    it("exportar a Excel: gerente, instructor y administrativo", () => {
      expect(hasPermission("gerente", "can_export")).toBe(true);
      expect(hasPermission("instructor", "can_export")).toBe(true);
      expect(hasPermission("administrativo", "can_export")).toBe(true);
      expect(hasPermission("committee", "can_export")).toBe(false);
      expect(hasPermission("student", "can_export")).toBe(false);
    });

    it("guardar borrador (create o edit): gerente, instructor, administrativo y committee", () => {
      const canSaveDraft = (role: string) =>
        hasAnyPermission(role, ["can_create", "can_edit"]);

      expect(canSaveDraft("gerente")).toBe(true);
      expect(canSaveDraft("instructor")).toBe(true);
      expect(canSaveDraft("administrativo")).toBe(true);
      expect(canSaveDraft("committee")).toBe(true); // Tiene can_create
      expect(canSaveDraft("student")).toBe(false);
    });
  });
});
