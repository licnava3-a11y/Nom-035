/**
 * Tests unitarios para cálculos de métricas y reportes del sistema NOM-035
 */

import { describe, it, expect } from 'vitest';

interface Case {
  id: number;
  createdAt: Date;
  closedAt?: Date;
  status: string;
  type: string;
  priority: string;
}

export function calculateSurveyCompletionRate(totalUsers: number, completedResponses: number): number {
  if (totalUsers === 0) return 0;
  return Math.round((completedResponses / totalUsers) * 100 * 10) / 10;
}

export function calculateAverageResolutionTime(cases: Case[]): number {
  const resolvedCases = cases.filter(c => c.closedAt && c.createdAt);
  if (resolvedCases.length === 0) return 0;
  
  const totalDays = resolvedCases.reduce((sum, c) => {
    const diffMs = c.closedAt!.getTime() - c.createdAt.getTime();
    const days = diffMs / (24 * 60 * 60 * 1000);
    return sum + days;
  }, 0);
  
  return Math.round((totalDays / resolvedCases.length) * 10) / 10;
}

export function calculateCaseDistribution(cases: Case[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  cases.forEach(c => {
    distribution[c.type] = (distribution[c.type] || 0) + 1;
  });
  return distribution;
}

export function calculateCaseDistributionPercentage(cases: Case[]): Record<string, number> {
  const distribution = calculateCaseDistribution(cases);
  const total = cases.length;
  if (total === 0) return {};
  
  const percentages: Record<string, number> = {};
  Object.entries(distribution).forEach(([type, count]) => {
    percentages[type] = Math.round((count / total) * 100 * 10) / 10;
  });
  return percentages;
}

export function calculateCasesByMonth(cases: Case[], year: number): Record<string, number> {
  const monthCounts: Record<string, number> = {};
  for (let month = 1; month <= 12; month++) {
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
    monthCounts[monthKey] = 0;
  }
  
  cases.forEach(c => {
    const caseDate = new Date(c.createdAt);
    if (caseDate.getFullYear() === year) {
      const monthKey = `${year}-${(caseDate.getMonth() + 1).toString().padStart(2, '0')}`;
      monthCounts[monthKey]++;
    }
  });
  return monthCounts;
}

export function calculateResolutionRate(cases: Case[]): number {
  if (cases.length === 0) return 0;
  const closedCases = cases.filter(c => c.status === 'closed').length;
  return Math.round((closedCases / cases.length) * 100 * 10) / 10;
}

export function identifyHighRiskCases(cases: Case[], now: Date = new Date()): Case[] {
  return cases.filter(c => {
    if (c.status !== 'open' || c.priority !== 'critical') return false;
    const daysOpen = (now.getTime() - c.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    return daysOpen > 3;
  });
}

export function calculateWorkloadByType(cases: Case[]): Record<string, { open: number; total: number; percentage: number }> {
  const workload: Record<string, { open: number; total: number; percentage: number }> = {};
  
  cases.forEach(c => {
    if (!workload[c.type]) {
      workload[c.type] = { open: 0, total: 0, percentage: 0 };
    }
    workload[c.type].total++;
    if (c.status === 'open') {
      workload[c.type].open++;
    }
  });
  
  Object.keys(workload).forEach(type => {
    const { open, total } = workload[type];
    workload[type].percentage = total > 0 ? Math.round((open / total) * 100 * 10) / 10 : 0;
  });
  return workload;
}

describe('Cálculos de Métricas y Reportes NOM-035', () => {
  describe('calculateSurveyCompletionRate', () => {
    it('debe calcular correctamente la tasa de cumplimiento', () => {
      expect(calculateSurveyCompletionRate(100, 80)).toBe(80.0);
      expect(calculateSurveyCompletionRate(50, 25)).toBe(50.0);
    });

    it('debe retornar 0 cuando no hay usuarios', () => {
      expect(calculateSurveyCompletionRate(0, 0)).toBe(0);
    });

    it('debe manejar correctamente decimales', () => {
      expect(calculateSurveyCompletionRate(100, 67)).toBe(67.0);
      expect(calculateSurveyCompletionRate(100, 33)).toBe(33.0);
    });

    it('debe redondear a 1 decimal', () => {
      expect(calculateSurveyCompletionRate(100, 66)).toBe(66.0);
      expect(calculateSurveyCompletionRate(100, 67)).toBe(67.0);
    });
  });

  describe('calculateAverageResolutionTime', () => {
    it('debe calcular correctamente el tiempo promedio de resolución', () => {
      const cases: Case[] = [
        { id: 1, createdAt: new Date('2024-01-01'), closedAt: new Date('2024-01-05'), status: 'closed', type: 'mobbing', priority: 'high' },
        { id: 2, createdAt: new Date('2024-01-10'), closedAt: new Date('2024-01-20'), status: 'closed', type: 'burnout', priority: 'medium' },
      ];
      expect(calculateAverageResolutionTime(cases)).toBe(7.0);
    });

    it('debe retornar 0 cuando no hay casos resueltos', () => {
      const cases: Case[] = [
        { id: 1, createdAt: new Date('2024-01-01'), status: 'open', type: 'mobbing', priority: 'high' },
      ];
      expect(calculateAverageResolutionTime(cases)).toBe(0);
    });

    it('debe ignorar casos sin fecha de cierre', () => {
      const cases: Case[] = [
        { id: 1, createdAt: new Date('2024-01-01'), closedAt: new Date('2024-01-06'), status: 'closed', type: 'mobbing', priority: 'high' },
        { id: 2, createdAt: new Date('2024-01-10'), status: 'open', type: 'burnout', priority: 'medium' },
      ];
      expect(calculateAverageResolutionTime(cases)).toBe(5.0);
    });

    it('debe manejar correctamente casos con resolución rápida (<1 día)', () => {
      const cases: Case[] = [
        { id: 1, createdAt: new Date('2024-01-01T08:00:00'), closedAt: new Date('2024-01-01T16:00:00'), status: 'closed', type: 'mobbing', priority: 'high' },
      ];
      expect(calculateAverageResolutionTime(cases)).toBeCloseTo(0.3, 1);
    });
  });

  describe('calculateCaseDistribution', () => {
    it('debe calcular correctamente la distribución por tipo', () => {
      const cases: Case[] = [
        { id: 1, createdAt: new Date(), status: 'open', type: 'mobbing', priority: 'high' },
        { id: 2, createdAt: new Date(), status: 'open', type: 'mobbing', priority: 'medium' },
        { id: 3, createdAt: new Date(), status: 'open', type: 'burnout', priority: 'high' },
        { id: 4, createdAt: new Date(), status: 'open', type: 'harassment', priority: 'critical' },
      ];
      
      const distribution = calculateCaseDistribution(cases);
      expect(distribution['mobbing']).toBe(2);
      expect(distribution['burnout']).toBe(1);
      expect(distribution['harassment']).toBe(1);
    });

    it('debe retornar objeto vacío para lista vacía', () => {
      const distribution = calculateCaseDistribution([]);
      expect(distribution).toEqual({});
    });
  });

  describe('calculateCaseDistributionPercentage', () => {
    it('debe calcular correctamente porcentajes de distribución', () => {
      const cases: Case[] = [
        { id: 1, createdAt: new Date(), status: 'open', type: 'mobbing', priority: 'high' },
        { id: 2, createdAt: new Date(), status: 'open', type: 'mobbing', priority: 'medium' },
        { id: 3, createdAt: new Date(), status: 'open', type: 'burnout', priority: 'high' },
        { id: 4, createdAt: new Date(), status: 'open', type: 'harassment', priority: 'critical' },
      ];
      
      const percentages = calculateCaseDistributionPercentage(cases);
      expect(percentages['mobbing']).toBe(50.0);
      expect(percentages['burnout']).toBe(25.0);
      expect(percentages['harassment']).toBe(25.0);
    });

    it('debe retornar objeto vacío para lista vacía', () => {
      const percentages = calculateCaseDistributionPercentage([]);
      expect(percentages).toEqual({});
    });
  });

  describe('calculateCasesByMonth', () => {
    it('debe calcular correctamente casos por mes', () => {
      const cases: Case[] = [
        { id: 1, createdAt: new Date('2024-01-15'), status: 'open', type: 'mobbing', priority: 'high' },
        { id: 2, createdAt: new Date('2024-01-20'), status: 'open', type: 'burnout', priority: 'medium' },
        { id: 3, createdAt: new Date('2024-03-10'), status: 'open', type: 'harassment', priority: 'critical' },
      ];
      
      const monthCounts = calculateCasesByMonth(cases, 2024);
      expect(monthCounts['2024-01']).toBe(2);
      expect(monthCounts['2024-02']).toBe(0);
      expect(monthCounts['2024-03']).toBe(1);
    });

    it('debe inicializar todos los meses en 0', () => {
      const monthCounts = calculateCasesByMonth([], 2024);
      expect(Object.keys(monthCounts)).toHaveLength(12);
      expect(monthCounts['2024-01']).toBe(0);
      expect(monthCounts['2024-12']).toBe(0);
    });

    it('debe ignorar casos de otros años', () => {
      const cases: Case[] = [
        { id: 1, createdAt: new Date('2023-01-15'), status: 'open', type: 'mobbing', priority: 'high' },
        { id: 2, createdAt: new Date('2024-01-20'), status: 'open', type: 'burnout', priority: 'medium' },
        { id: 3, createdAt: new Date('2025-03-10'), status: 'open', type: 'harassment', priority: 'critical' },
      ];
      
      const monthCounts = calculateCasesByMonth(cases, 2024);
      expect(monthCounts['2024-01']).toBe(1);
    });
  });

  describe('calculateResolutionRate', () => {
    it('debe calcular correctamente la tasa de resolución', () => {
      const cases: Case[] = [
        { id: 1, createdAt: new Date(), status: 'closed', type: 'mobbing', priority: 'high' },
        { id: 2, createdAt: new Date(), status: 'closed', type: 'burnout', priority: 'medium' },
        { id: 3, createdAt: new Date(), status: 'open', type: 'harassment', priority: 'critical' },
        { id: 4, createdAt: new Date(), status: 'in_progress', type: 'mobbing', priority: 'high' },
      ];
      expect(calculateResolutionRate(cases)).toBe(50.0);
    });

    it('debe retornar 0 para lista vacía', () => {
      expect(calculateResolutionRate([])).toBe(0);
    });

    it('debe retornar 100 cuando todos están cerrados', () => {
      const cases: Case[] = [
        { id: 1, createdAt: new Date(), status: 'closed', type: 'mobbing', priority: 'high' },
        { id: 2, createdAt: new Date(), status: 'closed', type: 'burnout', priority: 'medium' },
      ];
      expect(calculateResolutionRate(cases)).toBe(100.0);
    });
  });

  describe('identifyHighRiskCases', () => {
    const now = new Date('2024-01-10T00:00:00Z');

    it('debe identificar casos críticos abiertos >3 días', () => {
      const cases: Case[] = [
        { id: 1, createdAt: new Date('2024-01-01'), status: 'open', type: 'mobbing', priority: 'critical' },
        { id: 2, createdAt: new Date('2024-01-08'), status: 'open', type: 'burnout', priority: 'critical' },
        { id: 3, createdAt: new Date('2024-01-05'), status: 'open', type: 'harassment', priority: 'high' },
      ];
      
      const highRisk = identifyHighRiskCases(cases, now);
      expect(highRisk).toHaveLength(1);
      expect(highRisk[0].id).toBe(1);
    });

    it('debe excluir casos no críticos', () => {
      const cases: Case[] = [
        { id: 1, createdAt: new Date('2024-01-01'), status: 'open', type: 'mobbing', priority: 'high' },
        { id: 2, createdAt: new Date('2024-01-01'), status: 'open', type: 'burnout', priority: 'medium' },
      ];
      
      const highRisk = identifyHighRiskCases(cases, now);
      expect(highRisk).toHaveLength(0);
    });

    it('debe excluir casos cerrados', () => {
      const cases: Case[] = [
        { id: 1, createdAt: new Date('2024-01-01'), status: 'closed', type: 'mobbing', priority: 'critical' },
      ];
      
      const highRisk = identifyHighRiskCases(cases, now);
      expect(highRisk).toHaveLength(0);
    });
  });

  describe('calculateWorkloadByType', () => {
    it('debe calcular correctamente la carga de trabajo por tipo', () => {
      const cases: Case[] = [
        { id: 1, createdAt: new Date(), status: 'open', type: 'mobbing', priority: 'high' },
        { id: 2, createdAt: new Date(), status: 'closed', type: 'mobbing', priority: 'medium' },
        { id: 3, createdAt: new Date(), status: 'open', type: 'burnout', priority: 'high' },
        { id: 4, createdAt: new Date(), status: 'open', type: 'burnout', priority: 'critical' },
      ];
      
      const workload = calculateWorkloadByType(cases);
      expect(workload['mobbing'].total).toBe(2);
      expect(workload['mobbing'].open).toBe(1);
      expect(workload['mobbing'].percentage).toBe(50.0);
      expect(workload['burnout'].total).toBe(2);
      expect(workload['burnout'].open).toBe(2);
      expect(workload['burnout'].percentage).toBe(100.0);
    });

    it('debe retornar objeto vacío para lista vacía', () => {
      const workload = calculateWorkloadByType([]);
      expect(workload).toEqual({});
    });
  });
});
