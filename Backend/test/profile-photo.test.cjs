const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach, mock } = require('node:test');
const jwt = require('jsonwebtoken');
const fs = require('node:fs/promises');
const path = require('node:path');
const { connection } = require('../src/util/connection.ts');
const app = require('../src/app.ts').default;
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9XcAAAAASUVORK5CYII=';
const oldFilename = '00000000-0000-4000-8000-000000000001.png';
let server, origin, token, stored, pendingValue, exists, fail, failFile, calls, written, type;
const previousSecret = process.env.JWT_ACCESS_SECRET;
before(async () => {
  process.env.JWT_ACCESS_SECRET = 'profile-photo-test-secret';
  token = jwt.sign({ userId: 'owner-1' }, process.env.JWT_ACCESS_SECRET);
  server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  origin = 'http://127.0.0.1:' + server.address().port;
});
beforeEach(() => {
  stored = origin + '/uploads/profiles/' + oldFilename;
  pendingValue = stored; exists = true; fail = false; failFile = false; calls = []; written = []; type = 'PRODUCER';
  const db = {
    beginTransaction: async () => calls.push('begin'),
    commit: async () => { calls.push('commit'); stored = pendingValue; },
    rollback: async () => { calls.push('rollback'); pendingValue = stored; },
    release: () => calls.push('release'),
    query: async (sql, values) => {
      calls.push({ sql, values });
      if (sql.startsWith('SELECT profilePicture')) return [exists ? [{ profilePicture: stored }] : []];
      if (sql.startsWith('UPDATE users')) {
        if (fail) throw new Error('Sensitive database failure');
        pendingValue = values[0]; return [{ affectedRows: 1 }];
      }
      throw new Error('Unexpected query');
    },
  };
  mock.method(connection, 'getConnection', async () => db);
  mock.method(connection, 'query', async (sql, values) => {
    assert.match(sql, /profilePicture/); assert.equal(values[0], 'owner-1');
    return [[{ id: 'owner-1', name: 'Test user', email: 'private@example.test', password: 'private-hash', cpf_cnpj: 'private-document', userType: type, description: null, location: null, phone: null, businessHours: null, profilePicture: stored, createdAt: new Date('2026-01-01') }]];
  });
  mock.method(fs, 'mkdir', async () => {});
  mock.method(fs, 'writeFile', async (target, buffer, options) => {
    if (failFile) throw new Error('File system unavailable');
    assert.equal(options.flag, 'wx'); assert(Buffer.isBuffer(buffer)); written.push(target);
  });
  mock.method(fs, 'unlink', async target => calls.push({ unlink: target }));
});
afterEach(() => mock.restoreAll());
after(async () => {
  await new Promise(resolve => server.close(resolve)); await connection.end();
  if (previousSecret === undefined) delete process.env.JWT_ACCESS_SECRET; else process.env.JWT_ACCESS_SECRET = previousSecret;
});
const save = (body = { data: png }, auth = token) => fetch(origin + '/users/me/photo', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) }, body: JSON.stringify(body) });

test('requires authentication and rejects attempts to choose another account', async () => {
  assert.equal((await save({ data: png }, '')).status, 401);
  assert.equal((await save({ data: png }, 'invalid')).status, 401);
  assert.equal((await save({ data: png, userId: 'other-user' })).status, 400);
  assert.equal(calls.length, 0); assert.equal(written.length, 0);
});
test('validates image signature, format and 3 MB limit before opening a transaction', async () => {
  for (const body of [{}, [], { data: 12 }, { data: '' }, { data: 'https://example.test/photo.png' }, { data: 'data:image/svg+xml;base64,PHN2Zy8+' }, { data: 'data:image/png;base64,PHNjcmlwdD4=' }, { data: 'data:image/png;base64,' + Buffer.alloc(3 * 1024 * 1024 + 1).toString('base64') }]) {
    assert.equal((await save(body)).status, 400);
  }
  assert.equal(calls.length, 0); assert.equal(written.length, 0);
});
test('saves only the token owner, returns the persisted URL on reload and removes the previous file after commit', async () => {
  const response = await save(); assert.equal(response.status, 200);
  const result = await response.json(); assert.match(result.profilePicture, /\/uploads\/profiles\/[a-f0-9-]{36}\.png$/);
  assert.equal(stored, result.profilePicture); assert.equal(written.length, 1);
  const update = calls.find(call => call.sql?.startsWith('UPDATE users'));
  assert.deepEqual(update.values, [result.profilePicture, 'owner-1']);
  const removed = calls.find(call => call.unlink);
  assert.equal(path.basename(removed.unlink), oldFilename);
  assert(calls.indexOf('commit') < calls.indexOf(removed));
  const profile = await (await fetch(origin + '/users/me', { headers: { Authorization: 'Bearer ' + token } })).json();
  assert.equal(profile.profilePicture, result.profilePicture);
  assert(!JSON.stringify(profile).includes('private-hash')); assert(!JSON.stringify(profile).includes('private-document'));
});
test('buyers can save their own photo and removing it persists null without creating files', async () => {
  type = 'BUYER';
  assert.equal((await save()).status, 200);
  assert.equal((await (await fetch(origin + '/users/me', { headers: { Authorization: 'Bearer ' + token } })).json()).userType, 'BUYER');
  const writes = written.length;
  const response = await save({ data: null }); assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { profilePicture: null }); assert.equal(stored, null); assert.equal(written.length, writes);
});
test('missing account and storage failure cannot leave a committed photo', async () => {
  exists = false; assert.equal((await save()).status, 404); assert.equal(written.length, 0);
  exists = true; failFile = true; mock.method(console, 'error', () => {});
  assert.equal((await save()).status, 500); assert(!calls.includes('commit')); assert(calls.includes('rollback'));
  assert.equal(stored, origin + '/uploads/profiles/' + oldFilename);
});
test('database failure rolls back and cleans only the new file, retaining the saved photo', async () => {
  fail = true; mock.method(console, 'error', () => {});
  const response = await save(); assert.equal(response.status, 500); assert(!JSON.stringify(await response.json()).includes('Sensitive'));
  assert.equal(stored, origin + '/uploads/profiles/' + oldFilename);
  assert(calls.includes('rollback')); assert(!calls.includes('commit'));
  assert.deepEqual(calls.filter(call => call.unlink).map(call => call.unlink), written);
});
test('cleanup never unlinks paths outside the dedicated profile-photo directory', async () => {
  for (const previous of ['https://example.test/uploads/offers/' + oldFilename, 'file:///C:/sensitive.png', 'https://example.test/uploads/profiles/../sensitive.png']) {
    stored = previous; calls = [];
    assert.equal((await save({ data: null })).status, 200); assert(!calls.some(call => call.unlink));
  }
});
test('photo upload accepts bodies larger than the standard JSON limit', async () => {
  const data = 'data:image/png;base64,' + Buffer.concat([Buffer.from(png.split(',')[1], 'base64'), Buffer.alloc(150 * 1024)]).toString('base64');
  assert.equal((await save({ data })).status, 200); assert.equal(written.length, 1);
});
