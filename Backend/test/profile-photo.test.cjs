const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach, mock } = require('node:test');
const jwt = require('jsonwebtoken');
const { imageStorage } = require('../src/service/imageStorage.ts');
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
  stored = 'https://res.cloudinary.com/test/image/upload/v1/redecamarao/profiles/' + oldFilename;
  pendingValue = stored; exists = true; fail = false; failFile = false; calls = []; written = []; type = 'PRODUCER';
  const db = {
    release: () => calls.push('release'),
    query: async (sql, values) => {
        sql = sql.replaceAll('"', '');
      if (sql === 'BEGIN') { calls.push('begin'); return { rows: [] }; }
      if (sql === 'COMMIT') { calls.push('commit'); stored = pendingValue; return { rows: [] }; }
      if (sql === 'ROLLBACK') { calls.push('rollback'); pendingValue = stored; return { rows: [] }; }
      calls.push({ sql, values });
      if (sql.startsWith('SELECT profilePicture')) return { rows: exists ? [{ profilePicture: stored }] : [] };
      if (sql.startsWith('UPDATE users')) {
        if (fail) throw new Error('Sensitive database failure');
        pendingValue = values[0]; return { rowCount: 1 };
      }
      throw new Error('Unexpected query');
    },
  };
  mock.method(connection, 'connect', async () => db);
  mock.method(connection, 'query', async (sql, values) => {
        sql = sql.replaceAll('"', '');
    assert.match(sql, /profilePicture/); assert.equal(values[0], 'owner-1');
    return { rows: [{ id: 'owner-1', name: 'Test user', email: 'private@example.test', password: 'private-hash', cpf_cnpj: 'private-document', userType: type, description: null, location: null, phone: null, businessHours: null, profilePicture: stored, createdAt: new Date('2026-01-01') }] };
  });
  mock.method(imageStorage, 'upload', async (buffer, folder) => {
    if (failFile) throw new Error('Cloudinary unavailable');
    assert.equal(folder, 'profiles'); assert(Buffer.isBuffer(buffer));
    const publicId = 'redecamarao/profiles/00000000-0000-4000-8000-000000000002';
    written.push(publicId);
    return { publicId, imageUrl: 'https://res.cloudinary.com/test/image/upload/v1/' + publicId + '.png' };
  });
  mock.method(imageStorage, 'removeCreated', async ids => ids.forEach(id => calls.push({ removeCreated: id })));
  mock.method(imageStorage, 'removeUnused', async urls => { for (const url of urls) if (typeof url === 'string' && url.startsWith('https://res.cloudinary.com/test/image/upload/v1/redecamarao/profiles/')) calls.push({ removed: url }); });
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
test('validates image signature, format and 10 MB limit before opening a transaction', async () => {
  for (const body of [{}, [], { data: 12 }, { data: '' }, { data: 'https://example.test/photo.png' }, { data: 'data:image/svg+xml;base64,PHN2Zy8+' }, { data: 'data:image/png;base64,PHNjcmlwdD4=' }, { data: 'data:image/png;base64,' + Buffer.alloc(10 * 1024 * 1024 + 1).toString('base64') }]) {
    assert.equal((await save(body)).status, 400);
  }
  assert.equal(calls.length, 0); assert.equal(written.length, 0);
});
test('saves only the token owner, returns the Cloudinary URL on reload and removes the previous image after commit', async () => {
  const response = await save(); assert.equal(response.status, 200);
  const result = await response.json(); assert.match(result.profilePicture, /^https:\/\/res.cloudinary.com\/test\/image\/upload\/v1\/redecamarao\/profiles\/[a-f0-9-]{36}\.png$/);
  assert.equal(stored, result.profilePicture); assert.equal(written.length, 1);
  const update = calls.find(call => call.sql?.startsWith('UPDATE users'));
  assert.deepEqual(update.values, [result.profilePicture, 'owner-1']);
  const removed = calls.find(call => call.removed);
  assert(removed.removed.endsWith(oldFilename));
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
  assert.equal(stored, 'https://res.cloudinary.com/test/image/upload/v1/redecamarao/profiles/' + oldFilename);
});
test('database failure rolls back and cleans only the new Cloudinary image, retaining the saved photo', async () => {
  fail = true; mock.method(console, 'error', () => {});
  const response = await save(); assert.equal(response.status, 500); assert(!JSON.stringify(await response.json()).includes('Sensitive'));
  assert.equal(stored, 'https://res.cloudinary.com/test/image/upload/v1/redecamarao/profiles/' + oldFilename);
  assert(calls.includes('rollback')); assert(!calls.includes('commit'));
  assert.deepEqual(calls.filter(call => call.removeCreated).map(call => call.removeCreated), written);
  assert(!calls.some(call => call.removed));
});
test('cleanup leaves legacy and external URLs intact', async () => {
  for (const previous of ['https://example.test/uploads/offers/' + oldFilename, 'file:///C:/sensitive.png', 'https://example.test/uploads/profiles/../sensitive.png']) {
    stored = previous; calls = [];
    assert.equal((await save({ data: null })).status, 200); assert(!calls.some(call => call.removed));
  }
});
test('photo upload accepts bodies larger than the standard JSON limit', async () => {
  const buffer = Buffer.alloc(10 * 1024 * 1024);
  Buffer.from(png.split(',')[1], 'base64').copy(buffer);
  const data = 'data:image/png;base64,' + buffer.toString('base64');
  assert.equal((await save({ data })).status, 200); assert.equal(written.length, 1);
});
