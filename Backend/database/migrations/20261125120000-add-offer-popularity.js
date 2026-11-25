'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(transaction => queryInterface.sequelize.query(`
      CREATE TABLE offer_views (
        offer_id char(36) PRIMARY KEY REFERENCES offers(id) ON DELETE CASCADE,
        views bigint NOT NULL DEFAULT 0
      );
      CREATE TABLE offer_contacts (
        offer_id char(36) REFERENCES offers(id) ON DELETE CASCADE,
        user_id char(36) REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (offer_id, user_id)
      );
    `, { transaction }));
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE offer_contacts, offer_views');
  },
};
