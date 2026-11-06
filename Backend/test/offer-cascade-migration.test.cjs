const assert = require('node:assert/strict');
const { test, mock } = require('node:test');
const { randomUUID, randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const Sequelize = require('sequelize');
const mysql = require('mysql2/promise');
const migration = require('../database/migrations/20261106120000-cascade-user-offer-deletion.js');

function migrationInterface(references) {
    const queries = [];
    return {
        queries,
        queryGenerator: { quoteIdentifier: value => '`' + value.replaceAll('`', '``') + '`' },
        sequelize: { query: async sql => {
            queries.push(sql);
            return queries.length === 1 ? [references, []] : [[], []];
        } }
    };
}

for (const constraintName of ['offers_ibfk_1', 'offers_users_FK', 'legacy`constraint']) {
    test(`migration replaces the discovered FK ${constraintName} in a single ALTER`, async () => {
        const qi = migrationInterface([{ constraintName, deleteRule: 'RESTRICT', updateRule: 'CASCADE' }]);
        await migration.up(qi);
        assert.equal(qi.queries.length, 2);
        assert.match(qi.queries[0], /k.TABLE_SCHEMA = DATABASE\(\)/);
        assert.match(qi.queries[0], /k.REFERENCED_TABLE_NAME = 'users'/);
        const sql = qi.queries[1];
        assert.ok(sql.includes(`DROP FOREIGN KEY ${qi.queryGenerator.quoteIdentifier(constraintName)}`));
        assert.match(sql, /ALTER TABLE offers[\s\S]+ADD CONSTRAINT[\s\S]+ON UPDATE CASCADE ON DELETE CASCADE/);
        assert.doesNotMatch(sql, /DELETE FROM|DROP TABLE|FOREIGN_KEY_CHECKS/);
    });
}

test('migration is a no-op when the cascade already exists', async () => {
    const qi = migrationInterface([{ constraintName: 'offers_users_FK', deleteRule: 'CASCADE', updateRule: 'CASCADE' }]);
    await migration.up(qi);
    assert.equal(qi.queries.length, 1);
});

test('migration refuses missing or ambiguous foreign keys before changing the schema', async () => {
    for (const references of [[], [{ constraintName: 'first' }, { constraintName: 'second' }]]) {
        const qi = migrationInterface(references);
        await assert.rejects(() => migration.up(qi), /exatamente uma chave estrangeira/);
        assert.equal(qi.queries.length, 1);
    }
});

test('rollback restores RESTRICT without removing rows or the offer-photo relationship', async () => {
    const qi = migrationInterface([{ constraintName: 'offers_users_FK', deleteRule: 'CASCADE', updateRule: 'CASCADE' }]);
    await migration.down(qi);
    assert.equal(qi.queries.length, 2);
    assert.match(qi.queries[1], /ON UPDATE CASCADE ON DELETE RESTRICT/);
    assert.doesNotMatch(qi.queries[1], /offerPhotos|DELETE FROM/);
});

// Uses only explicit test-server variables and databases created by this test.
// It never uses the application's DB_NAME or opens its configured database.
test('real MySQL: migration, ownership and cascades through SQL and HTTP', {
    skip: process.env.MIGRATION_TEST_MYSQL !== '1'
}, async t => {
    const settings = {
        host: process.env.MIGRATION_TEST_HOST || '127.0.0.1',
        port: Number(process.env.MIGRATION_TEST_PORT || 3306),
        user: process.env.MIGRATION_TEST_USER || 'root',
        password: process.env.MIGRATION_TEST_PASSWORD || '',
        connectTimeout: 5000
    };
    const database = `redecamarao_cascade_test_${randomBytes(8).toString('hex')}`;
    const snapshotDatabase = `${database}_snapshot`;
    const admin = await mysql.createConnection(settings);
    const createdDatabases = [];
    let sequelize, data, snapshot, server, appPool, queryMock;
    const originalSecret = process.env.JWT_ACCESS_SECRET;

    async function seed(client) {
        const owner = randomUUID(), other = randomUUID();
        const offers = [randomUUID(), randomUUID(), randomUUID()];
        // The existing migration history and SQL snapshot use different enum spellings.
        const [userTypeColumn] = await client.query("SHOW COLUMNS FROM users LIKE 'user_type'");
        const userType = userTypeColumn[0].Type.includes("'PRODUTOR'") ? 'PRODUTOR' : 'PRODUCER';
        for (const id of [owner, other]) {
            await client.query('INSERT INTO users (id, name, email, hashPassword, user_type) VALUES (?, ?, ?, ?, ?)',
                [id, 'Teste', `${id}@example.com`, 'test-hash', userType]);
            await client.query('INSERT INTO user_refresh_tokens (id, userId, tokenHash, expiresAt) VALUES (?, ?, ?, ?)',
                [randomUUID(), id, randomBytes(32).toString('hex'), '2099-12-31 00:00:00']);
        }
        for (const [index, id] of offers.entries()) {
            await client.query(`INSERT INTO offers
                (id, userId, title, type, size, price, max_quantity, location,
                 start_availability_date, end_availability_date, status)
                VALUES (?, ?, 'Oferta', 'Cinza', 'Grande', 35, 10, 'Aracati', '2026-11-06', '2026-12-06', 'ATIVO')`,
                [id, index < 2 ? owner : other]);
            for (let photo = 0; photo < (index < 2 ? 2 : 1); photo++) {
                await client.query('INSERT INTO offerPhotos (id, offerId, imageUrl, description) VALUES (?, ?, ?, ?)',
                    [randomUUID(), id, 'https://example.com/camarao.jpg', 'Foto de teste']);
            }
        }
        return { owner, other, offers };
    }

    async function count(client, table, column, id) {
        const [rows] = await client.query(`SELECT COUNT(*) AS total FROM ${table} WHERE ${column} = ?`, [id]);
        return rows[0].total;
    }

    try {
        for (const name of [database, snapshotDatabase]) {
            await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
            createdDatabases.push(name);
        }
        sequelize = new Sequelize(database, settings.user, settings.password, {
            host: settings.host, port: settings.port, dialect: 'mysql', logging: false
        });
        const qi = sequelize.getQueryInterface();
        const migrationsPath = path.resolve(__dirname, '../database/migrations');
        for (const file of fs.readdirSync(migrationsPath).filter(file => file.endsWith('.js')).sort()) {
            if (file >= '20261106120000-cascade-user-offer-deletion.js') break;
            await require(path.join(migrationsPath, file)).up(qi, Sequelize);
        }
        data = await mysql.createConnection({ ...settings, database });
        const existing = await seed(data);

        await t.test('upgrade preserves existing records and installs both levels of cascading deletion', async () => {
            await migration.up(qi);
            await migration.up(qi);
            const [rules] = await data.query(`SELECT TABLE_NAME AS tableName, DELETE_RULE AS deleteRule
                FROM information_schema.REFERENTIAL_CONSTRAINTS
                WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME IN ('offers', 'offerPhotos')`);
            assert.deepEqual(rules.map(row => [row.tableName.toLowerCase(), row.deleteRule]).sort(),
                [['offerphotos', 'CASCADE'], ['offers', 'CASCADE']].sort());
            assert.equal(await count(data, 'offers', 'userId', existing.owner), 2);
            assert.equal(await count(data, 'offerPhotos', 'offerId', existing.offers[0]), 2);
        });

        await t.test('rollback blocks user deletion again and reapplication restores the cascade', async () => {
            await migration.down(qi);
            await assert.rejects(() => data.query('DELETE FROM users WHERE id = ?', [existing.owner]),
                error => error.code === 'ER_ROW_IS_REFERENCED_2');
            assert.equal(await count(data, 'offers', 'userId', existing.owner), 2);
            await migration.up(qi);
        });

        await t.test('direct offer deletion removes its photos and preserves sibling offers and users', async () => {
            await data.query('DELETE FROM offers WHERE id = ?', [existing.offers[0]]);
            assert.equal(await count(data, 'offerPhotos', 'offerId', existing.offers[0]), 0);
            assert.equal(await count(data, 'offerPhotos', 'offerId', existing.offers[1]), 2);
            assert.equal(await count(data, 'offerPhotos', 'offerId', existing.offers[2]), 1);
            assert.equal(await count(data, 'users', 'id', existing.owner), 1);
        });

        await t.test('direct user deletion removes offers, photos and refresh tokens, preserving another user', async () => {
            await data.query('DELETE FROM users WHERE id = ?', [existing.owner]);
            assert.equal(await count(data, 'offers', 'userId', existing.owner), 0);
            assert.equal(await count(data, 'offerPhotos', 'offerId', existing.offers[1]), 0);
            assert.equal(await count(data, 'user_refresh_tokens', 'userId', existing.owner), 0);
            assert.equal(await count(data, 'users', 'id', existing.other), 1);
            assert.equal(await count(data, 'offers', 'userId', existing.other), 1);
            assert.equal(await count(data, 'offerPhotos', 'offerId', existing.offers[2]), 1);
            assert.equal(await count(data, 'user_refresh_tokens', 'userId', existing.other), 1);
        });

        const jwt = require('jsonwebtoken');
        const app = require('../src/app.ts').default;
        appPool = require('../src/util/connection.ts').connection;
        // The real DAO SQL runs against the isolated database, not the application's pool.
        queryMock = mock.method(appPool, 'query', (...args) => data.query(...args));
        process.env.JWT_ACCESS_SECRET = 'cascade-integration-test-secret';
        server = await new Promise(resolve => {
            const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
        });
        const baseUrl = `http://127.0.0.1:${server.address().port}`;
        const fixture = await seed(data);
        const token = jwt.sign({ userId: fixture.owner }, process.env.JWT_ACCESS_SECRET);
        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

        await t.test('HTTP update and deletion reject another owner and leave their rows intact', async () => {
            for (const method of ['PATCH', 'DELETE']) {
                const response = await fetch(`${baseUrl}/offer/${fixture.offers[2]}`, {
                    method, headers, ...(method === 'PATCH' ? { body: JSON.stringify({ title: 'Alterada' }) } : {})
                });
                assert.equal(response.status, 403);
            }
            const [rows] = await data.query('SELECT title FROM offers WHERE id = ?', [fixture.offers[2]]);
            assert.equal(rows[0].title, 'Oferta');
            assert.equal(await count(data, 'offerPhotos', 'offerId', fixture.offers[2]), 1);
        });

        await t.test('HTTP owner update succeeds and deleting the offer cascades to its photos', async () => {
            assert.equal((await fetch(`${baseUrl}/offer/${fixture.offers[0]}`, {
                method: 'PATCH', headers, body: JSON.stringify({ title: 'Atualizada' })
            })).status, 200);
            assert.equal((await fetch(`${baseUrl}/offer/${fixture.offers[0]}`, { method: 'DELETE', headers })).status, 200);
            assert.equal(await count(data, 'offers', 'id', fixture.offers[0]), 0);
            assert.equal(await count(data, 'offerPhotos', 'offerId', fixture.offers[0]), 0);
            assert.equal(await count(data, 'offerPhotos', 'offerId', fixture.offers[1]), 2);
        });

        await t.test('HTTP account deletion cascades to all remaining offers, photos and tokens', async () => {
            const response = await fetch(`${baseUrl}/users/me`, {
                method: 'DELETE', headers, body: JSON.stringify({ userId: fixture.other })
            });
            assert.equal(response.status, 204);
            assert.match(response.headers.get('set-cookie'), /userRefreshToken=;/);
            assert.equal(await count(data, 'users', 'id', fixture.owner), 0);
            assert.equal(await count(data, 'offers', 'userId', fixture.owner), 0);
            assert.equal(await count(data, 'offerPhotos', 'offerId', fixture.offers[1]), 0);
            assert.equal(await count(data, 'user_refresh_tokens', 'userId', fixture.owner), 0);
            assert.equal(await count(data, 'offers', 'userId', fixture.other), 1);
            assert.equal(await count(data, 'offerPhotos', 'offerId', fixture.offers[2]), 1);
        });

        await t.test('the SQL snapshot also cascades user deletion through offers and photos', async () => {
            snapshot = await mysql.createConnection({ ...settings, database: snapshotDatabase });
            const sql = fs.readFileSync(path.resolve(__dirname, '../database/RedeCamarao_db.sql'), 'utf8');
            for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) await snapshot.query(statement);
            const rows = await seed(snapshot);
            await snapshot.query('DELETE FROM users WHERE id = ?', [rows.owner]);
            assert.equal(await count(snapshot, 'offers', 'userId', rows.owner), 0);
            for (const id of rows.offers.slice(0, 2)) assert.equal(await count(snapshot, 'offerPhotos', 'offerId', id), 0);
            assert.equal(await count(snapshot, 'offers', 'userId', rows.other), 1);
            assert.equal(await count(snapshot, 'offerPhotos', 'offerId', rows.offers[2]), 1);
        });
    } finally {
        if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        queryMock?.mock.restore();
        if (appPool) await appPool.end();
        if (snapshot) await snapshot.end();
        if (data) await data.end();
        if (sequelize) await sequelize.close();
        for (const name of createdDatabases) {
            assert.match(name, /^redecamarao_cascade_test_[a-f0-9]{16}(_snapshot)?$/);
            await admin.query(`DROP DATABASE \`${name}\``);
        }
        await admin.end();
        if (originalSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
        else process.env.JWT_ACCESS_SECRET = originalSecret;
    }
});
