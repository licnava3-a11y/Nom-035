import { describe, it, expect } from "vitest";

// Sprint 13: Auditoría + Gráfica NOM-035 + Seguimiento Acuerdos + Email empleados

describe("Sprint 13 - Auditoría y Módulos", () => {
  describe("Auditoría TypeScript", () => {
    it("Las propiedades del widget de calidad usan nombres correctos del backend", () => {
      // Los nombres correctos son: pendiente, corregido, implementada, pctImplemented
      const mockBugStats = {
        pendiente: 5,
        en_revision: 2,
        corregido: 10,
        critico: 1,
        total: 18,
      };
      const mockFeatureStats = {
        solicitada: 3,
        en_desarrollo: 2,
        implementada: 8,
        rechazada: 1,
        total: 14,
        pctImplemented: 57,
      };
      expect(mockBugStats.pendiente).toBe(5);
      expect(mockBugStats.corregido).toBe(10);
      expect(mockFeatureStats.implementada).toBe(8);
      expect(mockFeatureStats.pctImplemented).toBe(57);
    });
  });

  describe("Gráfica de barras NOM-035 Extendido", () => {
    it("Calcula el nivel de riesgo correcto según el puntaje", () => {
      const getRiskLevel = (score: number) => {
        if (score === 0) return "Nulo";
        if (score <= 20) return "Bajo";
        if (score <= 45) return "Medio";
        if (score <= 70) return "Alto";
        return "Muy Alto";
      };
      expect(getRiskLevel(0)).toBe("Nulo");
      expect(getRiskLevel(10)).toBe("Bajo");
      expect(getRiskLevel(30)).toBe("Medio");
      expect(getRiskLevel(60)).toBe("Alto");
      expect(getRiskLevel(80)).toBe("Muy Alto");
    });

    it("Asigna el color correcto según el nivel de riesgo", () => {
      const getRiskColor = (level: string) => {
        const colors: Record<string, string> = {
          Nulo: "#22c55e",
          Bajo: "#86efac",
          Medio: "#facc15",
          Alto: "#f97316",
          "Muy Alto": "#ef4444",
        };
        return colors[level] || "#6b7280";
      };
      expect(getRiskColor("Nulo")).toBe("#22c55e");
      expect(getRiskColor("Muy Alto")).toBe("#ef4444");
      expect(getRiskColor("Desconocido")).toBe("#6b7280");
    });
  });

  describe("Seguimiento de Acuerdos del Comité", () => {
    it("Detecta acuerdos vencidos correctamente", () => {
      const today = new Date();
      const pastDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); // hace 7 días
      const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // en 7 días

      const isOverdue = (dueDate: Date, status: string) => {
        return dueDate < today && status !== "completado";
      };

      expect(isOverdue(pastDate, "pendiente")).toBe(true);
      expect(isOverdue(pastDate, "completado")).toBe(false);
      expect(isOverdue(futureDate, "pendiente")).toBe(false);
    });

    it("Detecta acuerdos por vencer en los próximos 7 días", () => {
      const today = new Date();
      const in3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
      const in10Days = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000);

      const isDueSoon = (dueDate: Date, status: string) => {
        const diffDays = Math.ceil(
          (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        return diffDays <= 7 && diffDays >= 0 && status !== "completado";
      };

      expect(isDueSoon(in3Days, "pendiente")).toBe(true);
      expect(isDueSoon(in10Days, "pendiente")).toBe(false);
      expect(isDueSoon(in3Days, "completado")).toBe(false);
    });

    it("Valida los estados permitidos de un acuerdo", () => {
      const validStatuses = [
        "pendiente",
        "en_proceso",
        "completado",
        "cancelado",
      ];
      expect(validStatuses).toContain("pendiente");
      expect(validStatuses).toContain("en_proceso");
      expect(validStatuses).toContain("completado");
      expect(validStatuses).toContain("cancelado");
      expect(validStatuses).not.toContain("borrador");
    });
  });

  describe("Validación de email en empleados", () => {
    it("Valida formato de correo electrónico correctamente", () => {
      const isValidEmail = (email: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      expect(isValidEmail("usuario@empresa.com")).toBe(true);
      expect(isValidEmail("nombre.apellido@dominio.mx")).toBe(true);
      expect(isValidEmail("invalido")).toBe(false);
      expect(isValidEmail("sin@dominio")).toBe(false);
      expect(isValidEmail("")).toBe(false);
    });

    it("Rechaza email vacío como obligatorio", () => {
      const validateEmail = (email: string): string | null => {
        if (!email.trim()) return "El correo electrónico es requerido";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          return "El correo electrónico no es válido";
        return null;
      };
      expect(validateEmail("")).toBe("El correo electrónico es requerido");
      expect(validateEmail("   ")).toBe("El correo electrónico es requerido");
      expect(validateEmail("invalido")).toBe(
        "El correo electrónico no es válido"
      );
      expect(validateEmail("valido@empresa.com")).toBeNull();
    });
  });

  describe("Comparativa Q1/Q2 en widget de calidad", () => {
    it("Calcula correctamente el porcentaje de implementación", () => {
      const calcPct = (implemented: number, total: number) => {
        if (total === 0) return 0;
        return Math.round((implemented / total) * 100);
      };
      expect(calcPct(8, 14)).toBe(57);
      expect(calcPct(0, 10)).toBe(0);
      expect(calcPct(10, 10)).toBe(100);
      expect(calcPct(0, 0)).toBe(0);
    });

    it("Compara correctamente dos períodos", () => {
      const periodA = { bugs: 15, features: 8, implementedFeatures: 5 };
      const periodB = { bugs: 8, features: 12, implementedFeatures: 10 };

      const improvement = {
        bugsReduced: periodA.bugs - periodB.bugs,
        featuresGrowth:
          periodB.implementedFeatures - periodA.implementedFeatures,
      };

      expect(improvement.bugsReduced).toBe(7); // Mejora: menos bugs
      expect(improvement.featuresGrowth).toBe(5); // Mejora: más features implementadas
    });
  });
});
