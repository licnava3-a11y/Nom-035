import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { assessmentsRouter } from "./routers/assessments";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(
  userId: number,
  role: AuthenticatedUser["role"] = "empleado"
): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      email: `user-${userId}@example.com`,
      name: "Usuario de prueba",
      loginMethod: "local",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function queryResult<T>(result: T) {
  const promise = Promise.resolve(result);
  const chain = {
    limit: vi.fn(() => promise),
    orderBy: vi.fn(() => promise),
    leftJoin: vi.fn(() => chain),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
  };
  return chain;
}

function configureSelectSequence(results: unknown[]) {
  const queue = [...results];
  mockDb.select.mockImplementation(() => {
    const source = {
      where: vi.fn(() => queryResult(queue.shift() ?? [])),
      leftJoin: vi.fn(() => source),
      orderBy: vi.fn(() => source),
    };
    return { from: vi.fn(() => source) };
  });
}

describe("assessmentsRouter — autorización de intentos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deriva el colaborador del usuario autenticado al iniciar un examen", async () => {
    configureSelectSequence([
      [{ id: 42 }],
      [{ id: 7, status: "active", maxAttempts: 3 }],
      [],
    ]);
    const values = vi.fn().mockResolvedValue([{ insertId: 100 }]);
    mockDb.insert.mockReturnValue({ values });

    const caller = assessmentsRouter.createCaller(createContext(501));
    await caller.startAttempt({ assessmentId: 7 });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ assessmentId: 7, employeeId: 42 })
    );
  });

  it("rechaza la consulta de resultados de un intento que pertenece a otro colaborador", async () => {
    configureSelectSequence([
      [{ id: 100, employeeId: 99, assessmentId: 7, status: "completed" }],
      [{ id: 42 }],
    ]);

    const caller = assessmentsRouter.createCaller(createContext(501));

    await expect(caller.getAttemptResults({ attemptId: 100 })).rejects.toThrow(
      "No tiene permiso para consultar este intento."
    );
  });

  it("rechaza el historial solicitado con un employeeId ajeno para un rol no gestor", async () => {
    configureSelectSequence([[{ id: 42 }]]);

    const caller = assessmentsRouter.createCaller(createContext(501));

    await expect(
      caller.listEmployeeAttempts({ employeeId: 99 })
    ).rejects.toThrow("No tiene permiso para consultar estos intentos.");
  });

  it("ignora un employeeId inyectado en la petición de inicio y conserva la identidad de sesión", async () => {
    configureSelectSequence([
      [{ id: 42 }],
      [{ id: 7, status: "active", maxAttempts: 3 }],
      [],
    ]);
    const values = vi.fn().mockResolvedValue([{ insertId: 101 }]);
    mockDb.insert.mockReturnValue({ values });

    const caller = assessmentsRouter.createCaller(createContext(501));
    await caller.startAttempt({ assessmentId: 7, employeeId: 99 } as never);

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ assessmentId: 7, employeeId: 42 })
    );
  });

  it("rechaza el envío de respuestas a un intento ajeno", async () => {
    configureSelectSequence([
      [{ id: 100, employeeId: 99, assessmentId: 7, status: "in_progress" }],
      [{ id: 42 }],
    ]);

    const caller = assessmentsRouter.createCaller(createContext(501));

    await expect(
      caller.submitAnswers({ attemptId: 100, answers: [] })
    ).rejects.toThrow("No tiene permiso para enviar este intento.");
  });

  it("rechaza el inicio de examen cuando la cuenta no tiene un perfil de colaborador", async () => {
    configureSelectSequence([[]]);

    const caller = assessmentsRouter.createCaller(createContext(777));

    await expect(caller.startAttempt({ assessmentId: 7 })).rejects.toThrow(
      "No existe un perfil de colaborador vinculado a esta cuenta."
    );
  });

  it("mantiene el acceso transversal para un rol gestor autorizado", async () => {
    configureSelectSequence([
      [{ id: 100, employeeId: 99, assessmentId: 7, status: "completed" }],
      [],
    ]);

    const caller = assessmentsRouter.createCaller(createContext(900, "admin"));
    const result = await caller.getAttemptResults({ attemptId: 100 });

    expect(result.employeeId).toBe(99);
  });
});
