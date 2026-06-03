#!/usr/bin/env python3
"""
Script to add null guards after every 'const db = await getDb();' that is not
already followed by 'if (!db)' in TypeScript router files.
"""
import re
import os
import glob

ROUTER_DIR = "/home/ubuntu/nom035_moodle_platform/server/routers"
SERVER_DIR = "/home/ubuntu/nom035_moodle_platform/server"

NULL_GUARD = '      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });'

# Pattern: const db = await getDb(); NOT followed by if (!db)
PATTERN = re.compile(
    r'([ \t]*const db = await getDb\(\);)([ \t]*\n)(?![ \t]*if \(!db\))',
    re.MULTILINE
)

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Count existing guards
    existing_guards = content.count('if (!db) throw new TRPCError')
    total_calls = content.count('const db = await getDb();')
    
    if total_calls == 0:
        return 0
    
    def replacement(m):
        indent = m.group(1).split('const')[0]  # Get indentation
        guard_line = f'{indent}      if (!db) throw new TRPCError({{ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" }});'
        return f'{m.group(1)}{m.group(2)}{guard_line}\n'
    
    new_content = PATTERN.sub(replacement, content)
    new_guards = new_content.count('if (!db) throw new TRPCError')
    added = new_guards - existing_guards
    
    if added > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  {os.path.basename(filepath)}: added {added} null guards ({total_calls} total getDb() calls)")
    
    return added

def main():
    total_fixed = 0
    files_fixed = 0
    
    # Process all router files
    router_files = glob.glob(os.path.join(ROUTER_DIR, "*.ts"))
    # Also process server-level files
    server_files = glob.glob(os.path.join(SERVER_DIR, "*.ts"))
    
    all_files = router_files + server_files
    
    print(f"Scanning {len(all_files)} TypeScript files...")
    
    for filepath in sorted(all_files):
        if '.test.' in filepath or 'fix_null' in filepath:
            continue
        added = fix_file(filepath)
        if added > 0:
            total_fixed += added
            files_fixed += 1
    
    print(f"\nTotal: {total_fixed} null guards added across {files_fixed} files")

if __name__ == "__main__":
    main()
