import { Pool } from 'pg';

const { databaseOptions } = require('../../database/config/connection');

export const connection = new Pool(databaseOptions());

connection.on('error', (error) => {
    console.error('Idle PostgreSQL connection failed:', error.message);
});
