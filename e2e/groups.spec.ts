import { expect, test, type Browser, type Page } from '@playwright/test'
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

async function createGroup(
  page: Page,
  name: string,
  privacy: 'Public' | 'Private',
): Promise<string> {
  await page.goto('/groups/new')
  await page.getByLabel('Group name').fill(name)
  await page.getByLabel('Description').fill(`About ${name}`)
  await page.getByRole('radio', { name: privacy }).check()
  await page.getByRole('button', { name: 'Create group' }).click()
  await expect(page).toHaveURL(/\/g\/[a-z0-9-]+$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name)
  return page.url()
}

async function postIn(page: Page, body: string) {
  await page.getByLabel("What's on your mind?").fill(body)
  await page.getByRole('button', { name: 'Post' }).click()
  await expect(page.getByRole('article').filter({ hasText: body })).toHaveCount(
    1,
  )
}

test('public group: create, join, post, and the post reaches both feeds', async ({
  browser,
}) => {
  const a = await userIn(browser, 'gpa')
  const b = await userIn(browser, 'gpb')
  const name = `Hikers ${Date.now()}`
  const url = await createGroup(a.page, name, 'Public')

  // It is listed under Your groups and findable by search
  await a.page.goto('/groups')
  await expect(
    a.page.getByRole('region', { name: 'Your groups' }),
  ).toContainText(name)
  await b.page.goto(`/groups?q=${encodeURIComponent(name.slice(0, 10))}`)
  const row = b.page
    .getByRole('region', { name: 'Find groups' })
    .getByRole('listitem')
    .filter({ hasText: name })
  await row.getByRole('button', { name: 'Join group' }).click()
  await expect(row).toContainText('Joined')

  // B posts in the group; A and B both see it in the group and in their feeds
  await b.page.goto(url)
  await expect(
    b.page.getByRole('button', { name: 'Leave group' }),
  ).toBeVisible()
  await postIn(b.page, 'Trail this Sunday?')
  for (const p of [a.page, b.page]) {
    await p.goto('/feed')
    const article = p
      .getByRole('article')
      .filter({ hasText: 'Trail this Sunday?' })
    await expect(article).toHaveCount(1)
    await expect(article.getByRole('link', { name })).toBeVisible()
  }
  // A and B are not friends, so B's feed does not get A's timeline posts
  await a.page.goto('/feed')
  await postIn(a.page, 'Timeline only')
  await b.page.goto('/feed')
  await expect(b.page.getByText('Timeline only')).toHaveCount(0)
})

test('moderators can delete others’ posts; the last admin cannot leave', async ({
  browser,
}) => {
  const a = await userIn(browser, 'gma')
  const b = await userIn(browser, 'gmb')
  const name = `Mods ${Date.now()}`
  const url = await createGroup(a.page, name, 'Public')
  await b.page.goto(url)
  await b.page.getByRole('button', { name: 'Join group' }).click()
  await expect(
    b.page.getByRole('button', { name: 'Leave group' }),
  ).toBeVisible()

  await a.page.goto(url)
  await postIn(a.page, 'Admin says hi')

  // B is a plain member: no Delete on A's post
  await b.page.goto(url)
  const bView = b.page.getByRole('article').filter({ hasText: 'Admin says hi' })
  await expect(bView).toHaveCount(1)
  await expect(bView.getByRole('button', { name: 'Delete' })).toHaveCount(0)

  // A promotes B to moderator
  await a.page.goto(`${url}/members`)
  await a.page.getByLabel(`Role for ${b.user.name}`).selectOption('MODERATOR')
  await a.page
    .getByRole('listitem')
    .filter({ hasText: b.user.name })
    .getByRole('button', { name: 'Change role' })
    .click()
  await expect(
    a.page.getByRole('listitem').filter({ hasText: b.user.name }),
  ).toContainText('Moderator')

  // Now B can delete A's post
  await b.page.goto(url)
  await bView.getByRole('button', { name: 'Delete' }).click()
  await expect(bView).toHaveCount(0)

  // A is the only admin and may not leave
  await a.page.goto(url)
  await a.page.getByRole('button', { name: 'Leave group' }).click()
  await expect(
    a.page.getByText('Promote another admin before leaving'),
  ).toBeVisible()
  await expect(a.page).toHaveURL(url)
})

test('private group: request, approve, and visibility before versus after', async ({
  browser,
}) => {
  const a = await userIn(browser, 'gra')
  const b = await userIn(browser, 'grb')
  const name = `Secret ${Date.now()}`
  const url = await createGroup(a.page, name, 'Private')
  await postIn(a.page, 'Members only')
  const permalink = await a.page
    .getByRole('article')
    .filter({ hasText: 'Members only' })
    .locator('a:has(time)')
    .getAttribute('href')

  // B sees the header but not the posts, and the permalink 404s
  await b.page.goto(url)
  await expect(b.page.getByRole('heading', { level: 1 })).toContainText(name)
  await expect(b.page.getByText('This group is private')).toBeVisible()
  await expect(b.page.getByText('Members only')).toHaveCount(0)
  expect((await b.page.goto(permalink!))?.status()).toBe(404)
  // The roster is private too
  await b.page.goto(`${url}/members`)
  await expect(b.page.getByText('This group is private')).toBeVisible()
  await expect(b.page.getByRole('region', { name: 'Members' })).toHaveCount(0)

  await b.page.goto(url)
  await b.page.getByRole('button', { name: 'Request to join' }).dblclick()
  await expect(
    b.page.getByRole('button', { name: 'Cancel request' }),
  ).toBeVisible()

  // A approves the single request
  await a.page.goto(`${url}/members`)
  const requests = a.page.getByRole('region', { name: 'Join requests' })
  await expect(requests.getByRole('listitem')).toHaveCount(1)
  await requests.getByRole('button', { name: 'Approve' }).click()
  await expect(requests).toContainText('No pending requests')
  await expect(a.page.getByRole('region', { name: 'Members' })).toContainText(
    b.user.name,
  )

  // B now sees the posts and the roster, and can post
  await b.page.goto(`${url}/members`)
  await expect(b.page.getByRole('region', { name: 'Members' })).toContainText(
    a.user.name,
  )
  await b.page.goto(url)
  await expect(b.page.getByText('Members only')).toBeVisible()
  await postIn(b.page, 'Thanks for letting me in')
  expect((await b.page.goto(permalink!))?.status()).toBe(200)
})

test('declining a request, and a stale Approve refreshes to reality', async ({
  browser,
}) => {
  const a = await userIn(browser, 'gda')
  const b = await userIn(browser, 'gdb')
  const url = await createGroup(a.page, `Decline ${Date.now()}`, 'Private')

  await b.page.goto(url)
  await b.page.getByRole('button', { name: 'Request to join' }).click()
  await expect(
    b.page.getByRole('button', { name: 'Cancel request' }),
  ).toBeVisible()

  // A opens the members page; B withdraws; A's Approve must not error or add B
  await a.page.goto(`${url}/members`)
  const requests = a.page.getByRole('region', { name: 'Join requests' })
  await expect(requests.getByRole('button', { name: 'Approve' })).toBeVisible()
  await b.page.getByRole('button', { name: 'Cancel request' }).click()
  await expect(
    b.page.getByRole('button', { name: 'Request to join' }),
  ).toBeVisible()
  await requests.getByRole('button', { name: 'Approve' }).click()
  await expect(requests).toContainText('No pending requests')
  await expect(
    a.page.getByRole('region', { name: 'Members' }),
  ).not.toContainText(b.user.name)

  // Decline flow
  await b.page.getByRole('button', { name: 'Request to join' }).click()
  await expect(
    b.page.getByRole('button', { name: 'Cancel request' }),
  ).toBeVisible()
  await a.page.reload()
  await requests.getByRole('button', { name: 'Decline' }).click()
  await expect(requests).toContainText('No pending requests')
  await b.page.reload()
  await expect(
    b.page.getByRole('button', { name: 'Request to join' }),
  ).toBeVisible()
})

test('making a private group public lets pending requesters in', async ({
  browser,
}) => {
  const a = await userIn(browser, 'goa')
  const b = await userIn(browser, 'gob')
  const url = await createGroup(a.page, `Opening ${Date.now()}`, 'Private')
  await b.page.goto(url)
  await b.page.getByRole('button', { name: 'Request to join' }).click()
  await expect(
    b.page.getByRole('button', { name: 'Cancel request' }),
  ).toBeVisible()

  await a.page.goto(`${url}/settings`)
  await a.page.getByRole('radio', { name: 'Public' }).check()
  await a.page.getByRole('button', { name: 'Save' }).click()
  await expect(a.page).toHaveURL(url)

  await b.page.reload()
  await expect(
    b.page.getByRole('button', { name: 'Leave group' }),
  ).toBeVisible()
})

test('a removed member’s stale composer is rejected; admins can delete the group', async ({
  browser,
}) => {
  const a = await userIn(browser, 'gxa')
  const b = await userIn(browser, 'gxb')
  const url = await createGroup(a.page, `Gone ${Date.now()}`, 'Public')
  await b.page.goto(url)
  await b.page.getByRole('button', { name: 'Join group' }).click()
  await expect(b.page.getByLabel("What's on your mind?")).toBeVisible()

  // A removes B while B's page still shows the composer
  await a.page.goto(`${url}/members`)
  await a.page
    .getByRole('listitem')
    .filter({ hasText: b.user.name })
    .getByRole('button', { name: 'Remove' })
    .click()
  await expect(
    a.page.getByRole('listitem').filter({ hasText: b.user.name }),
  ).toHaveCount(0)

  await b.page.getByLabel("What's on your mind?").fill('Still here?')
  await b.page.getByRole('button', { name: 'Post' }).click()
  await expect(
    b.page.getByText('You must be a member to post here'),
  ).toBeVisible()

  // Settings are admin-only, then the admin deletes the group
  expect((await b.page.goto(`${url}/settings`))?.status()).toBe(404)
  await a.page.goto(`${url}/settings`)
  await a.page.getByLabel('I understand, delete this group').check()
  await a.page.getByRole('button', { name: 'Delete group' }).click()
  await expect(a.page).toHaveURL(/\/groups$/)
  expect((await a.page.goto(url))?.status()).toBe(404)
})

test('two admins leaving at the same instant cannot leave the group without an admin', async ({
  browser,
}) => {
  // Three users and many round-trips: give this one triple the usual budget.
  test.slow()
  const a = await userIn(browser, 'gla')
  const b = await userIn(browser, 'glb')
  const url = await createGroup(a.page, `Race ${Date.now()}`, 'Public')
  await b.page.goto(url)
  await b.page.getByRole('button', { name: 'Join group' }).click()
  await expect(
    b.page.getByRole('button', { name: 'Leave group' }),
  ).toBeVisible()

  await a.page.goto(`${url}/members`)
  await a.page.getByLabel(`Role for ${b.user.name}`).selectOption('ADMIN')
  await a.page
    .getByRole('listitem')
    .filter({ hasText: b.user.name })
    .getByRole('button', { name: 'Change role' })
    .click()
  await expect(
    a.page.getByRole('listitem').filter({ hasText: b.user.name }),
  ).toContainText('Admin')

  // Both admins click Leave at once; exactly one may succeed
  await a.page.goto(url)
  await b.page.goto(url)
  await Promise.all([
    a.page.getByRole('button', { name: 'Leave group' }).click(),
    b.page.getByRole('button', { name: 'Leave group' }).click(),
  ])
  const outcome = async (page: Page) => {
    await expect
      .poll(
        async () =>
          /\/groups$/.test(page.url()) ||
          (await page
            .getByText('Promote another admin before leaving')
            .count()) > 0,
      )
      .toBe(true)
    return /\/groups$/.test(page.url()) ? 'left' : 'blocked'
  }
  const results = await Promise.all([outcome(a.page), outcome(b.page)])
  expect(results.filter((r) => r === 'left')).toHaveLength(1)
  const stayer = results[0] === 'blocked' ? a.page : b.page
  await stayer.goto(`${url}/members`)
  await expect(stayer.getByRole('region', { name: 'Members' })).toContainText(
    'Admin',
  )
})
