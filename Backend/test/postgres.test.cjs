const assert = require('node:assert/strict');
const { test, mock } = require('node:test');
const { randomUUID, randomBytes } = require('node:crypto');
const { databaseOptions } = require('../database/config/connection');

test('PostgreSQL connection supports URL, explicit port, escaped credentials and SSL', () => {
  const config = databaseOptions({ DATABASE_URL: 'postgres://test:p%40ss@db.example:13054/defaultdb?sslmode=require' });
  assert.equal(config.host, 'db.example');
  assert.equal(config.port, 13054);
  assert.equal(config.password, 'p@ss');
  assert.equal(config.database, 'defaultdb');
  assert.equal(config.ssl.rejectUnauthorized, false);
  assert.equal(config.max, 5);
  const verified = databaseOptions({ DB_SSL_MODE: 'verify-full', DB_SSL_CA: 'line1\\nline2' });
  assert.equal(verified.ssl.rejectUnauthorized, true);
  assert.equal(verified.ssl.ca, 'line1\nline2');
  assert.equal(databaseOptions({ DB_SSL_MODE: 'require', DB_SSL_CA: 'test-ca' }).ssl.rejectUnauthorized, true);
  assert.equal(databaseOptions({ DB_HOST: 'localhost', DB_PORT: '5433' }).ssl, false);
  assert.throws(() => databaseOptions({ DB_POOL_MAX: '20' }), /DB_POOL_MAX/);
  assert.throws(() => databaseOptions({ DATABASE_URL: 'mysql://user:pass@localhost/db' }), /DATABASE_URL/);
});

test('PostgreSQL migration and real DAO flows in an isolated temporary schema', {
  skip: process.env.POSTGRES_INTEGRATION !== '1', timeout: 90000,
}, async t => {
  const { Pool } = require('pg');
  const { Sequelize } = require('sequelize');
  const migration = require('../database/migrations/20261115120000-initialize-postgres');
  const { connection } = require('../src/util/connection.ts');
  const { UserDAOPostgres } = require('../src/infra/bd/postgres/user.Postgres.dao.ts');
  const { OfferDAOPostgres } = require('../src/infra/bd/postgres/offer.Postgres.dao.ts');
  const { OfferPhotoDAOPostgres } = require('../src/infra/bd/postgres/offerPhoto.Postgres.dao.ts');
  const { OfferEditorDAOPostgres } = require('../src/infra/bd/postgres/offerEditor.Postgres.dao.ts');
  const { UserRefreshTokenDAOPostgres } = require('../src/infra/bd/postgres/UserRefreshToken.Postgres.dao.ts');
  const { RefreshTokenDAOPostgres } = require('../src/infra/bd/postgres/adminRefreshToken.Postgres.dao.ts');
  const { AdminDAOPostgres } = require('../src/infra/bd/postgres/admin.Postgres.dao.ts');
  const { PasswordResetDAOPostgres } = require('../src/infra/bd/postgres/passwordReset.Postgres.dao.ts');
  const { PostgresTokenBucketStore } = require('../src/rateLimit/postgresTokenBucketStore.ts');
  const { User, UserType } = require('../src/domain/model/user.ts');
  const { Offer, OfferStatus } = require('../src/domain/model/offer.ts');
  const { OfferPhoto } = require('../src/domain/model/offerPhoto.ts');
  const { Admin, AdminRole } = require('../src/domain/model/admin.ts');
  const schema = 'redecamarao_test_' + randomBytes(8).toString('hex');
  const options = databaseOptions();
  const adminPool = new Pool({ ...options, max: 1 });
  const pool = new Pool({ ...options, max: 3, options: `-c search_path=${schema}` });
  const sequelize = new Sequelize(options.database, options.user, options.password, {
    dialect: 'postgres', host: options.host, port: options.port, logging: false,
    dialectOptions: { ssl: options.ssl, options: `-c search_path=${schema}` },
    pool: { max: 1, min: 0 },
  });
  let created = false;
  try {
    await adminPool.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    await migration.up(sequelize.getQueryInterface());
    const tables = await pool.query('SELECT tablename FROM pg_tables WHERE schemaname = $1', [schema]);
    assert.equal(tables.rowCount, 8);
    mock.method(connection, 'query', (...args) => pool.query(...args));
    mock.method(connection, 'connect', () => pool.connect());
    const users = new UserDAOPostgres();
    const offers = new OfferDAOPostgres();
    const photos = new OfferPhotoDAOPostgres();
    const tokens = new UserRefreshTokenDAOPostgres();
    const user = User.construct({ name: 'Produtor teste', email: 'producer@example.test', password: 'hash', userType: UserType.PRODUCER, cpf_cnpj: '12345678901', location: 'Fortim', phone: '85999999999' });
    const other = User.construct({ name: 'Outro produtor', email: 'other@example.test', password: 'hash', userType: UserType.PRODUCER, cpf_cnpj: '12345678902', location: 'Fortim', phone: '85999999998' });
    await users.register(user);
    await users.register(other);
    const offer = Offer.construct({ userId: user.id, title: 'Oferta teste', description: 'Teste PostgreSQL', type: 'Cinza', size: 'M', price: 35.50, weight: 1, maximumQuantity: 10, minimumQuantity: 1, location: 'Fortim', startDate: new Date('2026-01-01'), endDate: new Date('2030-12-31') });

    await t.test('user fields, case insensitive email and unique conflicts', async () => {
      assert.equal((await users.searchByEmail('PRODUCER@example.test')).id, user.id);
      await users.update(user.id, { name: 'Atualizado', businessHours: '08:00-18:00', description: 'Teste', email: 'producer@example.test' });
      assert.equal((await users.searchById(user.id)).businessHours, '08:00-18:00');
      const duplicate = User.construct({ name: 'Duplicado', email: user.email, password: 'hash', userType: UserType.BUYER, cpf_cnpj: '12345678903', location: 'Fortim', phone: '85999999997' });
      await assert.rejects(users.register(duplicate), { code: '23505' });
    });

    await t.test('offer updates preserve ownership, numbers, calendar dates and updatedAt', async () => {
      await offers.create(offer);
      const before = (await offers.searchById(offer.id)).updatedAt;
      assert.equal(await offers.update(offer.id, other.id, { title: 'Invadida' }), false);
      assert.equal(await offers.update(offer.id, user.id, { status: OfferStatus.ACTIVE, price: 40.25, startDate: '2026-01-02', endDate: '2030-12-30' }), true);
      const found = await offers.searchById(offer.id);
      assert.equal(found.price, 40.25);
      assert.equal(found.startDate.getFullYear(), 2026);
      assert.equal(found.startDate.getDate(), 2);
      assert(found.updatedAt > before);
      assert.equal(await offers.update(offer.id, user.id, { minimumQuantity: 50 }), false);
      assert.equal((await offers.searchActive()).length, 1);
      assert.equal((await offers.search()).length, 1);
    });

    await t.test('photo INSERT, UPDATE FROM, DELETE USING and public producer aggregation', async () => {
      const photo = OfferPhoto.construct({ offerId: offer.id, imageUrl: 'https://example.test/photo.jpg', description: 'Inicial' });
      assert.equal(await photos.create(photo, other.id), false);
      assert.equal(await photos.create(photo, user.id), true);
      assert.equal(await photos.update(photo.id, offer.id, other.id, { description: 'Invadida' }), false);
      assert.equal(await photos.update(photo.id, offer.id, user.id, { imageUrl: 'https://example.test/new.jpg', description: 'Nova' }), true);
      assert.equal((await photos.searchById(photo.id)).description, 'Nova');
      assert.equal((await photos.searchByOfferId(offer.id)).length, 1);
      assert.equal((await offers.listByUserId(user.id))[0].coverPhoto, 'https://example.test/new.jpg');
      assert.equal((await users.searchPublicProducerById(user.id)).activeOfferCount, 1);
      assert.equal((await users.listPublicProducers()).length, 2);
      assert.equal(await photos.delete(photo.id, offer.id, other.id), false);
      assert.equal(await photos.delete(photo.id, offer.id, user.id), true);
    });

    await t.test('refresh token rotation allows only one concurrent consumer', async () => {
      await tokens.create(randomUUID(), 'refresh-test-token', user.id, new Date(Date.now() + 60000));
      assert.equal((await tokens.findByToken('refresh-test-token')).userId, user.id);
      const results = await Promise.all([tokens.consume('refresh-test-token'), tokens.consume('refresh-test-token')]);
      assert.equal(results.filter(Boolean).length, 1);
      assert.equal(await tokens.findByToken('refresh-test-token'), null);
      await tokens.create(randomUUID(), 'delete-token', user.id, new Date(Date.now() + 60000));
      await tokens.deleteByToken('delete-token');
      assert.equal(await tokens.findByToken('delete-token'), null);
    });

    await t.test('admin and password recovery use PostgreSQL upsert and revoke sessions', async () => {
      const admins = new AdminDAOPostgres();
      const admin = Admin.construct({ name: 'Admin teste', email: 'admin@example.test', password: 'old-hash', role: AdminRole.ADMIN });
      await admins.register(admin);
      await admins.update(admin.id, { name: 'Admin atualizado', active: true, profile_picture: 'https://example.test/profile.jpg' });
      assert.equal((await admins.searchByEmail('ADMIN@example.test')).name, 'Admin atualizado');
      const refresh = new RefreshTokenDAOPostgres();
      await refresh.create(randomUUID(), 'admin-refresh', admin.id, new Date(Date.now() + 60000));
      assert(await refresh.findByToken('admin-refresh'));
      const resets = new PasswordResetDAOPostgres(pool);
      await resets.issue(admin.email, 'a'.repeat(64));
      await resets.issue(admin.email, 'b'.repeat(64));
      assert.equal(await resets.consume('a'.repeat(64), 'new-hash'), false);
      assert.equal(await resets.consume('b'.repeat(64), 'new-hash'), true);
      assert.equal((await admins.searchById(admin.id)).password, 'new-hash');
      assert.equal(await refresh.findByToken('admin-refresh'), null);
      assert.equal(await resets.consume('b'.repeat(64), 'another-hash'), false);
    });

    await t.test('persistent rate limiting handles concurrent requests', async () => {
      const limiter = new PostgresTokenBucketStore(pool);
      const key = 'c'.repeat(64);
      const policy = { capacity: 2, refillIntervalMs: 900000 };
      const results = await Promise.all(Array.from({ length: 5 }, () => limiter.consume(key, policy)));
      assert.equal(results.filter(result => result.allowed).length, 2);
    });

    await t.test('editor transaction creates a draft and enforces ownership', async () => {
      const editor = new OfferEditorDAOPostgres();
      const id = randomUUID();
      const data = { title: 'Rascunho', description: 'Teste', type: 'Cinza', size: 'M', price: 30, weight: 1, minimumQuantity: 1, maximumQuantity: 5, location: 'Fortim', startDate: '2026-01-01', endDate: '2030-01-01', status: 'DRAFT' };
      await editor.save(id, user.id, data, [], true);
      assert.equal((await offers.searchById(id)).status, OfferStatus.DRAFT);
      await assert.rejects(editor.save(id, other.id, data, []), { code: 'FORBIDDEN' });
      await editor.save(id, user.id, { ...data, title: 'Editada' }, []);
      assert.equal((await offers.searchById(id)).title, 'Editada');
    });

    await t.test('user deletion cascades through offers, photos and refresh tokens', async () => {
      const photo = OfferPhoto.construct({ offerId: offer.id, imageUrl: 'https://example.test/cascade.jpg', description: '' });
      await photos.create(photo, user.id);
      await tokens.create(randomUUID(), 'cascade-token', user.id, new Date(Date.now() + 60000));
      await users.delete(user.id);
      assert.equal(await offers.searchById(offer.id), null);
      assert.equal(await photos.searchById(photo.id), null);
      assert.equal(await tokens.findByToken('cascade-token'), null);
      assert(await users.searchById(other.id));
    });

    await t.test('HTTP registration, login, profile, editor, marketplace and refresh use PostgreSQL', async () => {
      const previousAccess = process.env.JWT_ACCESS_SECRET;
      const previousRefresh = process.env.JWT_REFRESH_SECRET;
      process.env.JWT_ACCESS_SECRET = 'postgres-integration-access-secret';
      process.env.JWT_REFRESH_SECRET = 'postgres-integration-refresh-secret';
      const app = require('../src/app.ts').default;
      const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
      const origin = 'http://127.0.0.1:' + server.address().port;
      const send = (route, method, body, token, cookie) => fetch(origin + route, {
        method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(cookie ? { Cookie: cookie } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      try {
        const registration = { name: 'Produtor HTTP', email: 'http@example.test', password: 'Strong-Test-Password-42', userType: 'PRODUCER', cpf_cnpj: '12345678909', location: 'Fortim', phone: '85999999999' };
        assert.equal((await send('/users/register', 'POST', registration)).status, 201);
        assert.equal((await send('/users/register', 'POST', registration)).status, 409);
        const login = await send('/users/login', 'POST', { email: registration.email, password: registration.password });
        assert.equal(login.status, 200);
        const cookie = login.headers.get('set-cookie').split(';')[0];
        const { accessToken, userId } = await login.json();
        assert.equal((await send('/users/me', 'PATCH', { businessHours: '09:00-17:00' }, accessToken)).status, 200);
        const profile = await (await send('/users/me', 'GET', null, accessToken)).json();
        assert.equal(profile.businessHours, '09:00-17:00');
        const draft = { offer: { title: 'Oferta HTTP', description: 'Teste HTTP PostgreSQL', type: 'Cinza', size: 'M', price: 35, weight: 20, minimumQuantity: 1, maximumQuantity: 10, location: 'Fortim', startDate: '2026-01-01', endDate: '2030-01-01', status: 'ACTIVE' }, photos: [] };
        const saved = await send('/offer/editor', 'POST', draft, accessToken);
        assert.equal(saved.status, 201);
        const marketplace = await send('/offer/marketplace', 'GET');
        assert.equal(marketplace.status, 200);
        assert(JSON.stringify(await marketplace.json()).includes('Oferta HTTP'));
        const producers = await send('/users/producers/' + userId, 'GET');
        assert.equal(producers.status, 200);
        assert.equal((await send('/users/refresh', 'POST', {}, null, cookie)).status, 200);
        assert.equal((await send('/users/refresh', 'POST', {}, null, cookie)).status, 401);
        assert.equal((await send('/users/me', 'DELETE', null, accessToken)).status, 204);
      } finally {
        await new Promise(resolve => server.close(resolve));
        if (previousAccess === undefined) delete process.env.JWT_ACCESS_SECRET; else process.env.JWT_ACCESS_SECRET = previousAccess;
        if (previousRefresh === undefined) delete process.env.JWT_REFRESH_SECRET; else process.env.JWT_REFRESH_SECRET = previousRefresh;
      }
    });

    await migration.down(sequelize.getQueryInterface());
    const remaining = await pool.query('SELECT tablename FROM pg_tables WHERE schemaname = $1', [schema]);
    assert.equal(remaining.rowCount, 0);
    await migration.up(sequelize.getQueryInterface());
  } finally {
    mock.restoreAll();
    await pool.end();
    await sequelize.close();
    await connection.end();
    if (created) {
      assert.match(schema, /^redecamarao_test_[a-f0-9]{16}$/);
      await adminPool.query(`DROP SCHEMA "${schema}" CASCADE`);
    }
    await adminPool.end();
  }
});
