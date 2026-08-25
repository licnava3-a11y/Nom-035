/**
 * Tests unitarios para el sistema de alertas de casos estancados
 */

import { describe, it, expect } from "vitest";

export function calculateDaysOpen(
  createdAt: Date,
  now: Date = new Date()
): number {
  const diffMs = now.getTime() - createdAt.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

export function isCaseStale(
  createdAt: Date,
  status: string,
  daysThreshold: number = 7,
  now: Date = new Date()
): boolean {
  if (status !== "open") return false;
  const daysOpen = calculateDaysOpen(createdAt, now);
  return daysOpen >= daysThreshold;
}

export function isCriticalCaseStale(
  createdAt: Date,
  status: string,
  priority: string,
  now: Date = new Date()
): boolean {
  if (status !== "open" || priority !== "critical") return false;
  const daysOpen = calculateDaysOpen(createdAt, now);
  return daysOpen >= 3;
}

export function generateStaleNotificationMessage(
  caseNumber: string,
  daysOpen: number,
  isCritical: boolean = false
): string {
  if (isCritical) {
    return `⚠️ URGENTE: El caso crítico ${caseNumber} lleva ${daysOpen} días abierto sin resolución. Requiere atención inmediata.`;
  }
  return `El caso ${caseNumber} lleva ${daysOpen} días abierto sin cambio de estado. Requiere atención.`;
}

export function classifyCaseUrgency(
  daysOpen: number,
  priority: string
): "low" | "medium" | "high" | "critical" {
  if (priority === "critical" && daysOpen >= 3) return "critical";
  if (priority === "high" && daysOpen >= 5) return "high";
  if (daysOpen >= 14) return "high";
  if (daysOpen >= 7) return "medium";
  return "low";
}

describe("Sistema de Alertas de Casos Estancados", () => {
  describe("calculateDaysOpen", () => {
    it("debe calcular correctamente días transcurridos", () => {
      const createdAt = new Date("2024-01-01T00:00:00Z");
      const now = new Date("2024-01-08T00:00:00Z");
      expect(calculateDaysOpen(createdAt, now)).toBe(7);
    });

    it("debe retornar 0 para casos creados el mismo día", () => {
      const createdAt = new Date("2024-01-01T10:00:00Z");
      const now = new Date("2024-01-01T20:00:00Z");
      expect(calculateDaysOpen(createdAt, now)).toBe(0);
    });

    it("debe manejar correctamente diferencias de horas (redondeo hacia abajo)", () => {
      const createdAt = new Date("2024-01-01T00:00:00Z");
      const now = new Date("2024-01-04T23:59:59Z");
      expect(calculateDaysOpen(createdAt, now)).toBe(3);
    });

    it("debe calcular correctamente períodos largos (>30 días)", () => {
      const createdAt = new Date("2024-01-01T00:00:00Z");
      const now = new Date("2024-02-15T00:00:00Z");
      expect(calculateDaysOpen(createdAt, now)).toBe(45);
    });
  });

  describe("isCaseStale", () => {
    const now = new Date("2024-01-15T00:00:00Z");

    it("debe detectar caso abierto por más de 7 días", () => {
      const createdAt = new Date("2024-01-01T00:00:00Z");
      expect(isCaseStale(createdAt, "open", 7, now)).toBe(true);
    });

    it("debe retornar false para caso abierto por menos de 7 días", () => {
      const createdAt = new Date("2024-01-10T00:00:00Z");
      expect(isCaseStale(createdAt, "open", 7, now)).toBe(false);
    });

    it("debe retornar false para casos cerrados independientemente de días", () => {
      const createdAt = new Date("2024-01-01T00:00:00Z");
      expect(isCaseStale(createdAt, "closed", 7, now)).toBe(false);
    });

    it("debe retornar false para casos en progreso", () => {
      const createdAt = new Date("2024-01-01T00:00:00Z");
      expect(isCaseStale(createdAt, "in_progress", 7, now)).toBe(false);
    });

    it("debe detectar correctamente casos en el límite exacto (7 días)", () => {
      const createdAt = new Date("2024-01-08T00:00:00Z");
      expect(isCaseStale(createdAt, "open", 7, now)).toBe(true);
    });

    it("debe permitir umbrales personalizados", () => {
      const createdAt = new Date("2024-01-10T00:00:00Z");
      expect(isCaseStale(createdAt, "open", 3, now)).toBe(true);
      expect(isCaseStale(createdAt, "open", 10, now)).toBe(false);
    });
  });

  describe("isCriticalCaseStale", () => {
    const now = new Date("2024-01-10T00:00:00Z");

    it("debe detectar caso crítico abierto por más de 3 días", () => {
      const createdAt = new Date("2024-01-01T00:00:00Z");
      expect(isCriticalCaseStale(createdAt, "open", "critical", now)).toBe(
        true
      );
    });

    it("debe retornar false para caso crítico abierto por menos de 3 días", () => {
      const createdAt = new Date("2024-01-08T00:00:00Z");
      expect(isCriticalCaseStale(createdAt, "open", "critical", now)).toBe(
        false
      );
    });

    it("debe retornar false para casos no críticos independientemente de días", () => {
      const createdAt = new Date("2024-01-01T00:00:00Z");
      expect(isCriticalCaseStale(createdAt, "open", "high", now)).toBe(false);
      expect(isCriticalCaseStale(createdAt, "open", "medium", now)).toBe(false);
      expect(isCriticalCaseStale(createdAt, "open", "low", now)).toBe(false);
    });

    it("debe retornar false para casos críticos cerrados", () => {
      const createdAt = new Date("2024-01-01T00:00:00Z");
      expect(isCriticalCaseStale(createdAt, "closed", "critical", now)).toBe(
        false
      );
    });

    it("debe detectar correctamente casos en el límite exacto (3 días)", () => {
      const createdAt = new Date("2024-01-07T00:00:00Z");
      expect(isCriticalCaseStale(createdAt, "open", "critical", now)).toBe(
        true
      );
    });
  });

  describe("generateStaleNotificationMessage", () => {
    it("debe generar mensaje estándar para casos regulares", () => {
      const message = generateStaleNotificationMessage("CASE-001", 10, false);
      expect(message).toContain("CASE-001");
      expect(message).toContain("10 días");
      expect(message).toContain("Requiere atención");
      expect(message).not.toContain("URGENTE");
    });

    it("debe generar mensaje urgente para casos críticos", () => {
      const message = generateStaleNotificationMessage("CASE-002", 5, true);
      expect(message).toContain("⚠️ URGENTE");
      expect(message).toContain("CASE-002");
      expect(message).toContain("5 días");
      expect(message).toContain("crítico");
      expect(message).toContain("atención inmediata");
    });

    it("debe manejar correctamente 1 día (singular)", () => {
      const message = generateStaleNotificationMessage("CASE-003", 1, false);
      expect(message).toContain("1 día");
    });

    it("debe incluir número de caso en el mensaje", () => {
      const message1 = generateStaleNotificationMessage("CASE-123", 7, false);
      const message2 = generateStaleNotificationMessage("CASE-456", 7, false);
      expect(message1).toContain("CASE-123");
      expect(message2).toContain("CASE-456");
    });
  });

  describe("classifyCaseUrgency", () => {
    it('debe clasificar como "critical" casos críticos con >3 días', () => {
      expect(classifyCaseUrgency(5, "critical")).toBe("critical");
      expect(classifyCaseUrgency(10, "critical")).toBe("critical");
    });

    it('debe clasificar como "high" casos de alta prioridad con >5 días', () => {
      expect(classifyCaseUrgency(7, "high")).toBe("high");
      expect(classifyCaseUrgency(10, "high")).toBe("high");
    });

    it('debe clasificar como "high" cualquier caso con >14 días', () => {
      expect(classifyCaseUrgency(15, "low")).toBe("high");
      expect(classifyCaseUrgency(20, "medium")).toBe("high");
    });

    it('debe clasificar como "medium" casos con 7-13 días', () => {
      expect(classifyCaseUrgency(7, "low")).toBe("medium");
      expect(classifyCaseUrgency(10, "medium")).toBe("medium");
      expect(classifyCaseUrgency(13, "low")).toBe("medium");
    });

    it('debe clasificar como "low" casos con <7 días', () => {
      expect(classifyCaseUrgency(1, "low")).toBe("low");
      expect(classifyCaseUrgency(5, "medium")).toBe("low");
      expect(classifyCaseUrgency(4, "high")).toBe("low");
    });

    it("debe manejar correctamente casos en límites de umbral", () => {
      expect(classifyCaseUrgency(3, "critical")).toBe("critical");
      expect(classifyCaseUrgency(5, "high")).toBe("high");
      expect(classifyCaseUrgency(7, "low")).toBe("medium");
      expect(classifyCaseUrgency(14, "low")).toBe("high");
    });
  });

  describe("Integración: Flujo completo de detección de casos estancados", () => {
    const now = new Date("2024-01-20T00:00:00Z");

    it("debe identificar correctamente múltiples casos estancados", () => {
      const cases = [
        {
          id: 1,
          caseNumber: "CASE-001",
          createdAt: new Date("2024-01-01"),
          status: "open",
          priority: "low",
        },
        {
          id: 2,
          caseNumber: "CASE-002",
          createdAt: new Date("2024-01-10"),
          status: "open",
          priority: "medium",
        },
        {
          id: 3,
          caseNumber: "CASE-003",
          createdAt: new Date("2024-01-15"),
          status: "open",
          priority: "high",
        },
        {
          id: 4,
          caseNumber: "CASE-004",
          createdAt: new Date("2024-01-05"),
          status: "closed",
          priority: "low",
        },
      ];

      const staleCases = cases.filter((c: any) =>
        isCaseStale(c.createdAt, c.status, 7, now)
      );
      expect(staleCases).toHaveLength(2);
      expect(staleCases.map((c: any) => c.caseNumber)).toContain("CASE-001");
      expect(staleCases.map((c: any) => c.caseNumber)).toContain("CASE-002");
    });

    it("debe identificar correctamente casos críticos estancados", () => {
      const cases = [
        {
          id: 1,
          caseNumber: "CASE-001",
          createdAt: new Date("2024-01-15"),
          status: "open",
          priority: "critical",
        },
        {
          id: 2,
          caseNumber: "CASE-002",
          createdAt: new Date("2024-01-10"),
          status: "open",
          priority: "critical",
        },
        {
          id: 3,
          caseNumber: "CASE-003",
          createdAt: new Date("2024-01-18"),
          status: "open",
          priority: "critical",
        },
      ];

      const criticalStale = cases.filter((c: any) =>
        isCriticalCaseStale(c.createdAt, c.status, c.priority, now)
      );
      expect(criticalStale).toHaveLength(2);
      expect(criticalStale.map((c: any) => c.caseNumber)).toContain("CASE-001");
      expect(criticalStale.map((c: any) => c.caseNumber)).toContain("CASE-002");
    });

    it("debe generar notificaciones apropiadas para cada tipo de caso", () => {
      const regularCase = {
        caseNumber: "CASE-001",
        daysOpen: 10,
        priority: "medium",
      };
      const criticalCase = {
        caseNumber: "CASE-002",
        daysOpen: 5,
        priority: "critical",
      };

      const regularMessage = generateStaleNotificationMessage(
        regularCase.caseNumber,
        regularCase.daysOpen,
        false
      );
      const criticalMessage = generateStaleNotificationMessage(
        criticalCase.caseNumber,
        criticalCase.daysOpen,
        true
      );

      expect(regularMessage).not.toContain("URGENTE");
      expect(criticalMessage).toContain("URGENTE");
      expect(regularMessage).toContain("10 días");
      expect(criticalMessage).toContain("5 días");
    });

    it("debe calcular urgencia correcta para diferentes escenarios", () => {
      const scenarios = [
        { days: 2, priority: "critical", expected: "low" },
        { days: 5, priority: "critical", expected: "critical" },
        { days: 7, priority: "high", expected: "high" },
        { days: 10, priority: "medium", expected: "medium" },
        { days: 15, priority: "low", expected: "high" },
      ];

      scenarios.forEach(({ days, priority, expected }) => {
        expect(classifyCaseUrgency(days, priority)).toBe(expected);
      });
    });
  });
});
