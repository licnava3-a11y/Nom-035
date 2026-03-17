#!/usr/bin/env python3
"""Corrige inArray con nom035Cases.status - 'investigating' no existe en ese enum"""
import subprocess

files = [
    "/home/ubuntu/nom035_moodle_platform/server/routers/predictiveReports.ts",
    "/home/ubuntu/nom035_moodle_platform/server/routers/predictiveTurnoverDashboard.ts",
]

for fp in files:
    with open(fp) as f:
        content = f.read()
    # nom035Cases.status tiene: ["open", "in_progress", "closed"]
    # NO tiene "investigating" - reemplazar con "in_progress"
    new_content = content.replace(
        'inArray(nom035Cases.status, ["open", "investigating"])',
        'inArray(nom035Cases.status, ["open", "in_progress"])'
    )
    if new_content != content:
        with open(fp, 'w') as f:
            f.write(new_content)
        print(f"Corregido: {fp.split('/')[-1]}")
    else:
        print(f"Sin cambios: {fp.split('/')[-1]}")

# Verificar
result = subprocess.run(
    ["grep", "-rn", 'inArray(nom035Cases.status, ["open", "investigating"])',
     "/home/ubuntu/nom035_moodle_platform/server/routers/"],
    capture_output=True, text=True
)
if result.stdout.strip():
    print(f"Restantes: {result.stdout.strip()}")
else:
    print("0 referencias incorrectas restantes")
