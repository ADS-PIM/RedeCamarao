const assert = require('node:assert/strict');
const { test, before, beforeEach, after, afterEach, mock } = require('node:test');
const app = require('../src/app.ts').default;
const { connection } = require('../src/util/connection.ts');
const { OfferDAOMySQL } = require('../src/infra/bd/mySql/offer.MySQL.dao.ts');
const { UserDAOMySQL } = require('../src/infra/bd/mySql/user.MySQL.dao.ts');
const { OfferPhotoDAOMySQL } = require('../src/infra/bd/mySql/offerPhoto.MySQL.dao.ts');
const { Offer, OfferStatus } = require('../src/domain/model/offer.ts');
const { User, UserType } = require('../src/domain/model/user.ts');
const { OfferPhoto } = require('../src/domain/model/offerPhoto.ts');

const offerId = 'c58d2304-f74f-42db-8e57-4ca50b1c642e';
const producerId = 'bd9fb70b-af5f-4f72-9e18-a841db772d81';
const otherProducerId = '96f175ad-4ec3-4d8c-8848-36d35c02da47';
const photoId = 'c8b3dd27-4587-432b-8397-7a39f8e5aa15';
const inactiveId = 'cdd0623b-b72e-4183-a905-cc084cf8c487';
let server;
let baseUrl;
let activeOffers;
let producer;
let photos;
let activeQuery;
let userQuery;
let photoQuery;

function offer(id = offerId, userId = producerId) {
    return Offer.reconstruct({
        id, userId, title: 'Camarão cinza fresco', description: 'Lote conservado em gelo.',
        type: 'Camarão cinza', size: 'Médio (11–14 cm)', price: 34.9, weight: 80,
        maximumQuantity: 80, minimumQuantity: 20, location: 'Fortim, CE',
        startDate: new Date('2026-11-01T00:00:00.000Z'),
        endDate: new Date('2026-11-30T00:00:00.000Z'),
        createdAt: new Date('2026-11-08T10:00:00.000Z'), status: OfferStatus.ACTIVE
    });
}

function producerRecord(overrides = {}) {
    return User.reconstruct({
        id: producerId, name: 'Fazenda de teste', email: 'private-owner@example.test',
        password: 'private-password-hash', userType: UserType.PRODUCER, cpf_cnpj: 'private-document',
        description: 'Produção local.', location: 'Fortim, CE', phone: '85999990000',
        businessHours: 'Segunda a sexta, 8h às 17h', createdAt: new Date('2024-01-01T00:00:00Z'),
        ...overrides
    });
}

before(async () => {
    server = await new Promise(resolve => {
        const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
    activeOffers = [offer(), offer('a58d2304-f74f-42db-8e57-4ca50b1c642e'), offer('b58d2304-f74f-42db-8e57-4ca50b1c642e', otherProducerId)];
    producer = producerRecord();
    photos = [OfferPhoto.reconstruct({
        id: photoId, offerId, imageUrl: 'https://example.test/lote.jpg', description: 'Foto do lote'
    })];
    // No database is contacted: only the DAO boundaries are replaced, keeping HTTP/controller/use-case real.
    activeQuery = mock.method(OfferDAOMySQL.prototype, 'searchActive', async () => activeOffers);
    userQuery = mock.method(UserDAOMySQL.prototype, 'searchById', async id => {
        assert.equal(id, producerId);
        return producer;
    });
    photoQuery = mock.method(OfferPhotoDAOMySQL.prototype, 'searchByOfferId', async id => {
        assert.equal(id, offerId);
        return photos;
    });
    mock.method(connection, 'query', async () => { throw new Error('Unexpected database access'); });
});

afterEach(() => mock.restoreAll());
after(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await connection.end();
});

function request(path = `/offer/marketplace/${offerId}`) { return fetch(`${baseUrl}${path}`); }

test('public detail returns the active offer, its photos and only public producer fields without authentication', async () => {
    const response = await request();
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result, {
        id: offerId, title: 'Camarão cinza fresco', description: 'Lote conservado em gelo.',
        type: 'Camarão cinza', size: 'Médio (11–14 cm)', price: 34.9, weight: 80,
        maximumQuantity: 80, minimumQuantity: 20, location: 'Fortim, CE',
        startDate: '2026-11-01T00:00:00.000Z', endDate: '2026-11-30T00:00:00.000Z',
        createdAt: '2026-11-08T10:00:00.000Z',
        photos: [{ id: photoId, imageUrl: 'https://example.test/lote.jpg', description: 'Foto do lote' }],
        producer: {
            id: producerId, name: 'Fazenda de teste', description: 'Produção local.', location: 'Fortim, CE',
            phone: '85999990000', businessHours: 'Segunda a sexta, 8h às 17h', profilePicture: null, activeOfferCount: 2
        }
    });
    for (const sensitive of ['private-owner', 'private-password', 'private-document', 'cpf_cnpj', 'email', 'password', 'userId', 'status']) {
        assert.ok(!JSON.stringify(result).includes(sensitive), sensitive);
    }
    assert.equal(activeQuery.mock.callCount(), 1);
    assert.equal(photoQuery.mock.callCount(), 1);
    assert.equal(connection.query.mock.callCount(), 0);
});

test('detail preserves optional public producer fields and an empty gallery without invented values', async () => {
    producer = producerRecord({ description: null, location: null, phone: null, businessHours: null });
    photos = [];
    const response = await request();
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result.photos, []);
    for (const field of ['description', 'location', 'phone', 'businessHours']) assert.equal(result.producer[field], null);
    assert.ok(!('createdAt' in result.producer));
    assert.ok(!('responseTime' in result.producer));
});

test('offer detail includes the saved producer photo', async () => {
    const profilePicture = 'https://example.test/uploads/profiles/photo.png';
    producer = producerRecord({ profilePicture });
    const response = await request();
    assert.equal(response.status, 200);
    assert.equal((await response.json()).producer.profilePicture, profilePicture);
});

test('inactive, expired and missing offers receive the same 404 before reading producer or photos', async () => {
    // searchActive is the existing DAO query that excludes inactive/out-of-period offers.
    for (const id of [inactiveId, 'expired-offer', 'missing-offer']) {
        const response = await request(`/offer/marketplace/${id}`);
        assert.equal(response.status, 404);
        assert.deepEqual(await response.json(), { error: 'Oferta não encontrada' });
    }
    assert.equal(userQuery.mock.callCount(), 0);
    assert.equal(photoQuery.mock.callCount(), 0);
});

test('missing and non-producer owners do not expose an offer detail or its photos', async () => {
    producer = null;
    assert.equal((await request()).status, 404);
    producer = producerRecord({ userType: UserType.BUYER });
    assert.equal((await request()).status, 404);
    assert.equal(photoQuery.mock.callCount(), 0);
});

test('invalid identifiers are rejected before any DAO is read', async () => {
    for (const id of [' ', 'a'.repeat(37)]) {
        const response = await request(`/offer/marketplace/${encodeURIComponent(id)}`);
        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), { error: 'ID da oferta inválido' });
    }
    assert.equal(activeQuery.mock.callCount(), 0);
});

test('catalog contract remains unchanged and private photo route still requires authentication', async () => {
    const response = await request('/offer/marketplace');
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.length, 3);
    for (const field of ['userId', 'producer', 'photos', 'createdAt', 'status']) assert.ok(!(field in result[0]));
    assert.equal((await request(`/offerPhotos/offer/${offerId}`)).status, 401);
    assert.equal(photoQuery.mock.callCount(), 0);
});

test('internal failures return a generic message without exposing database details', async () => {
    activeQuery.mock.mockImplementation(async () => { throw new Error('Sensitive database details'); });
    mock.method(console, 'error', () => {});
    const response = await request();
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'Não foi possível carregar os detalhes da oferta' });
});
