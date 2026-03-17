#!/usr/bin/env python3
import os, re, subprocess

BASE = "/home/ubuntu/nom035_moodle_platform"
ROUTERS = f"{BASE}/server/routers"
JOBS = f"{BASE}/server/jobs"

# PASO 1: employees.status -> employees.isActive
fixes = {
    f"{JOBS}/predictive-turnover-job.ts": [
        ("sql`${employees.status} = 'activo'`", "eq(employees.isActive, true)"),
        ("sql`${employees.status} = 'inactivo'`", "eq(employees.isActive, false)"),
    ],
    f"{ROUTERS}/departmentMetrics.ts": [
        ("sql`${employees.status} = 'inactivo'`", "eq(employees.isActive, false)"),
        ("sql`(${employees.status} = 'activo' OR ${employees.updatedAt} > ${monthEnd})`", "eq(employees.isActive, true)"),
        ("sql`${employees.status} = 'activo'`", "eq(employees.isActive, true)"),
        ("sql`(${employees.status} = 'activo' OR ${employees.updatedAt} > ${currentYearEnd})`", "eq(employees.isActive, true)"),
        ("sql`(${employees.status} = 'activo' OR ${employees.updatedAt} > ${lastYearEnd})`", "eq(employees.isActive, true)"),
    ],
    f"{ROUTERS}/departments.ts": [("status: employees.status,", "isActive: employees.isActive,")],
}
for fp, reps in fixes.items():
    if not os.path.exists(fp): continue
    c = open(fp).read()
    for o, n in reps: c = c.replace(o, n)
    open(fp, 'w').write(c)

# PASO 2: db null validation
result = subprocess.run(["grep", "-rln", "const db = await getDb();", ROUTERS], capture_output=True, text=True)
for fp in [f for f in result.stdout.strip().split('\n') if f]:
    c = open(fp).read()
    if 'if (!db)' not in c and 'if (db === null)' not in c:
        c2 = re.sub(r'(      const db = await getDb\(\);)\n(?!      if \(!db\))', r'\1\n      if (!db) throw new Error("Database not available");\n', c)
        if c2 == c:
            c2 = re.sub(r'(    const db = await getDb\(\);)\n(?!    if \(!db\))', r'\1\n    if (!db) throw new Error("Database not available");\n', c)
        if c2 != c: open(fp, 'w').write(c2)

r = subprocess.run(["grep", "-rn", "employees.status", f"{BASE}/server/"], capture_output=True, text=True)
count = len([l for l in r.stdout.strip().split('\n') if l])
print(f"DONE. employees.status restantes: {count}")
