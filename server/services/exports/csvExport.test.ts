import { describe, expect, it } from "vitest";
import { toCsv } from "./csvExport";

describe("toCsv", () => {
  it("conserva encabezados, diez filas representativas y valores nulos", () => {
    const csv = toCsv(
      ["ID", "Colaborador", "Área", "Progreso"],
      [
        [1, "Ana", "Operaciones", 100],
        [2, "Bruno", "Calidad", 90],
        [3, "Carla", "Recursos Humanos", 80],
        [4, "Diego", "Producción", 70],
        [5, "Elena", "Logística", 60],
        [6, "Felipe", "Tecnología", 50],
        [7, "Gabriela", "Finanzas", 40],
        [8, "Hugo", "Ventas", 30],
        [9, "Inés", "Dirección", 20],
        [10, null, "Sin asignación", null],
      ]
    );

    const lines = csv.split("\n");
    expect(lines).toHaveLength(11);
    expect(lines[0]).toBe("ID,Colaborador,Área,Progreso");
    expect(lines[10]).toBe("10,,Sin asignación,");
  });

  it("escapa comillas, comas y saltos de línea según CSV", () => {
    const csv = toCsv(["Detalle"], [["Meta, revisada"], ["Dijo \"sí\""], ["Línea 1\nLínea 2"]]);

    expect(csv).toBe('Detalle\n"Meta, revisada"\n"Dijo ""sí"""\n"Línea 1\nLínea 2"');
  });
});
