import 'dotenv/config'
import { Client } from 'pg'

/** Direct SQL for test setup/teardown the UI cannot express (e.g. simulating db:seed). */
export async function deleteUserByEmail(email: string): Promise<void> {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    await client.query('DELETE FROM "User" WHERE email = $1', [email])
  } finally {
    await client.end()
  }
}
