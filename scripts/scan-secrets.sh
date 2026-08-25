#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p security-reports

# Busca asignaciones potencialmente sensibles en archivos versionados.
# Excluye lockfiles, documentación y artefactos de reportes.
pattern='(api[_-]?key|secret|password|token|private[_-]?key)[[:space:]]*[:=][[:space:]]*[^[:space:]]{16,}'
git grep -nEI "$pattern" -- \
  ':!*.lock' ':!docs/**' ':!*.md' ':!security-reports/**' \
  > security-reports/secret-scan.txt || true

printf 'POTENTIAL_MATCHES=%s\n' "$(wc -l < security-reports/secret-scan.txt)"
sed -n '1,160p' security-reports/secret-scan.txt
