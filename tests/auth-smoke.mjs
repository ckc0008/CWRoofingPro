import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
const port = '5011';
const server = spawn(process.execPath, ['dist/index.cjs'], { env: { ...process.env, NODE_ENV: 'production', PORT: port } });
let output = '';
server.stdout.on('data', data => output += data);
server.stderr.on('data', data => output += data);
try {
  for (let i = 0; i < 100 && !output.includes('serving on port'); i++) await new Promise(resolve => setTimeout(resolve, 100));
  assert.match(output, /serving on port/, 'Production server should start');
  for (const [route, headers, expected] of [
    ['/healthz', {}, 200],
    ['/api/auth/config', {}, 200],
    ['/api/leads', {}, 401],
    ['/api/leads', { Authorization: 'Bearer invalid' }, 401],
    ['/api/settings', {}, 401],
    ['/api/documents', {}, 401],
    ['/', {}, 200],
  ]) {
    const response = await fetch(`http://127.0.0.1:${port}${route}`, { headers, signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, expected, route);
  }
  const response = await fetch(`http://127.0.0.1:${port}/api/leads`, {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({firstName:'Blocked',lastName:'Test'})});
  assert.equal(response.status, 401, 'Unauthenticated writes must be denied');
  console.log('Production startup and API authentication smoke tests passed.');
} finally { server.kill(); }
