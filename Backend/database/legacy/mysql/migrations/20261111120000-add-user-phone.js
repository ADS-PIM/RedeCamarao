'use strict';

const PROFILE_ARCHIVE = 'profiles_legacy_20261101';

async function hasTable(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => String(table).toLowerCase() === tableName.toLowerCase());
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('users');
    if (!columns.phone) {
      await queryInterface.addColumn('users', 'phone', {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: null
      });
    }

    if (await hasTable(queryInterface, PROFILE_ARCHIVE)) {
      await queryInterface.sequelize.query(`UPDATE users u
        JOIN \`${PROFILE_ARCHIVE}\` p ON p.userId = u.id
        SET u.phone = NULLIF(TRIM(p.phone), '')
        WHERE u.phone IS NULL OR u.phone = ''`);
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('users');
    if (columns.phone) {
      await queryInterface.removeColumn('users', 'phone');
    }
  }
};
