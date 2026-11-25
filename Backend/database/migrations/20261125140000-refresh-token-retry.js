'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(transaction => queryInterface.sequelize.query(`
      ALTER TABLE user_refresh_tokens ADD COLUMN "previousTokenHash" char(64);
      ALTER TABLE refresh_tokens ADD COLUMN "previousTokenHash" char(64);
      CREATE INDEX user_refresh_tokens_previous_hash_idx ON user_refresh_tokens ("previousTokenHash")
        WHERE "previousTokenHash" IS NOT NULL AND "revokedAt" IS NULL;
      CREATE INDEX refresh_tokens_previous_hash_idx ON refresh_tokens ("previousTokenHash") WHERE "previousTokenHash" IS NOT NULL;
      CREATE INDEX refresh_tokens_current_hash_idx ON refresh_tokens ("tokenHash");
    `, { transaction }));
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(transaction => queryInterface.sequelize.query(`
      DROP INDEX refresh_tokens_current_hash_idx;
      ALTER TABLE user_refresh_tokens DROP COLUMN "previousTokenHash";
      ALTER TABLE refresh_tokens DROP COLUMN "previousTokenHash";
    `, { transaction }));
  },
};
