#!/usr/bin/env python3
"""Script para corregir errores TypeScript masivos en el backend."""
import re, os, glob

def fix_file(path, replacements):
    with open(path, 'r') as f:
        content = f.read()
    original = content
    for old, new in replacements:
        content = content.replace(old, new)
    if content != original:
        with open(path, 'w') as f:
            f.write(content)
        print(f"Fixed: {path}")
    else:
        print(f"No changes: {path}")

# 1. Fix predictiveAnalytics.ts - MapIterator y TS7006
fix_file(
    "/home/ubuntu/nom035_moodle_platform/server/routers/predictiveAnalytics.ts",
    [
        # Fix MapIterator - convert to Array.from()
        ("for (const [employeeId, data] of employeeMap.entries())",
         "for (const [employeeId, data] of Array.from(employeeMap.entries()))"),
        # Fix TS7006 sort callback
        ("data.evaluations.sort((a, b) => {",
         "data.evaluations.sort((a: any, b: any) => {"),
    ]
)

# 2. Fix all TS7006 in backend routers - implicit any in .sort/.reduce/.map/.filter callbacks
router_dir = "/home/ubuntu/nom035_moodle_platform/server/routers"
router_files = glob.glob(f"{router_dir}/*.ts")

# Pattern: .sort((a, b) => ... without type annotation
sort_pattern = re.compile(r'\.sort\(\(([a-zA-Z_][a-zA-Z0-9_]*),\s*([a-zA-Z_][a-zA-Z0-9_]*)\)\s*=>')
reduce_pattern = re.compile(r'\.reduce\(\(([a-zA-Z_][a-zA-Z0-9_]*),\s*([a-zA-Z_][a-zA-Z0-9_]*)\)\s*=>')

fixed_count = 0
for fp in router_files:
    with open(fp, 'r') as f:
        content = f.read()
    original = content
    
    # Fix .sort((a, b) => without type annotation
    content = sort_pattern.sub(lambda m: f'.sort((${m.group(1)}: any, ${m.group(2)}: any) =>', content)
    
    # Actually use simpler approach - just replace common patterns
    content = re.sub(
        r'\.sort\(\(([a-zA-Z_][a-zA-Z0-9_]*),\s*([a-zA-Z_][a-zA-Z0-9_]*)\)\s*=>',
        lambda m: f'.sort(({m.group(1)}: any, {m.group(2)}: any) =>',
        content
    )
    
    if content != original:
        with open(fp, 'w') as f:
            f.write(content)
        fixed_count += 1
        print(f"Fixed sort callbacks: {os.path.basename(fp)}")

print(f"\nFixed {fixed_count} files with sort callbacks")

# 3. Fix frontend files too
client_dir = "/home/ubuntu/nom035_moodle_platform/client/src"
client_files = glob.glob(f"{client_dir}/**/*.tsx", recursive=True) + glob.glob(f"{client_dir}/**/*.ts", recursive=True)

fixed_count = 0
for fp in client_files:
    with open(fp, 'r') as f:
        content = f.read()
    original = content
    
    # Fix .sort((a, b) => without type annotation
    content = re.sub(
        r'\.sort\(\(([a-zA-Z_][a-zA-Z0-9_]*),\s*([a-zA-Z_][a-zA-Z0-9_]*)\)\s*=>',
        lambda m: f'.sort(({m.group(1)}: any, {m.group(2)}: any) =>',
        content
    )
    
    if content != original:
        with open(fp, 'w') as f:
            f.write(content)
        fixed_count += 1
        print(f"Fixed sort callbacks: {os.path.basename(fp)}")

print(f"\nFixed {fixed_count} frontend files with sort callbacks")
