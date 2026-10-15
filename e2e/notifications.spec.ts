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

/** A pending request from B to A (inserted directly), accepted by A on the friends page. */
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

function list(page: Page) {
  return page.getByRole('region', { name: 'Notifications' })
}

test('friend request and acceptance notify each side; opening the page clears the badge', async ({
  browser,
}) => {
  const a = await userIn(browser, 'nfa')
  const b = await userIn(browser, 'nfb')

  // B sends A a request through the UI, so the action creates the notification
  await b.page.goto(`/u/${a.user.username}`)
  await b.page.getByRole('button', { name: 'Add friend' }).click()
  await expect(
    b.page.getByRole('button', { name: 'Cancel request' }),
  ).toBeVisible()

  await a.page.goto('/feed')
  await expect(a.page.getByRole('navigation')).toContainText(
    'Notifications (1)',
  )
  await a.page.goto('/notifications')
  const request = list(a.page).getByRole('link', {
    name: `${b.user.name} sent you a friend request`,
  })
  await expect(request).toHaveAttribute('href', '/friends')
  await expect(list(a.page)).toContainText('New')
  // Opening the page clears the badge right away...
  await expect(a.page.getByRole('navigation')).not.toContainText(
    'Notifications (',
    { timeout: 8_000 },
  )
  // ...and the "New" marker survives that refresh for the rest of this visit
  await a.page.waitForTimeout(1_500)
  await expect(list(a.page)).toContainText('New')
  // A second visit shows the row as read
  await a.page.goto('/notifications')
  await expect(list(a.page)).not.toContainText('New')

  await a.page.goto('/friends')
  await a.page
    .getByRole('listitem')
    .filter({ hasText: b.user.name })
    .getByRole('button', { name: 'Accept' })
    .click()
  await expect(a.page.getByRole('region', { name: 'Friends' })).toContainText(
    b.user.name,
  )

  await b.page.goto('/notifications')
  await expect(
    list(b.page).getByRole('link', {
      name: `${a.user.name} accepted your friend request`,
    }),
  ).toHaveAttribute('href', `/u/${a.user.username}`)
})

test('reactions collapse to one row, comments add rows, and you never notify yourself', async ({
  browser,
}) => {
  test.slow()
  const a = await userIn(browser, 'nra')
  const b = await userIn(browser, 'nrb')
  await befriend(a, b)

  await a.page.goto('/feed')
  await a.page.getByLabel("What's on your mind?").fill('Notify me please')
  await a.page.getByRole('button', { name: 'Post' }).click()
  const own = a.page
    .getByRole('article')
    .filter({ hasText: 'Notify me please' })
  await expect(own).toHaveCount(1)
  // Reacting to your own post creates nothing
  await own.getByRole('button', { name: 'Like', exact: true }).click()
  await expect(own).toContainText('1 reaction')
  await a.page.goto('/notifications')
  await expect(list(a.page)).toContainText('Nothing yet')

  // B reacts twice (Like, then Love via the picker) and comments once
  await b.page.goto('/feed')
  const article = b.page
    .getByRole('article')
    .filter({ hasText: 'Notify me please' })
  await expect(article).toHaveCount(1)
  await article.getByRole('button', { name: 'Like', exact: true }).click()
  await expect(article).toContainText('2 reactions')
  await article.getByRole('button', { name: 'Choose reaction' }).click()
  await article
    .getByRole('group', { name: 'Reactions' })
    .getByRole('button', { name: 'Love' })
    .click()
  await expect(article.getByRole('button', { name: 'Love' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await article.getByLabel('Write a comment').fill('Nice one')
  await article.getByRole('button', { name: 'Comment' }).click()
  await expect(article).toContainText('Nice one')

  await a.page.goto('/notifications')
  await expect(
    list(a.page).getByRole('link', { name: /reacted to your post/ }),
  ).toHaveCount(1)
  await expect(
    list(a.page).getByRole('link', { name: /commented on your post/ }),
  ).toHaveCount(1)
  await expect(
    list(a.page).getByRole('link', { name: /reacted to your post/ }),
  ).toContainText('“Notify me please”')
  const href = await list(a.page)
    .getByRole('link', { name: /commented on your post/ })
    .getAttribute('href')
  expect(href).toMatch(/^\/p\/[a-z0-9]+$/)
})

test('private group join request and approval notify admin and requester', async ({
  browser,
}) => {
  const a = await userIn(browser, 'nga')
  const b = await userIn(browser, 'ngb')
  const name = `Quiet ${Date.now()}`
  await a.page.goto('/groups/new')
  await a.page.getByLabel('Group name').fill(name)
  await a.page.getByRole('radio', { name: 'Private' }).check()
  await a.page.getByRole('button', { name: 'Create group' }).click()
  await expect(a.page).toHaveURL(/\/g\/[a-z0-9-]+$/)
  await expect(a.page.getByRole('heading', { level: 1 })).toContainText(name)
  const url = new URL(a.page.url()).pathname

  await b.page.goto(url)
  await b.page.getByRole('button', { name: 'Request to join' }).click()
  await expect(
    b.page.getByRole('button', { name: 'Cancel request' }),
  ).toBeVisible()

  await a.page.goto('/notifications')
  await expect(
    list(a.page).getByRole('link', {
      name: `${b.user.name} asked to join ${name}`,
    }),
  ).toHaveAttribute('href', `${url}/members`)

  await a.page.goto(`${url}/members`)
  await a.page
    .getByRole('region', { name: 'Join requests' })
    .getByRole('button', { name: 'Approve' })
    .click()
  await expect(a.page.getByRole('region', { name: 'Members' })).toContainText(
    b.user.name,
  )

  await b.page.goto('/notifications')
  await expect(
    list(b.page).getByRole('link', {
      name: `Your request to join ${name} was approved`,
    }),
  ).toHaveAttribute('href', url)
})

test('being added to a page team notifies the new member', async ({
  browser,
}) => {
  const a = await userIn(browser, 'npa')
  const b = await userIn(browser, 'npb')
  const name = `Shop ${Date.now()}`
  await a.page.goto('/pages/new')
  await a.page.getByLabel('Page name').fill(name)
  await a.page.getByRole('button', { name: 'Create page' }).click()
  // /pages/new also matches a loose slug pattern; wait for the real page
  await expect(a.page).toHaveURL(/\/pages\/(?!new$)[a-z0-9-]+$/)
  await expect(a.page.getByRole('heading', { level: 1 })).toContainText(name)
  const url = new URL(a.page.url()).pathname

  await a.page.goto(`${url}/team`)
  await a.page.getByLabel('Username').fill(b.user.username)
  await a.page.getByRole('button', { name: 'Add to team' }).click()
  await expect(
    a.page.getByRole('region', { name: 'Team' }).getByRole('listitem'),
  ).toHaveCount(2)

  await b.page.goto('/notifications')
  await expect(
    list(b.page).getByRole('link', {
      name: `${a.user.name} added you to the team of ${name}`,
    }),
  ).toHaveAttribute('href', url)
})
