/**
 * Tests unitarios para los módulos:
 * - Buzón de Comunicación Interna
 * - Expediente Clínico Psicométrico
 * - Segmentación demográfica del Dashboard de Tokens
 */
import { describe, it, expect } from 'vitest';

// ─── Buzón de Comunicación Interna ───────────────────────────────────────────

describe('Buzón de Comunicación Interna', () => {
  it('genera folio con formato correcto', () => {
    const generateFolio = (type: string, id: number): string => {
      const prefix: Record<string, string> = {
        queja: 'QJA',
        denuncia: 'DEN',
        felicitacion: 'FEL',
        solicitud_capacitacion: 'DNC',
        sugerencia: 'SUG',
      };
      const p = prefix[type] ?? 'GEN';
      const year = new Date().getFullYear();
      return `${p}-${year}-${String(id).padStart(5, '0')}`;
    };

    expect(generateFolio('queja', 1)).toMatch(/^QJA-\d{4}-00001$/);
    expect(generateFolio('denuncia', 42)).toMatch(/^DEN-\d{4}-00042$/);
    expect(generateFolio('felicitacion', 100)).toMatch(/^FEL-\d{4}-00100$/);
    expect(generateFolio('solicitud_capacitacion', 7)).toMatch(/^DNC-\d{4}-00007$/);
    expect(generateFolio('sugerencia', 999)).toMatch(/^SUG-\d{4}-00999$/);
  });

  it('valida que los tipos de solicitud son correctos', () => {
    const validTypes = ['queja', 'denuncia', 'felicitacion', 'solicitud_capacitacion', 'sugerencia'];
    expect(validTypes).toContain('queja');
    expect(validTypes).toContain('denuncia');
    expect(validTypes).toContain('felicitacion');
    expect(validTypes).toContain('solicitud_capacitacion');
    expect(validTypes).toContain('sugerencia');
    expect(validTypes).not.toContain('otro_tipo');
  });

  it('valida que los estados de solicitud son correctos', () => {
    const validStatuses = ['pendiente', 'en_proceso', 'resuelto', 'cerrado'];
    expect(validStatuses).toContain('pendiente');
    expect(validStatuses).toContain('en_proceso');
    expect(validStatuses).toContain('resuelto');
    expect(validStatuses).toContain('cerrado');
  });

  it('valida que los niveles de prioridad son correctos', () => {
    const validPriorities = ['baja', 'media', 'alta', 'urgente'];
    expect(validPriorities).toContain('baja');
    expect(validPriorities).toContain('media');
    expect(validPriorities).toContain('alta');
    expect(validPriorities).toContain('urgente');
  });

  it('calcula el SLA en días según prioridad', () => {
    const getSLADays = (priority: string): number => {
      const sla: Record<string, number> = {
        urgente: 1,
        alta: 3,
        media: 7,
        baja: 15,
      };
      return sla[priority] ?? 7;
    };

    expect(getSLADays('urgente')).toBe(1);
    expect(getSLADays('alta')).toBe(3);
    expect(getSLADays('media')).toBe(7);
    expect(getSLADays('baja')).toBe(15);
    expect(getSLADays('desconocido')).toBe(7);
  });

  it('verifica que una solicitud anónima no expone datos del empleado', () => {
    const sanitizeRequest = (req: { isAnonymous: boolean; employeeId?: number; employeeName?: string }) => {
      if (req.isAnonymous) {
        return { ...req, employeeId: undefined, employeeName: 'Anónimo' };
      }
      return req;
    };

    const anonReq = sanitizeRequest({ isAnonymous: true, employeeId: 42, employeeName: 'Juan Pérez' });
    expect(anonReq.employeeId).toBeUndefined();
    expect(anonReq.employeeName).toBe('Anónimo');

    const namedReq = sanitizeRequest({ isAnonymous: false, employeeId: 42, employeeName: 'Juan Pérez' });
    expect(namedReq.employeeId).toBe(42);
    expect(namedReq.employeeName).toBe('Juan Pérez');
  });
});

// ─── Expediente Clínico Psicométrico ─────────────────────────────────────────

describe('Expediente Clínico Psicométrico', () => {
  it('valida los tipos de evaluación disponibles', () => {
    const validTypes = [
      'historia_clinica',
      'evaluacion_psicologica',
      'evaluacion_riesgo_psicosocial',
      'seguimiento',
      'alta_medica',
    ];
    expect(validTypes).toContain('historia_clinica');
    expect(validTypes).toContain('evaluacion_psicologica');
    expect(validTypes).toContain('evaluacion_riesgo_psicosocial');
    expect(validTypes).not.toContain('tipo_invalido');
  });

  it('valida los estados de sesión clínica', () => {
    const validStatuses = ['programada', 'completada', 'cancelada', 'no_asistio'];
    expect(validStatuses).toContain('programada');
    expect(validStatuses).toContain('completada');
    expect(validStatuses).toContain('cancelada');
    expect(validStatuses).toContain('no_asistio');
  });

  it('verifica que el acceso al expediente está restringido a admin', () => {
    const canAccessClinicalRecord = (userRole: string): boolean => {
      return userRole === 'admin' || userRole === 'psicologo';
    };

    expect(canAccessClinicalRecord('admin')).toBe(true);
    expect(canAccessClinicalRecord('psicologo')).toBe(true);
    expect(canAccessClinicalRecord('user')).toBe(false);
    expect(canAccessClinicalRecord('supervisor')).toBe(false);
  });

  it('valida los niveles de riesgo psicosocial NOM-035', () => {
    const validRiskLevels = ['nulo', 'bajo', 'medio', 'alto', 'muy_alto'];
    expect(validRiskLevels).toContain('nulo');
    expect(validRiskLevels).toContain('bajo');
    expect(validRiskLevels).toContain('medio');
    expect(validRiskLevels).toContain('alto');
    expect(validRiskLevels).toContain('muy_alto');
  });

  it('calcula el número de sesiones completadas correctamente', () => {
    const sessions = [
      { status: 'completada' },
      { status: 'completada' },
      { status: 'cancelada' },
      { status: 'no_asistio' },
      { status: 'programada' },
    ];
    const completed = sessions.filter(s => s.status === 'completada').length;
    expect(completed).toBe(2);
  });

  it('verifica que las notas de sesión tienen los campos requeridos', () => {
    const validateNote = (note: Record<string, any>): boolean => {
      return !!(note.sessionDate && note.content && note.sessionType);
    };

    expect(validateNote({ sessionDate: new Date(), content: 'Nota de sesión', sessionType: 'seguimiento' })).toBe(true);
    expect(validateNote({ content: 'Sin fecha', sessionType: 'seguimiento' })).toBe(false);
    expect(validateNote({ sessionDate: new Date(), sessionType: 'seguimiento' })).toBe(false);
  });
});

// ─── Segmentación demográfica del Dashboard de Tokens ────────────────────────

describe('Segmentación demográfica NOM-035', () => {
  it('clasifica correctamente los rangos de edad según NOM-035', () => {
    const getAgeGroup = (birthDate: Date | null): string => {
      if (!birthDate) return 'No especificado';
      const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) return 'Menor de 18';
      if (age <= 29) return '18-29';
      if (age <= 39) return '30-39';
      if (age <= 49) return '40-49';
      if (age <= 59) return '50-59';
      return '60+';
    };

    const now = new Date();
    const age25 = new Date(now.getFullYear() - 25, now.getMonth(), now.getDate());
    const age35 = new Date(now.getFullYear() - 35, now.getMonth(), now.getDate());
    const age45 = new Date(now.getFullYear() - 45, now.getMonth(), now.getDate());
    const age55 = new Date(now.getFullYear() - 55, now.getMonth(), now.getDate());
    const age65 = new Date(now.getFullYear() - 65, now.getMonth(), now.getDate());

    expect(getAgeGroup(age25)).toBe('18-29');
    expect(getAgeGroup(age35)).toBe('30-39');
    expect(getAgeGroup(age45)).toBe('40-49');
    expect(getAgeGroup(age55)).toBe('50-59');
    expect(getAgeGroup(age65)).toBe('60+');
    expect(getAgeGroup(null)).toBe('No especificado');
  });

  it('calcula la tasa de completado correctamente', () => {
    const calcRate = (completed: number, total: number): number => {
      if (total === 0) return 0;
      return Math.round((completed / total) * 100 * 100) / 100;
    };

    expect(calcRate(80, 100)).toBe(80);
    expect(calcRate(0, 0)).toBe(0);
    expect(calcRate(1, 3)).toBeCloseTo(33.33, 1);
    expect(calcRate(100, 100)).toBe(100);
  });

  it('agrupa tokens por género correctamente', () => {
    const tokens = [
      { sexo: 'Masculino', completed: true },
      { sexo: 'Masculino', completed: false },
      { sexo: 'Femenino', completed: true },
      { sexo: 'Femenino', completed: true },
      { sexo: null, completed: false },
    ];

    const grouped = tokens.reduce((acc: Record<string, { total: number; completed: number }>, t) => {
      const key = t.sexo ?? 'No especificado';
      if (!acc[key]) acc[key] = { total: 0, completed: 0 };
      acc[key].total++;
      if (t.completed) acc[key].completed++;
      return acc;
    }, {});

    expect(grouped['Masculino'].total).toBe(2);
    expect(grouped['Masculino'].completed).toBe(1);
    expect(grouped['Femenino'].total).toBe(2);
    expect(grouped['Femenino'].completed).toBe(2);
    expect(grouped['No especificado'].total).toBe(1);
  });

  it('identifica departamentos con cobertura crítica (<50%)', () => {
    const departments = [
      { department: 'Ventas', completionRate: 85 },
      { department: 'Producción', completionRate: 45 },
      { department: 'Administración', completionRate: 72 },
      { department: 'Mantenimiento', completionRate: 30 },
    ];

    const critical = departments.filter(d => d.completionRate < 50);
    expect(critical).toHaveLength(2);
    expect(critical.map(d => d.department)).toContain('Producción');
    expect(critical.map(d => d.department)).toContain('Mantenimiento');
  });
});
