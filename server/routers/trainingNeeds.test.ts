import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from '../routers';
import { getDb } from '../db';
import { trainingNeeds, employees, competencies, employeeCompetencies } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('trainingNeeds router', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testEmployeeId: number;
  let testCompetencyId: number;
  let testNeedId: number;

  beforeAll(async () => {
    // Crear caller con contexto de usuario admin
    caller = appRouter.createCaller({
      user: {
        id: 1,
        openId: 'test-admin',
        name: 'Test Admin',
        email: 'admin@test.com',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Crear empleado de prueba
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [employee] = await db.insert(employees).values({
      firstName: 'Test',
      lastName: 'Employee DNC',
      email: 'test.dnc@example.com',
      department: 'IT',
      position: 'Developer',
      hireDate: new Date(),
      status: 'active',
    });
    testEmployeeId = employee.insertId;

    // Crear competencia de prueba
    const [competency] = await db.insert(competencies).values({
      name: 'Arquitectura de Software',
      type: 'tecnica',
      description: 'Competencia técnica de arquitectura',
      createdBy: 1,
    });
    testCompetencyId = competency.insertId;

    // Crear competencia del empleado (nivel actual intermedio)
    await db.insert(employeeCompetencies).values({
      employeeId: testEmployeeId,
      competencyName: 'Arquitectura de Software',
      competencyType: 'tecnica',
      currentLevel: 'intermedio',
    });
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    const db = await getDb();
    if (!db) return;

    if (testNeedId) {
      await db.delete(trainingNeeds).where(eq(trainingNeeds.id, testNeedId));
    }
    if (testEmployeeId) {
      await db.delete(employeeCompetencies).where(eq(employeeCompetencies.employeeId, testEmployeeId));
      await db.delete(employees).where(eq(employees.id, testEmployeeId));
    }
    if (testCompetencyId) {
      await db.delete(competencies).where(eq(competencies.id, testCompetencyId));
    }
  });

  describe('create', () => {
    it('debe crear una necesidad de capacitación', async () => {
      const result = await caller.trainingNeeds.create({
        employeeId: testEmployeeId,
        competencyId: testCompetencyId,
        trainingType: 'curso',
        priority: 'alta',
        justification: 'Brecha crítica en arquitectura de software',
        suggestedCourse: 'Curso de Arquitectura Avanzada',
        estimatedDuration: 40,
        estimatedCost: 5000,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      testNeedId = result.id;
    });
  });

  describe('list', () => {
    it('debe listar necesidades de capacitación', async () => {
      const result = await caller.trainingNeeds.list({});

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('debe filtrar por estado pendiente', async () => {
      const result = await caller.trainingNeeds.list({
        status: 'pendiente',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      result.forEach(need => {
        expect(need.status).toBe('pendiente');
      });
    });

    it('debe filtrar por prioridad alta', async () => {
      const result = await caller.trainingNeeds.list({
        priority: 'alta',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      result.forEach(need => {
        expect(need.priority).toBe('alta');
      });
    });
  });

  describe('getById', () => {
    it('debe obtener una necesidad por ID', async () => {
      const result = await caller.trainingNeeds.getById({ id: testNeedId });

      expect(result).toBeDefined();
      expect(result.id).toBe(testNeedId);
      expect(result.employeeId).toBe(testEmployeeId);
      expect(result.competencyId).toBe(testCompetencyId);
    });
  });

  describe('getCriticalGaps', () => {
    it('debe obtener top 3 brechas críticas', async () => {
      const result = await caller.trainingNeeds.getCriticalGaps();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(3);

      if (result.length > 0) {
        const gap = result[0];
        expect(gap.competencyName).toBeDefined();
        expect(gap.competencyType).toBeDefined();
        expect(gap.avgGap).toBeGreaterThan(0);
        expect(gap.affectedEmployees).toBeGreaterThan(0);
        expect(gap.criticalCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('generateFromPerformance', () => {
    it('debe generar necesidades desde evaluaciones de desempeño', async () => {
      const result = await caller.trainingNeeds.generateFromPerformance({
        evaluationId: 1,
        threshold: 3,
      });

      expect(result).toBeDefined();
      expect(result.generated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateFromSkillsMatrix', () => {
    it('debe generar necesidades desde matriz de habilidades', async () => {
      const result = await caller.trainingNeeds.generateFromSkillsMatrix({
        minGap: 2,
      });

      expect(result).toBeDefined();
      expect(result.generated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('approve', () => {
    it('debe aprobar una necesidad de capacitación', async () => {
      const result = await caller.trainingNeeds.approve({
        id: testNeedId,
        approvedCourse: 'Curso de Arquitectura Avanzada',
        approvedDuration: 40,
        approvedCost: 5000,
        approvalNotes: 'Aprobado por alta prioridad',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Verificar que el estado cambió
      const need = await caller.trainingNeeds.getById({ id: testNeedId });
      expect(need.status).toBe('aprobada');
    });
  });

  describe('update', () => {
    it('debe actualizar una necesidad de capacitación', async () => {
      const result = await caller.trainingNeeds.update({
        id: testNeedId,
        priority: 'media',
        justification: 'Justificación actualizada',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Verificar que se actualizó
      const need = await caller.trainingNeeds.getById({ id: testNeedId });
      expect(need.priority).toBe('media');
    });
  });

  describe('delete', () => {
    it('debe eliminar una necesidad de capacitación', async () => {
      const result = await caller.trainingNeeds.delete({ id: testNeedId });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Marcar como eliminado para no intentar limpiar en afterAll
      testNeedId = 0;
    });
  });
});
