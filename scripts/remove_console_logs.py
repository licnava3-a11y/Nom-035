#!/usr/bin/env python3
"""Elimina console.log/error/warn de todos los archivos TSX del frontend."""
import os
import re

pages_dir = '/home/ubuntu/nom035_moodle_platform/client/src/pages'
# Patrón para líneas que son solo console.log/error/warn
pattern = re.compile(r'^\s*console\.(log|error|warn)\([^)]*\);\s*\n', re.MULTILINE)

files_fixed = 0
for fname in sorted(os.listdir(pages_dir)):
    if not fname.endswith('.tsx'):
        continue
    fpath = os.path.join(pages_dir, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = pattern.sub('', content)
    if new_content != content:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        files_fixed += 1
        print(f'  Fixed: {fname}')

print(f'\nTotal files fixed: {files_fixed}')
