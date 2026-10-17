'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      name: { type: Sequelize.STRING(255), allowNull: false },
      email: { type: Sequelize.STRING(320), allowNull: false, unique: true },
      hashPassword: { type: Sequelize.STRING(255), allowNull: false },
      user_type: { type: Sequelize.ENUM('PRODUTOR', 'REVENDEDOR', 'COMPRADOR'), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.createTable('profiles', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      userId: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      location: { type: Sequelize.STRING(255), allowNull: false },
      phone: { type: Sequelize.STRING(20), allowNull: false },
      whatsapp: { type: Sequelize.STRING(20), allowNull: true }
    });

    await queryInterface.createTable('offers', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      userId: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.STRING(1000), allowNull: true },
      type: { type: Sequelize.STRING(255), allowNull: false },
      size: { type: Sequelize.STRING(255), allowNull: false },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      quantity: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      location: { type: Sequelize.STRING(255), allowNull: false },
      availability_date: { type: Sequelize.DATEONLY, allowNull: false },
      status: { type: Sequelize.ENUM('ATIVO', 'PAUSADO', 'VENDIDO', 'CANCELADO'), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.createTable('offerPhotos', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      offerId: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'offers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      imageUrl: { type: Sequelize.STRING(2048), allowNull: false }
    });

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
    });

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
    });

    await queryInterface.createTable('administrators', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      name: { type: Sequelize.STRING(255), allowNull: false },
      email: { type: Sequelize.STRING(320), allowNull: false, unique: true },
      hashPassword: { type: Sequelize.STRING(255), allowNull: false },
      role: { type: Sequelize.ENUM('ADMIN', 'SUPER_ADMIN'), allowNull: false },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      profile_picture: { type: Sequelize.STRING(2048), allowNull: true }
    });

    await queryInterface.createTable('refresh_tokens', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      adminId: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'administrators', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      tokenHash: { type: Sequelize.STRING(281), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      revokedAt: { type: Sequelize.DATE, allowNull: true }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('refresh_tokens');
    await queryInterface.dropTable('administrators');
    await queryInterface.dropTable('messages');
    await queryInterface.dropTable('conversations');
    await queryInterface.dropTable('offerPhotos');
    await queryInterface.dropTable('offers');
    await queryInterface.dropTable('profiles');
    await queryInterface.dropTable('users');
  }
};
