import 'dotenv/config'
import { promises as fs } from 'node:fs'
import { Client } from 'pg'
import { resolveUploadPath } from '../src/lib/storage'

/** Direct SQL for test setup/teardown the UI cannot express (e.g. simulating db:seed). */
async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

export function deleteUserByEmail(email: string): Promise<void> {
  return withClient(async (client) => {
    await client.query('DELETE FROM "User" WHERE email = $1', [email])
  })
}

/** Insert a PENDING friendship row directly, bypassing the application's checks. */
export function createFriendship(
  requesterEmail: string,
  addresseeEmail: string,
): Promise<void> {
  return withClient(async (client) => {
    await client.query(
      `INSERT INTO "Friendship" ("id", "requesterId", "addresseeId")
       SELECT gen_random_uuid()::text, r.id, a.id
       FROM "User" r, "User" a
       WHERE r.email = $1 AND a.email = $2`,
      [requesterEmail, addresseeEmail],
    )
  })
}

/**
 * Delete every user whose email is on `domain`, plus the files their avatars
 * and posts uploaded. Rows that hang off a user (posts, reactions, comments,
 * friendships) go with it through ON DELETE CASCADE.
 */
export async function deleteUsersByEmailDomain(
  domain: string,
  uploadRoot: string,
): Promise<{ users: number; files: number }> {
  return withClient(async (client) => {
    const pattern = `%@${domain}`
    const { rows } = await client.query<{ url: string }>(
      `SELECT "avatarUrl" AS url FROM "User"
       WHERE email LIKE $1 AND "avatarUrl" IS NOT NULL
       UNION ALL
       SELECT p."imageUrl" FROM "Post" p JOIN "User" u ON u.id = p."authorId"
       WHERE u.email LIKE $1 AND p."imageUrl" IS NOT NULL`,
      [pattern],
    )
    const deleted = await client.query(
      'DELETE FROM "User" WHERE email LIKE $1',
      [pattern],
    )
    // Pages have no creator column; once their last team member is gone they
    // are orphans. Collect their avatars, then delete them (posts cascade).
    const orphanAvatars = await client.query<{ url: string }>(
      `SELECT "avatarUrl" AS url FROM "Page" p
       WHERE "avatarUrl" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "PageMember" m WHERE m."pageId" = p.id)`,
    )
    await client.query(
      `DELETE FROM "Page" p
       WHERE NOT EXISTS (SELECT 1 FROM "PageMember" m WHERE m."pageId" = p.id)`,
    )
    rows.push(...orphanAvatars.rows)

    let files = 0
    for (const { url } of rows) {
      const target = resolveUploadPath(
        uploadRoot,
        url.replace(/^\/uploads\//, '').split('/'),
      )
      if (!target) continue
      await fs.unlink(target).then(
        () => files++,
        () => undefined,
      )
    }
    return { users: deleted.rowCount ?? 0, files }
  })
}
