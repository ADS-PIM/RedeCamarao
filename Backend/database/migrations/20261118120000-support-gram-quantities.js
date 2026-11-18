'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE offers
      ALTER COLUMN weight TYPE numeric(11,3),
      ALTER COLUMN min_quantity TYPE numeric(11,3),
      ALTER COLUMN max_quantity TYPE numeric(11,3)`);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.sequelize.query('LOCK TABLE offers IN ACCESS EXCLUSIVE MODE', { transaction });
      // Refuse a rollback that would round existing quantities to multiples of 10 g.
      await queryInterface.sequelize.query(`DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM offers WHERE weight <> round(weight, 2)
          OR min_quantity <> round(min_quantity, 2) OR max_quantity <> round(max_quantity, 2))
        THEN RAISE EXCEPTION 'Cannot roll back: offers contain gram quantities requiring three decimal places'; END IF;
        END $$`, { transaction });
      await queryInterface.sequelize.query(`ALTER TABLE offers
        ALTER COLUMN weight TYPE numeric(10,2),
        ALTER COLUMN min_quantity TYPE numeric(10,2),
        ALTER COLUMN max_quantity TYPE numeric(10,2)`, { transaction });
    });
  },
};
