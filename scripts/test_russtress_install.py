#!/usr/bin/env python3
"""Test installing and using russtress library for adding Russian stress marks."""
import subprocess, sys, os

venv_path = os.path.expanduser(r'~\.workbuddy\binaries\python\envs\russtress')
py_exe = os.path.join(venv_path, 'Scripts', 'python.exe')
pip_exe = os.path.join(venv_path, 'Scripts', 'pip.exe')

# Create venv if needed
if not os.path.exists(venv_path):
    print('Creating venv...')
    subprocess.check_call([sys.executable, '-m', 'venv', venv_path])
    print('Venv created.')

# Install russtress
print('Installing russtress...')
result = subprocess.run([pip_exe, 'install', 'russtress'], capture_output=True, text=True)
print(f'Install RC: {result.returncode}')
if result.stdout:
    print(f'Output (last 300 chars): {result.stdout[-300:]}')
if result.returncode != 0 and result.stderr:
    print(f'Error: {result.stderr[-500:]}')

# Test russtress
print('\nTesting russtress...')
test_script = r'''
import sys
try:
    from russtress import Accentuator
    a = Accentuator()
    result = a.put_stress("Привет, как дела?")
    print(f"OK: {repr(result)}")
except Exception as e:
    print(f"ERROR: {e}")
'''

test_file = os.path.expanduser(r'~\.workbuddy\russtress_test.py')
with open(test_file, 'w', encoding='utf-8') as f:
    f.write(test_script)

result2 = subprocess.run([py_exe, test_file], capture_output=True, text=True)
print(f'Test RC: {result2.returncode}')
if result2.stdout:
    print(f'Test output: {result2.stdout}')
if result2.stderr:
    print(f'Test stderr: {result2.stderr}')
