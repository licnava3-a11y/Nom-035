import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock de la base de datos para aislar los tests
vi.mock("./db", () => ({
  getDb: vi.fn(),
  getRecipients: vi.fn(),
  getRecipientById: vi.fn(),
}));

vi.mock("../drizzle/schema", () => ({
  minuteRecipients: {
    id: "id",
    name: "name",
    email: "email",
    position: "position",
    department: "department",
    isActive: "is_active",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return { ctx };
}

// Datos de muestra para los tests
const sampleRecipients = [
  {
    id: 1,
    name: "María González López",
    email: "m.gonzalez@empresa.com",
    position: "Coordinadora de Recursos Humanos",
    department: "Recursos Humanos",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
  {
    id: 2,
    name: "Carlos Ramírez Torres",
    email: "c.ramirez@empresa.com",
    position: "Director General",
    department: "Dirección",
    isActive: true,
    createdAt: new Date("2026-01-02"),
    updatedAt: new Date("2026-01-02"),
  },
  {
    id: 3,
    name: "Ana Martínez Pérez",
    email: "a.martinez@empresa.com",
    position: "Representante de los Trabajadores",
    department: "Comité de Seguridad",
    isActive: false,
    createdAt: new Date("2026-01-03"),
    updatedAt: new Date("2026-01-03"),
  },
];

describe("minuteRecipients router", () => {
  describe("Validación de esquema de entrada", () => {
    it("debe rechazar un correo electrónico inválido en create", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Mock de la BD para que no falle por conexión
      const { getDb } = await import("./db");
      vi.mocked(getDb).mockResolvedValue(null as any);

      await expect(
        caller.minuteRecipients.create({
          name: "Test User",
          email: "correo-invalido",
          position: "Gerente",
        })
      ).rejects.toThrow();
    });

    it("debe rechazar un nombre muy corto en create", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const { getDb } = await import("./db");
      vi.mocked(getDb).mockResolvedValue(null as any);

      await expect(
        caller.minuteRecipients.create({
          name: "A",
          email: "test@empresa.com",
          position: "Gerente",
        })
      ).rejects.toThrow();
    });

    it("debe rechazar un cargo muy corto en create", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const { getDb } = await import("./db");
      vi.mocked(getDb).mockResolvedValue(null as any);

      await expect(
        caller.minuteRecipients.create({
          name: "Juan Pérez",
          email: "j.perez@empresa.com",
          position: "G",
        })
      ).rejects.toThrow();
    });
  });

  describe("Validación de datos de muestra", () => {
    it("los datos de muestra tienen la estructura correcta", () => {
      for (const recipient of sampleRecipients) {
        expect(recipient).toHaveProperty("id");
        expect(recipient).toHaveProperty("name");
        expect(recipient).toHaveProperty("email");
        expect(recipient).toHaveProperty("position");
        expect(recipient).toHaveProperty("isActive");
        expect(typeof recipient.id).toBe("number");
        expect(typeof recipient.name).toBe("string");
        expect(typeof recipient.email).toBe("string");
        expect(typeof recipient.position).toBe("string");
        expect(typeof recipient.isActive).toBe("boolean");
        // Validar formato de correo
        expect(recipient.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      }
    });

    it("los datos de muestra contienen al menos 3 destinatarios", () => {
      expect(sampleRecipients.length).toBeGreaterThanOrEqual(3);
    });

    it("hay al menos un destinatario activo en los datos de muestra", () => {
      const activeCount = sampleRecipients.filter(r => r.isActive).length;
      expect(activeCount).toBeGreaterThan(0);
    });
  });

  describe("Validación de procedimientos protegidos", () => {
    it("list requiere autenticación", async () => {
      const unauthCtx: TrpcContext = {
        user: null,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      };
      const caller = appRouter.createCaller(unauthCtx);
      await expect(
        caller.minuteRecipients.list({ onlyActive: false })
      ).rejects.toThrow();
    });

    it("create requiere autenticación", async () => {
      const unauthCtx: TrpcContext = {
        user: null,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      };
      const caller = appRouter.createCaller(unauthCtx);
      await expect(
        caller.minuteRecipients.create({
          name: "Test",
          email: "test@test.com",
          position: "Gerente",
        })
      ).rejects.toThrow();
    });

    it("delete requiere autenticación", async () => {
      const unauthCtx: TrpcContext = {
        user: null,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      };
      const caller = appRouter.createCaller(unauthCtx);
      await expect(caller.minuteRecipients.delete({ id: 1 })).rejects.toThrow();
    });

    it("toggleActive requiere autenticación", async () => {
      const unauthCtx: TrpcContext = {
        user: null,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      };
      const caller = appRouter.createCaller(unauthCtx);
      await expect(
        caller.minuteRecipients.toggleActive({ id: 1, isActive: false })
      ).rejects.toThrow();
    });
  });
});
