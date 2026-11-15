'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rate_limit_buckets', {
      bucket_key: {
        type: Sequelize.CHAR(64),
        allowNull: false,
        primaryKey: true
      },
      // Refilling a bucket can produce fractional tokens.
      tokens: { type: Sequelize.DOUBLE, allowNull: false },
      updated_at_ms: { type: Sequelize.BIGINT, allowNull: false },
      expires_at_ms: { type: Sequelize.BIGINT, allowNull: false }
    }, { engine: 'InnoDB' });

    await queryInterface.addIndex('rate_limit_buckets', ['expires_at_ms'], {
      name: 'rate_limit_buckets_expires_at_ms_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rate_limit_buckets');
  }
};
