'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('offers', 'status', {
      type: Sequelize.ENUM('ATIVO', 'PAUSADO', 'VENDIDO', 'CANCELADO', 'EXPIRADO', 'RASCUNHO'), allowNull: false
    });
  },
  async down(queryInterface, Sequelize) {
    const [rows] = await queryInterface.sequelize.query("SELECT id FROM offers WHERE status = 'RASCUNHO' LIMIT 1");
    if (rows.length) throw new Error('Existem rascunhos. Altere seus status antes de reverter.');
    await queryInterface.changeColumn('offers', 'status', {
      type: Sequelize.ENUM('ATIVO', 'PAUSADO', 'VENDIDO', 'CANCELADO', 'EXPIRADO'), allowNull: false
    });
  }
};
