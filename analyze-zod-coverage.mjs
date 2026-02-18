import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const routersDir = './server/routers';
const files = readdirSync(routersDir).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));

let totalProcedures = 0;
let proceduresWithValidation = 0;
const routersWithoutValidation = [];

for (const file of files) {
  const content = readFileSync(join(routersDir, file), 'utf-8');
  
  // Count procedures (query/mutation)
  const procedureMatches = content.match(/(query|mutation):\s*(protectedProcedure|publicProcedure|adminProcedure)/g);
  if (!procedureMatches) continue;
  
  const fileProcs = procedureMatches.length;
  totalProcedures += fileProcs;
  
  // Count procedures with .input()
  const inputMatches = content.match(/\.input\(/g);
  const fileProcsWithInput = inputMatches ? inputMatches.length : 0;
  proceduresWithValidation += fileProcsWithInput;
  
  if (fileProcsWithInput < fileProcs) {
    routersWithoutValidation.push({
      file,
      total: fileProcs,
      withValidation: fileProcsWithInput,
      missing: fileProcs - fileProcsWithInput
    });
  }
}

console.log(`\n=== Análisis de Validaciones Zod ===\n`);
console.log(`Total procedures: ${totalProcedures}`);
console.log(`Con validación: ${proceduresWithValidation} (${(proceduresWithValidation/totalProcedures*100).toFixed(1)}%)`);
console.log(`Sin validación: ${totalProcedures - proceduresWithValidation} (${((totalProcedures-proceduresWithValidation)/totalProcedures*100).toFixed(1)}%)\n`);

console.log(`\n=== Top 20 Routers Sin Validación ===\n`);
routersWithoutValidation
  .sort((a, b) => b.missing - a.missing)
  .slice(0, 20)
  .forEach((r, i) => {
    console.log(`${i+1}. ${r.file}: ${r.missing}/${r.total} sin validación`);
  });
