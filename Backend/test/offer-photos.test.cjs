const assert = require('node:assert/strict');
const { test, before, beforeEach, after, afterEach, mock } = require('node:test');
const jwt = require('jsonwebtoken');
const { connection } = require('../src/util/connection.ts');
const app = require('../src/app.ts').default;
const { ApplicationError } = require('../src/application/errors/ApplicationError.ts');
const { applicationErrorResponse } = require('../src/infra/web/express/applicationErrorResponse.ts');

const userId = 'bd9fb70b-af5f-4f72-9e18-a841db772d81';
const otherUserId = '96f175ad-4ec3-4d8c-8848-36d35c02da47';
const offerId = 'c58d2304-f74f-42db-8e57-4ca50b1c642e';
const otherOfferId = 'cdd0623b-b72e-4183-a905-cc084cf8c487';
const photoId = 'c8b3dd27-4587-432b-8397-7a39f8e5aa15';
const otherPhotoId = '908c1df9-6de3-4580-9b93-fc05c7d202de';
const imageUrl = 'https://example.com/camarao.jpg';
const originalSecret = process.env.JWT_ACCESS_SECRET;
let server;
let baseUrl;
let token;
let db;

before(async () => {
    process.env.JWT_ACCESS_SECRET = 'offer-photos-test-secret';
    token = jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET);
    server = await new Promise(resolve => {
        const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    baseUrl = `http://127.0.0.1:${server.address().port}/offerPhotos`;
});

beforeEach(() => {
    db = {
        offers: new Map([[offerId, { id: offerId, userId }], [otherOfferId, { id: otherOfferId, userId: otherUserId }]]),
        photos: new Map([
            [photoId, { id: photoId, offerId, imageUrl, description: 'Original' }],
            [otherPhotoId, { id: otherPhotoId, offerId: otherOfferId, imageUrl, description: 'Outra oferta' }]
        ])
    };
    // All database access is intercepted; the test runs the real HTTP/DTO/use-case/DAO flow.
    db.query = mock.method(connection, 'query', async (sql, values) => {
        if (db.readFailure && sql.startsWith('SELECT')) throw new Error('Sensitive SQL details');
        if (sql.startsWith('SELECT') && sql.includes('FROM offers WHERE id = ?')) {
            const offer = db.offers.get(values[0]);
            return [offer ? [{ ...offer }] : [], []];
        }
        if (sql.startsWith('SELECT') && sql.includes('FROM offerPhotos WHERE id = ?')) {
            const photo = db.photos.get(values[0]);
            return [photo ? [{ ...photo, internal: 'not exposed' }] : [], []];
        }
        if (sql.startsWith('SELECT') && sql.includes('FROM offerPhotos WHERE offerId = ?')) {
            assert.match(sql, /ORDER BY id ASC$/);
            return [[...db.photos.values()].filter(photo => photo.offerId === values[0])
                .sort((a, b) => a.id.localeCompare(b.id)).map(photo => ({ ...photo, internal: 'not exposed' })), []];
        }
        if (db.writeFailure) throw new Error('Sensitive SQL details');
        db.beforeWrite?.();
        if (sql.startsWith('INSERT INTO offerPhotos')) {
            assert.match(sql, /\(id, offerId, imageUrl, description\)/);
            assert.match(sql, /SELECT \?, offers.id, \?, \? FROM offers WHERE offers.id = \? AND offers.userId = \?/);
            const [id, url, description, parentId, ownerId] = values;
            if (db.offers.get(parentId)?.userId !== ownerId) return [{ affectedRows: 0 }, []];
            db.photos.set(id, { id, offerId: parentId, imageUrl: url, description });
            return [{ affectedRows: 1 }, []];
        }
        assert.match(sql, /^(UPDATE offerPhotos AS photo|DELETE photo FROM offerPhotos AS photo)/);
        assert.match(sql, /INNER JOIN offers ON offers.id = photo.offerId/);
        assert.match(sql, /WHERE photo.id = \? AND photo.offerId = \? AND offers.userId = \?/);
        const [id, parentId, ownerId] = values.slice(-3);
        const photo = db.photos.get(id);
        if (!photo || photo.offerId !== parentId || db.offers.get(parentId)?.userId !== ownerId) {
            return [{ affectedRows: 0 }, []];
        }
        if (sql.startsWith('DELETE')) db.photos.delete(id);
        else {
            const fields = [...sql.matchAll(/photo\.(imageUrl|description) = \?/g)].map(match => match[1]);
            assert.equal(fields.length, values.length - 3);
            fields.forEach((field, index) => { photo[field] = values[index]; });
        }
        return [{ affectedRows: 1, changedRows: 0 }, []];
    });
});

afterEach(() => mock.restoreAll());
after(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await connection.end();
    if (originalSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = originalSecret;
});

function request(method, path, body, accessToken = token) {
    return fetch(`${baseUrl}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
}

const operations = [
    ['create', () => request('POST', '/create', { offerId, imageUrl })],
    ['update', () => request('PATCH', `/${photoId}`, { description: 'Nova' })],
    ['searchByOfferId', () => request('GET', `/offer/${offerId}`)],
    ['delete', () => request('DELETE', `/${photoId}`)]
];

test('photo error statuses depend on stable codes rather than translated messages', () => {
    for (const [code, status] of [['OFFER_PHOTO_NOT_FOUND', 404], ['OFFER_PHOTO_WRITE_CONFLICT', 409]]) {
        for (const message of ['Mensagem alterada', 'Another translation']) {
            const response = { status(value) { this.statusCode = value; return this; }, json(body) { this.body = body; return this; } };
            assert.equal(applicationErrorResponse(new ApplicationError(code, message), response), response);
            assert.equal(response.statusCode, status);
            assert.deepEqual(response.body, { error: message });
        }
    }
});

test('complete CRUD creates distinct IDs, persists edits, searches by offer and deletes only the chosen photo', async () => {
    db.photos.clear();
    const created = [];
    for (const description of [undefined, "Camarão d'água doce"]) {
        const response = await request('POST', '/create', { offerId, imageUrl, description });
        assert.equal(response.status, 201);
        const result = await response.json();
        assert.equal(result.message, 'Foto da oferta cadastrada com sucesso');
        assert.match(result.photo.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        assert.deepEqual(result.photo, { id: result.photo.id, offerId, imageUrl, description: description ?? '' });
        created.push(result.photo);
    }
    assert.notEqual(created[0].id, created[1].id);
    const newUrl = 'https://example.com/novo.jpg';
    assert.equal((await request('PATCH', `/${created[0].id}`, { imageUrl: newUrl })).status, 200);
    assert.equal(db.photos.get(created[0].id).description, '');
    assert.equal((await request('PATCH', `/${created[1].id}`, { description: '' })).status, 200);
    const listed = await request('GET', `/offer/${offerId}`);
    assert.equal(listed.status, 200);
    assert.deepEqual(await listed.json(), [...db.photos.values()].sort((a, b) => a.id.localeCompare(b.id)));

    const removed = await request('DELETE', `/${created[0].id}`);
    assert.equal(removed.status, 200);
    assert.deepEqual(await removed.json(), { message: 'Foto da oferta excluída com sucesso' });
    assert.deepEqual(await (await request('GET', `/offer/${offerId}`)).json(), [db.photos.get(created[1].id)]);
    assert.equal(db.offers.size, 2);
    assert.equal((await request('DELETE', `/${created[0].id}`)).status, 404);
});

test('search returns only the requested offer photos and public DTO fields to another authenticated user', async () => {
    const otherToken = jwt.sign({ userId: otherUserId }, process.env.JWT_ACCESS_SECRET);
    const response = await request('GET', `/offer/${offerId}`, undefined, otherToken);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [db.photos.get(photoId)]);
    assert.deepEqual(db.query.mock.calls[1].arguments[1], [offerId]);
});

test('search returns an empty array for an existing offer without photos', async () => {
    db.photos.delete(photoId);
    const response = await request('GET', `/offer/${offerId}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
});

test('create accepts schema length boundaries and persists URL and description as parameters', async () => {
    const prefix = 'https://example.com/';
    const url = prefix + 'a'.repeat(2048 - prefix.length);
    const description = "'".repeat(500);
    const response = await request('POST', '/create', { offerId, imageUrl: url, description });
    assert.equal(response.status, 201);
    const [sql, values] = db.query.mock.calls[1].arguments;
    assert.ok(!sql.includes(url));
    assert.ok(!sql.includes(description));
    assert.deepEqual(values.slice(1), [url, description, offerId, userId]);
});

test('update changes only supplied fields and accepts a repeated value and an empty description', async () => {
    for (const data of [{ imageUrl }, { description: '' }]) {
        const response = await request('PATCH', `/${photoId}`, data);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { message: 'Foto da oferta atualizada com sucesso' });
        const [sql, values] = db.query.mock.calls.at(-1).arguments;
        assert.match(sql, new RegExp(`SET photo.${Object.keys(data)[0]} = \\?\\s+WHERE`));
        assert.deepEqual(values, [...Object.values(data), photoId, offerId, userId]);
    }
    assert.deepEqual(db.photos.get(photoId), { id: photoId, offerId, imageUrl, description: '' });
});

test('update accepts both mutable fields with parameterized SQL', async () => {
    const data = { imageUrl: 'http://localhost:3000/uploads/photo.jpg', description: "Foto d'água" };
    assert.equal((await request('PATCH', `/${photoId}`, data)).status, 200);
    const [sql, values] = db.query.mock.calls.at(-1).arguments;
    assert.match(sql, /SET photo.imageUrl = \?, photo.description = \?/);
    assert.ok(!sql.includes(data.description));
    assert.deepEqual(values, [data.imageUrl, data.description, photoId, offerId, userId]);
});

test('create rejects missing, null, malformed and oversized fields before querying', async () => {
    const valid = { offerId, imageUrl };
    const invalid = [{}, [], { imageUrl }, { offerId },
        ...[null, '', ' ', 'a'.repeat(37), 123].map(value => ({ ...valid, offerId: value })),
        ...[null, '', ' ', 123, 'not-a-url', 'example.com/photo.jpg', 'javascript:alert(1)',
            'data:image/png;base64,AAA', 'ftp://example.com/photo.jpg', 'https://example.com/' + 'a'.repeat(2030)]
            .map(value => ({ ...valid, imageUrl: value })),
        ...[null, 123, {}, 'a'.repeat(501)].map(value => ({ ...valid, description: value }))];
    for (const body of invalid) {
        assert.equal((await request('POST', '/create', body)).status, 400, JSON.stringify(body));
    }
    assert.equal(db.query.mock.callCount(), 0);
});

test('update rejects empty bodies, nulls, malformed URLs and storage overflow before querying', async () => {
    for (const body of [{}, [], { imageUrl: null }, { imageUrl: '' }, { imageUrl: 123 },
        { imageUrl: 'javascript:alert(1)' }, { imageUrl: 'https://example.com/' + 'a'.repeat(2030) },
        { description: null }, { description: 123 }, { description: 'a'.repeat(501) }]) {
        assert.equal((await request('PATCH', `/${photoId}`, body)).status, 400, JSON.stringify(body));
    }
    assert.equal(db.query.mock.callCount(), 0);
});

test('create and update reject protected and unknown fields, including changing the parent offer', async () => {
    for (const field of ['id', 'userId', 'createdAt', 'updatedAt', 'unknown']) {
        assert.equal((await request('POST', '/create', { offerId, imageUrl, [field]: 'override' })).status, 400);
        assert.equal((await request('PATCH', `/${photoId}`, { description: 'Nova', [field]: 'override' })).status, 400);
    }
    assert.equal((await request('PATCH', `/${photoId}`, { offerId: otherOfferId })).status, 400);
    assert.equal(db.query.mock.callCount(), 0);
});

test('all routes reject absent, invalid, expired and refresh tokens before database access', async () => {
    const expired = jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: -1 });
    const refresh = jwt.sign({ userId, jti: 'refresh-id' }, process.env.JWT_ACCESS_SECRET);
    for (const accessToken of [null, 'invalid', expired, refresh]) {
        for (const [method, path, body] of [
            ['POST', '/create', { offerId, imageUrl }], ['PATCH', `/${photoId}`, { description: 'Nova' }],
            ['GET', `/offer/${offerId}`], ['DELETE', `/${photoId}`]
        ]) assert.equal((await request(method, path, body, accessToken)).status, 401);
    }
    assert.equal(db.query.mock.callCount(), 0);
});

test('invalid path IDs are rejected before querying', async () => {
    for (const id of [' ', 'a'.repeat(37)]) {
        const encoded = encodeURIComponent(id);
        assert.equal((await request('GET', `/offer/${encoded}`)).status, 400);
        assert.equal((await request('PATCH', `/${encoded}`, { description: 'Nova' })).status, 400);
        assert.equal((await request('DELETE', `/${encoded}`)).status, 400);
    }
    assert.equal(db.query.mock.callCount(), 0);
});

test('IDs containing SQL syntax are bound as data and never interpolated', async () => {
    const id = "x' OR '1'='1";
    assert.equal((await request('GET', `/offer/${encodeURIComponent(id)}`)).status, 404);
    assert.equal((await request('PATCH', `/${encodeURIComponent(id)}`, { description: 'Nova' })).status, 404);
    assert.equal((await request('DELETE', `/${encodeURIComponent(id)}`)).status, 404);
    for (const call of db.query.mock.calls) {
        assert.ok(!call.arguments[0].includes(id));
        assert.deepEqual(call.arguments[1], [id]);
    }
});

for (const [name, perform] of operations) {
    test(`${name} returns 404 if its offer no longer exists`, async () => {
        db.offers.delete(offerId);
        const response = await perform();
        assert.equal(response.status, 404);
        assert.deepEqual(await response.json(), { error: 'Oferta não encontrada' });
        assert.ok(db.query.mock.calls.every(call => call.arguments[0].startsWith('SELECT')));
    });

    test(`${name} hides unexpected read failures`, async () => {
        db.readFailure = true;
        mock.method(console, 'error', () => {});
        const response = await perform();
        assert.equal(response.status, 500);
        assert.ok(!(await response.text()).includes('Sensitive'));
    });

    if (name === 'searchByOfferId') continue;

    test(`${name} rejects writing photos of another user's offer`, async () => {
        db.offers.get(offerId).userId = otherUserId;
        const response = await perform();
        assert.equal(response.status, 403);
        assert.deepEqual(await response.json(), { error: 'Acesso negado' });
        assert.ok(db.query.mock.calls.every(call => call.arguments[0].startsWith('SELECT')));
    });

    test(`${name} returns 409 if ownership changes between the read and write`, async () => {
        db.beforeWrite = () => { db.offers.get(offerId).userId = otherUserId; };
        const response = await perform();
        assert.equal(response.status, 409);
        assert.equal(db.photos.size, 2);
        assert.equal(db.photos.get(photoId).description, 'Original');
    });

    test(`${name} hides unexpected write failures`, async () => {
        db.writeFailure = true;
        mock.method(console, 'error', () => {});
        const response = await perform();
        assert.equal(response.status, 500);
        assert.ok(!(await response.text()).includes('Sensitive'));
    });
}

for (const method of ['PATCH', 'DELETE']) {
    test(`${method} returns 404 for a missing photo before querying its offer`, async () => {
        db.photos.delete(photoId);
        const response = await request(method, `/${photoId}`, method === 'PATCH' ? { description: 'Nova' } : undefined);
        assert.equal(response.status, 404);
        assert.deepEqual(await response.json(), { error: 'Foto da oferta não encontrada' });
        assert.equal(db.query.mock.callCount(), 1);
    });

    test(`${method} returns 409 if the photo is deleted concurrently`, async () => {
        db.beforeWrite = () => db.photos.delete(photoId);
        const response = await request(method, `/${photoId}`, method === 'PATCH' ? { description: 'Nova' } : undefined);
        assert.equal(response.status, 409);
        assert.ok(db.photos.has(otherPhotoId));
    });
}
