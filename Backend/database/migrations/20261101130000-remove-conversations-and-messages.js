'use strict';

module.exports = {
  async up(queryInterface) {
    // Messages reference conversations, so remove them first.
    await queryInterface.dropTable('messages');
    await queryInterface.dropTable('conversations');
  },

  async down(queryInterface, Sequelize) {
    // Restore only the schema. Deleted conversations/messages require a backup.
    // Match the parent IDs even if the database default collation has changed.
    const [columns] = await queryInterface.sequelize.query(`
      SELECT CHARACTER_SET_NAME AS columnCharset, COLLATION_NAME AS columnCollation
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id'`);
    const options = {
      engine: 'InnoDB',
      charset: columns[0].columnCharset,
      collate: columns[0].columnCollation
    };

    await queryInterface.createTable('conversations', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      offerId: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'offers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      buyerId: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      advertiserId: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, options);

    await queryInterface.createTable('messages', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      conversationId: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'conversations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      senderId: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      message: { type: Sequelize.STRING(1500), allowNull: false },
      sentAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }
    }, options);
  }
};
