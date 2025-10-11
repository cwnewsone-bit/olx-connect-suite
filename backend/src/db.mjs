import pg from 'pg';
import env from './env.mjs';

const { Pool } = pg;

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool de conexões:', err);
});

export const db = {
  async query(text, params) {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log(`✓ Query executada em ${duration}ms`, { rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('❌ Erro na query:', error.message);
      throw error;
    }
  },
  
  async getClient() {
    return await pool.connect();
  },
  
  async end() {
    await pool.end();
  }
};

export default db;
