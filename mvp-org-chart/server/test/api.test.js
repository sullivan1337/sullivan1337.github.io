import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function startServer() {
  const server = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DB_FILE: ':memory:' }
  });
  return new Promise(resolve => setTimeout(() => resolve(server), 200));
}

test('login and fetch chart', async () => {
  const server = await startServer();
  try {
    // wait a moment to ensure server ready
    await new Promise(r => setTimeout(r, 100));
    const loginRes = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@acme.com', password: 'password' })
    });
    assert.equal(loginRes.status, 200);
    const { token } = await loginRes.json();
    assert.ok(token);

    const chartRes = await fetch('http://localhost:3000/api/org-chart', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(chartRes.status, 200);
    const data = await chartRes.json();
    assert.ok(data.id);
  } finally {
    server.kill();
    await new Promise(r => server.on('exit', r));
  }
});
