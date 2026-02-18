/**
 * Esquemas de validación Zod compartidos para routers críticos
 * Incluye validaciones robustas para casos edge y seguridad
 */

import { z } from "zod";

/**
 * Validaciones de campos comunes
 */
export const commonValidators = {
  // ID positivo no nulo
  positiveId: z.number().int().positive("El ID debe ser un número positivo"),
  
  // String no vacío con límite de longitud
  nonEmptyString: (maxLength = 255) =>
    z.string()
      .trim()
      .min(1, "El campo no puede estar vacío")
      .max(maxLength, `El campo no puede exceder ${maxLength} caracteres`),
  
  // Email válido
  email: z.string().email("Formato de email inválido").toLowerCase(),
  
  // Fecha en formato ISO (YYYY-MM-DD)
  isoDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  
  // Porcentaje (0-100)
  percentage: z.number()
    .min(0, "El porcentaje no puede ser negativo")
    .max(100, "El porcentaje no puede exceder 100"),
  
  // Monto monetario positivo
  monetaryAmount: z.number()
    .nonnegative("El monto no puede ser negativo")
    .finite("El monto debe ser un número válido"),
  
  // Enum de género
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"], {
    errorMap: () => ({ message: "Género inválido" }),
  }),
  
  // Enum de estado de cumplimiento
  complianceStatus: z.enum(["compliant", "partial", "non_compliant"], {
    errorMap: () => ({ message: "Estado de cumplimiento inválido" }),
  }),
};

/**
 * Validaciones para Payroll Integration
 */
export const payrollValidators = {
  upsertPayrollData: z.object({
    employeeId: commonValidators.positiveId,
    employeeName: commonValidators.nonEmptyString(100),
    department: commonValidators.nonEmptyString(100).optional(),
    position: commonValidators.nonEmptyString(100).optional(),
    salary: z.number()
      .positive("El salario debe ser mayor a cero")
      .max(10000000, "El salario excede el límite permitido"),
    benefits: z.number()
      .nonnegative("Los beneficios no pueden ser negativos")
      .max(5000000, "Los beneficios exceden el límite permitido")
      .optional(),
    lastRaiseDate: commonValidators.isoDate.optional(),
    lastRaisePercentage: z.number()
      .min(-50, "El porcentaje de aumento no puede ser menor a -50%")
      .max(200, "El porcentaje de aumento no puede exceder 200%")
      .optional(),
    marketRate: z.number()
      .positive("La tasa de mercado debe ser mayor a cero")
      .max(15000000, "La tasa de mercado excede el límite permitido")
      .optional(),
  }).refine(
    (data) => {
      // Validar que el salario no sea menor al 30% de la tasa de mercado (si existe)
      if (data.marketRate && data.salary < data.marketRate * 0.3) {
        return false;
      }
      return true;
    },
    {
      message: "El salario no puede ser menor al 30% de la tasa de mercado",
      path: ["salary"],
    }
  ),
};

/**
 * Validaciones para Salary Equity
 */
export const salaryEquityValidators = {
  generateEquityReport: z.object({
    analysisId: commonValidators.positiveId,
  }),
};

/**
 * Validaciones para Compliance NOM-035
 */
export const complianceValidators = {
  updateComplianceStatus: z.object({
    employeeId: commonValidators.positiveId,
    complianceStatus: commonValidators.complianceStatus,
    notes: z.string().max(1000, "Las notas no pueden exceder 1000 caracteres").optional(),
    evidenceUrl: z.string().url("URL de evidencia inválida").optional(),
  }),
  
  uploadEvidence: z.object({
    employeeId: commonValidators.positiveId,
    evidenceType: z.enum(["survey", "training", "medical", "other"], {
      errorMap: () => ({ message: "Tipo de evidencia inválido" }),
    }),
    fileName: commonValidators.nonEmptyString(255),
    fileSize: z.number()
      .positive("El tamaño del archivo debe ser mayor a cero")
      .max(10 * 1024 * 1024, "El archivo no puede exceder 10MB"),
    mimeType: z.string().regex(/^[a-z]+\/[a-z0-9\-\+\.]+$/i, "Tipo MIME inválido"),
  }),
};

/**
 * Validaciones para Climate Analysis
 */
export const climateAnalysisValidators = {
  createSurvey: z.object({
    title: commonValidators.nonEmptyString(200),
    description: z.string().max(1000, "La descripción no puede exceder 1000 caracteres").optional(),
    startDate: commonValidators.isoDate,
    endDate: commonValidators.isoDate,
    targetDepartments: z.array(commonValidators.nonEmptyString(100)).min(1, "Debe seleccionar al menos un departamento"),
    questions: z.array(
      z.object({
        questionText: commonValidators.nonEmptyString(500),
        questionType: z.enum(["likert", "multiple_choice", "open_ended"], {
          errorMap: () => ({ message: "Tipo de pregunta inválido" }),
        }),
        category: z.enum(["leadership", "communication", "work_environment", "benefits", "growth"], {
          errorMap: () => ({ message: "Categoría de pregunta inválida" }),
        }),
      })
    ).min(1, "Debe incluir al menos una pregunta"),
  }).refine(
    (data) => {
      // Validar que la fecha de fin sea posterior a la fecha de inicio
      return new Date(data.endDate) > new Date(data.startDate);
    },
    {
      message: "La fecha de fin debe ser posterior a la fecha de inicio",
      path: ["endDate"],
    }
  ),
  
  submitResponse: z.object({
    surveyId: commonValidators.positiveId,
    employeeId: commonValidators.positiveId,
    responses: z.array(
      z.object({
        questionId: commonValidators.positiveId,
        answer: z.union([
          z.number().int().min(1).max(5), // Likert scale
          commonValidators.nonEmptyString(1000), // Open-ended
        ]),
      })
    ).min(1, "Debe responder al menos una pregunta"),
  }),
};

/**
 * Validaciones para Career Planning
 */
export const careerPlanningValidators = {
  createPath: z.object({
    pathName: commonValidators.nonEmptyString(200),
    fromPosition: commonValidators.nonEmptyString(100),
    toPosition: commonValidators.nonEmptyString(100),
    department: commonValidators.nonEmptyString(100),
    requiredSkills: z.array(commonValidators.nonEmptyString(100))
      .min(1, "Debe especificar al menos una habilidad requerida")
      .max(20, "No puede especificar más de 20 habilidades"),
    estimatedDuration: z.number()
      .int()
      .positive("La duración estimada debe ser mayor a cero")
      .max(120, "La duración estimada no puede exceder 120 meses"),
    description: z.string().max(1000, "La descripción no puede exceder 1000 caracteres").optional(),
  }),
  
  createPlan: z.object({
    employeeId: commonValidators.positiveId,
    pathId: commonValidators.positiveId,
    startDate: commonValidators.isoDate,
    targetCompletionDate: commonValidators.isoDate,
    milestones: z.array(
      z.object({
        title: commonValidators.nonEmptyString(200),
        description: z.string().max(500, "La descripción no puede exceder 500 caracteres").optional(),
        dueDate: commonValidators.isoDate,
        skillsToAcquire: z.array(commonValidators.nonEmptyString(100)),
      })
    ).min(1, "Debe incluir al menos un hito"),
  }).refine(
    (data) => {
      // Validar que la fecha objetivo sea posterior a la fecha de inicio
      return new Date(data.targetCompletionDate) > new Date(data.startDate);
    },
    {
      message: "La fecha objetivo debe ser posterior a la fecha de inicio",
      path: ["targetCompletionDate"],
    }
  ),
  
  updateMilestone: z.object({
    milestoneId: commonValidators.positiveId,
    status: z.enum(["pending", "in_progress", "completed", "cancelled"], {
      errorMap: () => ({ message: "Estado de hito inválido" }),
    }),
    completionPercentage: commonValidators.percentage.optional(),
    notes: z.string().max(1000, "Las notas no pueden exceder 1000 caracteres").optional(),
  }),
};
