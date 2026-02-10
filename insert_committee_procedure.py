# Leer archivo
with open('server/routers/compliance.ts', 'r') as f:
    lines = f.readlines()

# Leer procedimiento nuevo
with open('server/temp_committee_minutes_procedure.txt', 'r') as f:
    new_procedure = f.read()

# Buscar la última línea con });
for i in range(len(lines) - 1, -1, -1):
    if lines[i].strip() == '});':
        # Insertar antes de esta línea
        lines.insert(i, new_procedure + '\n')
        break

# Escribir de vuelta
with open('server/routers/compliance.ts', 'w') as f:
    f.writelines(lines)

print("✅ Procedimiento generateCommitteeMinutesPDF agregado exitosamente")
