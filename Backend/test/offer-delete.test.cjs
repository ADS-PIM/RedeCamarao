const assert = require('node:assert/strict');
const { test, before, after, afterEach, mock } = require('node:test');
const jwt = require('jsonwebtoken');
const { connection } = require('../src/util/connection.ts');
const app = require('../src/app.ts').default;
const { ApplicationError } = require('../src/application/errors/ApplicationError.ts');
const { applicationErrorResponse } = require('../src/infra/web/express/applicationErrorResponse.ts');

const userId = 'bd9fb70b-af5f-4f72-9e18-a841db772d81';
const offerId = 'c58d2304-f74f-42db-8e57-4ca50b1c642e';
const otherUserId = '96f175ad-4ec3-4d8c-8848-36d35c02da47';
const storedOffer = {
    id: offerId, userId, title: 'Oferta', description: '', type: 'Cinza', size: 'Grande',
    price: '35.50', weight: '1.00', maximumQuantity: '10.00', minimumQuantity: '1.00',
    location: 'Aracati', startDate: new Date(2026, 10, 6), endDate: new Date(2026, 11, 6),
    status: 'ACTIVE', createdAt: new Date()
};
const originalSecret = process.env.JWT_ACCESS_SECRET;
let server;
let baseUrl;
let token;

before(async () => {
    process.env.JWT_ACCESS_SECRET = 'offer-delete-test-secret';
    token = jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET);
    server = await new Promise(resolve => {
        const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(() => mock.restoreAll());
after(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await connection.end();
    if (originalSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = originalSecret;
});

function request(method = 'DELETE', { id = offerId, accessToken = token, body, query = '' } = {}) {
    return fetch(`${baseUrl}/offer/${encodeURIComponent(id)}${query}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
}

function mockQueries({ offer = storedOffer, affectedRows = 1, failWrite = false } = {}) {
    return mock.method(connection, 'query', async (sql, values) => {
        if (sql.startsWith('SELECT')) {
            assert.match(sql, /FROM offers WHERE id = \?/);
            return [offer ? [{ ...offer }] : [], []];
        }
        if (failWrite) throw new Error('Sensitive database details');
        assert.equal(sql, 'DELETE FROM offers WHERE id = ? AND userId = ?');
        assert.deepEqual(values, [offerId, userId]);
        return [{ affectedRows }, []];
    });
}

test('owner deletes an offer through parameterized SQL scoped to the authenticated user', async () => {
    const query = mockQueries();
    const response = await request();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { message: 'Oferta excluída com sucesso' });
    assert.equal(query.mock.callCount(), 2);
});

for (const method of ['PATCH', 'DELETE']) {
    test(`${method} refuses another user's offer even with owner IDs supplied in the query`, async () => {
        const query = mockQueries({ offer: { ...storedOffer, userId: otherUserId } });
        const response = await request(method, { body: method === 'PATCH' ? { title: 'Nova' } : { userId: otherUserId },
            query: `?userId=${otherUserId}` });
        assert.equal(response.status, 403);
        assert.deepEqual(await response.json(), { error: 'Acesso negado' });
        assert.equal(query.mock.callCount(), 1);
    });

    test(`${method} refuses absent, invalid, expired and refresh tokens before reading the database`, async () => {
        const query = mockQueries();
        const expired = jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: -1 });
        const refresh = jwt.sign({ userId, jti: 'refresh' }, process.env.JWT_ACCESS_SECRET);
        for (const accessToken of [null, 'invalid', expired, refresh]) {
            assert.equal((await request(method, { accessToken, body: method === 'PATCH' ? { title: 'Nova' } : undefined })).status, 401);
        }
        assert.equal(query.mock.callCount(), 0);
    });
}

test('update rejects changing the owner through the body', async () => {
    const query = mockQueries();
    assert.equal((await request('PATCH', { body: { userId: otherUserId, title: 'Nova' } })).status, 400);
    assert.equal(query.mock.callCount(), 0);
});

test('owner update is also guarded by userId in the SQL write', async () => {
    const query = mock.method(connection, 'query', async (sql, values) => {
        if (sql.startsWith('SELECT')) return [[storedOffer], []];
        assert.match(sql, /^UPDATE offers SET title = \? WHERE id = \? AND userId = \?/);
        assert.deepEqual(values.slice(0, 3), ['Nova', offerId, userId]);
        return [{ affectedRows: 1 }, []];
    });
    assert.equal((await request('PATCH', { body: { title: 'Nova' } })).status, 200);
    assert.equal(query.mock.callCount(), 2);
});

test('delete rejects blank and oversized IDs before reading the database', async () => {
    const query = mockQueries();
    for (const id of [' ', 'a'.repeat(37)]) assert.equal((await request('DELETE', { id })).status, 400);
    assert.equal(query.mock.callCount(), 0);
});

test('delete returns 404 without writing when the offer does not exist', async () => {
    const query = mockQueries({ offer: null });
    const response = await request();
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Oferta não encontrada' });
    assert.equal(query.mock.callCount(), 1);
});

test('delete returns 409 when the offer is removed or changes owner between read and write', async () => {
    mockQueries({ affectedRows: 0 });
    const response = await request();
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: 'Oferta alterada durante a exclusão; recarregue e tente novamente' });
});

test('delete binds SQL syntax in IDs as data', async () => {
    const query = mockQueries({ offer: null });
    const id = "x' OR '1'='1";
    assert.equal((await request('DELETE', { id })).status, 404);
    assert.ok(!query.mock.calls[0].arguments[0].includes(id));
    assert.deepEqual(query.mock.calls[0].arguments[1], [id]);
});

test('delete hides unexpected database errors', async () => {
    mock.method(console, 'error', () => {});
    mockQueries({ failWrite: true });
    const response = await request();
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'Erro ao excluir oferta' });
});

test('delete conflict status does not depend on its translated message', () => {
    const response = { status(value) { this.statusCode = value; return this; }, json(body) { this.body = body; return this; } };
    applicationErrorResponse(new ApplicationError('OFFER_DELETE_CONFLICT', 'Texto alterado'), response);
    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.body, { error: 'Texto alterado' });
});

test('DELETE /users/me derives the account ID exclusively from the token', async () => {
    const query = mock.method(connection, 'query', async (sql, values) => {
        assert.deepEqual(values, [userId]);
        if (sql.startsWith('SELECT')) {
            assert.match(sql, /FROM users WHERE id = \?/);
            return [[{ id: userId }], []];
        }
        assert.equal(sql, 'DELETE FROM users WHERE id = ?');
        return [{ affectedRows: 1 }, []];
    });
    const response = await fetch(`${baseUrl}/users/me?userId=${otherUserId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: otherUserId, userId: otherUserId })
    });
    assert.equal(response.status, 204);
    assert.match(response.headers.get('set-cookie'), /userRefreshToken=;/);
    assert.equal(query.mock.callCount(), 2);
});
