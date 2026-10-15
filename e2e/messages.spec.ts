import { expect, test, type Browser, type Page } from '@playwright/test'
import { createFriendship, seedMessages } from './db'
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

/** A pending request from B to A, accepted by A on the friends page. */
async function befriend(
  a: { page: Page; user: TestUser },
  b: { page: Page; user: TestUser },
) {
  await createFriendship(b.user.email, a.user.email)
  await a.page.goto('/friends')
  await a.page
    .getByRole('listitem')
    .filter({ hasText: b.user.name })
    .getByRole('button', { name: 'Accept' })
    .click()
  await expect(a.page.getByRole('region', { name: 'Friends' })).toContainText(
    b.user.name,
  )
}

async function send(page: Page, body: string) {
  await page.getByLabel('Write a message').fill(body)
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByRole('list', { name: 'Messages' })).toContainText(body)
}

test('friends can message; strangers cannot; unread badge and inbox follow along', async ({
  browser,
}) => {
  test.slow()
  const a = await userIn(browser, 'msa')
  const b = await userIn(browser, 'msb')

  // Strangers: notice, no composer
  await b.page.goto(`/messages/${a.user.username}`)
  await expect(b.page.getByText('You can only message friends')).toBeVisible()
  await expect(b.page.getByLabel('Write a message')).toHaveCount(0)

  await befriend(a, b)

  // Profile shows a Message link for friends; empty body is refused
  await a.page.goto(`/u/${b.user.username}`)
  await a.page.getByRole('link', { name: 'Message', exact: true }).click()
  await expect(a.page).toHaveURL(new RegExp(`/messages/${b.user.username}$`))
  await expect(a.page.getByText('No messages yet')).toBeVisible()
  await a.page.getByLabel('Write a message').fill('   ')
  await a.page.getByRole('button', { name: 'Send' }).click()
  await expect(
    a.page.getByRole('alert').filter({ hasText: 'Write a message' }),
  ).toBeVisible()
  await expect(a.page.getByRole('list', { name: 'Messages' })).toHaveCount(0)

  await send(a.page, 'Hei Bob')
  // The sender's own message is not unread for them
  await expect(a.page.getByRole('navigation')).not.toContainText('Messages (')

  // B sees the badge, the inbox row with preview and Unread, then opens it
  await b.page.goto('/feed')
  await expect(b.page.getByRole('navigation')).toContainText('Messages (1)')
  await b.page.goto('/messages')
  const row = b.page
    .getByRole('region', { name: 'Conversations' })
    .getByRole('listitem')
    .filter({ hasText: a.user.name })
  await expect(row).toContainText('Hei Bob')
  await expect(row).toContainText('Unread')
  await row.getByRole('link').click()
  await expect(b.page).toHaveURL(new RegExp(`/messages/${a.user.username}$`))
  // Opening the thread clears the badge right away, not at the next 10 s refresh
  await expect(b.page.getByRole('navigation')).not.toContainText('Messages (', {
    timeout: 8_000,
  })

  // B replies; A's open thread picks it up without a reload
  await send(b.page, 'Hei Alice!')
  await expect(a.page.getByRole('list', { name: 'Messages' })).toContainText(
    'Hei Alice!',
    { timeout: 30_000 },
  )
  await a.page.goto('/messages')
  await expect(
    a.page.getByRole('region', { name: 'Conversations' }),
  ).toContainText('Hei Alice!')
})

test('after unfriending the thread stays readable but sending is refused', async ({
  browser,
}) => {
  const a = await userIn(browser, 'mua')
  const b = await userIn(browser, 'mub')
  await befriend(a, b)
  await a.page.goto(`/messages/${b.user.username}`)
  await send(a.page, 'Before we fell out')

  // B keeps the thread open in a tab, then A unfriends
  await b.page.goto(`/messages/${a.user.username}`)
  await expect(b.page.getByLabel('Write a message')).toBeVisible()
  await a.page.goto(`/u/${b.user.username}`)
  await a.page.getByRole('button', { name: 'Unfriend' }).click()
  await expect(a.page.getByRole('button', { name: 'Add friend' })).toBeVisible()

  // Stale tab: the send is refused
  await b.page.getByLabel('Write a message').fill('Still friends?')
  await b.page.getByRole('button', { name: 'Send' }).click()
  await expect(b.page.getByText('You can only message friends')).toBeVisible()

  // Fresh load: history readable, no composer
  await b.page.goto(`/messages/${a.user.username}`)
  await expect(b.page.getByRole('list', { name: 'Messages' })).toContainText(
    'Before we fell out',
  )
  await expect(b.page.getByLabel('Write a message')).toHaveCount(0)
  await expect(b.page.getByText('You can only message friends')).toBeVisible()
})

test('long threads page 50 at a time with Load earlier', async ({
  browser,
}) => {
  const a = await userIn(browser, 'mpa')
  const b = await userIn(browser, 'mpb')
  await befriend(a, b)
  await seedMessages(b.user.email, a.user.email, 60)

  await a.page.goto(`/messages/${b.user.username}`)
  const list = a.page.getByRole('list', { name: 'Messages' })
  await expect(list.getByRole('listitem')).toHaveCount(50)
  // A long thread opens at its newest end, with the composer in view
  await expect(a.page.getByLabel('Write a message')).toBeInViewport()
  await expect(list.getByRole('listitem').first()).toContainText(
    'Seeded message 11',
  )
  await expect(list.getByRole('listitem').last()).toContainText(
    'Seeded message 60',
  )

  await a.page.getByRole('link', { name: 'Load earlier' }).click()
  await expect(list.getByRole('listitem')).toHaveCount(10)
  await expect(list.getByRole('listitem').first()).toContainText(
    'Seeded message 1',
  )
  await expect(a.page.getByRole('link', { name: 'Load earlier' })).toHaveCount(
    0,
  )
})
