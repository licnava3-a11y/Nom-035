import { describe, expect, it } from "vitest";
import { toEmployeeAutofillData, toEmployeeAutofillOption } from "./employeeAutofill";

describe("adaptador de prellenado de empleado", () => {
  it("normaliza datos maestros de empresa a responsable con valores seguros", () => {
    const data = toEmployeeAutofillData({
      id: 8,
      firstName: "Ana",
      lastName: "López",
      email: "ana@example.test",
      department: "Recursos Humanos",
      positionName: "Analista",
      companyName: "Empresa NOM",
      branch: "Centro Norte",
      managerName: "María Pérez",
    });

    expect(data.fullName).toBe("Ana López");
    expect(data.departmentName).toBe("Recursos Humanos");
    expect(data.companyName).toBe("Empresa NOM");
    expect(data.branchName).toBe("Centro Norte");
    expect(data.managerName).toBe("María Pérez");
    expect(toEmployeeAutofillOption({ id: 8, firstName: "Ana", lastName: "López" }).value).toBe("8");
  });
});
