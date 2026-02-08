# Especificación Técnica Detallada - Fases Pendientes
## Sistema NOM-035 STPS 2018

**Fecha:** 8 de Febrero de 2026  
**Versión:** 1.0  
**Estado:** Pendiente de Implementación

---

## 📋 Resumen Ejecutivo

Este documento describe la especificación técnica detallada para completar las **3 fases críticas pendientes** del sistema NOM-035:

1. **FASE 193 Frontend** (12 tareas) - Estructura JSON Estandarizada
2. **FASE 185** (24 tareas) - Módulo de Autodiagnóstico
3. **FASE 189** (36 tareas) - Dashboard Interactivo

**Total:** 72 tareas críticas | **Tiempo estimado:** 40-60 horas | **ROI:** $480k MXN/año

---

## 🎯 FASE 193 FRONTEND: Estructura JSON Estandarizada

### Objetivo
Completar la implementación frontend de la estructura JSON oficial NOM-035 para garantizar interoperabilidad y cumplimiento normativo.

### Tareas Pendientes (12/18)

#### 1. Actualizar Input Schema de submitResponse (2 tareas)
**Archivo:** `server/routers/surveys.ts` (línea 280)

**Cambios requeridos:**
```typescript
.input(z.object({
  surveyId: z.number(),
  answers: z.array(z.object({
    questionId: z.number(),
    answerValue: z.string(),
  })),
  responseToken: z.string().optional(),
  curp: z.string().optional(),
  // AGREGAR METADATA DE EVALUACIÓN
  evaluacion: z.object({
    fecha: z.string(), // ISO 8601: "2024-01-15"
    periodo: z.string(), // "Q1-2024"
    version_nom: z.string().default("NOM-035-STPS-2018"),
  }).optional(),
}))
```

**Actualizar INSERT (línea 311):**
```typescript
await db.insert(surveyResponses).values({
  surveyId: input.surveyId,
  userId: ctx.user.id,
  curp: input.curp || null,
  token: responseToken,
  completedAt: new Date(),
  startedAt: new Date(),
  // AGREGAR CAMPOS DE EVALUACIÓN
  fecha: input.evaluacion?.fecha || new Date().toISOString().split('T')[0],
  periodo: input.evaluacion?.periodo || `Q${Math.ceil((new Date().getMonth() + 1) / 3)}-${new Date().getFullYear()}`,
  version_nom: input.evaluacion?.version_nom || "NOM-035-STPS-2018",
});
```

---

#### 2. Crear Procedimiento getEvaluationMetadata (2 tareas)
**Archivo:** `server/routers/surveys.ts` (agregar después de submitResponse)

**Código completo:**
```typescript
// Obtener metadata de evaluación
getEvaluationMetadata: protectedProcedure
  .input(z.object({
    responseId: z.number(),
  }))
  .query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    
    const [response] = await db
      .select({
        fecha: surveyResponses.fecha,
        periodo: surveyResponses.periodo,
        version_nom: surveyResponses.version_nom,
      })
      .from(surveyResponses)
      .where(eq(surveyResponses.id, input.responseId))
      .limit(1);
    
    if (!response) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Respuesta no encontrada" });
    }
    
    return response;
  }),
```

---

#### 3. Actualizar Procedimiento getResults (3 tareas)
**Archivo:** `server/routers/surveys.ts` (buscar procedimiento getResults)

**Cambios requeridos:**
1. Importar tipos de dimensiones:
```typescript
import { DIMENSION_CODES, generarInterpretacion } from '../lib/nom035-calculator';
```

2. Modificar estructura de retorno para incluir códigos e interpretación:
```typescript
// En la sección de dimensiones, agregar:
const dimensionesConCodigo = dimensionScores.map(dim => ({
  ...dim,
  codigo: DIMENSION_CODES[dim.dimension] || 'N/A',
  interpretacion: generarInterpretacion(dim.riskColor, dim.score),
}));

return {
  ...results,
  dimensiones: dimensionesConCodigo,
  evaluacion: {
    fecha: response.fecha,
    periodo: response.periodo,
    version_nom: response.version_nom,
  },
};
```

---

#### 4. Actualizar Componente SurveyResults.tsx (5 tareas)
**Archivo:** `client/src/pages/surveys/SurveyResults.tsx`

**Cambios requeridos:**

**4.1. Agregar sección de metadata de evaluación (línea ~150):**
```tsx
{/* Metadata de Evaluación */}
<Card>
  <CardHeader>
    <CardTitle>Información de Evaluación</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-3 gap-4">
      <div>
        <Label className="text-muted-foreground">Fecha</Label>
        <p className="font-semibold">{results.evaluacion?.fecha || 'N/A'}</p>
      </div>
      <div>
        <Label className="text-muted-foreground">Periodo</Label>
        <p className="font-semibold">{results.evaluacion?.periodo || 'N/A'}</p>
      </div>
      <div>
        <Label className="text-muted-foreground">Versión NOM</Label>
        <p className="font-semibold">{results.evaluacion?.version_nom || 'NOM-035-STPS-2018'}</p>
      </div>
    </div>
  </CardContent>
</Card>
```

**4.2. Actualizar tabla de dimensiones para mostrar códigos (línea ~250):**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Código</TableHead>
      <TableHead>Dimensión</TableHead>
      <TableHead>Puntuación</TableHead>
      <TableHead>Nivel de Riesgo</TableHead>
      <TableHead>Interpretación</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {results.dimensiones?.map((dim) => (
      <TableRow key={dim.codigo}>
        <TableCell className="font-mono font-semibold">{dim.codigo}</TableCell>
        <TableCell>{dim.dimension}</TableCell>
        <TableCell>{dim.score.toFixed(2)}</TableCell>
        <TableCell>
          <Badge style={{ backgroundColor: getRiskColor(dim.riskColor) }}>
            {dim.riskLevel}
          </Badge>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {dim.interpretacion}
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**4.3. Agregar función helper para colores:**
```typescript
function getRiskColor(color: string): string {
  const colorMap: Record<string, string> = {
    red: '#ef4444',
    orange: '#f97316',
    yellow: '#eab308',
    green: '#22c55e',
    blue: '#3b82f6',
  };
  return colorMap[color] || '#6b7280';
}
```

---

### Criterios de Aceptación FASE 193
- [ ] Metadata de evaluación se guarda correctamente en BD
- [ ] Procedimiento `getEvaluationMetadata` retorna datos correctos
- [ ] Procedimiento `getResults` incluye códigos de dimensiones (G2-1, G3-1)
- [ ] `SurveyResults.tsx` muestra metadata de evaluación
- [ ] Tabla de dimensiones muestra códigos oficiales
- [ ] Textos de interpretación se muestran correctamente
- [ ] 0 errores TypeScript
- [ ] Tests unitarios pasan (crear 3 tests para nuevos procedimientos)

---

## 🔍 FASE 185: Módulo de Autodiagnóstico NOM-035

### Objetivo
Crear un módulo completo de autodiagnóstico que permita a las empresas evaluar su cumplimiento normativo NOM-035 con checklist interactivo, gestión de evidencias y generación de reportes PDF.

### Arquitectura del Módulo

```
/nom035/autodiagnostico
├── Backend (server/routers/autodiagnostico.ts)
│   ├── createAutodiagnostico()
│   ├── updateRequirement()
│   ├── uploadEvidence()
│   ├── getAutodiagnosticoById()
│   ├── getCompliancePercentage()
│   └── generatePDFReport()
├── Frontend (client/src/pages/nom035/Autodiagnostico.tsx)
│   ├── ChecklistSection (5 categorías)
│   ├── EvidenceManager (upload/view/delete)
│   ├── ComplianceDashboard (gauge charts)
│   └── ReportGenerator (PDF export)
└── Base de Datos (drizzle/schema.ts)
    ├── autodiagnosticos (tabla principal)
    ├── autodiagnostico_requirements (45 requisitos)
    └── autodiagnostico_evidences (evidencias documentales)
```

### Tareas Detalladas (24 tareas)

#### Backend (12 tareas)

**1. Crear tabla `autodiagnosticos` en schema.ts:**
```typescript
export const autodiagnosticos = mysqlTable('autodiagnosticos', {
  id: int('id').primaryKey().autoincrement(),
  companyId: int('company_id').notNull(),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  status: varchar('status', { length: 50 }).default('en_progreso'), // en_progreso, completado
  compliancePercentage: decimal('compliance_percentage', { precision: 5, scale: 2 }).default('0.00'),
});
```

**2. Crear tabla `autodiagnostico_requirements`:**
```typescript
export const autodiagnosticoRequirements = mysqlTable('autodiagnostico_requirements', {
  id: int('id').primaryKey().autoincrement(),
  autodiagnosticoId: int('autodiagnostico_id').notNull().references(() => autodiagnosticos.id),
  category: varchar('category', { length: 100 }).notNull(), // politica, identificacion, analisis, medidas, difusion
  requirementCode: varchar('requirement_code', { length: 20 }).notNull(), // 5.1, 5.2, 5.3...
  requirementText: text('requirement_text').notNull(),
  status: varchar('status', { length: 50 }).default('pendiente'), // pendiente, cumple, no_cumple, parcial
  notes: text('notes'),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});
```

**3. Crear tabla `autodiagnostico_evidences`:**
```typescript
export const autodiagnosticoEvidences = mysqlTable('autodiagnostico_evidences', {
  id: int('id').primaryKey().autoincrement(),
  requirementId: int('requirement_id').notNull().references(() => autodiagnosticoRequirements.id),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: varchar('file_url', { length: 500 }).notNull(), // S3 URL
  fileType: varchar('file_type', { length: 50 }).notNull(), // pdf, docx, xlsx, jpg, png
  fileSize: int('file_size').notNull(), // bytes
  uploadedBy: varchar('uploaded_by', { length: 255 }).notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
});
```

**4-9. Crear 6 procedimientos tRPC en `server/routers/autodiagnostico.ts`:**

```typescript
import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { autodiagnosticos, autodiagnosticoRequirements, autodiagnosticoEvidences } from '../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

export const autodiagnosticoRouter = router({
  // 1. Crear nuevo autodiagnóstico
  create: protectedProcedure
    .input(z.object({
      companyId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      // Crear autodiagnóstico
      const [result] = await db.insert(autodiagnosticos).values({
        companyId: input.companyId,
        createdBy: ctx.user.id,
      });
      
      // Poblar con 45 requisitos normativos
      const requisitos = REQUISITOS_NOM035; // Constante con 45 requisitos
      for (const req of requisitos) {
        await db.insert(autodiagnosticoRequirements).values({
          autodiagnosticoId: result.insertId,
          category: req.category,
          requirementCode: req.code,
          requirementText: req.text,
        });
      }
      
      return { id: result.insertId };
    }),
  
  // 2. Actualizar estado de requisito
  updateRequirement: protectedProcedure
    .input(z.object({
      requirementId: z.number(),
      status: z.enum(['pendiente', 'cumple', 'no_cumple', 'parcial']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      await db.update(autodiagnosticoRequirements)
        .set({
          status: input.status,
          notes: input.notes,
          updatedAt: new Date(),
        })
        .where(eq(autodiagnosticoRequirements.id, input.requirementId));
      
      // Recalcular porcentaje de cumplimiento
      await recalcularCumplimiento(input.requirementId);
      
      return { success: true };
    }),
  
  // 3. Subir evidencia
  uploadEvidence: protectedProcedure
    .input(z.object({
      requirementId: z.number(),
      fileName: z.string(),
      fileUrl: z.string(),
      fileType: z.string(),
      fileSize: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      await db.insert(autodiagnosticoEvidences).values({
        requirementId: input.requirementId,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        fileType: input.fileType,
        fileSize: input.fileSize,
        uploadedBy: ctx.user.id,
      });
      
      return { success: true };
    }),
  
  // 4. Obtener autodiagnóstico por ID
  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      const [autodiag] = await db
        .select()
        .from(autodiagnosticos)
        .where(eq(autodiagnosticos.id, input.id))
        .limit(1);
      
      if (!autodiag) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      
      const requirements = await db
        .select()
        .from(autodiagnosticoRequirements)
        .where(eq(autodiagnosticoRequirements.autodiagnosticoId, input.id));
      
      // Obtener evidencias para cada requisito
      const requirementsWithEvidences = await Promise.all(
        requirements.map(async (req) => {
          const evidences = await db
            .select()
            .from(autodiagnosticoEvidences)
            .where(eq(autodiagnosticoEvidences.requirementId, req.id));
          
          return { ...req, evidences };
        })
      );
      
      return {
        ...autodiag,
        requirements: requirementsWithEvidences,
      };
    }),
  
  // 5. Obtener porcentaje de cumplimiento
  getCompliancePercentage: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      const requirements = await db
        .select()
        .from(autodiagnosticoRequirements)
        .where(eq(autodiagnosticoRequirements.autodiagnosticoId, input.id));
      
      const total = requirements.length;
      const cumple = requirements.filter(r => r.status === 'cumple').length;
      const parcial = requirements.filter(r => r.status === 'parcial').length;
      
      const percentage = ((cumple + parcial * 0.5) / total) * 100;
      
      return {
        total,
        cumple,
        parcial,
        noCumple: requirements.filter(r => r.status === 'no_cumple').length,
        pendiente: requirements.filter(r => r.status === 'pendiente').length,
        percentage: percentage.toFixed(2),
      };
    }),
  
  // 6. Generar reporte PDF
  generatePDFReport: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      // Implementar generación de PDF con reportlab o similar
      // Retornar URL del PDF generado
      return { pdfUrl: '/reports/autodiagnostico-' + input.id + '.pdf' };
    }),
});

// Helper function
async function recalcularCumplimiento(requirementId: number) {
  const db = await getDb();
  if (!db) return;
  
  // Obtener autodiagnosticoId
  const [req] = await db
    .select()
    .from(autodiagnosticoRequirements)
    .where(eq(autodiagnosticoRequirements.id, requirementId))
    .limit(1);
  
  if (!req) return;
  
  // Calcular porcentaje
  const requirements = await db
    .select()
    .from(autodiagnosticoRequirements)
    .where(eq(autodiagnosticoRequirements.autodiagnosticoId, req.autodiagnosticoId));
  
  const total = requirements.length;
  const cumple = requirements.filter(r => r.status === 'cumple').length;
  const parcial = requirements.filter(r => r.status === 'parcial').length;
  
  const percentage = ((cumple + parcial * 0.5) / total) * 100;
  
  // Actualizar autodiagnóstico
  await db.update(autodiagnosticos)
    .set({ compliancePercentage: percentage.toFixed(2) })
    .where(eq(autodiagnosticos.id, req.autodiagnosticoId));
}

// Constante con 45 requisitos NOM-035
const REQUISITOS_NOM035 = [
  // Categoría 1: Política (5.1 - 5.4)
  { category: 'politica', code: '5.1', text: 'Establecer por escrito, implantar, mantener y difundir en el centro de trabajo una política de prevención de riesgos psicosociales...' },
  { category: 'politica', code: '5.2', text: 'Realizar la identificación y análisis de los factores de riesgo psicosocial...' },
  // ... (43 requisitos más)
];
```

**10-12. Crear tests unitarios para procedimientos tRPC**

#### Frontend (12 tareas)

**13. Crear página principal `/nom035/autodiagnostico`:**

**Archivo:** `client/src/pages/nom035/Autodiagnostico.tsx`

```tsx
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Circle, AlertCircle, Upload, FileText } from 'lucide-react';

export default function Autodiagnostico() {
  const [autodiagId, setAutodiagId] = useState<number | null>(null);
  
  // Queries
  const { data: autodiag, isLoading } = trpc.autodiagnostico.getById.useQuery(
    { id: autodiagId! },
    { enabled: !!autodiagId }
  );
  
  const { data: compliance } = trpc.autodiagnostico.getCompliancePercentage.useQuery(
    { id: autodiagId! },
    { enabled: !!autodiagId }
  );
  
  // Mutations
  const createMutation = trpc.autodiagnostico.create.useMutation({
    onSuccess: (data) => setAutodiagId(data.id),
  });
  
  const updateRequirementMutation = trpc.autodiagnostico.updateRequirement.useMutation();
  
  if (!autodiagId) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Autodiagnóstico NOM-035</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Evalúa el cumplimiento de tu empresa con la NOM-035-STPS-2018</p>
            <Button onClick={() => createMutation.mutate({ companyId: 1 })}>
              Iniciar Autodiagnóstico
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (isLoading) return <div>Cargando...</div>;
  
  // Agrupar requisitos por categoría
  const requirementsByCategory = {
    politica: autodiag?.requirements.filter(r => r.category === 'politica') || [],
    identificacion: autodiag?.requirements.filter(r => r.category === 'identificacion') || [],
    analisis: autodiag?.requirements.filter(r => r.category === 'analisis') || [],
    medidas: autodiag?.requirements.filter(r => r.category === 'medidas') || [],
    difusion: autodiag?.requirements.filter(r => r.category === 'difusion') || [],
  };
  
  return (
    <div className="container py-8">
      {/* Dashboard de Cumplimiento */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Resumen de Cumplimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{compliance?.cumple || 0}</div>
              <div className="text-sm text-muted-foreground">Cumple</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{compliance?.parcial || 0}</div>
              <div className="text-sm text-muted-foreground">Parcial</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{compliance?.noCumple || 0}</div>
              <div className="text-sm text-muted-foreground">No Cumple</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600">{compliance?.pendiente || 0}</div>
              <div className="text-sm text-muted-foreground">Pendiente</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{compliance?.percentage || 0}%</div>
              <div className="text-sm text-muted-foreground">Cumplimiento</div>
            </div>
          </div>
          <Progress value={parseFloat(compliance?.percentage || '0')} className="h-4" />
        </CardContent>
      </Card>
      
      {/* Checklist por Categorías */}
      <Card>
        <CardHeader>
          <CardTitle>Checklist de Requisitos NOM-035</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="politica">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="politica">Política</TabsTrigger>
              <TabsTrigger value="identificacion">Identificación</TabsTrigger>
              <TabsTrigger value="analisis">Análisis</TabsTrigger>
              <TabsTrigger value="medidas">Medidas</TabsTrigger>
              <TabsTrigger value="difusion">Difusión</TabsTrigger>
            </TabsList>
            
            {Object.entries(requirementsByCategory).map(([category, requirements]) => (
              <TabsContent key={category} value={category}>
                <div className="space-y-4">
                  {requirements.map((req) => (
                    <RequirementCard
                      key={req.id}
                      requirement={req}
                      onUpdate={(status) => {
                        updateRequirementMutation.mutate({
                          requirementId: req.id,
                          status,
                        });
                      }}
                    />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para cada requisito
function RequirementCard({ requirement, onUpdate }: any) {
  const [showEvidence, setShowEvidence] = useState(false);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'cumple': return <CheckCircle2 className="text-green-600" />;
      case 'no_cumple': return <XCircle className="text-red-600" />;
      case 'parcial': return <AlertCircle className="text-yellow-600" />;
      default: return <Circle className="text-gray-400" />;
    }
  };
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {getStatusIcon(requirement.status)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{requirement.requirementCode}</Badge>
              <h4 className="font-semibold">{requirement.requirementText}</h4>
            </div>
            
            <div className="flex gap-2 mb-4">
              <Button
                size="sm"
                variant={requirement.status === 'cumple' ? 'default' : 'outline'}
                onClick={() => onUpdate('cumple')}
              >
                Cumple
              </Button>
              <Button
                size="sm"
                variant={requirement.status === 'parcial' ? 'default' : 'outline'}
                onClick={() => onUpdate('parcial')}
              >
                Parcial
              </Button>
              <Button
                size="sm"
                variant={requirement.status === 'no_cumple' ? 'default' : 'outline'}
                onClick={() => onUpdate('no_cumple')}
              >
                No Cumple
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowEvidence(!showEvidence)}
              >
                <FileText className="w-4 h-4 mr-2" />
                Ver Evidencias ({requirement.evidences?.length || 0})
              </Button>
              <Button size="sm" variant="ghost">
                <Upload className="w-4 h-4 mr-2" />
                Subir Evidencia
              </Button>
            </div>
            
            {showEvidence && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h5 className="font-semibold mb-2">Evidencias Documentales</h5>
                {requirement.evidences?.length > 0 ? (
                  <ul className="space-y-2">
                    {requirement.evidences.map((ev: any) => (
                      <li key={ev.id} className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <a href={ev.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {ev.fileName}
                        </a>
                        <span className="text-sm text-muted-foreground">
                          ({(ev.fileSize / 1024).toFixed(2)} KB)
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay evidencias cargadas</p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

**14-24. Implementar componentes adicionales:**
- EvidenceUploadDialog.tsx
- ComplianceGaugeChart.tsx
- PDFReportGenerator.tsx
- Integración con S3 para upload de archivos
- Tests de integración

---

### Criterios de Aceptación FASE 185
- [ ] 3 tablas creadas en BD con migraciones
- [ ] 6 procedimientos tRPC funcionando correctamente
- [ ] Página `/nom035/autodiagnostico` renderiza correctamente
- [ ] Checklist de 45 requisitos se muestra organizado en 5 categorías
- [ ] Actualización de estado de requisitos funciona en tiempo real
- [ ] Upload de evidencias a S3 funciona correctamente
- [ ] Dashboard de cumplimiento muestra porcentajes correctos
- [ ] Generación de PDF funciona (básico)
- [ ] 0 errores TypeScript
- [ ] Tests unitarios pasan (mínimo 8 tests)

---

## 📊 FASE 189: Dashboard Interactivo NOM-035

### Objetivo
Crear un dashboard interactivo en tiempo real que muestre el estado global de riesgos psicosociales con semáforo, mapas de calor, gráficos de evolución y notificaciones automáticas.

### Arquitectura del Módulo

```
/dashboard
├── Backend (server/routers/dashboard.ts)
│   ├── getGlobalRiskStatus()
│   ├── getHeatMapData()
│   ├── getEvolutionData()
│   ├── getNotifications()
│   └── subscribeToUpdates() [WebSocket]
├── Frontend (client/src/pages/Dashboard.tsx)
│   ├── RiskSemaphore (semáforo global)
│   ├── HeatMapChart (mapa de calor)
│   ├── EvolutionChart (Chart.js)
│   ├── NotificationPanel (WebSocket)
│   └── ActionsSummary (resumen de acciones)
└── WebSocket Server (server/_core/websocket.ts)
    └── Real-time updates
```

### Tareas Detalladas (36 tareas)

#### Backend (18 tareas)

**1-6. Crear 6 procedimientos tRPC en `server/routers/dashboard.ts`:**

```typescript
import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { surveyResponses, surveys, employees } from '../../drizzle/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

export const dashboardRouter = router({
  // 1. Obtener estado global de riesgo
  getGlobalRiskStatus: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      // Obtener última evaluación completada
      const responses = await db
        .select()
        .from(surveyResponses)
        .where(eq(surveyResponses.completedAt, sql`IS NOT NULL`))
        .orderBy(desc(surveyResponses.completedAt))
        .limit(100);
      
      // Calcular promedio global de riesgo
      let totalScore = 0;
      let count = 0;
      
      for (const response of responses) {
        // Calcular score de cada respuesta
        const score = await calcularScoreRespuesta(response.id);
        totalScore += score;
        count++;
      }
      
      const averageScore = count > 0 ? totalScore / count : 0;
      
      // Determinar color del semáforo
      let color: 'red' | 'orange' | 'yellow' | 'green' | 'blue';
      let nivel: string;
      
      if (averageScore >= 3.0) {
        color = 'red';
        nivel = 'Muy Alto';
      } else if (averageScore >= 2.0) {
        color = 'orange';
        nivel = 'Alto';
      } else if (averageScore >= 1.0) {
        color = 'yellow';
        nivel = 'Medio';
      } else if (averageScore >= 0.5) {
        color = 'green';
        nivel = 'Bajo';
      } else {
        color = 'blue';
        nivel = 'Nulo';
      }
      
      return {
        color,
        nivel,
        score: averageScore.toFixed(2),
        totalEvaluaciones: count,
        ultimaActualizacion: new Date().toISOString(),
        tendencia: 'estable', // Calcular comparando con periodo anterior
      };
    }),
  
  // 2. Obtener datos para mapa de calor
  getHeatMapData: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      // Obtener scores por dimensión
      const dimensionScores = await db
        .select({
          dimension: sql`dimension`,
          avgScore: sql`AVG(score)`,
          color: sql`color`,
        })
        .from(sql`dimension_scores`) // Vista o tabla temporal
        .groupBy(sql`dimension`);
      
      return dimensionScores.map(d => ({
        dimension: d.dimension,
        score: parseFloat(d.avgScore as string),
        color: d.color,
      }));
    }),
  
  // 3. Obtener datos de evolución temporal
  getEvolutionData: protectedProcedure
    .input(z.object({
      period: z.enum(['7days', '30days', '90days', '1year']),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      // Calcular fecha de inicio según periodo
      const now = new Date();
      let startDate = new Date();
      
      switch (input.period) {
        case '7days':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(now.getDate() - 90);
          break;
        case '1year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      // Obtener scores agrupados por fecha
      const evolutionData = await db
        .select({
          fecha: sql`DATE(completed_at)`,
          avgScore: sql`AVG(score)`,
        })
        .from(surveyResponses)
        .where(sql`completed_at >= ${startDate}`)
        .groupBy(sql`DATE(completed_at)`)
        .orderBy(sql`DATE(completed_at)`);
      
      return evolutionData.map(d => ({
        fecha: d.fecha,
        score: parseFloat(d.avgScore as string),
      }));
    }),
  
  // 4. Obtener notificaciones
  getNotifications: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      // Obtener casos críticos
      const casosCriticos = await db
        .select()
        .from(sql`nom035_cases`)
        .where(sql`status = 'abierto' AND priority = 'alta'`)
        .limit(10);
      
      // Obtener evaluaciones pendientes
      const evaluacionesPendientes = await db
        .select()
        .from(surveys)
        .where(sql`status = 'active' AND end_date < NOW()`)
        .limit(10);
      
      return {
        casosCriticos: casosCriticos.length,
        evaluacionesPendientes: evaluacionesPendientes.length,
        alertas: [
          ...casosCriticos.map(c => ({
            type: 'caso_critico',
            message: `Caso crítico #${c.id} requiere atención`,
            timestamp: c.created_at,
          })),
          ...evaluacionesPendientes.map(e => ({
            type: 'evaluacion_pendiente',
            message: `Evaluación "${e.title}" venció`,
            timestamp: e.end_date,
          })),
        ],
      };
    }),
  
  // 5. Obtener resumen de acciones
  getActionsSummary: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      const actions = await db
        .select({
          total: sql`COUNT(*)`,
          completadas: sql`SUM(CASE WHEN status = 'completada' THEN 1 ELSE 0 END)`,
          enProgreso: sql`SUM(CASE WHEN status = 'en_progreso' THEN 1 ELSE 0 END)`,
          pendientes: sql`SUM(CASE WHEN status = 'pendiente' THEN 1 ELSE 0 END)`,
        })
        .from(sql`corrective_actions`);
      
      return actions[0];
    }),
  
  // 6. Suscribirse a actualizaciones en tiempo real
  subscribeToUpdates: protectedProcedure
    .subscription(async function* () {
      // Implementar WebSocket subscription
      // Emitir eventos cuando haya cambios en el dashboard
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        yield {
          type: 'update',
          timestamp: new Date().toISOString(),
        };
      }
    }),
});

// Helper function
async function calcularScoreRespuesta(responseId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  // Implementar lógica de cálculo
  // Retornar score promedio de la respuesta
  return 0;
}
```

**7-12. Implementar WebSocket server para notificaciones en tiempo real**

**13-18. Crear tests unitarios para procedimientos tRPC**

#### Frontend (18 tareas)

**19. Crear página principal `/dashboard`:**

**Archivo:** `client/src/pages/Dashboard.tsx`

```tsx
import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [period, setPeriod] = useState<'7days' | '30days' | '90days' | '1year'>('30days');
  
  // Queries
  const { data: riskStatus, isLoading: loadingRisk } = trpc.dashboard.getGlobalRiskStatus.useQuery();
  const { data: heatMapData } = trpc.dashboard.getHeatMapData.useQuery();
  const { data: evolutionData } = trpc.dashboard.getEvolutionData.useQuery({ period });
  const { data: notifications } = trpc.dashboard.getNotifications.useQuery();
  const { data: actionsSummary } = trpc.dashboard.getActionsSummary.useQuery();
  
  // WebSocket subscription para actualizaciones en tiempo real
  useEffect(() => {
    // Implementar WebSocket connection
    const ws = new WebSocket('ws://localhost:3000/dashboard');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Refrescar queries cuando hay actualizaciones
      if (data.type === 'update') {
        // trpc.dashboard.getGlobalRiskStatus.refetch();
      }
    };
    
    return () => ws.close();
  }, []);
  
  if (loadingRisk) return <div>Cargando dashboard...</div>;
  
  return (
    <div className="container py-8">
      {/* Semáforo de Riesgo Global */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Estado Global de Riesgo Psicosocial</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            {/* Semáforo visual */}
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="45" fill={getRiskColor(riskStatus?.color || 'gray')} />
                <circle cx="50" cy="50" r="35" fill="white" fillOpacity="0.3" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{riskStatus?.score}</div>
                  <div className="text-xs text-white opacity-90">{riskStatus?.nivel}</div>
                </div>
              </div>
            </div>
            
            {/* Métricas */}
            <div className="flex-1 grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Evaluaciones</div>
                <div className="text-2xl font-bold">{riskStatus?.totalEvaluaciones}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Última Actualización</div>
                <div className="text-sm font-semibold">
                  {riskStatus?.ultimaActualizacion ? new Date(riskStatus.ultimaActualizacion).toLocaleString() : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Tendencia</div>
                <div className="flex items-center gap-2">
                  {riskStatus?.tendencia === 'subiendo' && <TrendingUp className="text-red-600" />}
                  {riskStatus?.tendencia === 'bajando' && <TrendingDown className="text-green-600" />}
                  {riskStatus?.tendencia === 'estable' && <Minus className="text-yellow-600" />}
                  <span className="font-semibold capitalize">{riskStatus?.tendencia}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Mapa de Calor por Dimensión */}
        <Card>
          <CardHeader>
            <CardTitle>Mapa de Calor por Dimensión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {heatMapData?.map((dim) => (
                <div key={dim.dimension} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{dim.dimension}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-6 rounded-full overflow-hidden bg-gray-200">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${(dim.score / 4) * 100}%`,
                            backgroundColor: getRiskColor(dim.color),
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-12 text-right">
                        {dim.score.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Resumen de Acciones */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Acciones Correctivas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{actionsSummary?.completadas || 0}</div>
                <div className="text-sm text-muted-foreground">Completadas</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-3xl font-bold text-yellow-600">{actionsSummary?.enProgreso || 0}</div>
                <div className="text-sm text-muted-foreground">En Progreso</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-gray-600">{actionsSummary?.pendientes || 0}</div>
                <div className="text-sm text-muted-foreground">Pendientes</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{actionsSummary?.total || 0}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Gráfico de Evolución Temporal */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Evolución Temporal del Riesgo</CardTitle>
            <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
              <TabsList>
                <TabsTrigger value="7days">7 días</TabsTrigger>
                <TabsTrigger value="30days">30 días</TabsTrigger>
                <TabsTrigger value="90days">90 días</TabsTrigger>
                <TabsTrigger value="1year">1 año</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <Line
            data={{
              labels: evolutionData?.map(d => d.fecha) || [],
              datasets: [
                {
                  label: 'Nivel de Riesgo',
                  data: evolutionData?.map(d => d.score) || [],
                  borderColor: 'rgb(59, 130, 246)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  tension: 0.4,
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
                title: {
                  display: false,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 4,
                },
              },
            }}
          />
        </CardContent>
      </Card>
      
      {/* Panel de Notificaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="text-red-600" />
            Notificaciones y Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications?.alertas.map((alert, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                <Badge variant={alert.type === 'caso_critico' ? 'destructive' : 'default'}>
                  {alert.type === 'caso_critico' ? 'Crítico' : 'Pendiente'}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            
            {(!notifications?.alertas || notifications.alertas.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                No hay notificaciones pendientes
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function
function getRiskColor(color: string): string {
  const colorMap: Record<string, string> = {
    red: '#ef4444',
    orange: '#f97316',
    yellow: '#eab308',
    green: '#22c55e',
    blue: '#3b82f6',
    gray: '#6b7280',
  };
  return colorMap[color] || colorMap.gray;
}
```

**20-36. Implementar componentes adicionales:**
- RiskSemaphoreGauge.tsx (gauge animado)
- HeatMapChart.tsx (mapa de calor interactivo)
- EvolutionChart.tsx (gráfico con Chart.js)
- NotificationPanel.tsx (panel de notificaciones en tiempo real)
- WebSocket client integration
- Tests de integración

---

### Criterios de Aceptación FASE 189
- [ ] 6 procedimientos tRPC funcionando correctamente
- [ ] WebSocket server implementado y funcionando
- [ ] Página `/dashboard` renderiza correctamente
- [ ] Semáforo de riesgo global muestra color y nivel correctos
- [ ] Mapa de calor muestra dimensiones con colores NOM-035
- [ ] Gráfico de evolución temporal funciona con 4 periodos
- [ ] Panel de notificaciones muestra alertas en tiempo real
- [ ] Resumen de acciones muestra contadores correctos
- [ ] Actualizaciones en tiempo real funcionan con WebSocket
- [ ] 0 errores TypeScript
- [ ] Tests unitarios pasan (mínimo 10 tests)
- [ ] Performance: Dashboard carga en < 2 segundos

---

## 📊 Resumen de Implementación

### Tareas Totales por Fase
- **FASE 193 Frontend:** 12 tareas | 8-12 horas
- **FASE 185 Autodiagnóstico:** 24 tareas | 16-24 horas
- **FASE 189 Dashboard:** 36 tareas | 16-24 horas

**Total:** 72 tareas | 40-60 horas de desarrollo

### Prioridades de Implementación
1. **FASE 193 Frontend** (Crítico) - Completa estructura JSON oficial
2. **FASE 189 Dashboard** (Importante) - Mejora UX y visibilidad
3. **FASE 185 Autodiagnóstico** (Importante) - Cumplimiento normativo

### Dependencias Técnicas
- **FASE 193** → Sin dependencias (puede iniciar inmediatamente)
- **FASE 189** → Depende parcialmente de FASE 193 (metadata de evaluación)
- **FASE 185** → Independiente (puede desarrollarse en paralelo)

### Tecnologías Requeridas
- **Backend:** tRPC, Drizzle ORM, MySQL, WebSocket
- **Frontend:** React 19, Tailwind CSS 4, Chart.js, shadcn/ui
- **Infraestructura:** S3 (evidencias), WebSocket server (notificaciones)

---

## 🎯 Recomendaciones de Implementación

1. **Enfoque Iterativo:** Implementar por fases completas (no mezclar)
2. **Tests Primero:** Escribir tests antes de implementar (TDD)
3. **Code Review:** Revisar código después de cada fase
4. **Documentación:** Actualizar README.md con nuevas funcionalidades
5. **Performance:** Optimizar queries SQL con índices
6. **Seguridad:** Validar permisos en todos los procedimientos tRPC
7. **UX:** Agregar loading states y error handling en todos los componentes

---

## 📝 Notas Finales

Este documento es una **hoja de ruta completa** para finalizar el sistema NOM-035. Todas las especificaciones técnicas están detalladas con código de ejemplo y criterios de aceptación claros.

**Próximos pasos sugeridos:**
1. Revisar y aprobar especificación técnica
2. Iniciar implementación de FASE 193 Frontend
3. Crear branch de desarrollo para cada fase
4. Implementar tests unitarios en paralelo
5. Realizar code review antes de merge a main

---

**Documento generado:** 8 de Febrero de 2026  
**Autor:** Manus AI Agent  
**Versión:** 1.0
