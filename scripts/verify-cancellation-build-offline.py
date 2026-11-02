"""Offline optimized build, using an existing cache of real public font assets.

Usage: python scripts/verify-cancellation-build-offline.py /path/to/font-cache.json
No download/install, live keys, env loading, deployment, or external write. The
cache is read-only; artifacts and synthetic HOME/TMPDIR remain in this worktree.
"""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
if list(root.glob('.env*')):
    raise SystemExit('Refusing build with local env files present')
cache = Path(sys.argv[1]).resolve()
font_cache = json.loads(cache.read_text())
assets = sorted({Path(p) for css in font_cache.values() for p in re.findall(r'url\((/[^)]+)\)', css)})
if len(font_cache) != 2 or not assets or not all(p.is_file() for p in assets):
    raise SystemExit('Existing real-font cache is incomplete; no network fallback')
artifacts = root / 'node_modules/.cache/post-effect'
artifacts.mkdir(parents=True, exist_ok=True)
env = {
    'PATH': '/opt/homebrew/bin:/usr/bin:/bin', 'HOME': str(artifacts), 'TMPDIR': str(artifacts),
    'CI': '1', 'NEXT_TELEMETRY_DISABLED': '1',
    'NEXT_FONT_GOOGLE_MOCKED_RESPONSES': str(cache),
    'STRIPE_SECRET_KEY_PRIMARY': 'sk_test_offline_primary',
    'STRIPE_SECRET_KEY_SECONDARY': 'sk_test_offline_secondary',
    'STRIPE_SECRET_KEY': 'sk_test_offline_rotating',
    'RESEND_API_KEY': 're_offline_placeholder', 'SEAM_API_KEY': 'seam_offline_placeholder',
    'NEXT_PUBLIC_SUPABASE_URL': 'https://build-placeholder.invalid',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'build-placeholder-anon',
    'SUPABASE_SERVICE_ROLE_KEY': 'build-placeholder-service',
    'ADMIN_API_SECRET': 'build-only-admin-canary-not-a-real-secret',
}
cmd = ['/usr/bin/sandbox-exec', '-p', '(version 1) (allow default) (deny network*)',
       shutil.which('npm'), 'run', 'build']
p = subprocess.run(cmd, cwd=root, env=env, text=True, capture_output=True, timeout=300)
(artifacts / 'build.log').write_text(p.stdout + p.stderr)
markers = ['build-only-admin-canary-not-a-real-secret', 'ADMIN_API_SECRET',
           'STRIPE_SECRET_KEY_PRIMARY', 'build-placeholder-service']
files = [f for f in (root / '.next/static').rglob('*') if f.is_file()] if p.returncode == 0 else []
leaks = [str(f.relative_to(root)) for f in files if any(s.encode() in f.read_bytes() for s in markers)]
result = {
    'command': cmd, 'exit_code': p.returncode,
    'log': str(artifacts / 'build.log'), 'font_stylesheets': len(font_cache),
    'real_font_asset_sha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in assets},
    'client_artifacts_scanned': len(files), 'canary_or_server_marker_leaks': leaks,
}
(artifacts / 'build-execution.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
raise SystemExit(p.returncode or bool(leaks))
