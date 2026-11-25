'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(transaction => queryInterface.sequelize.query(`
      UPDATE users SET account_status = 'ACTIVE' WHERE account_status = 'PENDING';
      ALTER TABLE users DROP CONSTRAINT users_account_status_check,
        ADD CONSTRAINT users_account_status_check CHECK (account_status IN ('ACTIVE','SUSPENDED','BANNED'));
    `, { transaction }));
  },
  async down(queryInterface) {
    // Existing active accounts keep their access when reverting the constraint.
    await queryInterface.sequelize.query(`
      ALTER TABLE users DROP CONSTRAINT users_account_status_check,
        ADD CONSTRAINT users_account_status_check CHECK (account_status IN ('ACTIVE','PENDING','SUSPENDED','BANNED'));
    `);
  },
};
