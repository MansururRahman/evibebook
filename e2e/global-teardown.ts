import { deleteUsersByEmailDomain } from './db'
import { E2E_EMAIL_DOMAIN } from './helpers'
import { uploadRoot } from '../src/lib/storage'

/** Runs once after the whole suite: remove the users the tests signed up and their uploads. */
export default async function globalTeardown() {
  const { users, files } = await deleteUsersByEmailDomain(
    E2E_EMAIL_DOMAIN,
    uploadRoot(),
  )
  console.log(
    `e2e teardown: deleted ${users} test users and ${files} uploaded files`,
  )
}
