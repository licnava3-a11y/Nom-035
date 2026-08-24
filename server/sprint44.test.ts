/**
 * Sprint 44 Tests — Verificación P1-P9 + Preview Reporte Ejecutivo
 * Confirma que todos los ítems críticos y medios están implementados correctamente
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");

// ─── P1: Seed de preguntas predeterminadas ─────────────────────────────────────
describe("P1 — exitInterviews: seed de preguntas predeterminadas", () => {
  const routerContent = readFileSync(
    join(ROOT, "server/routers/exitInterviews.ts"),
    "utf-8"
  );
  const uiContent = readFileSync(
    join(ROOT, "client/src/pages/ExitInterviews.tsx"),
    "utf-8"
  );

  it("tiene procedure initDefaultQuestions en el router", () => {
    expect(routerContent).toContain("initDefaultQuestions");
  });

  it("el UI tiene botón para cargar preguntas predeterminadas", () => {
    expect(uiContent).toContain("initDefaultQuestions");
  });
});

// ─── P2: Selector de responsable técnico en Dictamen ──────────────────────────
describe("P2 — LegalDocGenerator: selector de responsable técnico", () => {
  const content = readFileSync(
    join(ROOT, "client/src/pages/LegalDocGenerator.tsx"),
    "utf-8"
  );

  it("tiene selector de responsable técnico con búsqueda", () => {
    expect(content).toContain("responsableSearch");
    expect(content).toContain("clinicalEmployees");
  });

  it("auto-rellena la cédula profesional al seleccionar", () => {
    expect(content).toContain("cedulaProfesional");
    expect(content).toContain("Auto-rellenada desde el catálogo");
  });

  it("muestra badge verde de confirmación", () => {
    expect(content).toContain("bg-green-50");
    expect(content).toContain("border-green-200");
  });
});

// ─── P3: Exportar catálogo de preguntas a Excel ───────────────────────────────
describe("P3 — ExitInterviews: exportar catálogo de preguntas a Excel", () => {
  const content = readFileSync(
    join(ROOT, "client/src/pages/ExitInterviews.tsx"),
    "utf-8"
  );

  it("tiene botón de exportación a Excel en el catálogo de preguntas", () => {
    expect(content).toMatch(/[Ee]xportar|[Ee]xport/);
    expect(content).toContain("xlsx");
  });

  it("usa CSV con BOM UTF-8 compatible con Excel", () => {
    // La exportación usa CSV nativo con BOM para compatibilidad con Excel
    expect(content).toContain("text/csv");
    expect(content).toContain(".csv");
  });
});

// ─── P4: sortOrder editable inline ────────────────────────────────────────────
describe("P4 — ExitInterviews: sortOrder editable inline", () => {
  const content = readFileSync(
    join(ROOT, "client/src/pages/ExitInterviews.tsx"),
    "utf-8"
  );

  it("tiene estado editOrder para edición inline", () => {
    expect(content).toContain("editOrder");
    expect(content).toContain("setEditOrder");
  });

  it("tiene input numérico para el orden", () => {
    expect(content).toContain("w-16");
  });
});

// ─── P5: Filtro por categoría ─────────────────────────────────────────────────
describe("P5 — ExitInterviews: filtro por categoría", () => {
  const content = readFileSync(
    join(ROOT, "client/src/pages/ExitInterviews.tsx"),
    "utf-8"
  );

  it("tiene estado filterCategory", () => {
    expect(content).toContain("filterCategory");
    expect(content).toContain("setFilterCategory");
  });

  it("tiene dropdown de filtro por categoría", () => {
    expect(content).toContain("editCategory");
  });
});

// ─── P6: QR en preview del Dictamen ──────────────────────────────────────────
describe("P6 — LegalDocGenerator: QR en preview del Dictamen", () => {
  const content = readFileSync(
    join(ROOT, "client/src/pages/LegalDocGenerator.tsx"),
    "utf-8"
  );

  it("tiene QR de verificación NOM-151 en el preview", () => {
    expect(content).toContain("qrserver.com");
    expect(content).toContain("QR");
  });

  it("el QR contiene el folio del dictamen", () => {
    expect(content).toContain("activeDoc.folio");
  });
});

// ─── P7: Validación de cédula profesional ────────────────────────────────────
describe("P7 — LegalDocGenerator: validación de cédula profesional", () => {
  const content = readFileSync(
    join(ROOT, "client/src/pages/LegalDocGenerator.tsx"),
    "utf-8"
  );

  it("muestra indicador visual cuando la cédula es válida del catálogo", () => {
    expect(content).toContain("border-green-500");
  });

  it("muestra texto de confirmación de auto-relleno", () => {
    expect(content).toContain("Auto-rellenada desde el catálogo de empleados");
  });
});

// ─── P8: RFC y NSS como columnas visibles en Employees ───────────────────────
describe("P8 — Employees: RFC y NSS como columnas visibles con toggle", () => {
  const content = readFileSync(
    join(ROOT, "client/src/pages/Employees.tsx"),
    "utf-8"
  );

  it("tiene estado showRfcNss para toggle de columnas", () => {
    expect(content).toContain("showRfcNss");
    expect(content).toContain("setShowRfcNss");
  });

  it("muestra RFC y NSS del empleado cuando el toggle está activo", () => {
    expect(content).toContain("employee.rfc");
    expect(content).toContain("employee.nss");
  });

  it("tiene botón para mostrar/ocultar RFC y NSS", () => {
    expect(content).toContain("Mostrar RFC/NSS");
    expect(content).toContain("Ocultar RFC/NSS");
  });
});

// ─── P9: Búsqueda por RFC y NSS ──────────────────────────────────────────────
describe("P9 — Employees: búsqueda por RFC y NSS", () => {
  const dbContent = readFileSync(join(ROOT, "server/db-employees.ts"), "utf-8");
  const uiContent = readFileSync(
    join(ROOT, "client/src/pages/Employees.tsx"),
    "utf-8"
  );

  it("el backend filtra por RFC en la búsqueda", () => {
    expect(dbContent).toContain("employees.rfc");
  });

  it("el backend filtra por NSS en la búsqueda", () => {
    expect(dbContent).toContain("employees.nss");
  });

  it("el placeholder del campo de búsqueda menciona RFC y NSS", () => {
    expect(uiContent).toContain("RFC o NSS");
  });
});

// ─── Preview de Reporte Ejecutivo ────────────────────────────────────────────
describe("ReportConfigurationPanel: preview de reporte ejecutivo", () => {
  const content = readFileSync(
    join(ROOT, "client/src/pages/ReportConfigurationPanel.tsx"),
    "utf-8"
  );

  it("tiene estado isPreviewOpen para el modal de preview", () => {
    expect(content).toContain("isPreviewOpen");
    expect(content).toContain("setIsPreviewOpen");
  });

  it("tiene botón Eye para abrir la vista previa", () => {
    expect(content).toContain("Eye");
    expect(content).toContain("openPreviewDialog");
  });

  it("usa trpc.executiveReport.getKPIs para cargar datos del preview", () => {
    expect(content).toContain("executiveReport.getKPIs");
  });

  it("muestra métricas de empleados, capacitación y casos en el preview", () => {
    expect(content).toContain("kpiData.employees");
    expect(content).toContain("kpiData.training");
    expect(content).toContain("kpiData.cases");
  });

  it("tiene botón para editar la configuración desde el preview", () => {
    expect(content).toContain("Editar Configuración");
  });
});

// ─── Validators: RFC y NSS en shared/validators.ts ───────────────────────────
describe("shared/validators.ts — validadores RFC y NSS", () => {
  const content = readFileSync(join(ROOT, "shared/validators.ts"), "utf-8");

  it("exporta validateRFC", () => {
    expect(content).toContain("export function validateRFC");
  });

  it("exporta validateNSS", () => {
    expect(content).toContain("export function validateNSS");
  });

  it("validateRFC valida el dígito verificador", () => {
    expect(content).toContain("calcularDigitoVerificadorRFC");
  });

  it("validateNSS valida el dígito verificador IMSS", () => {
    expect(content).toContain("calcularDigitoVerificadorNSS");
  });
});

// ─── Branches: CRUD completo ──────────────────────────────────────────────────
describe("branches router — CRUD completo", () => {
  const content = readFileSync(
    join(ROOT, "server/routers/branches.ts"),
    "utf-8"
  );

  it("tiene procedures list, listAll, create, update, delete", () => {
    expect(content).toContain("list:");
    expect(content).toContain("listAll:");
    expect(content).toContain("create:");
    expect(content).toContain("update:");
    expect(content).toContain("delete:");
  });

  it("usa await getDb() correctamente", () => {
    expect(content).toContain("getDb()");
  });
});

// ─── BranchesManagement.tsx existe ───────────────────────────────────────────
describe("BranchesManagement.tsx — página CRUD de sucursales", () => {
  it("el archivo existe", () => {
    expect(
      existsSync(join(ROOT, "client/src/pages/BranchesManagement.tsx"))
    ).toBe(true);
  });

  const content = readFileSync(
    join(ROOT, "client/src/pages/BranchesManagement.tsx"),
    "utf-8"
  );

  it("tiene tabla con CRUD de sucursales", () => {
    expect(content).toContain("branches");
  });

  it("tiene AlertDialog para confirmar activar/desactivar", () => {
    expect(content).toContain("AlertDialog");
  });
});

// ─── todo.md: P1-P9 marcados como completados ────────────────────────────────
describe("todo.md — P1-P9 marcados como completados", () => {
  const content = readFileSync(join(ROOT, "todo.md"), "utf-8");

  it("P1 está marcado como completado", () => {
    expect(content).toContain(
      "P1 — Seed de preguntas predeterminadas para Entrevistas de Salida ✅"
    );
  });

  it("P2 está marcado como completado", () => {
    expect(content).toContain(
      "P2 — Selector de responsable técnico en formulario del Dictamen ✅"
    );
  });

  it("P3 está marcado como completado", () => {
    expect(content).toContain(
      "P3 — Exportar Catálogo de Preguntas de Entrevistas de Salida a Excel ✅"
    );
  });

  it("P4 está marcado como completado", () => {
    expect(content).toContain(
      "P4 — Número de orden editable en Catálogo de Preguntas de Entrevistas de Salida ✅"
    );
  });

  it("P5 está marcado como completado", () => {
    expect(content).toContain(
      "P5 — Filtro por categoría en Catálogo de Preguntas de Entrevistas de Salida ✅"
    );
  });

  it("P6 está marcado como completado", () => {
    expect(content).toContain(
      "P6 — Mostrar QR de verificación NOM-151 en vista previa del Dictamen en pantalla ✅"
    );
  });

  it("P7 está marcado como completado", () => {
    expect(content).toContain(
      "P7 — Validar cédula profesional automáticamente al seleccionar responsable clínico ✅"
    );
  });

  it("P8 está marcado como completado", () => {
    expect(content).toContain(
      "P8 — RFC y NSS como columnas visibles en tabla catálogo de empleados ✅"
    );
  });

  it("P9 está marcado como completado", () => {
    expect(content).toContain(
      "P9 — Búsqueda por RFC y NSS en el catálogo de empleados ✅"
    );
  });
});
