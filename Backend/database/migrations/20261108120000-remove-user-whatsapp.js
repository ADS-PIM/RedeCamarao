'use strict';

module.exports = {
  async up(queryInterface) {
    const columns = await queryInterface.describeTable('users');
    if (columns.WhatsApp) {
      await queryInterface.removeColumn('users', 'WhatsApp');
    }
  },

  async down(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('users');
    if (!columns.WhatsApp) {
      await queryInterface.addColumn('users', 'WhatsApp', {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: null
      });
    }
  }
};
