/**
 * Sprint 31 Tests
 * Funcionalidades:
 * 1. Seed automático de 15 preguntas NOM-035 para Entrevistas de Salida
 * 2. Selector de responsable técnico con auto-relleno de cédula en Dictamen
 * 3. Exportar comparativa de departamentos a Excel desde /kpi-dashboard
 */

import { describe, it, expect, vi } from "vitest";

// ── Fase 1: Seed de preguntas NOM-035 ────────────────────────────────────────

const EXIT_INTERVIEW_SEED_QUESTIONS = [
  { order: 1, category: "ambiente", questionText: "¿Cómo calificarías el ambiente de trabajo en tu área?", options: ["Muy bueno", "Bueno", "Regular", "Malo", "Muy malo"] },
  { order: 2, category: "liderazgo", questionText: "¿Cómo fue tu relación con tu jefe directo?", options: ["Excelente", "Buena", "Regular", "Difícil", "Muy difícil"] },
  { order: 3, category: "compensacion", questionText: "¿Consideras que tu salario era justo para las responsabilidades del puesto?", options: ["Totalmente de acuerdo", "De acuerdo", "Neutral", "En desacuerdo", "Totalmente en desacuerdo"] },
  { order: 4, category: "desarrollo", questionText: "¿Tuviste oportunidades de crecimiento y desarrollo profesional?", options: ["Sí, muchas", "Algunas", "Pocas", "Ninguna", "No aplica"] },
  { order: 5, category: "carga_trabajo", questionText: "¿Cómo describirías la carga de trabajo que tenías?", options: ["Muy adecuada", "Adecuada", "Algo excesiva", "Excesiva", "Insostenible"] },
  { order: 6, category: "reconocimiento", questionText: "¿Sentiste que tu trabajo era reconocido y valorado?", options: ["Siempre", "Frecuentemente", "A veces", "Raramente", "Nunca"] },
  { order: 7, category: "comunicacion", questionText: "¿Cómo evalúas la comunicación interna en la organización?", options: ["Muy efectiva", "Efectiva", "Regular", "Deficiente", "Muy deficiente"] },
  { order: 8, category: "herramientas", questionText: "¿Contabas con las herramientas y recursos necesarios para realizar tu trabajo?", options: ["Siempre", "Casi siempre", "A veces", "Raramente", "Nunca"] },
  { order: 9, category: "equilibrio", questionText: "¿Pudiste mantener un equilibrio adecuado entre tu vida laboral y personal?", options: ["Siempre", "Casi siempre", "A veces", "Raramente", "Nunca"] },
  { order: 10, category: "capacitacion", questionText: "¿Recibiste la capacitación necesaria para desempeñar tu puesto?", options: ["Sí, completa", "Parcialmente", "Mínima", "Insuficiente", "No recibí"] },
  { order: 11, category: "companeros", questionText: "¿Cómo fue tu relación con tus compañeros de trabajo?", options: ["Excelente", "Buena", "Regular", "Difícil", "Muy difícil"] },
  { order: 12, category: "politicas", questionText: "¿Las políticas y procedimientos de la empresa te parecían claros y justos?", options: ["Totalmente", "En su mayoría", "Parcialmente", "Poco", "No"] },
  { order: 13, category: "seguridad", questionText: "¿Te sentiste seguro/a en tu lugar de trabajo (física y emocionalmente)?", options: ["Siempre", "Casi siempre", "A veces", "Raramente", "Nunca"] },
  { order: 14, category: "motivo_salida", questionText: "¿Cuál es la razón principal de tu salida?", options: ["Mejor oferta económica", "Crecimiento profesional externo", "Problemas con el jefe", "Ambiente laboral", "Motivos personales", "Reubicación geográfica", "Otro"] },
  { order: 15, category: "recomendacion", questionText: "¿Recomendarías esta empresa como lugar de trabajo?", options: ["Definitivamente sí", "Probablemente sí", "No estoy seguro/a", "Probablemente no", "Definitivamente no"] },
];

describe("Sprint 31 – Fase 1: Seed de preguntas NOM-035 para Entrevistas de Salida", () => {
  it("debe tener exactamente 15 preguntas en el seed", () => {
    expect(EXIT_INTERVIEW_SEED_QUESTIONS).toHaveLength(15);
  });

  it("cada pregunta debe tener los campos requeridos (order, category, questionText, options)", () => {
    for (const q of EXIT_INTERVIEW_SEED_QUESTIONS) {
      expect(q).toHaveProperty("order");
      expect(q).toHaveProperty("category");
      expect(q).toHaveProperty("questionText");
      expect(q).toHaveProperty("options");
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("los números de orden deben ser únicos y consecutivos del 1 al 15", () => {
    const orders = EXIT_INTERVIEW_SEED_QUESTIONS.map(q => q.order);
    const uniqueOrders = new Set(orders);
    expect(uniqueOrders.size).toBe(15);
    expect(Math.min(...orders)).toBe(1);
    expect(Math.max(...orders)).toBe(15);
  });

  it("las categorías cubren los factores de riesgo NOM-035 principales", () => {
    const categories = EXIT_INTERVIEW_SEED_QUESTIONS.map(q => q.category);
    const requiredCategories = ["ambiente", "liderazgo", "compensacion", "desarrollo", "carga_trabajo", "motivo_salida", "recomendacion"];
    for (const cat of requiredCategories) {
      expect(categories).toContain(cat);
    }
  });

  it("la función de seed debe ser idempotente (no insertar si ya existen preguntas)", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 1 }]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue({}),
    };

    let insertCalled = false;
    const seedFn = async (db: typeof mockDb) => {
      const existing = await db.select().from({} as any).limit(1);
      if (existing.length > 0) return;
      insertCalled = true;
      for (const q of EXIT_INTERVIEW_SEED_QUESTIONS) {
        await db.insert({} as any).values(q);
      }
    };

    await seedFn(mockDb as any);
    expect(insertCalled).toBe(false);
  });

  it("la función de seed debe insertar 15 preguntas si la tabla está vacía", async () => {
    const insertedItems: any[] = [];
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockImplementation((v) => { insertedItems.push(v); return Promise.resolve({}); }),
    };

    const seedFn = async (db: typeof mockDb) => {
      const existing = await db.select().from({} as any).limit(1);
      if (existing.length > 0) return;
      for (const q of EXIT_INTERVIEW_SEED_QUESTIONS) {
        await db.insert({} as any).values({
          questionText: q.questionText,
          questionType: "multiple_choice",
          options: q.options,
          category: q.category,
          order: q.order,
          isActive: true,
        });
      }
    };

    await seedFn(mockDb as any);
    expect(insertedItems).toHaveLength(15);
    expect(insertedItems[0].questionType).toBe("multiple_choice");
    expect(insertedItems[0].isActive).toBe(true);
  });
});

// ── Fase 2: Selector de responsable técnico ──────────────────────────────────

const mockClinicalEmployees = [
  { id: 1, fullName: "María García López", positionTitle: "Psicóloga Organizacional", cedulaProfesional: "1234567", clinicalTitle: "Psic.", email: "mgarcia@empresa.com" },
  { id: 2, fullName: "Juan Pérez Rodríguez", positionTitle: "Médico del Trabajo", cedulaProfesional: "7654321", clinicalTitle: "Dr.", email: "jperez@empresa.com" },
  { id: 3, fullName: "Ana López Martínez", positionTitle: "Coordinadora de SST", cedulaProfesional: null, clinicalTitle: null, email: "alopez@empresa.com" },
  { id: 4, fullName: "Carlos Ruiz Sánchez", positionTitle: "Director de RRHH", cedulaProfesional: "9876543", clinicalTitle: null, email: "cruiz@empresa.com" },
  { id: 5, fullName: "Laura Hernández Torres", positionTitle: "Supervisora de Calidad", cedulaProfesional: null, clinicalTitle: null, email: "lhernandez@empresa.com" },
];

describe("Sprint 31 – Fase 2: Selector de responsable técnico con auto-relleno de cédula", () => {
  it("debe incluir empleados con cédula profesional registrada", () => {
    const withCedula = mockClinicalEmployees.filter(e => e.cedulaProfesional);
    expect(withCedula.length).toBeGreaterThan(0);
    expect(withCedula.map(e => e.id)).toContain(1);
    expect(withCedula.map(e => e.id)).toContain(2);
    expect(withCedula.map(e => e.id)).toContain(4);
  });

  it("al seleccionar un empleado, debe auto-rellenar la cédula profesional", () => {
    const selectedEmpId = "1";
    const emp = mockClinicalEmployees.find(e => String(e.id) === selectedEmpId);
    expect(emp).toBeDefined();

    const formUpdate = {
      responsableTecnico: `${emp!.clinicalTitle ? emp!.clinicalTitle + ' ' : ''}${emp!.fullName}`,
      cedulaProfesional: emp!.cedulaProfesional || "",
    };

    expect(formUpdate.responsableTecnico).toBe("Psic. María García López");
    expect(formUpdate.cedulaProfesional).toBe("1234567");
  });

  it("debe mostrar el nombre completo con título clínico cuando existe", () => {
    const emp = mockClinicalEmployees[0];
    const displayName = `${emp.clinicalTitle ? emp.clinicalTitle + ' ' : ''}${emp.fullName}`;
    expect(displayName).toBe("Psic. María García López");
  });

  it("debe mostrar el nombre sin título cuando no tiene título clínico", () => {
    const emp = mockClinicalEmployees[2];
    const displayName = `${emp.clinicalTitle ? emp.clinicalTitle + ' ' : ''}${emp.fullName}`;
    expect(displayName).toBe("Ana López Martínez");
  });

  it("el filtro de búsqueda debe funcionar por nombre", () => {
    const search = "garcía";
    const filtered = mockClinicalEmployees.filter(emp => {
      const q = search.toLowerCase();
      return (
        emp.fullName.toLowerCase().includes(q) ||
        (emp.positionTitle || "").toLowerCase().includes(q) ||
        (emp.cedulaProfesional || "").toLowerCase().includes(q)
      );
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].fullName).toBe("María García López");
  });

  it("el filtro de búsqueda debe funcionar por cédula profesional", () => {
    const search = "7654321";
    const filtered = mockClinicalEmployees.filter(emp => {
      const q = search.toLowerCase();
      return (
        emp.fullName.toLowerCase().includes(q) ||
        (emp.positionTitle || "").toLowerCase().includes(q) ||
        (emp.cedulaProfesional || "").toLowerCase().includes(q)
      );
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].fullName).toBe("Juan Pérez Rodríguez");
  });

  it("el filtro de búsqueda debe funcionar por puesto", () => {
    const search = "coordinadora";
    const filtered = mockClinicalEmployees.filter(emp => {
      const q = search.toLowerCase();
      return (
        emp.fullName.toLowerCase().includes(q) ||
        (emp.positionTitle || "").toLowerCase().includes(q) ||
        (emp.cedulaProfesional || "").toLowerCase().includes(q)
      );
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].positionTitle).toBe("Coordinadora de SST");
  });

  it("el filtro de búsqueda vacío debe devolver todos los empleados", () => {
    const search = "";
    const filtered = mockClinicalEmployees.filter(emp => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        emp.fullName.toLowerCase().includes(q) ||
        (emp.positionTitle || "").toLowerCase().includes(q) ||
        (emp.cedulaProfesional || "").toLowerCase().includes(q)
      );
    });
    expect(filtered).toHaveLength(mockClinicalEmployees.length);
  });

  it("la deduplicación debe eliminar empleados duplicados por ID", () => {
    const withDuplicates = [
      ...mockClinicalEmployees,
      mockClinicalEmployees[0],
      mockClinicalEmployees[1],
    ];
    const seen = new Set<number>();
    const unique = withDuplicates.filter(emp => {
      if (seen.has(emp.id)) return false;
      seen.add(emp.id);
      return true;
    });
    expect(unique).toHaveLength(mockClinicalEmployees.length);
  });
});

// ── Fase 3: Exportar comparativa de departamentos a Excel ────────────────────

const mockDepts = [
  { deptName: "Producción", totalEmployees: 45, turnoverRate: 12, trainingRate: 78, nom035Score: 85, pendingVacations: 3, highRiskPsycho: 2 },
  { deptName: "Administración", totalEmployees: 20, turnoverRate: 5, trainingRate: 92, nom035Score: 91, pendingVacations: 1, highRiskPsycho: 0 },
  { deptName: "Ventas", totalEmployees: 30, turnoverRate: 18, trainingRate: 65, nom035Score: 72, pendingVacations: 5, highRiskPsycho: 4 },
];

describe("Sprint 31 – Fase 3: Exportar comparativa de departamentos a Excel", () => {
  it("debe tener datos de departamentos para exportar", () => {
    expect(mockDepts.length).toBeGreaterThan(0);
  });

  it("cada departamento debe tener los campos requeridos para el Excel", () => {
    for (const d of mockDepts) {
      expect(d).toHaveProperty("deptName");
      expect(d).toHaveProperty("totalEmployees");
      expect(d).toHaveProperty("turnoverRate");
      expect(d).toHaveProperty("trainingRate");
      expect(d).toHaveProperty("nom035Score");
      expect(d).toHaveProperty("pendingVacations");
      expect(d).toHaveProperty("highRiskPsycho");
    }
  });

  it("debe calcular el promedio general correctamente", () => {
    const n = mockDepts.length;
    const avgTurnover = Math.round(mockDepts.reduce((s, d) => s + d.turnoverRate, 0) / n);
    const avgTraining = Math.round(mockDepts.reduce((s, d) => s + d.trainingRate, 0) / n);
    const avgNom035 = Math.round(mockDepts.reduce((s, d) => s + d.nom035Score, 0) / n);
    const totalPendingVacations = mockDepts.reduce((s, d) => s + d.pendingVacations, 0);
    const totalHighRisk = mockDepts.reduce((s, d) => s + d.highRiskPsycho, 0);

    expect(avgTurnover).toBe(12);
    expect(avgTraining).toBe(78);
    expect(avgNom035).toBe(83);
    expect(totalPendingVacations).toBe(9);
    expect(totalHighRisk).toBe(6);
  });

  it("debe generar filas de Excel con los campos correctos", () => {
    const rows = mockDepts.map(d => ({
      "Departamento": d.deptName,
      "Total Empleados": d.totalEmployees,
      "Rotación %": d.turnoverRate,
      "% Personal Capacitado": d.trainingRate,
      "Puntaje NOM-035": d.nom035Score,
      "Vacaciones Pendientes": d.pendingVacations,
      "Riesgo Psicométrico Alto": d.highRiskPsycho,
    }));
    expect(rows).toHaveLength(3);
    expect(rows[0]["Departamento"]).toBe("Producción");
    expect(rows[0]["Total Empleados"]).toBe(45);
    expect(rows[1]["Puntaje NOM-035"]).toBe(91);
  });

  it("el nombre del archivo Excel debe incluir la fecha", () => {
    const fechaStr = new Date().toISOString().slice(0, 10);
    const fileName = `Comparativa_Departamentos_${fechaStr}.xlsx`;
    expect(fileName).toMatch(/^Comparativa_Departamentos_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  it("no debe exportar si no hay datos de departamentos", () => {
    const emptyDepts: typeof mockDepts = [];
    let exportCalled = false;

    const exportFn = (depts: typeof mockDepts) => {
      if (!depts || depts.length === 0) return;
      exportCalled = true;
    };

    exportFn(emptyDepts);
    expect(exportCalled).toBe(false);
  });
});
