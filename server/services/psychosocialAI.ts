/**
 * Servicio de IA para Análisis de Riesgos Psicosociales — NOM-035 STPS 2018
 *
 * Centraliza todas las llamadas a Forge LLM para:
 * - Análisis de sentimiento en respuestas de encuestas
 * - Generación de reportes ejecutivos de riesgo psicosocial
 * - Recomendaciones de intervención por departamento
 * - Detección de patrones de riesgo acumulado
 */

import { invokeLLM } from "../_core/llm";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type SentimentResult = {
  sentiment: "positive" | "neutral" | "negative" | "critical";
  riskLevel: "low" | "medium" | "high" | "critical";
  confidence: number;
  keywords: string[];
  riskIndicators: string[];
  summary: string;
  recommendations: string;
};

export type DepartmentRiskProfile = {
  departmentName: string;
  overallRiskLevel: "low" | "medium" | "high" | "critical";
  primaryRiskFactors: string[];
  trendDirection: "improving" | "stable" | "worsening";
  urgentActions: string[];
  preventiveActions: string[];
  estimatedImpact: string;
  priorityScore: number;
};

export type PsychosocialRiskReport = {
  executiveSummary: string;
  overallOrganizationRisk: "low" | "medium" | "high" | "critical";
  criticalDepartments: string[];
  topRiskFactors: Array<{
    factor: string;
    frequency: number;
    severity: string;
  }>;
  immediateActions: string[];
  shortTermActions: string[];
  longTermActions: string[];
  complianceStatus: string;
  nom035Recommendations: string[];
};

export type InterventionPlan = {
  title: string;
  objective: string;
  targetGroup: string;
  activities: Array<{
    name: string;
    description: string;
    responsible: string;
    timeline: string;
    expectedOutcome: string;
  }>;
  successIndicators: string[];
  estimatedDuration: string;
  resources: string[];
};

// ─── Análisis de sentimiento individual ──────────────────────────────────────

/**
 * Analiza el sentimiento y nivel de riesgo psicosocial de una respuesta de encuesta.
 * Optimizado para el contexto NOM-035 STPS 2018.
 */
export async function analyzeSurveyResponse(
  responseText: string,
  questionContext?: string,
  employeeContext?: {
    department?: string;
    position?: string;
    yearsInCompany?: number;
  }
): Promise<SentimentResult> {
  const contextInfo = employeeContext
    ? `\n**Contexto del empleado:** Departamento: ${employeeContext.department || "No especificado"}, Puesto: ${employeeContext.position || "No especificado"}, Antigüedad: ${employeeContext.yearsInCompany || "No especificada"} años`
    : "";

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "Eres un experto en psicología organizacional y riesgo psicosocial según la NOM-035-STPS-2018 de México. Analizas respuestas de encuestas para detectar factores de riesgo psicosocial como: carga de trabajo excesiva, falta de control, jornadas extendidas, interferencia trabajo-familia, liderazgo negativo, relaciones negativas, violencia laboral, acoso, hostigamiento y burnout. Respondes siempre en formato JSON válido.",
      },
      {
        role: "user",
        content: `Analiza esta respuesta de encuesta NOM-035:
${questionContext ? `**Pregunta:** ${questionContext}\n` : ""}**Respuesta:** "${responseText}"${contextInfo}

Evalúa el nivel de riesgo psicosocial y proporciona recomendaciones específicas para el comité de seguridad y salud.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "sentiment_analysis_nom035",
        strict: true,
        schema: {
          type: "object",
          properties: {
            sentiment: {
              type: "string",
              enum: ["positive", "neutral", "negative", "critical"],
              description:
                "Tono emocional: positive=satisfacción, neutral=indiferente, negative=insatisfacción, critical=alerta roja",
            },
            riskLevel: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
              description:
                "Nivel de riesgo psicosocial NOM-035: low=sin riesgo, medium=seguimiento, high=intervención, critical=atención inmediata",
            },
            confidence: {
              type: "number",
              description: "Confianza del análisis 0-100",
            },
            keywords: {
              type: "array",
              items: { type: "string" },
              description:
                "Palabras o frases clave identificadas en la respuesta",
            },
            riskIndicators: {
              type: "array",
              items: { type: "string" },
              description:
                "Factores de riesgo NOM-035 detectados (burnout, acoso, estrés_cronico, violencia, carga_excesiva, hostigamiento, discriminacion, jornada_extendida, conflicto_trabajo_familia, liderazgo_negativo)",
            },
            summary: {
              type: "string",
              description: "Resumen del análisis en máximo 200 caracteres",
            },
            recommendations: {
              type: "string",
              description:
                "Recomendaciones concretas para el comité NOM-035 en máximo 300 caracteres",
            },
          },
          required: [
            "sentiment",
            "riskLevel",
            "confidence",
            "keywords",
            "riskIndicators",
            "summary",
            "recommendations",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("No se recibió respuesta del modelo LLM");
  }

  return JSON.parse(content) as SentimentResult;
}

// ─── Perfil de riesgo por departamento ───────────────────────────────────────

/**
 * Genera un perfil de riesgo psicosocial para un departamento basado en
 * las tendencias de sentimiento acumuladas.
 */
export async function analyzeDepartmentRisk(
  departmentName: string,
  sentimentData: Array<{
    sentiment: string;
    riskLevel: string;
    riskIndicators: string[];
    analyzedAt: Date;
  }>,
  additionalContext?: {
    totalEmployees?: number;
    recentCases?: number;
    trainingCompletionRate?: number;
  }
): Promise<DepartmentRiskProfile> {
  if (sentimentData.length === 0) {
    return {
      departmentName,
      overallRiskLevel: "low",
      primaryRiskFactors: [],
      trendDirection: "stable",
      urgentActions: [],
      preventiveActions: [
        "Continuar con el monitoreo periódico de clima laboral",
      ],
      estimatedImpact: "Sin datos suficientes para análisis",
      priorityScore: 0,
    };
  }

  // Calcular estadísticas básicas para el contexto del LLM
  const riskCounts = sentimentData.reduce(
    (acc, d) => {
      acc[d.riskLevel] = (acc[d.riskLevel] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const allIndicators = sentimentData.flatMap(d => d.riskIndicators);
  const indicatorFrequency = allIndicators.reduce(
    (acc, ind) => {
      acc[ind] = (acc[ind] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const topIndicators = Object.entries(indicatorFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([ind, count]) => `${ind} (${count} ocurrencias)`);

  // Tendencia: comparar primera mitad vs segunda mitad
  const midpoint = Math.floor(sentimentData.length / 2);
  const firstHalf = sentimentData.slice(0, midpoint);
  const secondHalf = sentimentData.slice(midpoint);
  const firstHalfCritical = firstHalf.filter(
    d => d.riskLevel === "critical" || d.riskLevel === "high"
  ).length;
  const secondHalfCritical = secondHalf.filter(
    d => d.riskLevel === "critical" || d.riskLevel === "high"
  ).length;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "Eres un consultor experto en riesgos psicosociales laborales y cumplimiento de la NOM-035-STPS-2018. Generas perfiles de riesgo departamentales con recomendaciones accionables y priorizadas.",
      },
      {
        role: "user",
        content: `Genera un perfil de riesgo psicosocial para el departamento "${departmentName}" con los siguientes datos:

**Estadísticas de sentimiento (${sentimentData.length} respuestas analizadas):**
- Riesgo crítico: ${riskCounts.critical || 0} respuestas
- Riesgo alto: ${riskCounts.high || 0} respuestas
- Riesgo medio: ${riskCounts.medium || 0} respuestas
- Riesgo bajo: ${riskCounts.low || 0} respuestas

**Indicadores de riesgo más frecuentes:** ${topIndicators.join(", ") || "Ninguno detectado"}

**Tendencia:** Primera mitad del periodo: ${firstHalfCritical} casos críticos/altos. Segunda mitad: ${secondHalfCritical} casos críticos/altos.

${
  additionalContext
    ? `**Contexto adicional:**
- Total empleados: ${additionalContext.totalEmployees || "No disponible"}
- Casos recientes: ${additionalContext.recentCases || 0}
- Tasa de capacitación: ${additionalContext.trainingCompletionRate ? `${additionalContext.trainingCompletionRate}%` : "No disponible"}`
    : ""
}

Proporciona un análisis profundo con acciones urgentes y preventivas específicas para este departamento.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "department_risk_profile",
        strict: true,
        schema: {
          type: "object",
          properties: {
            departmentName: { type: "string" },
            overallRiskLevel: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
            },
            primaryRiskFactors: { type: "array", items: { type: "string" } },
            trendDirection: {
              type: "string",
              enum: ["improving", "stable", "worsening"],
            },
            urgentActions: { type: "array", items: { type: "string" } },
            preventiveActions: { type: "array", items: { type: "string" } },
            estimatedImpact: { type: "string" },
            priorityScore: { type: "number" },
          },
          required: [
            "departmentName",
            "overallRiskLevel",
            "primaryRiskFactors",
            "trendDirection",
            "urgentActions",
            "preventiveActions",
            "estimatedImpact",
            "priorityScore",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("No se recibió respuesta del modelo LLM");
  }

  return JSON.parse(content) as DepartmentRiskProfile;
}

// ─── Reporte ejecutivo organizacional ────────────────────────────────────────

/**
 * Genera un reporte ejecutivo completo de riesgo psicosocial para toda la organización.
 * Incluye estado de cumplimiento NOM-035 y plan de acción priorizado.
 */
export async function generateOrganizationalRiskReport(orgData: {
  companyName: string;
  totalEmployees: number;
  totalSurveyResponses: number;
  sentimentStats: {
    positive: number;
    neutral: number;
    negative: number;
    critical: number;
  };
  riskStats: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  topRiskIndicators: Array<{ indicator: string; count: number }>;
  departmentsAtRisk: string[];
  openCases: number;
  resolvedCases: number;
  compliancePercentage: number;
}): Promise<PsychosocialRiskReport> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "Eres un experto consultor en cumplimiento de la NOM-035-STPS-2018 y salud organizacional. Generas reportes ejecutivos precisos, accionables y orientados al cumplimiento normativo mexicano. Tu análisis debe ser objetivo, basado en datos y con recomendaciones priorizadas por urgencia e impacto.",
      },
      {
        role: "user",
        content: `Genera un reporte ejecutivo de riesgo psicosocial para la organización con los siguientes datos:

**Empresa:** ${orgData.companyName}
**Total de empleados:** ${orgData.totalEmployees}
**Respuestas de encuesta analizadas:** ${orgData.totalSurveyResponses}

**Distribución de sentimiento:**
- Positivo: ${orgData.sentimentStats.positive} (${Math.round((orgData.sentimentStats.positive / orgData.totalSurveyResponses) * 100) || 0}%)
- Neutral: ${orgData.sentimentStats.neutral} (${Math.round((orgData.sentimentStats.neutral / orgData.totalSurveyResponses) * 100) || 0}%)
- Negativo: ${orgData.sentimentStats.negative} (${Math.round((orgData.sentimentStats.negative / orgData.totalSurveyResponses) * 100) || 0}%)
- Crítico: ${orgData.sentimentStats.critical} (${Math.round((orgData.sentimentStats.critical / orgData.totalSurveyResponses) * 100) || 0}%)

**Distribución de riesgo:**
- Bajo: ${orgData.riskStats.low}
- Medio: ${orgData.riskStats.medium}
- Alto: ${orgData.riskStats.high}
- Crítico: ${orgData.riskStats.critical}

**Top indicadores de riesgo:** ${orgData.topRiskIndicators.map(r => `${r.indicator} (${r.count})`).join(", ")}

**Departamentos en riesgo:** ${orgData.departmentsAtRisk.join(", ") || "Ninguno identificado"}

**Casos activos:** ${orgData.openCases} abiertos, ${orgData.resolvedCases} resueltos

**Cumplimiento NOM-035:** ${orgData.compliancePercentage}%

Genera un reporte ejecutivo completo con resumen, acciones inmediatas, a corto y largo plazo, y recomendaciones específicas de cumplimiento NOM-035.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "psychosocial_risk_report",
        strict: true,
        schema: {
          type: "object",
          properties: {
            executiveSummary: {
              type: "string",
              description: "Resumen ejecutivo de 2-3 párrafos",
            },
            overallOrganizationRisk: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
            },
            criticalDepartments: { type: "array", items: { type: "string" } },
            topRiskFactors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  factor: { type: "string" },
                  frequency: { type: "number" },
                  severity: { type: "string" },
                },
                required: ["factor", "frequency", "severity"],
                additionalProperties: false,
              },
            },
            immediateActions: {
              type: "array",
              items: { type: "string" },
              description: "Acciones a implementar en los próximos 7 días",
            },
            shortTermActions: {
              type: "array",
              items: { type: "string" },
              description: "Acciones a implementar en los próximos 30-90 días",
            },
            longTermActions: {
              type: "array",
              items: { type: "string" },
              description: "Acciones estratégicas a 6-12 meses",
            },
            complianceStatus: {
              type: "string",
              description:
                "Estado de cumplimiento NOM-035 y brechas identificadas",
            },
            nom035Recommendations: {
              type: "array",
              items: { type: "string" },
              description:
                "Recomendaciones específicas de cumplimiento NOM-035-STPS-2018",
            },
          },
          required: [
            "executiveSummary",
            "overallOrganizationRisk",
            "criticalDepartments",
            "topRiskFactors",
            "immediateActions",
            "shortTermActions",
            "longTermActions",
            "complianceStatus",
            "nom035Recommendations",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("No se recibió respuesta del modelo LLM");
  }

  return JSON.parse(content) as PsychosocialRiskReport;
}

// ─── Plan de intervención ─────────────────────────────────────────────────────

/**
 * Genera un plan de intervención personalizado para un caso o departamento específico.
 */
export async function generateInterventionPlan(context: {
  targetType: "individual" | "department" | "organization";
  targetName: string;
  riskLevel: string;
  riskIndicators: string[];
  previousInterventions?: string[];
  specificConcerns?: string;
}): Promise<InterventionPlan> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "Eres un psicólogo organizacional especializado en intervenciones de riesgo psicosocial y cumplimiento de la NOM-035-STPS-2018. Diseñas planes de intervención estructurados, realistas y medibles.",
      },
      {
        role: "user",
        content: `Diseña un plan de intervención para el siguiente caso:

**Tipo de intervención:** ${context.targetType === "individual" ? "Individual" : context.targetType === "department" ? "Departamental" : "Organizacional"}
**Objetivo:** ${context.targetName}
**Nivel de riesgo:** ${context.riskLevel}
**Indicadores detectados:** ${context.riskIndicators.join(", ")}
${context.previousInterventions?.length ? `**Intervenciones previas:** ${context.previousInterventions.join(", ")}` : ""}
${context.specificConcerns ? `**Preocupaciones específicas:** ${context.specificConcerns}` : ""}

El plan debe ser práctico, con actividades concretas, responsables definidos y cronograma realista.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "intervention_plan",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            objective: { type: "string" },
            targetGroup: { type: "string" },
            activities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  responsible: { type: "string" },
                  timeline: { type: "string" },
                  expectedOutcome: { type: "string" },
                },
                required: [
                  "name",
                  "description",
                  "responsible",
                  "timeline",
                  "expectedOutcome",
                ],
                additionalProperties: false,
              },
            },
            successIndicators: { type: "array", items: { type: "string" } },
            estimatedDuration: { type: "string" },
            resources: { type: "array", items: { type: "string" } },
          },
          required: [
            "title",
            "objective",
            "targetGroup",
            "activities",
            "successIndicators",
            "estimatedDuration",
            "resources",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("No se recibió respuesta del modelo LLM");
  }

  return JSON.parse(content) as InterventionPlan;
}
