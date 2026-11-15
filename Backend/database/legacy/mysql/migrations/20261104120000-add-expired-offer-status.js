'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('offers', 'status', {
      type: Sequelize.ENUM('ATIVO', 'PAUSADO', 'VENDIDO', 'CANCELADO', 'EXPIRADO'),
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    // Do not silently remap or truncate expired offers during rollback.
    const [rows] = await queryInterface.sequelize.query("SELECT id FROM offers WHERE status = 'EXPIRADO' LIMIT 1");
    if (rows.length > 0) throw new Error('Existem ofertas expiradas; altere seus status antes de reverter esta migration');
    await queryInterface.changeColumn('offers', 'status', {
      type: Sequelize.ENUM('ATIVO', 'PAUSADO', 'VENDIDO', 'CANCELADO'),
      allowNull: false
    });
  }
};
