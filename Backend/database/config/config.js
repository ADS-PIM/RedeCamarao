const { databaseOptions } = require('./connection');

function config() {
  const { user, password, database, host, port, ssl, max } = databaseOptions();
  return {
    username: user, password, database, host, port,
    dialect: 'postgres', dialectOptions: { ssl },
    pool: { max, min: 0, acquire: 10000, idle: 30000 },
    logging: false,
  };
}

module.exports = { development: config(), test: config(), production: config() };
