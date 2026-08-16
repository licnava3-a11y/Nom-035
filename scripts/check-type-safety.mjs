import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const baseline = {
  "server/routers/employees.ts": 0,
  "server/routers/surveys.ts": 15,
  "server/routers.ts": 19,
  "client/src/pages/JobPositions.tsx": 4,
};

let failed = false;
for (const [file, maxUnsafeCasts] of Object.entries(baseline)) {
  const source = readFileSync(resolve(process.cwd(), file), "utf8");
  const count = (source.match(/\bas any\b/g) ?? []).length;
  const status = count <= maxUnsafeCasts ? "OK" : "EXCEDE";
  console.log(`${status} ${file}: ${count}/${maxUnsafeCasts}`);
  if (count > maxUnsafeCasts) failed = true;
}

if (failed) {
  console.error("El número de conversiones 'as any' aumentó en contratos prioritarios.");
  process.exit(1);
}
