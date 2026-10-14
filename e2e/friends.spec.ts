import { expect, test, type Browser, type Page } from '@playwright/test'
import { createFriendship } from './db'
import { newUser, signUp, type TestUser } from './helpers'

async function userIn(
  browser: Browser,
  prefix: string,
): Promise<{ page: Page; user: TestUser }> {
  const context = await browser.newContext()
  const page = await context.newPage()
  const user = newUser(prefix)
  await signUp(page, user)
  return { page, user }
}

test('friend request, accept, and friends-only feed', async ({ browser }) => {
  const a = await userIn(browser, 'fra')
  const b = await userIn(browser, 'frb')

  await a.page.getByLabel("What's on your mind?").fill('Hello from A')
  await a.page.getByRole('button', { name: 'Post' }).click()
  await expect(a.page.getByRole('article').first()).toContainText(
    'Hello from A',
  )

  // B cannot see A's post yet
  await b.page.goto('/feed')
  await expect(b.page.getByText('Hello from A')).toHaveCount(0)

  // B sends a request from A's profile
  await b.page.goto(`/u/${a.user.username}`)
  await b.page.getByRole('button', { name: 'Add friend' }).click()
  await expect(
    b.page.getByRole('button', { name: 'Cancel request' }),
  ).toBeVisible()
  await expect(b.page.getByText('Add friend to see posts')).toBeVisible()

  // A sees the incoming request in the navbar badge and on the friends page, and accepts
  await a.page.goto('/friends')
  await expect(a.page.getByRole('navigation')).toContainText('Friends (1)')
  const request = a.page.getByRole('listitem').filter({ hasText: b.user.name })
  await request.getByRole('button', { name: 'Accept' }).click()
  await expect(a.page.getByRole('region', { name: 'Friends' })).toContainText(
    b.user.name,
  )
  await expect(a.page.getByRole('navigation')).not.toContainText('Friends (1)')

  // Now B sees A's post and the profiles show the friendship
  await b.page.goto('/feed')
  await expect(b.page.getByText('Hello from A')).toBeVisible()
  await b.page.goto(`/u/${a.user.username}`)
  await expect(b.page.getByRole('button', { name: 'Unfriend' })).toBeVisible()
  await expect(b.page.getByText('Hello from A')).toBeVisible()

  // Unfriend hides the posts again
  await b.page.getByRole('button', { name: 'Unfriend' }).click()
  await expect(b.page.getByRole('button', { name: 'Add friend' })).toBeVisible()
  await expect(b.page.getByText('Hello from A')).toHaveCount(0)
})

test('declining a request returns both sides to the initial state', async ({
  browser,
}) => {
  const a = await userIn(browser, 'dca')
  const b = await userIn(browser, 'dcb')

  await b.page.goto(`/u/${a.user.username}`)
  await b.page.getByRole('button', { name: 'Add friend' }).click()
  await expect(
    b.page.getByRole('button', { name: 'Cancel request' }),
  ).toBeVisible()

  await a.page.goto('/friends')
  const request = a.page.getByRole('listitem').filter({ hasText: b.user.name })
  await request.getByRole('button', { name: 'Decline' }).click()
  await expect(
    a.page.getByRole('listitem').filter({ hasText: b.user.name }),
  ).toHaveCount(0)

  await b.page.reload()
  await expect(b.page.getByRole('button', { name: 'Add friend' })).toBeVisible()
})

test('cancelling your own request, and finding people by search', async ({
  browser,
}) => {
  const a = await userIn(browser, 'cna')
  const b = await userIn(browser, 'cnb')

  await b.page.goto(`/people?q=${a.user.username.slice(0, 8)}`)
  await b.page.getByRole('link', { name: a.user.name }).click()
  await expect(b.page).toHaveURL(new RegExp(`/u/${a.user.username}$`))
  await b.page.getByRole('button', { name: 'Add friend' }).click()
  await expect(
    b.page.getByRole('button', { name: 'Cancel request' }),
  ).toBeVisible()

  await b.page.goto('/friends')
  await expect(
    b.page.getByRole('region', { name: 'Sent requests' }),
  ).toContainText(a.user.name)
  await b.page.getByRole('button', { name: 'Cancel request' }).click()
  // The section disappears entirely once there are no sent requests
  await expect(
    b.page.getByRole('region', { name: 'Sent requests' }),
  ).toHaveCount(0)

  await a.page.goto('/friends')
  await expect(
    a.page.getByRole('listitem').filter({ hasText: b.user.name }),
  ).toHaveCount(0)
})

test('acting on a request that was withdrawn refreshes the page to reality', async ({
  browser,
}) => {
  const a = await userIn(browser, 'wda')
  const b = await userIn(browser, 'wdb')

  await b.page.goto(`/u/${a.user.username}`)
  await b.page.getByRole('button', { name: 'Add friend' }).click()
  await expect(
    b.page.getByRole('button', { name: 'Cancel request' }),
  ).toBeVisible()

  // A opens B's profile and sees Accept; meanwhile B withdraws the request
  await a.page.goto(`/u/${b.user.username}`)
  await expect(a.page.getByRole('button', { name: 'Accept' })).toBeVisible()
  await b.page.getByRole('button', { name: 'Cancel request' }).click()
  await expect(b.page.getByRole('button', { name: 'Add friend' })).toBeVisible()

  // A's stale Accept click must not leave the stale button in place
  await a.page.getByRole('button', { name: 'Accept' }).click()
  await expect(a.page.getByRole('button', { name: 'Add friend' })).toBeVisible()
  await expect(a.page.getByRole('button', { name: 'Accept' })).toHaveCount(0)
})

test('the people page offers Add friend inline and reflects the new state', async ({
  browser,
}) => {
  const a = await userIn(browser, 'ppa')
  const b = await userIn(browser, 'ppb')

  await b.page.goto(`/people?q=${a.user.username}`)
  const row = b.page.getByRole('listitem').filter({ hasText: a.user.name })
  await row.getByRole('button', { name: 'Add friend' }).click()
  await expect(
    row.getByRole('button', { name: 'Cancel request' }),
  ).toBeVisible()

  // A sees B in search with Accept, and accepting there makes them friends
  await a.page.goto(`/people?q=${b.user.username}`)
  const aRow = a.page.getByRole('listitem').filter({ hasText: b.user.name })
  await aRow.getByRole('button', { name: 'Accept' }).click()
  await expect(aRow.getByRole('button', { name: 'Unfriend' })).toBeVisible()
})

test('double-clicking Add friend sends exactly one request', async ({
  browser,
}) => {
  const a = await userIn(browser, 'dba')
  const b = await userIn(browser, 'dbb')

  await b.page.goto(`/u/${a.user.username}`)
  await b.page.getByRole('button', { name: 'Add friend' }).dblclick()
  await expect(
    b.page.getByRole('button', { name: 'Cancel request' }),
  ).toBeVisible()

  await a.page.goto('/friends')
  await expect(
    a.page
      .getByRole('region', { name: 'Friend requests' })
      .getByRole('listitem'),
  ).toHaveCount(1)
})

test('the database refuses a second request between the same two people, in either direction', async ({
  browser,
}) => {
  const a = await userIn(browser, 'rca')
  const b = await userIn(browser, 'rcb')

  await createFriendship(a.user.email, b.user.email)
  await expect(createFriendship(b.user.email, a.user.email)).rejects.toThrow(
    /unique/i,
  )
})

test('sending a request when the other side already asked makes you friends', async ({
  browser,
}) => {
  const a = await userIn(browser, 'mua')
  const b = await userIn(browser, 'mub')

  // Both open each other's profile and see Add friend
  await a.page.goto(`/u/${b.user.username}`)
  await b.page.goto(`/u/${a.user.username}`)
  await a.page.getByRole('button', { name: 'Add friend' }).click()
  await expect(
    a.page.getByRole('button', { name: 'Cancel request' }),
  ).toBeVisible()
  // B's page is stale; their click must land as an acceptance, not an error
  await b.page.getByRole('button', { name: 'Add friend' }).click()
  await expect(b.page.getByRole('button', { name: 'Unfriend' })).toBeVisible()
})
