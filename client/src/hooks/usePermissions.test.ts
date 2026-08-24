import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePermissions } from "./usePermissions";
import { useAuth } from "@/_core/hooks/useAuth";

// Mock useAuth hook
vi.mock("@/_core/hooks/useAuth");

describe("usePermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Admin role", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          role: "admin",
          id: 1,
          name: "Admin User",
          email: "admin@test.com",
        },
        isLoading: false,
      } as any);
    });

    it("should have all permissions", () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission("can_create")).toBe(true);
      expect(result.current.hasPermission("can_edit")).toBe(true);
      expect(result.current.hasPermission("can_delete")).toBe(true);
      expect(result.current.hasPermission("can_view")).toBe(true);
      expect(result.current.hasPermission("can_export")).toBe(true);
      expect(result.current.hasPermission("can_approve")).toBe(true);
    });

    it("should return true for isAdmin()", () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin()).toBe(true);
    });

    it("should have all shortcut permissions", () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canCreate).toBe(true);
      expect(result.current.canEdit).toBe(true);
      expect(result.current.canDelete).toBe(true);
      expect(result.current.canView).toBe(true);
      expect(result.current.canExport).toBe(true);
      expect(result.current.canApprove).toBe(true);
    });
  });

  describe("User role", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          role: "user",
          id: 2,
          name: "Regular User",
          email: "user@test.com",
        },
        isLoading: false,
      } as any);
    });

    it("should only have can_view and can_export permissions", () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission("can_create")).toBe(false);
      expect(result.current.hasPermission("can_edit")).toBe(false);
      expect(result.current.hasPermission("can_delete")).toBe(false);
      expect(result.current.hasPermission("can_view")).toBe(true);
      expect(result.current.hasPermission("can_export")).toBe(true);
      expect(result.current.hasPermission("can_approve")).toBe(false);
    });

    it("should return false for isAdmin()", () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin()).toBe(false);
    });

    it("should have correct shortcut permissions", () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canCreate).toBe(false);
      expect(result.current.canEdit).toBe(false);
      expect(result.current.canDelete).toBe(false);
      expect(result.current.canView).toBe(true);
      expect(result.current.canExport).toBe(true);
      expect(result.current.canApprove).toBe(false);
    });
  });

  describe("Instructor role", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          role: "instructor",
          id: 3,
          name: "Instructor User",
          email: "instructor@test.com",
        },
        isLoading: false,
      } as any);
    });

    it("should have can_create, can_edit, can_view, can_export permissions", () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission("can_create")).toBe(true);
      expect(result.current.hasPermission("can_edit")).toBe(true);
      expect(result.current.hasPermission("can_delete")).toBe(false);
      expect(result.current.hasPermission("can_view")).toBe(true);
      expect(result.current.hasPermission("can_export")).toBe(true);
      expect(result.current.hasPermission("can_approve")).toBe(false);
    });

    it("should return false for isAdmin()", () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin()).toBe(false);
    });
  });

  describe("Committee role", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          role: "committee",
          id: 4,
          name: "Committee User",
          email: "committee@test.com",
        },
        isLoading: false,
      } as any);
    });

    it("should have can_view and can_approve permissions", () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission("can_create")).toBe(false);
      expect(result.current.hasPermission("can_edit")).toBe(false);
      expect(result.current.hasPermission("can_delete")).toBe(false);
      expect(result.current.hasPermission("can_view")).toBe(true);
      expect(result.current.hasPermission("can_export")).toBe(false);
      expect(result.current.hasPermission("can_approve")).toBe(true);
    });

    it("should return false for isAdmin()", () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin()).toBe(false);
    });
  });

  describe("hasAllPermissions", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          role: "instructor",
          id: 3,
          name: "Instructor User",
          email: "instructor@test.com",
        },
        isLoading: false,
      } as any);
    });

    it("should return true when user has all specified permissions", () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasAllPermissions(["can_create", "can_edit"])).toBe(
        true
      );
    });

    it("should return false when user is missing one permission", () => {
      const { result } = renderHook(() => usePermissions());
      expect(
        result.current.hasAllPermissions(["can_create", "can_delete"])
      ).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          role: "user",
          id: 2,
          name: "Regular User",
          email: "user@test.com",
        },
        isLoading: false,
      } as any);
    });

    it("should return true when user has at least one permission", () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasAnyPermission(["can_create", "can_view"])).toBe(
        true
      );
    });

    it("should return false when user has none of the permissions", () => {
      const { result } = renderHook(() => usePermissions());
      expect(
        result.current.hasAnyPermission(["can_create", "can_delete"])
      ).toBe(false);
    });
  });

  describe("No user (not authenticated)", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isLoading: false,
      } as any);
    });

    it("should return false for all permissions", () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission("can_create")).toBe(false);
      expect(result.current.hasPermission("can_edit")).toBe(false);
      expect(result.current.hasPermission("can_delete")).toBe(false);
      expect(result.current.hasPermission("can_view")).toBe(false);
      expect(result.current.hasPermission("can_export")).toBe(false);
      expect(result.current.hasPermission("can_approve")).toBe(false);
    });

    it("should return false for isAdmin()", () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin()).toBe(false);
    });
  });
});
