import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function startServer() {
  const server = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DB_FILE: ':memory:' }
  });
  return new Promise(resolve => setTimeout(() => resolve(server), 1000));
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

    const putRes = await fetch('http://localhost:3000/api/org', {
      method: 'PUT',
      headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({name: 'New Name'})
    });
    assert.equal(putRes.status,204);
  } finally {
    server.kill();
    await new Promise(r => server.on('exit', r));
  }
});

test('create and delete member', async () => {
  const server = await startServer();
  try {
    await new Promise(r => setTimeout(r, 100));
    const loginRes = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@acme.com', password: 'password' })
    });
    const { token } = await loginRes.json();
    const addRes = await fetch('http://localhost:3000/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Temp', parent_id: null })
    });
    assert.equal(addRes.status, 200);
    const added = await addRes.json();
    const delRes = await fetch(`http://localhost:3000/api/members/${added.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(delRes.status, 204);
    const chartRes = await fetch('http://localhost:3000/api/org-chart', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const chart = await chartRes.json();
    assert.ok(!chart.children || chart.children.every(c => c.id !== added.id));
  } finally {
    server.kill();
    await new Promise(r => server.on('exit', r));
  }
});

test('add second root member', async () => {
  const server = await startServer();
  try {
    await new Promise(r => setTimeout(r, 100));
    const loginRes = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@acme.com', password: 'password' })
    });
    const { token } = await loginRes.json();
    const addRes = await fetch('http://localhost:3000/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Root2', parent_id: null })
    });
    assert.equal(addRes.status, 200);
    const chartRes = await fetch('http://localhost:3000/api/org-chart', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const chart = await chartRes.json();
    const roots = chart.children ? chart.children : [chart];
    assert.ok(roots.length >= 2);
  } finally {
    server.kill();
    await new Promise(r => server.on('exit', r));
  }
});

test('update member color', async () => {
  const server = await startServer();
  try {
    await new Promise(r => setTimeout(r, 100));
    const loginRes = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@acme.com', password: 'password' })
    });
    const { token } = await loginRes.json();
    const addRes = await fetch('http://localhost:3000/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'ColorTest', parent_id: null })
    });
    const added = await addRes.json();
    const putRes = await fetch(`http://localhost:3000/api/members/${added.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: 'ColorTest',
        bu_color: '#123456',
        parent_id: null
      })
    });
    assert.equal(putRes.status, 200);
    const chartRes = await fetch('http://localhost:3000/api/org-chart', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const chart = await chartRes.json();
    const node = chart.children ? chart.children.find(c => c.id === added.id) : null;
    assert.equal(node.bu_color, '#123456');
  } finally {
    server.kill();
    await new Promise(r => server.on('exit', r));
  }
});

test('import org chart', async () => {
  const server = await startServer();
  try {
    await new Promise(r => setTimeout(r, 100));
    const loginRes = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@acme.com', password: 'password' })
    });
    const { token } = await loginRes.json();
    const orgData = { name: 'RootImport', children: [{ name: 'ChildImport' }] };
    const res = await fetch('http://localhost:3000/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ members: orgData, company: 'ImportCo' })
    });
    assert.equal(res.status, 201);
    const chartRes = await fetch('http://localhost:3000/api/org-chart', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const chart = await chartRes.json();
    assert.equal(chart.name, 'RootImport');
    assert.equal(chart.company, 'ImportCo');
  } finally {
    server.kill();
    await new Promise(r => server.on('exit', r));
  }
});
