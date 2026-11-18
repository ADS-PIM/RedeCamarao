const assert = require('node:assert/strict');
const { test, before, after, beforeEach, afterEach, mock } = require('node:test');
const app = require('../src/app.ts').default;
const { connection } = require('../src/util/connection.ts');
const { UserDAOPostgres } = require('../src/infra/bd/postgres/user.Postgres.dao.ts');
let server, origin, coverPhoto;
const image = 'https://res.cloudinary.com/test/image/upload/v1/first.jpg';
before(async () => {
  server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  origin = 'http://127.0.0.1:' + server.address().port;
});
beforeEach(() => {
  coverPhoto = image;
  mock.method(connection, 'query', async sql => {
    assert.match(sql, /\(SELECT "imageUrl" FROM "offerPhotos" WHERE "offerId" = offers.id ORDER BY id ASC LIMIT 1\) AS "coverPhoto"/);
    assert.match(sql, /status = 'ATIVO'/);
    return { rows: [{ id: 'offer-1', userId: 'producer-1', title: 'Camarão', description: 'Lote real', type: 'Cinza', size: 'M', price: '34.90', weight: '300', minimumQuantity: '0.8', maximumQuantity: '30', location: 'Fortim, CE', startDate: new Date('2026-01-01'), endDate: new Date('2030-01-01'), status: 'ACTIVE', coverPhoto }] };
  });
  mock.method(UserDAOPostgres.prototype, 'searchPublicProducerById', async () => ({ id: 'producer-1', name: 'Produtor', description: null, location: null, phone: null, businessHours: null, profilePicture: null, activeOfferCount: 1 }));
});
afterEach(() => mock.restoreAll());
after(async () => { await new Promise(resolve => server.close(resolve)); await connection.end(); });
for (const path of ['/offer/marketplace', '/users/producers/producer-1']) {
  test(`${path} exposes the first gallery image to public cards without exposing the owner ID`, async () => {
    const response = await fetch(origin + path); assert.equal(response.status, 200);
    const data = await response.json(); const offers = Array.isArray(data) ? data : data.offers;
    assert.equal(offers[0].coverPhoto, image); assert.equal(offers[0].userId, undefined);
  });
  test(`${path} returns null for offers with no photos`, async () => {
    coverPhoto = null;
    const response = await fetch(origin + path); assert.equal(response.status, 200);
    const data = await response.json(); assert.equal((Array.isArray(data) ? data : data.offers)[0].coverPhoto, null);
  });
}
