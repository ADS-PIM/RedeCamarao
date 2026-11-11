const assert = require('node:assert/strict');
const { test, before, beforeEach, after, afterEach, mock } = require('node:test');
const app = require('../src/app.ts').default;
const { connection } = require('../src/util/connection.ts');
const { OfferDAOMySQL } = require('../src/infra/bd/mySql/offer.MySQL.dao.ts');
const { UserDAOMySQL } = require('../src/infra/bd/mySql/user.MySQL.dao.ts');
const { UserType } = require('../src/domain/model/user.ts');
const { Offer, OfferStatus } = require('../src/domain/model/offer.ts');

const producerId = 'bd9fb70b-af5f-4f72-9e18-a841db772d81';
const otherProducerId = '96f175ad-4ec3-4d8c-8848-36d35c02da47';
const listFromDatabase = UserDAOMySQL.prototype.listPublicProducers;
const producerFromDatabase = UserDAOMySQL.prototype.searchPublicProducerById;
let server;
let baseUrl;
let producers;
let producer;
let activeOffers;
let listQuery;
let producerQuery;
let offerQuery;

function publicProducer(overrides = {}) {
    return {
        id: producerId, name: 'Fazenda de teste', description: 'Produção familiar.',
        location: 'Fortim, CE', phone: '85999990000', businessHours: 'Segunda a sexta, 8h às 17h',
        activeOfferCount: 2, ...overrides
    };
}

function offer(id, userId = producerId) {
    return Offer.reconstruct({
        id, userId, title: 'Camarão cinza fresco', description: 'Lote conservado em gelo.',
        type: 'Camarão cinza', size: 'Médio (11–14 cm)', price: 34.9, weight: 80,
        maximumQuantity: 80, minimumQuantity: 20, location: 'Fortim, CE',
        startDate: new Date('2026-11-01T00:00:00.000Z'),
        endDate: new Date('2026-11-30T00:00:00.000Z'),
        createdAt: new Date('2026-11-08T10:00:00.000Z'), status: OfferStatus.ACTIVE
    });
}

before(async () => {
    server = await new Promise(resolve => {
        const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
    producer = publicProducer();
    producers = [producer, publicProducer({
        id: otherProducerId, name: 'Produtor sem ofertas', description: null,
        location: null, businessHours: null, activeOfferCount: 0
    })];
    activeOffers = [offer('offer-1'), offer('offer-2'), offer('other-offer', otherProducerId)];
    listQuery = mock.method(UserDAOMySQL.prototype, 'listPublicProducers', async () => producers);
    producerQuery = mock.method(UserDAOMySQL.prototype, 'searchPublicProducerById', async () => producer);
    offerQuery = mock.method(OfferDAOMySQL.prototype, 'searchActive', async () => activeOffers);
    mock.method(UserDAOMySQL.prototype, 'searchById', async () => { throw new Error('Private user query must not be used'); });
    mock.method(connection, 'query', async () => { throw new Error('Unexpected database access'); });
});

afterEach(() => mock.restoreAll());
after(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await connection.end();
});

function request(path = '/users/producers') { return fetch(`${baseUrl}${path}`); }

function assertNoPrivateFields(result) {
    const serialized = JSON.stringify(result);
    for (const key of ['email', 'password', 'hashPassword', 'CPF_CNPJ', 'cpf_cnpj', 'userType', 'userId', 'status']) {
        assert.ok(!serialized.includes(`"${key}"`), key);
    }
    for (const value of ['private-owner', 'private-password', 'private-document']) {
        assert.ok(!serialized.includes(value), value);
    }
}

test('public directory includes producers with zero offers and preserves optional fields without authentication', async () => {
    const response = await request();
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result, producers);
    assertNoPrivateFields(result);
    assert.equal(listQuery.mock.callCount(), 1);
    assert.equal(producerQuery.mock.callCount(), 0);
    assert.equal(offerQuery.mock.callCount(), 0);
    assert.equal(connection.query.mock.callCount(), 0);
});

test('directory uses an explicit public field allowlist even if a DAO returns additional fields', async () => {
    producers[0] = { ...producer, email: 'private-owner', password: 'private-password', cpf_cnpj: 'private-document' };
    const response = await request();
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result[0], producer);
    assertNoPrivateFields(result);
});

test('empty directory returns an empty array instead of fictional producers', async () => {
    producers = [];
    const response = await request();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
});

test('public producer profile contains only its own active catalog offers and public fields', async () => {
    producer = { ...producer, email: 'private-owner', password: 'private-password', cpf_cnpj: 'private-document' };
    const response = await request(`/users/producers/${producerId}`);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result.producer, publicProducer());
    assert.deepEqual(result.offers.map(item => item.id), ['offer-1', 'offer-2']);
    assert.deepEqual(Object.keys(result.offers[0]).sort(), [
        'id', 'title', 'description', 'type', 'size', 'price', 'weight',
        'maximumQuantity', 'minimumQuantity', 'location', 'startDate', 'endDate'
    ].sort());
    assert.equal(result.offers[0].startDate, '2026-11-01T00:00:00.000Z');
    assert.equal(producerQuery.mock.calls[0].arguments[0], producerId);
    assert.equal(offerQuery.mock.callCount(), 1);
    assertNoPrivateFields(result);
});

test('producer without offers still has a valid public profile and no invented data', async () => {
    producer = publicProducer({ description: null, location: null, businessHours: null, activeOfferCount: 0 });
    activeOffers = [offer('other-offer', otherProducerId)];
    const response = await request(`/users/producers/${producerId}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { producer, offers: [] });
});

test('missing producers and buyer IDs return 404 before reading offers', async () => {
    // The public DAO filters user_type=PRODUCER, so buyers and unknown IDs both return null.
    producer = null;
    for (const id of [producerId, 'buyer-id']) {
        const response = await request(`/users/producers/${id}`);
        assert.equal(response.status, 404);
        assert.deepEqual(await response.json(), { error: 'Produtor não encontrado' });
    }
    assert.equal(offerQuery.mock.callCount(), 0);
});

test('invalid profile identifiers are rejected before querying data', async () => {
    for (const id of [' ', 'a'.repeat(37)]) {
        const response = await request(`/users/producers/${encodeURIComponent(id)}`);
        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), { error: 'ID do produtor inválido' });
    }
    assert.equal(producerQuery.mock.callCount(), 0);
    assert.equal(offerQuery.mock.callCount(), 0);
});

test('directory and profile failures return generic errors', async () => {
    listQuery.mock.mockImplementation(async () => { throw new Error('Sensitive database details'); });
    producerQuery.mock.mockImplementation(async () => { throw new Error('Sensitive database details'); });
    mock.method(console, 'error', () => {});
    const directory = await request();
    assert.equal(directory.status, 500);
    assert.deepEqual(await directory.json(), { error: 'Não foi possível carregar os produtores' });
    const profile = await request(`/users/producers/${producerId}`);
    assert.equal(profile.status, 500);
    assert.deepEqual(await profile.json(), { error: 'Não foi possível carregar o produtor' });
});

test('directory DAO uses one producer-only public query with aggregated currently active offers', async () => {
    const rows = [
        { ...publicProducer(), activeOfferCount: '2', email: 'private-owner' },
        publicProducer({ id: otherProducerId, description: null, location: null, businessHours: null, activeOfferCount: '0' })
    ];
    connection.query.mock.mockImplementation(async (sql, params) => {
        assert.deepEqual(params, [UserType.PRODUCER]);
        assert.match(sql, /LEFT JOIN/i);
        assert.match(sql, /COUNT\(\*\) AS activeOfferCount/i);
        assert.match(sql, /GROUP BY userId/i);
        assert.match(sql, /COALESCE\(activeOffers\.activeOfferCount, 0\)/i);
        assert.match(sql, /status = 'ATIVO'/i);
        assert.match(sql, /start_availability_date <= CURRENT_DATE/i);
        assert.match(sql, /end_availability_date >= CURRENT_DATE/i);
        assert.match(sql, /WHERE u\.user_type = \?/i);
        assert.match(sql, /ORDER BY u\.name ASC, u\.id ASC/i);
        assert.match(sql, /u\.phone/i);
        assert.doesNotMatch(sql, /email|hashPassword|CPF_CNPJ|SELECT\s+\*/i);
        return [rows, []];
    });
    const result = await listFromDatabase.call(new UserDAOMySQL());
    assert.deepEqual(result, [publicProducer(), publicProducer({
        id: otherProducerId, description: null, location: null, businessHours: null, activeOfferCount: 0
    })]);
    assert.equal(connection.query.mock.callCount(), 1);
    assertNoPrivateFields(result);
});

test('public producer DAO binds the identifier and excludes buyer rows without private columns', async () => {
    const id = "id' OR 1=1 --";
    connection.query.mock.mockImplementation(async (sql, params) => {
        assert.deepEqual(params, [UserType.PRODUCER, id]);
        assert.match(sql, /WHERE u\.user_type = \?\s+AND u\.id = \? LIMIT 1/i);
        assert.ok(!sql.includes(id));
        assert.match(sql, /u\.phone/i);
        assert.doesNotMatch(sql, /email|hashPassword|CPF_CNPJ|SELECT\s+\*/i);
        return [[], []];
    });
    assert.equal(await producerFromDatabase.call(new UserDAOMySQL(), id), null);
    connection.query.mock.mockImplementation(async () => [[{ ...publicProducer(), activeOfferCount: '2' }], []]);
    assert.deepEqual(await producerFromDatabase.call(new UserDAOMySQL(), producerId), publicProducer());
});
