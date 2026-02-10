# Read the file
with open('server/routers/compliance.ts', 'r') as f:
    lines = f.readlines()

# Find the line with "return {" after "Registrar descarga en auditoría"
start_idx = None
for i, line in enumerate(lines):
    if i > 600 and 'return {' in line and 'success: true,' in lines[i+1]:
        start_idx = i
        break

if start_idx is None:
    print("Could not find start position")
    exit(1)

# Find the end (closing brace and semicolon)
end_idx = None
for i in range(start_idx, min(start_idx + 20, len(lines))):
    if '};' in lines[i] and 'data:' not in lines[i]:
        end_idx = i
        break

if end_idx is None:
    print("Could not find end position")
    exit(1)

print(f"Replacing lines {start_idx+1} to {end_idx+1}")

# Read the new code
with open('server/temp_procedure_code.txt', 'r') as f:
    new_code = f.read()

# Extract only the return statement part
new_code_lines = new_code.split('\n')
return_start = None
for i, line in enumerate(new_code_lines):
    if 'Cargar plantilla default' in line:
        return_start = i - 1
        break

if return_start is None:
    print("Could not find return start in new code")
    exit(1)

new_code_to_insert = '\n'.join(new_code_lines[return_start:])

# Replace the lines
new_lines = lines[:start_idx] + [new_code_to_insert + '\n'] + lines[end_idx+1:]

# Write back
with open('server/routers/compliance.ts', 'w') as f:
    f.writelines(new_lines)

print("Replacement completed successfully")
