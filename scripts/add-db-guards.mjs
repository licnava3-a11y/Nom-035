#!/usr/bin/env node

/**
 * Script para agregar guards de null para 'db' en archivos con errores TypeScript
 * 
 * Este script analiza los archivos que tienen errores 'db is possibly null'
 * y agrega verificaciones de null al inicio de cada función que usa db.
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// Archivos con errores 'db possibly null'
const FILES_WITH_ERRORS = [
  'server/jobs/external-offer-risk-monitor-job.ts',
  'server/routers/budgetPlanner.ts',
  'server/routers/careerPlanning.ts',
  'server/routers/climateAnalysis.ts',
  'server/routers/committeeOperatingRules.ts',
  'server/routers/compensationReports.ts',
  'server/routers/departments.ts',
  'server/routers/externalOfferAlerts.ts',
  'server/routers/nineBox.ts',
  'server/routers/salaryEquity.ts',
  'server/routers/salaryImpactSimulator.ts',
  'server/routers/salaryTrends.ts',
];

// Patrón de guard de null a agregar
const DB_GUARD = `if (!db) {
    throw new Error('Database not initialized');
  }`;

/**
 * Agrega guard de null al inicio de una función si usa 'db'
 */
function addDbGuardToFunction(content, functionMatch) {
  const functionStart = content.indexOf(functionMatch);
  if (functionStart === -1) return content;

  // Encontrar el inicio del cuerpo de la función (después del '{')
  const bodyStart = content.indexOf('{', functionStart);
  if (bodyStart === -1) return content;

  // Verificar si ya tiene un guard de null
  const nextLines = content.substring(bodyStart, bodyStart + 200);
  if (nextLines.includes('if (!db)') || nextLines.includes('if(!db)')) {
    console.log('  ✓ Guard ya existe');
    return content;
  }

  // Verificar si la función usa 'db'
  const functionEnd = findMatchingBrace(content, bodyStart);
  const functionBody = content.substring(bodyStart, functionEnd);
  if (!functionBody.includes(' db.') && !functionBody.includes('(db.')) {
    console.log('  ⊘ Función no usa db');
    return content;
  }

  // Insertar guard después del '{'
  const indent = getIndentation(content, functionStart);
  const guardWithIndent = '\n' + indent + '  ' + DB_GUARD.replace(/\n/g, '\n' + indent + '  ') + '\n' + indent + '  ';
  
  return content.substring(0, bodyStart + 1) + guardWithIndent + content.substring(bodyStart + 1);
}

/**
 * Encuentra el '}' que cierra un '{'
 */
function findMatchingBrace(content, openBraceIndex) {
  let count = 1;
  for (let i = openBraceIndex + 1; i < content.length; i++) {
    if (content[i] === '{') count++;
    if (content[i] === '}') {
      count--;
      if (count === 0) return i;
    }
  }
  return content.length;
}

/**
 * Obtiene la indentación de una línea
 */
function getIndentation(content, index) {
  const lineStart = content.lastIndexOf('\n', index) + 1;
  const line = content.substring(lineStart, index);
  const match = line.match(/^(\s*)/);
  return match ? match[1] : '';
}

/**
 * Procesa un archivo agregando guards de null
 */
function processFile(filePath) {
  console.log(`\n📄 Procesando: ${filePath}`);
  
  try {
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;

    // Buscar todas las funciones que podrían necesitar guards
    const functionPatterns = [
      /query\([^)]*\)\s*\.\s*query\s*\(/g,
      /mutation\([^)]*\)\s*\.\s*mutation\s*\(/g,
      /async\s+function\s+\w+\s*\([^)]*\)\s*{/g,
      /export\s+async\s+function\s+\w+\s*\([^)]*\)\s*{/g,
    ];

    for (const pattern of functionPatterns) {
      const matches = [...content.matchAll(pattern)];
      console.log(`  Encontradas ${matches.length} funciones con patrón: ${pattern.source.substring(0, 30)}...`);
      
      for (const match of matches.reverse()) { // Reverse para no afectar índices
        const originalContent = content;
        content = addDbGuardToFunction(content, match[0]);
        if (content !== originalContent) {
          modified = true;
          console.log(`  ✅ Guard agregado en posición ${match.index}`);
        }
      }
    }

    if (modified) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Archivo modificado: ${filePath}`);
      return 1;
    } else {
      console.log(`⊘ Sin cambios: ${filePath}`);
      return 0;
    }
  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
    return 0;
  }
}

/**
 * Main
 */
function main() {
  console.log('🚀 Iniciando agregado de guards de null para db...\n');
  console.log(`📋 Archivos a procesar: ${FILES_WITH_ERRORS.length}`);
  
  let filesModified = 0;
  
  for (const file of FILES_WITH_ERRORS) {
    filesModified += processFile(file);
  }
  
  console.log(`\n✅ Completado: ${filesModified}/${FILES_WITH_ERRORS.length} archivos modificados`);
  
  // Verificar errores restantes
  console.log('\n🔍 Verificando errores TypeScript restantes...');
  try {
    execSync('pnpm check 2>&1 | grep "\'db\' is possibly \'null\'" | wc -l', { 
      encoding: 'utf-8',
      stdio: 'pipe'
    });
  } catch (error) {
    // Ignorar error de pnpm check
  }
}

main();
