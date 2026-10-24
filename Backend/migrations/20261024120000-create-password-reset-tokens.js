'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('password_reset_tokens', {
      // One row per administrator allows the DAO to replace the previous token.
      adminId: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        primaryKey: true,
        references: { model: 'administrators', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tokenHash: { type: Sequelize.CHAR(64), allowNull: false, unique: true },
      passwordHashAtRequest: { type: Sequelize.STRING(255), allowNull: false },
      emailAtRequest: { type: Sequelize.STRING(320), allowNull: false },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      expiresAt: { type: Sequelize.DATE, allowNull: false }
    }, { engine: 'InnoDB' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('password_reset_tokens');
  }
};
