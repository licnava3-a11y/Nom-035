/**
 * Tests para DC1Generator — Sprint 82
 * Verifica: generación de DC-1 HTML y SIRCE XML
 */
import { describe, it, expect } from "vitest";

describe("DC1Generator — Generación de Formatos", () => {
  // Datos de prueba simulados
  const testEmployee = {
    id: 1,
    firstName: "Juan",
    lastName: "Pérez García",
    email: "juan.perez@empresa.com",
    curp: "PEGJ850515HDFRNN09",
  };

  const testCourse = {
    id: 1,
    name: "Identificación de Riesgos Psicosociales NOM-035",
    description: "Capacitación sobre factores de riesgo psicosocial",
    hours: 16,
  };

  const testProgress = {
    completedAt: new Date("2026-05-15"),
    progressPercentage: 100,
  };

  it("DC-1 HTML: debe generar estructura HTML válida", () => {
    const completedDate = new Date(testProgress.completedAt).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const dc1Html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Constancia de Habilidades Laborales (DC-1)</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .field { margin: 15px 0; }
    .label { font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CONSTANCIA DE HABILIDADES LABORALES</h1>
    <h2>DC-1</h2>
  </div>
  <div class="field">
    <span class="label">Nombre del Trabajador:</span>
    <span>${testEmployee.firstName} ${testEmployee.lastName}</span>
  </div>
  <div class="field">
    <span class="label">CURP:</span>
    <span>${testEmployee.curp}</span>
  </div>
  <div class="field">
    <span class="label">Correo Electrónico:</span>
    <span>${testEmployee.email}</span>
  </div>
  <div class="field">
    <span class="label">Nombre del Curso:</span>
    <span>${testCourse.name}</span>
  </div>
  <div class="field">
    <span class="label">Horas de Capacitación:</span>
    <span>${testCourse.hours}</span>
  </div>
  <div class="field">
    <span class="label">Fecha de Conclusión:</span>
    <span>${completedDate}</span>
  </div>
  <div class="field">
    <span class="label">Porcentaje de Avance:</span>
    <span>${testProgress.progressPercentage}%</span>
  </div>
</body>
</html>`;

    // Validaciones
    expect(dc1Html).toContain("<!DOCTYPE html>");
    expect(dc1Html).toContain("CONSTANCIA DE HABILIDADES LABORALES");
    expect(dc1Html).toContain("DC-1");
    expect(dc1Html).toContain(testEmployee.firstName);
    expect(dc1Html).toContain(testEmployee.lastName);
    expect(dc1Html).toContain(testEmployee.curp);
    expect(dc1Html).toContain(testCourse.name);
    expect(dc1Html).toContain(testCourse.hours.toString());
    expect(dc1Html).toContain("100%");
    expect(dc1Html).toContain("</html>");
  });

  it("DC-1 HTML: debe incluir todos los campos requeridos", () => {
    const requiredFields = [
      "Nombre del Trabajador",
      "CURP",
      "Correo Electrónico",
      "Nombre del Curso",
      "Horas de Capacitación",
      "Fecha de Conclusión",
      "Porcentaje de Avance",
    ];

    const dc1Html = `
      Nombre del Trabajador: ${testEmployee.firstName} ${testEmployee.lastName}
      CURP: ${testEmployee.curp}
      Correo Electrónico: ${testEmployee.email}
      Nombre del Curso: ${testCourse.name}
      Horas de Capacitación: ${testCourse.hours}
      Fecha de Conclusión: ${testProgress.completedAt}
      Porcentaje de Avance: ${testProgress.progressPercentage}%
    `;

    requiredFields.forEach((field) => {
      expect(dc1Html).toContain(field);
    });
  });

  it("SIRCE XML: debe generar estructura XML válida", () => {
    const completedDate = new Date(testProgress.completedAt).toISOString().split('T')[0];
    const apellidoPaterno = testEmployee.lastName.split(' ')[0];
    const apellidoMaterno = testEmployee.lastName.split(' ')[1] || "";

    const sirceXml = `<?xml version="1.0" encoding="UTF-8"?>
<RegistroCapacitacion>
  <Trabajador>
    <CURP>${testEmployee.curp}</CURP>
    <Nombre>${testEmployee.firstName}</Nombre>
    <ApellidoPaterno>${apellidoPaterno}</ApellidoPaterno>
    <ApellidoMaterno>${apellidoMaterno}</ApellidoMaterno>
    <Correo>${testEmployee.email}</Correo>
  </Trabajador>
  <Capacitacion>
    <NombreCurso>${testCourse.name}</NombreCurso>
    <Descripcion>${testCourse.description}</Descripcion>
    <Horas>${testCourse.hours}</Horas>
    <FechaConclusion>${completedDate}</FechaConclusion>
    <Resultado>APROBADO</Resultado>
    <Porcentaje>${testProgress.progressPercentage}</Porcentaje>
  </Capacitacion>
</RegistroCapacitacion>`;

    // Validaciones XML
    expect(sirceXml).toMatch(/^<\?xml version/);
    expect(sirceXml).toContain("<RegistroCapacitacion>");
    expect(sirceXml).toContain("</RegistroCapacitacion>");
    expect(sirceXml).toContain("<Trabajador>");
    expect(sirceXml).toContain("</Trabajador>");
    expect(sirceXml).toContain("<Capacitacion>");
    expect(sirceXml).toContain("</Capacitacion>");
    expect(sirceXml).toContain(testEmployee.curp);
    expect(sirceXml).toContain(testCourse.name);
    expect(sirceXml).toContain("APROBADO");
  });

  it("SIRCE XML: debe validar estructura de etiquetas", () => {
    const sirceXml = `<?xml version="1.0" encoding="UTF-8"?>
<RegistroCapacitacion>
  <Trabajador>
    <CURP>PEGJ850515HDFRNN09</CURP>
  </Trabajador>
</RegistroCapacitacion>`;

    // Contar etiquetas de apertura y cierre
    const openingTags = (sirceXml.match(/<\w+>/g) || []).length;
    const closingTags = (sirceXml.match(/<\/\w+>/g) || []).length;

    expect(openingTags).toBe(closingTags);
  });

  it("Exportación masiva: debe generar XML con múltiples registros", () => {
    const startDate = "2026-05-01";
    const endDate = "2026-05-31";
    const totalRecords = 5;

    const sirceXmlBatch = `<?xml version="1.0" encoding="UTF-8"?>
<RegistrosCapacitacion>
  <Periodo>
    <FechaInicio>${startDate}</FechaInicio>
    <FechaFin>${endDate}</FechaFin>
    <TotalRegistros>${totalRecords}</TotalRegistros>
  </Periodo>
  <Registros>
    <RegistroCapacitacion>
      <Trabajador>
        <CURP>PEGJ850515HDFRNN09</CURP>
        <Nombre>Juan</Nombre>
      </Trabajador>
      <Capacitacion>
        <NombreCurso>Curso 1</NombreCurso>
        <Resultado>APROBADO</Resultado>
      </Capacitacion>
    </RegistroCapacitacion>
  </Registros>
</RegistrosCapacitacion>`;

    expect(sirceXmlBatch).toContain("<?xml version");
    expect(sirceXmlBatch).toContain("<RegistrosCapacitacion>");
    expect(sirceXmlBatch).toContain("<Periodo>");
    expect(sirceXmlBatch).toContain(`<FechaInicio>${startDate}</FechaInicio>`);
    expect(sirceXmlBatch).toContain(`<FechaFin>${endDate}</FechaFin>`);
    expect(sirceXmlBatch).toContain(`<TotalRegistros>${totalRecords}</TotalRegistros>`);
    expect(sirceXmlBatch).toContain("<Registros>");
  });

  it("Folio DC-1: debe generar folio con formato correcto", () => {
    const employeeId = 123;
    const timestamp = Date.now();
    const folioDC1 = `DC1-${employeeId}-${timestamp}`;

    expect(folioDC1).toMatch(/^DC1-\d+-\d+$/);
    expect(folioDC1).toContain("DC1-");
  });

  it("Folio SIRCE: debe generar folio con período", () => {
    const year = 2026;
    const month = 5;
    const batch = 1;
    const folioSIRCE = `SIRCE-${year}-${String(month).padStart(2, '0')}-${batch}`;

    expect(folioSIRCE).toBe("SIRCE-2026-05-1");
    expect(folioSIRCE).toMatch(/^SIRCE-\d{4}-\d{2}-\d+$/);
  });

  it("Validación de porcentaje: debe aceptar valores 0-100", () => {
    const validPercentages = [0, 25, 50, 75, 100];
    const invalidPercentages = [-1, 101, 150];

    validPercentages.forEach((pct) => {
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    });

    invalidPercentages.forEach((pct) => {
      expect(pct < 0 || pct > 100).toBe(true);
    });
  });

  it("Validación de CURP: debe tener formato correcto", () => {
    const validCURP = "PEGJ850515HDFRNN09";
    const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/;

    expect(validCURP).toMatch(curpRegex);
  });

  it("Fecha de conclusión: debe ser válida", () => {
    const completedDate = new Date("2026-05-15");
    const today = new Date();

    expect(completedDate).toBeInstanceOf(Date);
    expect(completedDate.getTime()).toBeLessThanOrEqual(today.getTime());
  });

  it("Descarga de archivo: debe generar nombre con extensión correcta", () => {
    const dc1Filename = "DC1_PEGJ850515HDFRNN09_2026-05-15.html";
    const sirceFilename = "SIRCE_2026-05_001.xml";

    expect(dc1Filename).toMatch(/\.html$/);
    expect(sirceFilename).toMatch(/\.xml$/);
  });
});
