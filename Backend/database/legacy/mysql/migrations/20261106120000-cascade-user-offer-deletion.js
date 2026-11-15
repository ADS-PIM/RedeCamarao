'use strict';

async function changeDeleteRule(queryInterface, deleteRule) {
  // The initial migration and the SQL snapshot use different constraint names.
  const [references] = await queryInterface.sequelize.query(`
    SELECT k.CONSTRAINT_NAME AS constraintName, r.DELETE_RULE AS deleteRule,
      r.UPDATE_RULE AS updateRule
    FROM information_schema.KEY_COLUMN_USAGE k
    JOIN information_schema.REFERENTIAL_CONSTRAINTS r
      ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
      AND r.TABLE_NAME = k.TABLE_NAME AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
    WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = 'offers'
      AND k.COLUMN_NAME = 'userId' AND k.REFERENCED_TABLE_SCHEMA = DATABASE()
      AND k.REFERENCED_TABLE_NAME = 'users' AND k.REFERENCED_COLUMN_NAME = 'id'
  `);

  if (references.length !== 1) {
    throw new Error('A relação offers.userId -> users.id deve ter exatamente uma chave estrangeira antes desta migration');
  }
  const reference = references[0];
  if (reference.deleteRule === deleteRule && reference.updateRule === 'CASCADE') return;

  const quote = name => queryInterface.queryGenerator.quoteIdentifier(name);
  const nextName = reference.constraintName === 'offers_users_FK' ? 'offers_users_FK_v2' : 'offers_users_FK';

  // Replace the FK in one ALTER, without leaving a gap between DROP and ADD.
  // A different name also supports servers that retain the old name during ALTER.
  await queryInterface.sequelize.query(`
    ALTER TABLE offers
      DROP FOREIGN KEY ${quote(reference.constraintName)},
      ADD CONSTRAINT ${quote(nextName)} FOREIGN KEY (userId) REFERENCES users (id)
      ON UPDATE CASCADE ON DELETE ${deleteRule}
  `);
}

module.exports = {
  async up(queryInterface) {
    await changeDeleteRule(queryInterface, 'CASCADE');
  },

  async down(queryInterface) {
    // Reverting the rule cannot restore rows already deleted by a cascade.
    await changeDeleteRule(queryInterface, 'RESTRICT');
  }
};
