import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

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

  const result = await pool.query(text, values);

  return result.rows;
}

export default pool;
