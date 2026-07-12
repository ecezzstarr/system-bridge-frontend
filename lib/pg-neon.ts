import { Pool } from "pg";

let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
      // Connection pool settings for serverless
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      pool = null;
    });
  }
  return pool;
}

export async function neon(
  strings: TemplateStringsArray,
  ...values: any[]
) {
  let text = "";

  strings.forEach((str, i) => {
    text += str;

    if (i < values.length) {
      text += `$${i + 1}`;
    }
  });

  try {
    const pool = getPool();
    const result = await pool.query(text, values);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error, 'Query:', text.substring(0, 100));
    throw error;
  }
}

export default getPool();
