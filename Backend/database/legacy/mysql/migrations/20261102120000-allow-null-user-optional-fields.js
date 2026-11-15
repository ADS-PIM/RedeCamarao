'use strict';

module.exports = {
  async up(queryInterface) {
    // Preserve automatic timestamps while also accepting explicit NULL values.
    await queryInterface.sequelize.query(`ALTER TABLE users
      MODIFY description VARCHAR(2000) NULL DEFAULT NULL,
      MODIFY location VARCHAR(255) NULL DEFAULT NULL,
      MODIFY WhatsApp VARCHAR(20) NULL DEFAULT NULL,
      MODIFY businessHours VARCHAR(255) NULL DEFAULT NULL,
      MODIFY updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
  },

  async down(queryInterface) {
    // Do not fabricate profile data or dates to restore the old constraints.
    const [rows] = await queryInterface.sequelize.query(`SELECT id FROM users
      WHERE description IS NULL OR location IS NULL OR WhatsApp IS NULL
        OR businessHours IS NULL OR updatedAt IS NULL
      LIMIT 1`);
    if (rows.length) {
      throw new Error('Existem campos opcionais de usuarios com NULL. Preencha-os antes de reverter a migration.');
    }

    await queryInterface.sequelize.query(`ALTER TABLE users
      MODIFY description VARCHAR(2000) NOT NULL DEFAULT '',
      MODIFY location VARCHAR(255) NOT NULL DEFAULT '',
      MODIFY WhatsApp VARCHAR(20) NOT NULL DEFAULT '',
      MODIFY businessHours VARCHAR(255) NOT NULL DEFAULT '',
      MODIFY updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
  }
};
