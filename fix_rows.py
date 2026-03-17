#!/usr/bin/env python3
"""Corrige usos de .rows sin cast en routers"""
import re, subprocess

files_to_fix = [
    "/home/ubuntu/nom035_moodle_platform/server/routers/externalOfferAlerts.ts",
    "/home/ubuntu/nom035_moodle_platform/server/routers/predictiveCorrelation.ts",
    "/home/ubuntu/nom035_moodle_platform/server/routers/salaryTrends.ts",
]

for fp in files_to_fix:
    with open(fp) as f:
        content = f.read()
    # Reemplazar .rows con (result as any)[0] pattern
    # Patrón: variable.rows -> (variable as any)[0] para arrays
    new_content = re.sub(r'(\w+)\.rows\[0\]', r'(((\1) as any)[0] as any)[0]', content)
    new_content = re.sub(r'return (\w+)\.rows;', r'return ((\1) as any)[0] as any[];', new_content)
    new_content = re.sub(r'(\w+)\.rows;', r'((\1) as any)[0] as any[];', new_content)
    
    if new_content != content:
        with open(fp, 'w') as f:
            f.write(new_content)
        print(f"Corregido: {fp.split('/')[-1]}")
    else:
        print(f"Sin cambios: {fp.split('/')[-1]}")

print("Done")
