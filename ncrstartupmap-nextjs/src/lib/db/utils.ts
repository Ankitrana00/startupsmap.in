import { Pool } from "pg";

export function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({
    connectionString,
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '5000', 10),
  });
}

export async function withTransaction<T>(
  pool: Pool,
  callback: (client: Pool) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client as unknown as Pool);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
