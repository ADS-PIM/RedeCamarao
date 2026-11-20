'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.sequelize.query(
        'DELETE FROM refresh_tokens',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE refresh_tokens ALTER COLUMN "tokenHash" TYPE char(64)',
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.sequelize.query(
        'ALTER TABLE refresh_tokens ALTER COLUMN "tokenHash" TYPE varchar(281)',
        { transaction }
      );
    });
  },
};
