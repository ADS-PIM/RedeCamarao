'use strict';

// MySQL DDL commits implicitly. Run with the application stopped and a backup.
// These two archives retain fields that have no equivalent in the new model.
const PROFILE_ARCHIVE = 'profiles_legacy_20261101';
const OFFER_ARCHIVE = 'offer_types_legacy_20261101';

async function hasTable(queryInterface, table) {
  return (await queryInterface.showAllTables()).includes(table);
}

async function addMissingColumns(queryInterface, table, columns) {
  const existing = await queryInterface.describeTable(table);
  for (const [name, definition] of Object.entries(columns)) {
    if (!existing[name]) await queryInterface.addColumn(table, name, definition);
  }
}

async function requireNoRows(queryInterface, sql, message) {
  const [rows] = await queryInterface.sequelize.query(sql);
  if (rows.length) throw new Error(message);
}

async function relatedTableOptions(queryInterface, table) {
  // String foreign keys and archive joins must match the parent's collation,
  // even when the database default changed after that table was created.
  const [columns] = await queryInterface.sequelize.query(`
    SELECT CHARACTER_SET_NAME AS columnCharset, COLLATION_NAME AS columnCollation
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'id'`,
  { replacements: [table] });
  return { engine: 'InnoDB', charset: columns[0].columnCharset, collate: columns[0].columnCollation };
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const sql = (statement) => queryInterface.sequelize.query(statement);
    const users = await queryInterface.describeTable('users');
    const documentColumn = Object.keys(users).find((name) => name.toLowerCase() === 'cpf_cnpj');
    const normalizedDocument = "REPLACE(REPLACE(REPLACE(REPLACE(TRIM(`cpf_cnpj`), '.', ''), '/', ''), '-', ''), ' ', '')";

    // Validate before any DDL: shrinking a document must never truncate it.
    if (documentColumn) {
      await requireNoRows(queryInterface,
        `SELECT id FROM users WHERE CHAR_LENGTH(${normalizedDocument}) > 14 LIMIT 1`,
        'Existem CPF/CNPJ com mais de 14 caracteres apos remover a formatacao. Corrija-os antes de migrar.');
    }
    await requireNoRows(queryInterface,
      "SELECT id FROM users WHERE user_type NOT IN ('PRODUTOR', 'COMPRADOR', 'REVENDEDOR', 'PRODUCER', 'BUYER') LIMIT 1",
      'Existem tipos de usuario desconhecidos. Corrija-os antes de migrar.');

    if (!documentColumn) {
      await queryInterface.addColumn('users', 'CPF_CNPJ', {
        type: Sequelize.CHAR(14), allowNull: false, defaultValue: ''
      });
    } else {
      await sql(`UPDATE users SET cpf_cnpj = COALESCE(${normalizedDocument}, ''), updatedAt = updatedAt`);
      await sql(`ALTER TABLE users CHANGE COLUMN \`${documentColumn}\` CPF_CNPJ CHAR(14) NOT NULL DEFAULT ''`);
    }

    await addMissingColumns(queryInterface, 'users', {
      description: { type: Sequelize.STRING(2000), allowNull: false, defaultValue: '' },
      location: { type: Sequelize.STRING(255), allowNull: false, defaultValue: '' },
      WhatsApp: { type: Sequelize.STRING(20), allowNull: false, defaultValue: '' },
      businessHours: { type: Sequelize.STRING(255), allowNull: false, defaultValue: '' }
    });

    await queryInterface.changeColumn('users', 'user_type', {
      type: Sequelize.ENUM('PRODUTOR', 'COMPRADOR', 'REVENDEDOR', 'PRODUCER', 'BUYER'), allowNull: false
    });
    await sql(`UPDATE users SET user_type = CASE
      WHEN user_type = 'PRODUCER' THEN 'PRODUTOR'
      WHEN user_type IN ('BUYER', 'REVENDEDOR') THEN 'COMPRADOR'
      ELSE user_type END, updatedAt = updatedAt`);
    await queryInterface.changeColumn('users', 'user_type', {
      type: Sequelize.ENUM('PRODUTOR', 'COMPRADOR'), allowNull: false
    });

    if (await hasTable(queryInterface, 'profiles')) {
      // CREATE TABLE LIKE copies columns/indexes, but not foreign keys. The
      // archive must not keep preventing deletion of users after the merge.
      await sql(`CREATE TABLE IF NOT EXISTS \`${PROFILE_ARCHIVE}\` LIKE profiles`);
      await sql(`INSERT INTO \`${PROFILE_ARCHIVE}\` SELECT p.* FROM profiles p
        LEFT JOIN \`${PROFILE_ARCHIVE}\` archived ON archived.id = p.id WHERE archived.id IS NULL`);
      await sql(`UPDATE users u JOIN profiles p ON p.userId = u.id
        SET u.location = IF(u.location = '', p.location, u.location),
            u.WhatsApp = IF(u.WhatsApp = '', COALESCE(p.whatsapp, ''), u.WhatsApp),
            u.updatedAt = u.updatedAt`);
      await queryInterface.dropTable('profiles');
    }

    const offers = await queryInterface.describeTable('offers');
    if (offers.type) {
      await queryInterface.createTable(OFFER_ARCHIVE, {
        id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
        type: { type: Sequelize.STRING(255), allowNull: false }
      }, await relatedTableOptions(queryInterface, 'offers'));
      await sql(`INSERT INTO \`${OFFER_ARCHIVE}\` (id, type) SELECT o.id, o.type FROM offers o
        LEFT JOIN \`${OFFER_ARCHIVE}\` archived ON archived.id = o.id WHERE archived.id IS NULL`);
      await queryInterface.removeColumn('offers', 'type');
    }
    if (offers.quantity) {
      await queryInterface.renameColumn('offers', 'quantity', 'max_quantity');
    }
    if (offers.availability_date) {
      await queryInterface.renameColumn('offers', 'availability_date', 'start_availability_date');
    }
    await addMissingColumns(queryInterface, 'offers', {
      weight: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      min_quantity: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      end_availability_date: { type: Sequelize.DATEONLY, allowNull: true }
    });
    await sql(`UPDATE offers SET description = COALESCE(description, ''),
      end_availability_date = COALESCE(end_availability_date, start_availability_date), updatedAt = updatedAt`);
    await queryInterface.changeColumn('offers', 'description', {
      type: Sequelize.STRING(1000), allowNull: false, defaultValue: ''
    });
    await queryInterface.changeColumn('offers', 'end_availability_date', {
      type: Sequelize.DATEONLY, allowNull: false
    });
    await addMissingColumns(queryInterface, 'offerPhotos', {
      description: { type: Sequelize.STRING(500), allowNull: false, defaultValue: '' }
    });

    const administrators = await queryInterface.describeTable('administrators');
    if (administrators.profile_picture) {
      await queryInterface.renameColumn('administrators', 'profile_picture', 'profilePicture');
    }
    await queryInterface.changeColumn('administrators', 'role', {
      type: Sequelize.STRING(50), allowNull: false
    });

    // Keep refresh_tokens exclusively for administrators, as used by the DAO.
    // Its VARCHAR(281) stores existing JWTs; shrinking it would break sessions.
    if (!(await hasTable(queryInterface, 'user_refresh_tokens'))) {
      await queryInterface.createTable('user_refresh_tokens', {
        id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
        userId: {
          type: Sequelize.CHAR(36), allowNull: false,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE'
        },
        tokenHash: { type: Sequelize.CHAR(64), allowNull: false, unique: true },
        createdAt: { type: 'TIMESTAMP', allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        expiresAt: { type: Sequelize.DATE, allowNull: false },
        revokedAt: { type: Sequelize.DATE, allowNull: true }
      }, await relatedTableOptions(queryInterface, 'users'));
    }

    for (const table of ['users', 'offers']) {
      await sql(`ALTER TABLE \`${table}\`
        MODIFY createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        MODIFY updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
    }
    await sql('ALTER TABLE administrators MODIFY createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
    await sql('ALTER TABLE refresh_tokens MODIFY createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
  },

  async down(queryInterface, Sequelize) {
    const sql = (statement) => queryInterface.sequelize.query(statement);
    await requireNoRows(queryInterface,
      "SELECT id FROM administrators WHERE role NOT IN ('ADMIN', 'SUPER_ADMIN') LIMIT 1",
      'Existem cargos novos de administrador. Converta-os antes de reverter a migration.');

    // Restore the previous profile model without resurrecting deleted users.
    if (!(await hasTable(queryInterface, 'profiles'))) {
      await queryInterface.createTable('profiles', {
        id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
        userId: {
          type: Sequelize.CHAR(36), allowNull: false, unique: true,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT'
        },
        name: { type: Sequelize.STRING(255), allowNull: false },
        location: { type: Sequelize.STRING(255), allowNull: false },
        phone: { type: Sequelize.STRING(20), allowNull: false },
        whatsapp: { type: Sequelize.STRING(20), allowNull: true }
      }, await relatedTableOptions(queryInterface, 'users'));
      if (await hasTable(queryInterface, PROFILE_ARCHIVE)) {
        await sql(`INSERT INTO profiles (id, userId, name, location, phone, whatsapp)
          SELECT p.id, p.userId, p.name, u.location, p.phone, NULLIF(u.WhatsApp, '')
          FROM \`${PROFILE_ARCHIVE}\` p JOIN users u ON u.id = p.userId`);
      }
      await sql(`INSERT INTO profiles (id, userId, name, location, phone, whatsapp)
        SELECT UUID(), u.id, u.name, u.location, '', NULLIF(u.WhatsApp, '') FROM users u
        LEFT JOIN profiles p ON p.userId = u.id WHERE p.id IS NULL
          AND (u.location <> '' OR u.WhatsApp <> '')`);
    }

    await addMissingColumns(queryInterface, 'offers', {
      type: { type: Sequelize.STRING(255), allowNull: false, defaultValue: '' }
    });
    if (await hasTable(queryInterface, OFFER_ARCHIVE)) {
      await sql(`UPDATE offers o JOIN \`${OFFER_ARCHIVE}\` archived ON archived.id = o.id
        SET o.type = archived.type, o.updatedAt = o.updatedAt`);
    }
    await queryInterface.renameColumn('offers', 'max_quantity', 'quantity');
    await queryInterface.renameColumn('offers', 'start_availability_date', 'availability_date');
    for (const column of ['weight', 'min_quantity', 'end_availability_date']) {
      await queryInterface.removeColumn('offers', column);
    }
    await queryInterface.changeColumn('offers', 'description', {
      type: Sequelize.STRING(1000), allowNull: true, defaultValue: null
    });
    await queryInterface.removeColumn('offerPhotos', 'description');
    await queryInterface.renameColumn('administrators', 'profilePicture', 'profile_picture');
    await queryInterface.changeColumn('administrators', 'role', {
      type: Sequelize.ENUM('ADMIN', 'SUPER_ADMIN'), allowNull: false
    });
    await queryInterface.changeColumn('users', 'user_type', {
      type: Sequelize.ENUM('PRODUTOR', 'REVENDEDOR', 'COMPRADOR'), allowNull: false
    });
    for (const column of ['CPF_CNPJ', 'description', 'location', 'WhatsApp', 'businessHours']) {
      await queryInterface.removeColumn('users', column);
    }
    await queryInterface.dropTable('user_refresh_tokens');
    for (const table of ['users', 'offers']) {
      await sql(`ALTER TABLE \`${table}\`
        MODIFY createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        MODIFY updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`);
    }
    await sql('ALTER TABLE administrators MODIFY createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
    await sql('ALTER TABLE refresh_tokens MODIFY createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
    for (const table of [PROFILE_ARCHIVE, OFFER_ARCHIVE]) {
      if (await hasTable(queryInterface, table)) await queryInterface.dropTable(table);
    }
  }
};
