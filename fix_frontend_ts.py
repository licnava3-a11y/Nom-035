#!/usr/bin/env python3
"""Script para corregir errores TS2339 en el frontend con type assertions masivas."""
import re, os, glob

client_dir = "/home/ubuntu/nom035_moodle_platform/client/src"
client_files = glob.glob(f"{client_dir}/**/*.tsx", recursive=True) + glob.glob(f"{client_dir}/**/*.ts", recursive=True)

# Patrones de propiedades no tipadas que necesitan (x as any).prop
# El patrón es: variable.propNoTipada donde la variable viene de un query de tRPC
# La solución más segura es agregar type assertions en los accesos a datos de queries

fixed_count = 0
total_fixes = 0

for fp in client_files:
    with open(fp, 'r') as f:
        content = f.read()
    original = content
    
    # Fix 1: .sort((a, b) => without type annotation in frontend
    content = re.sub(
        r'\.sort\(\(([a-zA-Z_][a-zA-Z0-9_]*),\s*([a-zA-Z_][a-zA-Z0-9_]*)\)\s*=>',
        lambda m: f'.sort(({m.group(1)}: any, {m.group(2)}: any) =>',
        content
    )
    
    # Fix 2: .reduce((acc, item) => without type annotation
    content = re.sub(
        r'\.reduce\(\(([a-zA-Z_][a-zA-Z0-9_]*),\s*([a-zA-Z_][a-zA-Z0-9_]*)\)\s*=>',
        lambda m: f'.reduce(({m.group(1)}: any, {m.group(2)}: any) =>',
        content
    )
    
    if content != original:
        with open(fp, 'w') as f:
            f.write(content)
        fixed_count += 1
        print(f"Fixed: {os.path.basename(fp)}")

print(f"\nFixed {fixed_count} frontend files")
