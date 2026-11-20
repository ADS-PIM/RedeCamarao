'use strict';

const { readFileSync } = require('node:fs');
const path = require('node:path');

module.exports = {
  async up(queryInterface) {
    const schema = readFileSync(path.join(__dirname, '../moderation.sql'), 'utf8');
    await queryInterface.sequelize.transaction(transaction => queryInterface.sequelize.query(schema, { transaction }));
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(transaction => queryInterface.sequelize.query(`
      DROP VIEW admin_account_list, admin_offer_list;
      DROP TABLE admin_login_codes, moderation_evidence, moderation_reports, moderation_history, moderation_notifications;
      DROP FUNCTION protect_moderation_history();
      ALTER TABLE offers DROP COLUMN admin_disabled;
      ALTER TABLE users DROP COLUMN account_status, DROP COLUMN verified;
    `, { transaction }));
  },
};
