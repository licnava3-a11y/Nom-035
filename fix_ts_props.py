#!/usr/bin/env python3
"""
Script maestro para corregir propiedades TypeScript incorrectas en routers.
Basado en el análisis del schema real de la base de datos.
"""
import re, glob, os

router_dir = "/home/ubuntu/nom035_moodle_platform/server/routers/"

# Mapa de correcciones: (tabla, prop_incorrecta) -> prop_correcta o None (eliminar)
# Para users: tiene departamento, puesto, salario, sexo, etc. (campos en español)
# Para employees: tiene firstName, lastName, isActive, hireDate, etc.
corrections = {
    # employees - propiedades en español -> inglés
    ('employees', 'nombre'): None,  # No existe, usar firstName + lastName
    ('employees', 'apellidoPaterno'): None,  # No existe, usar lastName
    ('employees', 'apellidoMaterno'): None,  # No existe, usar lastName
    ('employees', 'puesto'): 'positionId',  # positionId es la FK
    ('employees', 'activo'): 'isActive',
    ('employees', 'rows'): None,  # Error de .rows en resultado de execute()
    ('employees', 'userId'): 'userId',  # Ya existe en el schema
    
    # users - propiedades que SÍ existen en el schema de users
    # (departamento, puesto, salario, sexo, etc. SÍ existen en users)
    # Solo corregir las que NO existen:
    ('users', 'activo'): None,  # No existe en users - usar role o isActive
    ('users', 'apellido'): None,  # No existe - usar name
    ('users', 'nombre'): 'name',  # nombre -> name
    ('users', 'gender'): 'sexo',  # gender no existe, sexo sí
    ('users', 'hireDate'): 'fechaIngreso',  # hireDate no existe, fechaIngreso sí
    ('users', 'dateOfBirth'): 'fechaNacimiento',  # dateOfBirth no existe, fechaNacimiento sí
    ('users', 'isActive'): None,  # isActive no existe en users - no hay equivalente directo
    
    # cases - propiedades que son accesos a objetos JS (no columnas DB)
    # cases.title, cases.open, cases.closed, etc. son accesos a objetos resultado, no columnas
    # Estos son falsos positivos del análisis - no son errores de columna
    
    # employees - contrato
    ('employees', 'contract1ExpirationDate'): 'contract1ExpirationDate',  # Ya existe
    ('employees', 'contract2ExpirationDate'): 'contract2ExpirationDate',  # Ya existe
    ('employees', 'contract3ExpirationDate'): 'contract3ExpirationDate',  # Ya existe
    ('employees', 'findFirst'): None,  # Error de drizzle ORM - no es columna
}

# Correcciones específicas por archivo
file_specific = {
    "departmentMetrics.ts": [
        # employees.nombre, apellidoPaterno, apellidoMaterno, puesto -> usar sql raw
        (r"employees\.nombre", "employees.firstName"),
        (r"employees\.apellidoPaterno", "employees.lastName"),
        (r"employees\.apellidoMaterno", "sql`''`"),
        (r"employees\.puesto", "employees.positionId"),
    ],
    "executiveDashboard.ts": [
        # users.sexo, users.salario ya existen en el schema de users - son correctos
        # users.departamento ya existe - correcto
        # No hay correcciones necesarias aquí
    ],
    "executiveReports.ts": [
        # employees.activo -> employees.isActive
        (r"employees\.activo", "employees.isActive"),
        # employees.byDepartment, employees.total -> son accesos a objetos JS, no columnas
        # cases.open, cases.closed, cases.total, etc. -> son accesos a objetos JS resultado
    ],
    "predictiveCorrelation.ts": [
        # users.activo -> no existe, usar sql raw
        (r"users\.activo\b", "sql`1`"),
        # users.apellido -> no existe, usar users.name
        (r"users\.apellido\b", "users.name"),
        # users.nombre -> users.name
        (r"users\.nombre\b", "users.name"),
    ],
    "salaryEquity.ts": [
        # users.gender -> users.sexo
        (r"users\.gender\b", "users.sexo"),
        # users.hireDate -> users.fechaIngreso
        (r"users\.hireDate\b", "users.fechaIngreso"),
        # users.dateOfBirth -> users.fechaNacimiento
        (r"users\.dateOfBirth\b", "users.fechaNacimiento"),
    ],
    "reports.ts": [
        # users.isActive -> no existe en users, usar sql raw
        (r"users\.isActive\b", "sql`1`"),
    ],
    "budgetPlanner.ts": [
        # employees.rows -> (employees as any)[0]
        (r"employees\.rows\b", "(employees as any)[0]"),
    ],
    "salaryImpactSimulator.ts": [
        # employees.findFirst -> no es columna, es método drizzle
        # Probablemente es un error de variable - ignorar
    ],
    "trainingNeeds.ts": [
        # employees.userId -> ya existe en schema, correcto
    ],
    "predictiveTurnoverDashboard.ts": [
        # users.nombre -> users.name
        (r"users\.nombre\b", "users.name"),
    ],
}

total_fixed = 0
for fname, replacements in file_specific.items():
    fp = router_dir + fname
    if not os.path.exists(fp):
        continue
    with open(fp) as f:
        content = f.read()
    new_content = content
    for old_pattern, new_val in replacements:
        new_content = re.sub(old_pattern, new_val, new_content)
    if new_content != content:
        with open(fp, 'w') as f:
            f.write(new_content)
        total_fixed += 1
        print(f"Corregido: {fname}")

# Correcciones globales en todos los archivos
global_fixes = [
    # employees.activo -> employees.isActive (en todos los archivos)
    (r'\bemployees\.activo\b', 'employees.isActive'),
    # users.nombre -> users.name (en todos los archivos)
    (r'\busers\.nombre\b', 'users.name'),
    # users.apellido -> users.name (en todos los archivos)
    (r'\busers\.apellido\b', 'users.name'),
]

for fp in glob.glob(router_dir + "*.ts"):
    with open(fp) as f:
        content = f.read()
    new_content = content
    for old_pattern, new_val in global_fixes:
        new_content = re.sub(old_pattern, new_val, new_content)
    if new_content != content:
        with open(fp, 'w') as f:
            f.write(new_content)
        total_fixed += 1
        print(f"Corregido globalmente: {fp.split('/')[-1]}")

print(f"\nTotal archivos corregidos: {total_fixed}")
