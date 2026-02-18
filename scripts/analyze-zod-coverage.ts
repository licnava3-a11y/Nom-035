/**
 * Script de Análisis de Cobertura de Validaciones Zod
 * Identifica procedures en routers tRPC que no tienen validación .input()
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ProcedureInfo {
  router: string;
  procedureName: string;
  type: "query" | "mutation" | "unknown";
  hasInput: boolean;
  lineNumber: number;
}

interface RouterAnalysis {
  routerFile: string;
  totalProcedures: number;
  proceduresWithValidation: number;
  proceduresWithoutValidation: number;
  coveragePercentage: number;
  procedures: ProcedureInfo[];
}

interface GlobalAnalysis {
  totalRouters: number;
  totalProcedures: number;
  proceduresWithValidation: number;
  proceduresWithoutValidation: number;
  globalCoveragePercentage: number;
  routers: RouterAnalysis[];
  priorityRouters: string[]; // Routers críticos que necesitan validación urgente
}

/**
 * Analiza un archivo de router para detectar procedures sin validación
 */
function analyzeRouterFile(filePath: string): RouterAnalysis {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const procedures: ProcedureInfo[] = [];

  // Regex para detectar procedures (query o mutation)
  const procedureRegex = /(\w+):\s*(protectedProcedure|publicProcedure|adminProcedure)/g;
  
  let match;
  while ((match = procedureRegex.exec(content)) !== null) {
    const procedureName = match[1];
    const startIndex = match.index;
    
    // Encontrar la línea del procedure
    const lineNumber = content.substring(0, startIndex).split("\n").length;
    
    // Buscar si tiene .input() en las siguientes líneas
    const procedureBlock = content.substring(startIndex, startIndex + 500); // Buscar en los próximos 500 caracteres
    const hasInput = /\.input\s*\(/.test(procedureBlock);
    
    // Determinar tipo (query o mutation)
    let type: "query" | "mutation" | "unknown" = "unknown";
    if (/\.query\s*\(/.test(procedureBlock)) {
      type = "query";
    } else if (/\.mutation\s*\(/.test(procedureBlock)) {
      type = "mutation";
    }
    
    procedures.push({
      router: path.basename(filePath, ".ts"),
      procedureName,
      type,
      hasInput,
      lineNumber,
    });
  }

  const proceduresWithValidation = procedures.filter((p) => p.hasInput).length;
  const proceduresWithoutValidation = procedures.length - proceduresWithValidation;
  const coveragePercentage = procedures.length > 0 
    ? Math.round((proceduresWithValidation / procedures.length) * 100) 
    : 0;

  return {
    routerFile: path.basename(filePath),
    totalProcedures: procedures.length,
    proceduresWithValidation,
    proceduresWithoutValidation,
    coveragePercentage,
    procedures,
  };
}

/**
 * Analiza todos los routers en el directorio server/routers
 */
function analyzeAllRouters(routersDir: string): GlobalAnalysis {
  const files = fs.readdirSync(routersDir).filter((f) => f.endsWith(".ts") && f !== "index.ts");
  
  const routers: RouterAnalysis[] = [];
  let totalProcedures = 0;
  let proceduresWithValidation = 0;

  for (const file of files) {
    const filePath = path.join(routersDir, file);
    const analysis = analyzeRouterFile(filePath);
    routers.push(analysis);
    totalProcedures += analysis.totalProcedures;
    proceduresWithValidation += analysis.proceduresWithValidation;
  }

  const proceduresWithoutValidation = totalProcedures - proceduresWithValidation;
  const globalCoveragePercentage = totalProcedures > 0
    ? Math.round((proceduresWithValidation / totalProcedures) * 100)
    : 0;

  // Identificar routers críticos (con <50% de cobertura y >5 procedures)
  const priorityRouters = routers
    .filter((r) => r.coveragePercentage < 50 && r.totalProcedures > 5)
    .map((r) => r.routerFile)
    .sort((a, b) => {
      const aRouter = routers.find((r) => r.routerFile === a)!;
      const bRouter = routers.find((r) => r.routerFile === b)!;
      return aRouter.coveragePercentage - bRouter.coveragePercentage;
    });

  return {
    totalRouters: routers.length,
    totalProcedures,
    proceduresWithValidation,
    proceduresWithoutValidation,
    globalCoveragePercentage,
    routers,
    priorityRouters,
  };
}

/**
 * Genera reporte en formato Markdown
 */
function generateMarkdownReport(analysis: GlobalAnalysis): string {
  let report = "# 📊 Reporte de Cobertura de Validaciones Zod\n\n";
  
  report += "## 📈 Resumen Global\n\n";
  report += `- **Total de Routers Analizados**: ${analysis.totalRouters}\n`;
  report += `- **Total de Procedures**: ${analysis.totalProcedures}\n`;
  report += `- **Procedures con Validación**: ${analysis.proceduresWithValidation} (${analysis.globalCoveragePercentage}%)\n`;
  report += `- **Procedures sin Validación**: ${analysis.proceduresWithoutValidation} (${100 - analysis.globalCoveragePercentage}%)\n\n`;
  
  report += "## 🎯 Routers Prioritarios (Cobertura <50%)\n\n";
  if (analysis.priorityRouters.length === 0) {
    report += "*No hay routers con cobertura crítica (<50%).*\n\n";
  } else {
    analysis.priorityRouters.forEach((routerFile) => {
      const router = analysis.routers.find((r) => r.routerFile === routerFile)!;
      report += `- **${routerFile}**: ${router.coveragePercentage}% (${router.proceduresWithoutValidation}/${router.totalProcedures} sin validación)\n`;
    });
    report += "\n";
  }
  
  report += "## 📋 Detalle por Router\n\n";
  
  // Ordenar routers por cobertura ascendente
  const sortedRouters = [...analysis.routers].sort((a, b) => a.coveragePercentage - b.coveragePercentage);
  
  sortedRouters.forEach((router) => {
    const emoji = router.coveragePercentage >= 80 ? "✅" : router.coveragePercentage >= 50 ? "⚠️" : "❌";
    report += `### ${emoji} ${router.routerFile}\n\n`;
    report += `- **Cobertura**: ${router.coveragePercentage}%\n`;
    report += `- **Procedures Totales**: ${router.totalProcedures}\n`;
    report += `- **Con Validación**: ${router.proceduresWithValidation}\n`;
    report += `- **Sin Validación**: ${router.proceduresWithoutValidation}\n\n`;
    
    if (router.proceduresWithoutValidation > 0) {
      report += "**Procedures sin validación:**\n\n";
      router.procedures
        .filter((p) => !p.hasInput)
        .forEach((p) => {
          report += `- \`${p.procedureName}\` (${p.type}, línea ${p.lineNumber})\n`;
        });
      report += "\n";
    }
  });
  
  report += "## 🔧 Recomendaciones\n\n";
  report += "1. Priorizar validaciones en routers con cobertura <50%\n";
  report += "2. Enfocarse en mutations críticas (auth, payments, data modifications)\n";
  report += "3. Usar esquemas reutilizables de `server/validators/common.ts`\n";
  report += "4. Validar todos los inputs de usuario, incluso en queries\n";
  report += "5. Agregar mensajes de error descriptivos en español\n\n";
  
  return report;
}

/**
 * Genera reporte en formato JSON
 */
function generateJSONReport(analysis: GlobalAnalysis): string {
  return JSON.stringify(analysis, null, 2);
}

// Ejecutar análisis
const routersDir = path.join(__dirname, "../server/routers");
const analysis = analyzeAllRouters(routersDir);

// Generar reportes
const markdownReport = generateMarkdownReport(analysis);
const jsonReport = generateJSONReport(analysis);

// Guardar reportes
const reportsDir = path.join(__dirname, "../reports");
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

fs.writeFileSync(path.join(reportsDir, "zod-coverage-report.md"), markdownReport);
fs.writeFileSync(path.join(reportsDir, "zod-coverage-report.json"), jsonReport);

// Mostrar resumen en consola
console.log("📊 Análisis de Cobertura de Validaciones Zod\n");
console.log(`✅ Total de Procedures: ${analysis.totalProcedures}`);
console.log(`✅ Con Validación: ${analysis.proceduresWithValidation} (${analysis.globalCoveragePercentage}%)`);
console.log(`❌ Sin Validación: ${analysis.proceduresWithoutValidation} (${100 - analysis.globalCoveragePercentage}%)\n`);

if (analysis.priorityRouters.length > 0) {
  console.log(`⚠️  Routers Prioritarios (${analysis.priorityRouters.length}):`);
  analysis.priorityRouters.slice(0, 5).forEach((router) => {
    const r = analysis.routers.find((x) => x.routerFile === router)!;
    console.log(`   - ${router}: ${r.coveragePercentage}%`);
  });
  console.log("");
}

console.log(`📄 Reportes generados en: ${reportsDir}`);
console.log(`   - zod-coverage-report.md`);
console.log(`   - zod-coverage-report.json\n`);
