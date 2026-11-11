'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'user_type', {
      type: Sequelize.ENUM('PRODUTOR', 'REVENDEDOR', 'COMPRADOR', 'PRODUCER', 'BUYER'),
      allowNull: false
    });

    await queryInterface.sequelize.query(`UPDATE users SET user_type = CASE
      WHEN user_type = 'PRODUTOR' THEN 'PRODUCER'
      WHEN user_type IN ('COMPRADOR', 'REVENDEDOR') THEN 'BUYER'
      ELSE user_type END, updatedAt = updatedAt`);

    await queryInterface.changeColumn('users', 'user_type', {
      type: Sequelize.ENUM('PRODUCER', 'BUYER'),
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'user_type', {
      type: Sequelize.ENUM('PRODUCER', 'BUYER', 'PRODUTOR', 'COMPRADOR', 'REVENDEDOR'),
      allowNull: false
    });

    await queryInterface.sequelize.query(`UPDATE users SET user_type = CASE
      WHEN user_type = 'PRODUCER' THEN 'PRODUTOR'
      WHEN user_type = 'BUYER' THEN 'COMPRADOR'
      ELSE user_type END, updatedAt = updatedAt`);

    await queryInterface.changeColumn('users', 'user_type', {
      type: Sequelize.ENUM('PRODUTOR', 'REVENDEDOR', 'COMPRADOR'),
      allowNull: false
    });
  }
};
