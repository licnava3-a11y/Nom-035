/**
 * Script de Seed para Compliance Checklist NOM-035-STPS-2018
 * Pobla la tabla compliance_checklist con requisitos por numeral y tamaño de empresa
 * 
 * Ejecutar: node seed-compliance-checklist.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { complianceChecklist } from "./drizzle/schema.ts";

const DATABASE_URL = process.env.DATABASE_URL || "mysql://root:password@localhost:3306/nom035_db";

// Requisitos por numeral NOM-035-STPS-2018
const complianceItems = [
  // 5.1 Política de prevención de riesgos psicosociales
  {
    fundament: "5.1",
    section: "5.1",
    sectionName: "Política de prevención de riesgos psicosociales",
    itemCode: "5.1.1",
    requirement: "Contar con una política de prevención de riesgos psicosociales por escrito",
    evidence: "Documento de política firmado por el representante legal",
    companySize: "all",
  },
  {
    fundament: "5.1",
    section: "5.1",
    sectionName: "Política de prevención de riesgos psicosociales",
    itemCode: "5.1.2",
    requirement: "Difundir la política entre todos los trabajadores",
    evidence: "Constancias de difusión, minutas de reuniones, evidencia fotográfica",
    companySize: "all",
  },
  {
    fundament: "5.1",
    section: "5.1",
    sectionName: "Política de prevención de riesgos psicosociales",
    itemCode: "5.1.3",
    requirement: "Exhibir la política en lugares visibles del centro de trabajo",
    evidence: "Fotografías de la política exhibida en áreas comunes",
    companySize: "all",
  },

  // 5.2 Medidas de prevención
  {
    fundament: "5.2",
    section: "5.2",
    sectionName: "Medidas de prevención y acciones de control",
    itemCode: "5.2.1",
    requirement: "Implementar medidas para prevenir factores de riesgo psicosocial",
    evidence: "Plan de acción documentado con medidas específicas",
    companySize: "all",
  },
  {
    fundament: "5.2",
    section: "5.2",
    sectionName: "Medidas de prevención y acciones de control",
    itemCode: "5.2.2",
    requirement: "Promover el sentido de pertenencia de los trabajadores",
    evidence: "Programas de integración, eventos de reconocimiento",
    companySize: "all",
  },
  {
    fundament: "5.2",
    section: "5.2",
    sectionName: "Medidas de prevención y acciones de control",
    itemCode: "5.2.3",
    requirement: "Facilitar la participación proactiva y comunicación entre trabajadores",
    evidence: "Canales de comunicación, buzones de sugerencias, reuniones periódicas",
    companySize: "all",
  },
  {
    fundament: "5.2",
    section: "5.2",
    sectionName: "Medidas de prevención y acciones de control",
    itemCode: "5.2.4",
    requirement: "Distribuir cargas de trabajo de forma equilibrada",
    evidence: "Análisis de cargas de trabajo, distribución documentada",
    companySize: "medium_large", // 16-50 y >50
  },
  {
    fundament: "5.2",
    section: "5.2",
    sectionName: "Medidas de prevención y acciones de control",
    itemCode: "5.2.5",
    requirement: "Establecer jornadas de trabajo que permitan descanso y convivencia familiar",
    evidence: "Registros de jornadas, políticas de horarios flexibles",
    companySize: "medium_large",
  },

  // 5.3 Identificación y análisis de factores de riesgo psicosocial
  {
    fundament: "5.3",
    section: "5.3",
    sectionName: "Identificación y análisis de factores de riesgo psicosocial",
    itemCode: "5.3.1",
    requirement: "Identificar factores de riesgo psicosocial mediante Guía de referencia I",
    evidence: "Cuestionarios aplicados, resultados de la Guía I",
    companySize: "small", // hasta 15
  },
  {
    fundament: "5.3",
    section: "5.3",
    sectionName: "Identificación y análisis de factores de riesgo psicosocial",
    itemCode: "5.3.2",
    requirement: "Identificar y analizar factores de riesgo psicosocial mediante Guía de referencia II",
    evidence: "Cuestionarios aplicados a todos los trabajadores, análisis de resultados",
    companySize: "medium", // 16-50
  },
  {
    fundament: "5.3",
    section: "5.3",
    sectionName: "Identificación y análisis de factores de riesgo psicosocial",
    itemCode: "5.3.3",
    requirement: "Identificar y analizar factores de riesgo psicosocial mediante Guía de referencia III",
    evidence: "Cuestionarios aplicados, análisis por categoría y dominio, informe de resultados",
    companySize: "large", // >50
  },
  {
    fundament: "5.3",
    section: "5.3",
    sectionName: "Identificación y análisis de factores de riesgo psicosocial",
    itemCode: "5.3.4",
    requirement: "Realizar evaluaciones cada dos años o cuando existan cambios significativos",
    evidence: "Calendario de evaluaciones, registros históricos",
    companySize: "medium_large",
  },

  // 5.4 Evaluación del entorno organizacional favorable
  {
    fundament: "5.4",
    section: "5.4",
    sectionName: "Evaluación del entorno organizacional favorable",
    itemCode: "5.4.1",
    requirement: "Evaluar el entorno organizacional favorable mediante Guía de referencia III",
    evidence: "Cuestionarios de entorno organizacional, resultados de evaluación",
    companySize: "large",
  },
  {
    fundament: "5.4",
    section: "5.4",
    sectionName: "Evaluación del entorno organizacional favorable",
    itemCode: "5.4.2",
    requirement: "Implementar acciones para promover el entorno organizacional favorable",
    evidence: "Plan de mejora, acciones implementadas, evidencias de seguimiento",
    companySize: "large",
  },

  // 5.5 Medidas y acciones de control
  {
    fundament: "5.5",
    section: "5.5",
    sectionName: "Medidas y acciones de control de los factores de riesgo psicosocial",
    itemCode: "5.5.1",
    requirement: "Adoptar medidas para prevenir y controlar factores de riesgo psicosocial",
    evidence: "Plan de acción con medidas específicas, cronograma de implementación",
    companySize: "medium_large",
  },
  {
    fundament: "5.5",
    section: "5.5",
    sectionName: "Medidas y acciones de control de los factores de riesgo psicosocial",
    itemCode: "5.5.2",
    requirement: "Dar seguimiento a las medidas y acciones de control implementadas",
    evidence: "Reportes de seguimiento, indicadores de cumplimiento",
    companySize: "medium_large",
  },
  {
    fundament: "5.5",
    section: "5.5",
    sectionName: "Medidas y acciones de control de los factores de riesgo psicosocial",
    itemCode: "5.5.3",
    requirement: "Realizar exámenes médicos a trabajadores expuestos a violencia laboral",
    evidence: "Constancias de exámenes médicos, diagnósticos",
    companySize: "medium_large",
  },

  // 5.6 Exámenes médicos
  {
    fundament: "5.6",
    section: "5.6",
    sectionName: "Exámenes médicos y evaluaciones psicológicas",
    itemCode: "5.6.1",
    requirement: "Practicar exámenes médicos a trabajadores expuestos a violencia laboral",
    evidence: "Constancias de exámenes médicos, resultados, canalizaciones",
    companySize: "medium_large",
  },
  {
    fundament: "5.6",
    section: "5.6",
    sectionName: "Exámenes médicos y evaluaciones psicológicas",
    itemCode: "5.6.2",
    requirement: "Informar a los trabajadores sobre los resultados de sus exámenes médicos",
    evidence: "Constancias de entrega de resultados, acuses de recibo",
    companySize: "medium_large",
  },

  // 5.7 Difusión de la información
  {
    fundament: "5.7",
    section: "5.7",
    sectionName: "Difusión de la información",
    itemCode: "5.7.1",
    requirement: "Informar a los trabajadores sobre las medidas adoptadas",
    evidence: "Constancias de difusión, minutas, correos electrónicos",
    companySize: "all",
  },
  {
    fundament: "5.7",
    section: "5.7",
    sectionName: "Difusión de la información",
    itemCode: "5.7.2",
    requirement: "Difundir los resultados de las evaluaciones de factores de riesgo psicosocial",
    evidence: "Presentaciones, informes compartidos, evidencia de difusión",
    companySize: "medium_large",
  },
  {
    fundament: "5.7",
    section: "5.7",
    sectionName: "Difusión de la información",
    itemCode: "5.7.3",
    requirement: "Informar sobre los mecanismos de atención y canalización disponibles",
    evidence: "Directorios de servicios, carteles informativos, difusión digital",
    companySize: "all",
  },

  // 5.8 Registros
  {
    fundament: "5.8",
    section: "5.8",
    sectionName: "Registros",
    itemCode: "5.8.1",
    requirement: "Conservar registros de las evaluaciones de factores de riesgo psicosocial",
    evidence: "Archivos de cuestionarios, resultados, análisis",
    companySize: "medium_large",
  },
  {
    fundament: "5.8",
    section: "5.8",
    sectionName: "Registros",
    itemCode: "5.8.2",
    requirement: "Conservar registros de las medidas de control adoptadas",
    evidence: "Planes de acción, reportes de seguimiento, evidencias de implementación",
    companySize: "medium_large",
  },
  {
    fundament: "5.8",
    section: "5.8",
    sectionName: "Registros",
    itemCode: "5.8.3",
    requirement: "Conservar constancias de difusión de la información",
    evidence: "Listas de asistencia, acuses de recibo, fotografías",
    companySize: "all",
  },
  {
    fundament: "5.8",
    section: "5.8",
    sectionName: "Registros",
    itemCode: "5.8.4",
    requirement: "Conservar registros por al menos un año",
    evidence: "Sistema de archivo físico o digital con control de fechas",
    companySize: "all",
  },
];

async function seedComplianceChecklist() {
  console.log("🌱 Iniciando seed de compliance_checklist...");

  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection, { mode: "default" });

  try {
    // Verificar si ya existen datos
    const existingCount = await connection.query(
      "SELECT COUNT(*) as count FROM complianceChecklist"
    );
    const count = existingCount[0][0].count;

    if (count > 0) {
      console.log(`⚠️  Ya existen ${count} registros en compliance_checklist`);
      console.log("   ¿Deseas continuar y agregar más registros? (Ctrl+C para cancelar)");
      // Esperar 3 segundos antes de continuar
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Insertar requisitos
    let insertedCount = 0;
    for (const item of complianceItems) {
      await db.insert(complianceChecklist).values(item);
      insertedCount++;
    }

    console.log(`✅ Seed completado: ${insertedCount} requisitos insertados`);
    console.log("\nResumen por numeral:");
    console.log("  5.1 Política de prevención: 3 requisitos");
    console.log("  5.2 Medidas de prevención: 5 requisitos");
    console.log("  5.3 Identificación y análisis: 4 requisitos");
    console.log("  5.4 Entorno organizacional: 2 requisitos");
    console.log("  5.5 Acciones de control: 3 requisitos");
    console.log("  5.6 Exámenes médicos: 2 requisitos");
    console.log("  5.7 Difusión: 3 requisitos");
    console.log("  5.8 Registros: 4 requisitos");
    console.log(`\n  Total: ${insertedCount} requisitos`);

  } catch (error) {
    console.error("❌ Error al ejecutar seed:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Ejecutar seed
seedComplianceChecklist()
  .then(() => {
    console.log("\n🎉 Seed finalizado exitosamente");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Error fatal:", error);
    process.exit(1);
  });
