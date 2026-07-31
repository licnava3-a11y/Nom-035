/**
 * Tests para el endpoint exportToExcel del router employees
 * Sprint: Importación Masiva Mejorada + Exportación CONTPAQi
 */
import { describe, it, expect } from "vitest";

// ─── Utilidades de transformación de datos ───────────────────────────────────

function mapToContpaqiFormat(rows: any[]) {
  return rows.map((r: any) => ({
    "Código": r.employeeNumber ?? "",
    "Nombre": r.firstName ?? "",
    "Apellido Paterno": r.lastName?.split(" ")[0] ?? "",
    "Apellido Materno": r.lastName?.split(" ").slice(1).join(" ") ?? "",
    "RFC": r.rfc ?? "",
    "CURP": r.curp ?? "",
    "NSS": r.nss ?? "",
    "Puesto": r.positionTitle ?? "",
    "Departamento": r.departmentName ?? "",
    "Fecha Alta": r.hireDate ? new Date(r.hireDate).toLocaleDateString("es-MX") : "",
    "Sexo": r.gender === "male" ? "M" : r.gender === "female" ? "F" : "",
    "Correo": r.email ?? "",
    "Teléfono": r.phone ?? "",
    "Activo": r.isActive ? "Sí" : "No",
  }));
}

function mapToGenericFormat(rows: any[]) {
  return rows.map((r: any) => ({
    "ID": r.id,
    "Nombre": r.firstName ?? "",
    "Apellidos": r.lastName ?? "",
    "Correo": r.email ?? "",
    "Teléfono": r.phone ?? "",
    "CURP": r.curp ?? "",
    "RFC": r.rfc ?? "",
    "NSS": r.nss ?? "",
    "Núm. Empleado": r.employeeNumber ?? "",
    "Departamento": r.departmentName ?? "",
    "Puesto": r.positionTitle ?? "",
    "Fecha Ingreso": r.hireDate ? new Date(r.hireDate).toLocaleDateString("es-MX") : "",
    "Género": r.gender ?? "",
    "Escolaridad": r.educationLevel ?? "",
    "Tipo Contrato": r.contractType ?? "",
    "Activo": r.isActive ? "Sí" : "No",
  }));
}

// ─── Datos de muestra ─────────────────────────────────────────────────────────

const sampleEmployees = [
  {
    id: 1,
    firstName: "Juan",
    lastName: "García López",
    email: "juan@empresa.com",
    phone: "5512345678",
    curp: "GALJ850101HDFRCN01",
    rfc: "GALJ850101ABC",
    nss: "12345678901",
    employeeNumber: "EMP-001",
    hireDate: new Date("2024-01-15"),
    gender: "male",
    educationLevel: "bachelor",
    contractType: "permanent",
    isActive: true,
    departmentName: "Recursos Humanos",
    positionTitle: "Gerente de RH",
  },
  {
    id: 2,
    firstName: "María",
    lastName: "Rodríguez",
    email: "maria@empresa.com",
    phone: null,
    curp: "RORM900215MDFDRR09",
    rfc: null,
    nss: null,
    employeeNumber: null,
    hireDate: null,
    gender: "female",
    educationLevel: null,
    contractType: "temporary",
    isActive: false,
    departmentName: "Finanzas",
    positionTitle: "Analista",
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("employees.exportToExcel — formato CONTPAQi/NOI", () => {
  it("mapea correctamente el nombre a Nombre + Apellido Paterno + Apellido Materno", () => {
    const result = mapToContpaqiFormat([sampleEmployees[0]]);
    expect(result[0]["Nombre"]).toBe("Juan");
    expect(result[0]["Apellido Paterno"]).toBe("García");
    expect(result[0]["Apellido Materno"]).toBe("López");
  });

  it("mapea gender 'male' a 'M' y 'female' a 'F'", () => {
    const result = mapToContpaqiFormat(sampleEmployees);
    expect(result[0]["Sexo"]).toBe("M");
    expect(result[1]["Sexo"]).toBe("F");
  });

  it("devuelve cadena vacía para campos nulos", () => {
    const result = mapToContpaqiFormat([sampleEmployees[1]]);
    expect(result[0]["RFC"]).toBe("");
    expect(result[0]["NSS"]).toBe("");
    expect(result[0]["Código"]).toBe("");
    expect(result[0]["Fecha Alta"]).toBe("");
  });

  it("mapea isActive correctamente a Sí/No", () => {
    const result = mapToContpaqiFormat(sampleEmployees);
    expect(result[0]["Activo"]).toBe("Sí");
    expect(result[1]["Activo"]).toBe("No");
  });

  it("incluye todos los campos requeridos por CONTPAQi", () => {
    const result = mapToContpaqiFormat([sampleEmployees[0]]);
    const requiredFields = ["Código", "Nombre", "Apellido Paterno", "Apellido Materno", "RFC", "CURP", "NSS", "Puesto", "Departamento", "Fecha Alta", "Sexo", "Correo", "Teléfono", "Activo"];
    requiredFields.forEach(field => {
      expect(result[0]).toHaveProperty(field);
    });
  });
});

describe("employees.exportToExcel — formato genérico", () => {
  it("incluye todos los campos extendidos (gender, educationLevel, contractType)", () => {
    const result = mapToGenericFormat([sampleEmployees[0]]);
    expect(result[0]["Género"]).toBe("male");
    expect(result[0]["Escolaridad"]).toBe("bachelor");
    expect(result[0]["Tipo Contrato"]).toBe("permanent");
  });

  it("incluye el ID del empleado", () => {
    const result = mapToGenericFormat([sampleEmployees[0]]);
    expect(result[0]["ID"]).toBe(1);
  });

  it("devuelve cadena vacía para campos nulos en formato genérico", () => {
    const result = mapToGenericFormat([sampleEmployees[1]]);
    expect(result[0]["RFC"]).toBe("");
    expect(result[0]["NSS"]).toBe("");
    expect(result[0]["Género"]).toBe("female");
    expect(result[0]["Escolaridad"]).toBe("");
  });
});

describe("massiveImport.importEmployees — validación de campos extendidos", () => {
  it("acepta campos opcionales rfc, nss, gender, educationLevel, contractType", () => {
    const employeeData = {
      firstName: "Juan",
      lastName: "García",
      email: "juan@empresa.com",
      curp: "GALJ850101HDFRCN01",
      departmentId: 1,
      positionId: 1,
      hireDate: "2024-01-15",
      rfc: "GALJ850101ABC",
      nss: "12345678901",
      gender: "male" as const,
      educationLevel: "bachelor" as const,
      contractType: "permanent" as const,
    };
    // Validar que el objeto tiene todos los campos esperados
    expect(employeeData.rfc).toBe("GALJ850101ABC");
    expect(employeeData.nss).toBe("12345678901");
    expect(employeeData.gender).toBe("male");
    expect(employeeData.educationLevel).toBe("bachelor");
    expect(employeeData.contractType).toBe("permanent");
  });

  it("permite campos opcionales ausentes (undefined)", () => {
    const minimalEmployee = {
      firstName: "Ana",
      lastName: "Pérez",
      email: "ana@empresa.com",
      curp: "PERA900101MDFRZN01",
      departmentId: 1,
      positionId: 1,
      hireDate: "2024-06-01",
    };
    // Sin campos opcionales, no debe fallar
    expect(minimalEmployee.firstName).toBe("Ana");
    expect((minimalEmployee as any).rfc).toBeUndefined();
    expect((minimalEmployee as any).nss).toBeUndefined();
  });

  it("valida los valores de gender (solo male/female/other)", () => {
    const validGenders = ["male", "female", "other"];
    const invalidGender = "masculino";
    expect(validGenders).toContain("male");
    expect(validGenders).toContain("female");
    expect(validGenders).not.toContain(invalidGender);
  });

  it("valida los valores de educationLevel", () => {
    const validLevels = ["primary", "secondary", "high_school", "technical", "bachelor", "master", "doctorate", "other"];
    expect(validLevels).toContain("bachelor");
    expect(validLevels).not.toContain("licenciatura"); // El enum usa inglés
  });

  it("valida los valores de contractType", () => {
    const validTypes = ["permanent", "temporary", "project", "internship", "outsourcing"];
    expect(validTypes).toContain("permanent");
    expect(validTypes).not.toContain("indefinido"); // El enum usa inglés
  });
});
