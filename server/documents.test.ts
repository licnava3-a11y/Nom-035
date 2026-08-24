import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("documents router - Acta de Recorrido", () => {
  it("should save acta de recorrido with signatures", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.documents.saveActaRecorrido({
      title: "Acta de Recorrido - Test",
      organizacion: "Empresa Test",
      fecha: "2026-02-04",
      horaInicio: "09:00",
      horaFin: "12:00",
      objetivo: "Verificar condiciones de seguridad",
      alcance: "Todas las áreas de producción",
      observaciones: [
        {
          area: "Producción",
          descripcion: "Falta de señalización",
          riesgo: "Riesgo medio",
          accionCorrectiva: "Instalar señalización",
          responsable: "Juan Pérez",
          plazo: "2026-03-01",
        },
      ],
      participantes: [
        {
          nombre: "María González",
          cargo: "Coordinadora de Seguridad",
          curp: undefined,
          ine: undefined,
        },
      ],
      firmas: [
        {
          url: "data:image/png;base64,test",
          nombre: "María González",
          cargo: "Coordinadora de Seguridad",
          userId: 1,
        },
      ],
      status: "final",
    });

    expect(result.success).toBe(true);
    expect(result.folio).toBeDefined();
    expect(result.documentId).toBeDefined();
  });

  it("should save acta final de resultados with signatures", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.documents.saveActaFinalResultados({
      title: "Acta Final de Resultados - Test",
      organizacion: "Empresa Test",
      rfc: "TEST123456ABC",
      domicilio: "Calle Test 123",
      telefono: "5551234567",
      actividadPrincipal: "Manufactura",
      fechaEvaluacion: "2026-02-04",
      esUnidadVerificacion: false,
      metodoUtilizado: "Cuestionario NOM-035",
      guiaReferencia: "Guía de referencia III",
      areasTrabajo: "Producción, Administración",
      numeroTrabajadores: "50",
      resultadosGenerales: "Nivel de riesgo medio",
      factoresRiesgoIdentificados: "Carga de trabajo, jornadas laborales",
      accionesControl: [
        {
          nivel: "Medio",
          descripcion: "Implementar pausas activas",
          fechaProgramada: "2026-03-01",
          responsable: "RH",
          avance: "0%",
        },
      ],
      firmas: [
        {
          url: "data:image/png;base64,test",
          nombre: "Director General",
          cargo: "Director",
          userId: 1,
        },
      ],
      status: "final",
    });

    expect(result.success).toBe(true);
    expect(result.folio).toBeDefined();
    expect(result.documentId).toBeDefined();
  });

  it("should list all documents", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const documents = await caller.documents.list({});
    expect(Array.isArray(documents)).toBe(true);
  });

  it("should filter documents by type", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const documents = await caller.documents.list({
      type: "acta_recorrido",
    });

    expect(Array.isArray(documents)).toBe(true);
    // Verificar que todos los documentos son del tipo correcto
    documents.forEach(doc => {
      expect(doc.type).toBe("acta_recorrido");
    });
  });
});
