import app from './app';
import { connection } from './util/connection';

const PORT = Number(process.env.PORT || 3001);

async function start() {
  try {
    await connection.query('SELECT 1');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} (PostgreSQL connected)`);
    });
  } catch (error: any) {
    console.error('Unable to connect to PostgreSQL:', error.message);
    await connection.end();
    process.exitCode = 1;
  }
}

void start();
