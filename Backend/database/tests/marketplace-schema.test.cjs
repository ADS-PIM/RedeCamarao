'use strict';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const Sequelize = require('sequelize');
const ts = require('typescript');

const migrationPath = path.join(__dirname, '../migrations');
const migration = require('../migrations/20261101120000-align-marketplace-schema');
const removeConversations = require('../migrations/20261101130000-remove-conversations-and-messages');
const previous = fs.readdirSync(migrationPath).filter((name) => name < '20261101').sort().map((name) => require(path.join(migrationPath, name)));
const enabled = process.env.MIGRATION_TEST_MYSQL === '1';
const config = {
  dialect: 'mysql', logging: false,
  host: process.env.MIGRATION_TEST_HOST || '127.0.0.1',
  port: Number(process.env.MIGRATION_TEST_PORT || 3306),
  username: process.env.MIGRATION_TEST_USER || 'root',
  password: process.env.MIGRATION_TEST_PASSWORD || ''
};

async function withDatabase(run) {
  const name = `redecamarao_schema_test_${randomUUID().replaceAll('-', '')}`;
  const server = new Sequelize({ ...config, database: undefined });
  const db = new Sequelize({ ...config, database: name });
  let created = false;
  try {
    await server.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
    created = true;
    await run(db, db.getQueryInterface());
  } finally {
    await db.close();
    if (created) {
      assert.match(name, /^redecamarao_schema_test_[a-f0-9]{32}$/);
      await server.query(`DROP DATABASE \`${name}\``);
    }
    await server.close();
  }
}

async function initialize(qi) {
  for (const item of previous) await item.up(qi, Sequelize);
}

async function rows(db, statement, replacements) {
  return (await db.query(statement, { replacements }))[0];
}

// Execute the real DAO queries against the temporary database, injecting only
// the connection. No application .env or application database is accessed.
function loadDao(relativePath, db) {
  const filename = path.resolve(__dirname, '../../src', relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  });
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = (request) => {
    if (request.endsWith('/util/connection')) {
      return { connection: { query: (sql, values) => db.query(sql, { replacements: values }) } };
    }
    if (request.startsWith('.')) {
      const dependency = path.resolve(path.dirname(filename), `${request}.ts`);
      if (fs.existsSync(dependency)) return loadDao(path.relative(path.resolve(__dirname, '../../src'), dependency), db);
    }
    return originalRequire(request);
  };
  loaded._compile(compiled.outputText, filename);
  return loaded.exports;
}

test('populated database: upgrade, DAO compatibility, token isolation and rollback', { skip: !enabled }, async () => {
  await withDatabase(async (db, qi) => {
    await initialize(qi);
    // Existing tables retain general_ci; new tables would inherit unicode_ci.
    await db.query(`ALTER DATABASE \`${db.getDatabaseName()}\` COLLATE utf8mb4_unicode_ci`);
    await db.query(`INSERT INTO users (id, name, email, hashPassword, user_type, createdAt, updatedAt) VALUES
      ('producer', 'Produtor', 'producer@example.test', 'hash', 'PRODUTOR', '2026-10-01 10:20:30', '2026-10-02 10:20:30'),
      ('reseller', 'Revendedor', 'reseller@example.test', 'hash', 'REVENDEDOR', '2026-10-01 10:20:30', '2026-10-02 10:20:30')`);
    await db.query(`INSERT INTO profiles (id, userId, name, location, phone, whatsapp)
      VALUES ('profile', 'producer', 'Nome comercial antigo', 'Fortaleza', '8533334444', '85999998888')`);
    await db.query(`INSERT INTO offers
      (id, userId, title, description, type, size, price, quantity, location, availability_date, status)
      VALUES ('offer', 'producer', 'Camarão', NULL, 'FRESCO', 'M', 34.50, 80.25, 'Fortaleza', '2026-11-05', 'ATIVO')`);
    await db.query("INSERT INTO offerPhotos (id, offerId, imageUrl) VALUES ('photo', 'offer', 'https://example.test/photo.jpg')");
    await db.query(`INSERT INTO administrators (id, name, email, hashPassword, role, profile_picture)
      VALUES ('admin', 'Administrador', 'admin@example.test', 'hash', 'SUPER_ADMIN', 'https://example.test/admin.jpg')`);
    const adminToken = 'x'.repeat(281);
    await db.query(`INSERT INTO refresh_tokens (id, adminId, tokenHash, expiresAt)
      VALUES ('admin-token', 'admin', ?, '2026-11-10')`, { replacements: [adminToken] });
    await db.query(`INSERT INTO conversations (id, offerId, buyerId, advertiserId)
      VALUES ('conversation', 'offer', 'reseller', 'producer')`);
    await db.query(`INSERT INTO messages (id, conversationId, senderId, message)
      VALUES ('message', 'conversation', 'reseller', 'Olá')`);

    await migration.up(qi, Sequelize);
    const [producer] = await rows(db, "SELECT *, CAST(updatedAt AS CHAR) AS updatedText FROM users WHERE id = 'producer'");
    assert.equal(producer.CPF_CNPJ, '');
    assert.equal(producer.location, 'Fortaleza');
    assert.equal(producer.WhatsApp, '85999998888');
    assert.equal(producer.description, '');
    assert.equal(producer.businessHours, '');
    assert.equal(producer.updatedText, '2026-10-02 10:20:30');
    assert.equal((await rows(db, "SELECT user_type FROM users WHERE id = 'reseller'"))[0].user_type, 'COMPRADOR');
    assert.ok(!(await qi.showAllTables()).includes('profiles'));
    assert.equal((await rows(db, 'SELECT name, phone FROM profiles_legacy_20261101'))[0].phone, '8533334444');
    const [offer] = await rows(db, 'SELECT * FROM offers');
    assert.equal(offer.type, undefined);
    assert.equal(offer.quantity, undefined);
    assert.equal(Number(offer.max_quantity), 80.25);
    assert.equal(Number(offer.min_quantity), 0);
    assert.equal(Number(offer.weight), 0);
    assert.equal(offer.start_availability_date, '2026-11-05');
    assert.equal(offer.end_availability_date, '2026-11-05');
    assert.equal(offer.description, '');
    assert.equal((await rows(db, 'SELECT description FROM offerPhotos'))[0].description, '');
    assert.equal((await rows(db, 'SELECT tokenHash FROM refresh_tokens'))[0].tokenHash, adminToken);
    assert.equal((await rows(db, 'SELECT message FROM messages'))[0].message, 'Olá');

    const { UserDAOMySQL } = loadDao('infra/bd/mySql/user.MySQL.dao.ts', db);
    const userDao = new UserDAOMySQL();
    assert.equal((await userDao.searchById('producer')).userType, 'PRODUCER');
    assert.equal((await userDao.searchByEmail('reseller@example.test')).userType, 'BUYER');
    await userDao.register({ id: 'new-user', name: 'Novo', email: 'new@example.test', password: 'hash', userType: 'BUYER', cpf_cnpj: '12345678901', createdAt: new Date() });
    assert.equal((await userDao.searchById('new-user')).cpf_cnpj, '12345678901');
    assert.equal((await rows(db, "SELECT user_type FROM users WHERE id = 'new-user'"))[0].user_type, 'COMPRADOR');
    const { AdminDAOMySQL } = loadDao('infra/bd/mySql/admin.MySQL.dao.ts', db);
    const adminDao = new AdminDAOMySQL();
    assert.equal((await adminDao.searchByEmail('admin@example.test')).profile_picture, 'https://example.test/admin.jpg');
    await adminDao.update('admin', { profile_picture: 'https://example.test/new.jpg' });
    assert.equal((await adminDao.searchById('admin')).profile_picture, 'https://example.test/new.jpg');
    assert.equal((await adminDao.searchPublicById('admin')).profile_picture, 'https://example.test/new.jpg');
    assert.equal((await adminDao.searchAll())[0].profile_picture, 'https://example.test/new.jpg');

    const hash = 'a'.repeat(64);
    await db.query("INSERT INTO user_refresh_tokens (id, userId, tokenHash, expiresAt) VALUES ('user-token', 'new-user', ?, '2026-11-10')", { replacements: [hash] });
    await assert.rejects(db.query("INSERT INTO user_refresh_tokens (id, userId, tokenHash, expiresAt) VALUES ('duplicate', 'producer', ?, '2026-11-10')", { replacements: [hash] }));
    await assert.rejects(db.query("INSERT INTO user_refresh_tokens (id, userId, tokenHash, expiresAt) VALUES ('wrong-owner', 'admin', ?, '2026-11-10')", { replacements: ['b'.repeat(64)] }));
    await assert.rejects(db.query("INSERT INTO refresh_tokens (id, adminId, tokenHash, expiresAt) VALUES ('wrong-admin', 'producer', 'hash', '2026-11-10')"));
    await userDao.delete('new-user');
    assert.equal((await rows(db, 'SELECT * FROM user_refresh_tokens')).length, 0);
    assert.equal((await rows(db, 'SELECT * FROM refresh_tokens')).length, 1);

    const conversationSchema = await qi.describeTable('conversations');
    const messageSchema = await qi.describeTable('messages');
    await removeConversations.up(qi);
    const remainingTables = await qi.showAllTables();
    assert.ok(!remainingTables.includes('messages'));
    assert.ok(!remainingTables.includes('conversations'));
    assert.equal((await rows(db, 'SELECT * FROM users')).length, 2);
    assert.equal((await rows(db, 'SELECT * FROM offers')).length, 1);
    // A retry after interrupted MySQL DDL must tolerate already removed tables.
    await removeConversations.up(qi);
    await removeConversations.down(qi, Sequelize);
    assert.deepEqual(await qi.describeTable('conversations'), conversationSchema);
    assert.deepEqual(await qi.describeTable('messages'), messageSchema);
    assert.equal((await rows(db, 'SELECT * FROM conversations')).length, 0);
    assert.equal((await rows(db, 'SELECT * FROM messages')).length, 0);
    await assert.rejects(db.query(`INSERT INTO messages (id, conversationId, senderId, message)
      VALUES ('orphan', 'missing', 'reseller', 'Invalid')`));
    await db.query(`INSERT INTO conversations (id, offerId, buyerId, advertiserId)
      VALUES ('restored', 'offer', 'reseller', 'producer')`);
    await db.query(`INSERT INTO messages (id, conversationId, senderId, message)
      VALUES ('restored-message', 'restored', 'reseller', 'Test')`);
    await db.query("DELETE FROM conversations WHERE id = 'restored'");
    assert.equal((await rows(db, 'SELECT * FROM messages')).length, 0);

    // Retrying the upgrade cannot overwrite migrated data or lose old tokens.
    await migration.up(qi, Sequelize);
    assert.equal((await rows(db, 'SELECT tokenHash FROM refresh_tokens'))[0].tokenHash, adminToken);
    await db.query("UPDATE administrators SET role = 'CUSTOM' WHERE id = 'admin'");
    await assert.rejects(migration.down(qi, Sequelize), /cargos novos/);
    assert.ok((await qi.describeTable('users')).businessHours);
    await db.query("UPDATE administrators SET role = 'SUPER_ADMIN' WHERE id = 'admin'");
    await migration.down(qi, Sequelize);
    const [oldProfile] = await rows(db, 'SELECT * FROM profiles');
    assert.equal(oldProfile.id, 'profile');
    assert.equal(oldProfile.name, 'Nome comercial antigo');
    assert.equal(oldProfile.phone, '8533334444');
    const [oldOffer] = await rows(db, 'SELECT * FROM offers');
    assert.equal(oldOffer.type, 'FRESCO');
    assert.equal(Number(oldOffer.quantity), 80.25);
    assert.equal(oldOffer.availability_date, '2026-11-05');
    assert.equal((await rows(db, 'SELECT tokenHash FROM refresh_tokens'))[0].tokenHash, adminToken);
    for (const item of [...previous].reverse()) await item.down(qi, Sequelize);
    assert.deepEqual(await qi.showAllTables(), []);
  });
});

test('existing CPF and user tokens: preflight prevents truncation; upgrade preserves sessions', { skip: !enabled }, async () => {
  await withDatabase(async (db, qi) => {
    await initialize(qi);
    await qi.addColumn('users', 'cpf_cnpj', { type: Sequelize.STRING(18), allowNull: false });
    await qi.changeColumn('users', 'user_type', { type: Sequelize.ENUM('PRODUCER', 'BUYER'), allowNull: false });
    await db.query(`INSERT INTO users (id, name, email, hashPassword, user_type, cpf_cnpj)
      VALUES ('user', 'Nome', 'user@example.test', 'hash', 'PRODUCER', '123456789012345678')`);
    await assert.rejects(migration.up(qi, Sequelize), /mais de 14/);
    assert.ok((await qi.describeTable('offers')).type);
    assert.ok(!(await qi.describeTable('users')).businessHours);
    await db.query("UPDATE users SET cpf_cnpj = '12.345.678/0001-90' WHERE id = 'user'");
    await db.query(`CREATE TABLE user_refresh_tokens (
      id CHAR(36) PRIMARY KEY, userId CHAR(36) NOT NULL, tokenHash CHAR(64) NOT NULL UNIQUE,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, expiresAt DATETIME NOT NULL,
      revokedAt DATETIME NULL, FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
    await db.query("INSERT INTO user_refresh_tokens (id, userId, tokenHash, expiresAt) VALUES ('token', 'user', ?, '2026-11-10')", { replacements: ['c'.repeat(64)] });
    await migration.up(qi, Sequelize);
    assert.equal((await rows(db, 'SELECT CPF_CNPJ FROM users'))[0].CPF_CNPJ, '12345678000190');
    assert.equal((await rows(db, 'SELECT user_type FROM users'))[0].user_type, 'PRODUTOR');
    assert.equal((await rows(db, 'SELECT tokenHash FROM user_refresh_tokens'))[0].tokenHash, 'c'.repeat(64));
  });
});

test('SQL reference creates the same active columns as the migration chain', { skip: !enabled }, async () => {
  await withDatabase(async (db, qi) => {
    await initialize(qi);
    await migration.up(qi, Sequelize);
    await removeConversations.up(qi);
    const activeTables = (await qi.showAllTables()).filter((name) => !name.endsWith('_legacy_20261101')).sort();
    const schema = {};
    for (const table of activeTables) schema[table] = await qi.describeTable(table);
    await withDatabase(async (snapshotDb, snapshotQi) => {
      const source = fs.readFileSync(path.join(__dirname, '../RedeCamarao_db.sql'), 'utf8');
      for (const statement of source.split(';').filter((item) => item.trim())) await snapshotDb.query(statement);
      assert.deepEqual((await snapshotQi.showAllTables()).sort(), activeTables);
      for (const table of activeTables) {
        const actual = await snapshotQi.describeTable(table);
        assert.deepEqual(Object.keys(actual).sort(), Object.keys(schema[table]).sort(), table);
        for (const column of Object.keys(actual)) {
          for (const property of ['type', 'allowNull', 'primaryKey', 'defaultValue']) {
            assert.deepEqual(actual[column][property], schema[table][column][property], `${table}.${column}.${property}`);
          }
        }
      }
    });
  });
});
