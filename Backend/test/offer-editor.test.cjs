const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach, mock } = require('node:test');
const jwt = require('jsonwebtoken');
const fs = require('node:fs/promises');
const { parseOfferEditor } = require('../src/application/dto/offerDTO/OfferEditorDTO.ts');
const { connection } = require('../src/util/connection.ts');
const app = require('../src/app.ts').default;
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9XcAAAAASUVORK5CYII=';
const data = () => ({ offer: { title: 'Camarão fresco', description: 'Lote de teste', type: 'Camarão cinza', size: 'Médio', price: 34.9, weight: 80, minimumQuantity: 20, maximumQuantity: 80, location: 'Fortim, CE', startDate: '2026-11-01', endDate: '2027-01-01', status: 'ACTIVE' }, photos: [{ id: 'photo-1', description: 'Atual' }, { data: png, description: 'Nova' }] });
let server, origin, token, db, calls, fail, owner, written;
const previousSecret = process.env.JWT_ACCESS_SECRET;
before(async () => {
  process.env.JWT_ACCESS_SECRET = 'offer-editor-test-secret';
  token = jwt.sign({ userId: 'producer-1' }, process.env.JWT_ACCESS_SECRET);
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  origin = 'http://127.0.0.1:' + server.address().port;
});
beforeEach(() => {
  calls = []; written = []; fail = false; owner = 'producer-1';
  db = { beginTransaction: async () => calls.push('begin'), commit: async () => calls.push('commit'), rollback: async () => calls.push('rollback'), release: () => calls.push('release'), query: async (sql, values) => {
    calls.push({ sql, values });
    if (sql.startsWith('SELECT userId')) return [[{ userId: owner }]];
    if (sql.startsWith('SELECT id, imageUrl')) return [[{ id: 'photo-1', imageUrl: 'https://example.test/old.png' }]];
    if (fail && sql.startsWith('INSERT INTO')) throw new Error('Sensitive database error');
    return [{ affectedRows: 1 }];
  } };
  mock.method(connection, 'getConnection', async () => db);
  mock.method(connection, 'query', async () => { throw new Error('Unexpected real DB access'); });
  mock.method(fs, 'mkdir', async () => {});
  mock.method(fs, 'writeFile', async target => written.push(target));
  mock.method(fs, 'unlink', async target => calls.push({ unlink: target }));
});
afterEach(() => mock.restoreAll());
after(async () => { await new Promise(resolve => server.close(resolve)); await connection.end(); if (previousSecret === undefined) delete process.env.JWT_ACCESS_SECRET; else process.env.JWT_ACCESS_SECRET = previousSecret; });
const save = (body = data(), auth = token) => fetch(origin + '/offer/offer-1/editor', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) }, body: JSON.stringify(body) });

test('valida tipos, limites, datas reais, quantidade e imagens antes de gravar', () => {
  assert.equal(parseOfferEditor(data()).photos.length, 2);
  for (const changed of [{ price: -1 }, { weight: 10 }, { minimumQuantity: 90 }, { endDate: '2026-02-30' }, { status: 'ADMIN' }]) assert.throws(() => parseOfferEditor({ ...data(), offer: { ...data().offer, ...changed } }));
  assert.throws(() => parseOfferEditor({ ...data(), photos: Array(6).fill({ data: png, description: '' }) }));
  assert.throws(() => parseOfferEditor({ ...data(), photos: [{ data: 'data:image/png;base64,PHNjcmlwdD4=', description: '' }] }));
});
test('rejeita visitante e oferta alheia sem gravar arquivos', async () => {
  assert.equal((await save(data(), '')).status, 401);
  owner = 'other-producer';
  assert.equal((await save()).status, 403);
  assert.equal(written.length, 0);
  assert(calls.includes('rollback'));
});
test('salva oferta e galeria na mesma transação e preserva capa com IDs ordenados', async () => {
  const response = await save(); assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.photos.length, 2);
  assert.equal(body.photos[0].imageUrl, 'https://example.test/old.png');
  assert(body.photos[0].id < body.photos[1].id);
  assert.match(body.photos[1].imageUrl, /\/uploads\/offers\/.*\.png$/);
  assert.equal(written.length, 1);
  assert(calls.includes('commit')); assert(!calls.includes('rollback'));
  const update = calls.find(call => call.sql?.startsWith('UPDATE offers'));
  assert.equal(update.values.at(-1), 'producer-1'); assert(update.values.includes('ATIVO'));
});
test('falha no banco desfaz a transação e remove apenas os arquivos novos', async () => {
  fail = true; mock.method(console, 'error', () => {});
  const response = await save(); assert.equal(response.status, 500);
  assert(!JSON.stringify(await response.json()).includes('Sensitive'));
  assert(calls.includes('rollback')); assert(!calls.includes('commit'));
  assert.equal(calls.filter(call => call.unlink).length, 1);
});
test('foto de outra oferta e corpo inválido não alteram a galeria', async () => {
  assert.equal((await save({ ...data(), photos: [{ id: 'foreign-photo', description: '' }] })).status, 400);
  assert.equal((await save({ offer: {}, photos: [] })).status, 400);
  assert.equal(written.length, 0);
  assert(!calls.some(call => call.sql?.startsWith('DELETE')));
});

test('endpoint aceita o tamanho das fotos além do JSON padrão e mantém o limite de 3 MB por arquivo', async () => {
  const raw = Buffer.concat([Buffer.from(png.split(',')[1], 'base64'), Buffer.alloc(150 * 1024)]);
  const body = { ...data(), photos: [{ data: 'data:image/png;base64,' + raw.toString('base64'), description: '' }] };
  assert.equal((await save(body)).status, 200);
  assert.equal(written.length, 1);
  body.photos[0].data = 'data:image/png;base64,' + Buffer.concat([raw, Buffer.alloc(3 * 1024 * 1024)]).toString('base64');
  assert.throws(() => parseOfferEditor(body));
});
