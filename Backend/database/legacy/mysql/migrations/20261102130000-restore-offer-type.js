'use strict';

const OFFER_ARCHIVE = 'offer_types_legacy_20261101';

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('offers');
    if (!columns.type) {
      // Existing offers may have no archived type. Do not infer it from size.
      await queryInterface.addColumn('offers', 'type', {
        type: Sequelize.STRING(255), allowNull: true, defaultValue: null
      });
    }

    if ((await queryInterface.showAllTables()).includes(OFFER_ARCHIVE)) {
      await queryInterface.sequelize.query(`UPDATE offers o
        JOIN ${OFFER_ARCHIVE} archived ON archived.id = o.id
        SET o.type = archived.type, o.updatedAt = o.updatedAt
        WHERE o.type IS NULL`);
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('offers', 'type');
  }
};
