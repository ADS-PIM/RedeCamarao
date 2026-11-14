'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('users');
    if (!columns.profilePicture) await queryInterface.addColumn('users', 'profilePicture', {
      type: Sequelize.STRING(2048), allowNull: true, defaultValue: null
    });
  },
  async down(queryInterface) {
    const columns = await queryInterface.describeTable('users');
    if (columns.profilePicture) {
      const [rows] = await queryInterface.sequelize.query('SELECT id FROM users WHERE profilePicture IS NOT NULL LIMIT 1');
      if (rows.length) throw new Error('Remova as fotos de perfil antes de reverter esta migration.');
      await queryInterface.removeColumn('users', 'profilePicture');
    }
  }
};
