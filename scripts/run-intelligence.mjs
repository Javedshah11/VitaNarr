import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const windowsUv = join(homedir(), '.local', 'bin', 'uv.exe');
const uv =
  process.env.UV_BIN ?? (process.platform === 'win32' && existsSync(windowsUv) ? windowsUv : 'uv');
const args = [
  '--directory',
  'backend/intelligence',
  'run',
  'uvicorn',
  'app.main:app',
  '--reload',
  '--host',
  '127.0.0.1',
  '--port',
  '8001',
];

const child = spawn(uv, args, { stdio: 'inherit' });

child.on('error', (error) => {
  console.error(`Unable to start uv: ${error.message}`);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 0 : 1);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
