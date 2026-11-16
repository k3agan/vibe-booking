"""Run committed cancellation checks with synthetic env and network denied (macOS).

No install, live credentials, .env loading or remote calls. Artifacts stay in the
existing ignored node_modules/.cache/post-effect tree. Invoke with a unique label
and optional Jest test path; `--typecheck` executes the local TypeScript compiler.
"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
label, *extra = sys.argv[1:]
if not label.replace('-', '').replace('_', '').isalnum():
    raise SystemExit('label must be alphanumeric with hyphens/underscores')
artifacts = root / 'node_modules/.cache/post-effect'
artifacts.mkdir(parents=True, exist_ok=True)
node = shutil.which('node')
assert node and (root / 'node_modules/jest/bin/jest.js').exists()
env = {
    'PATH': '/opt/homebrew/bin:/usr/bin:/bin',
    'HOME': str(artifacts), 'TMPDIR': str(artifacts),
    'NODE_ENV': 'test', 'NEXT_TELEMETRY_DISABLED': '1',
}
if extra == ['--typecheck']:
    args = [node, str(root / 'node_modules/typescript/bin/tsc'), '--noEmit', '--incremental', 'false']
else:
    args = [node, str(root / 'node_modules/jest/bin/jest.js'), '--runInBand',
            '--no-cache', '--cacheDirectory', str(artifacts / 'jest-cache'),
            '--json', '--outputFile', str(artifacts / f'{label}.json'), *extra]
cmd = ['/usr/bin/sandbox-exec', '-p', '(version 1) (allow default) (deny network*)', *args]
p = subprocess.run(cmd, cwd=root, env=env, text=True, capture_output=True, timeout=240)
(artifacts / f'{label}.log').write_text(p.stdout + p.stderr)
result = {'command': cmd, 'exit_code': p.returncode, 'log': str(artifacts / f'{label}.log')}
if extra != ['--typecheck'] and (artifacts / f'{label}.json').exists():
    data = json.loads((artifacts / f'{label}.json').read_text())
    result.update({key: data[key] for key in ['numTotalTests', 'numPassedTests', 'numFailedTests',
                  'numTotalTestSuites', 'numPassedTestSuites', 'numFailedTestSuites', 'success']})
(artifacts / f'{label}-execution.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
raise SystemExit(p.returncode)
