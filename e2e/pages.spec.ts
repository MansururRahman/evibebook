import { expect, test, type Browser, type Page } from '@playwright/test'
import { newUser, signUp, type TestUser } from './helpers'

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

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

async function createPage(
  page: Page,
  name: string,
  withAvatar = false,
): Promise<string> {
  await page.goto('/pages/new')
  await page.getByLabel('Page name').fill(name)
  await page.getByLabel('Description').fill(`About ${name}`)
  if (withAvatar) {
    await page
      .getByLabel('Avatar')
      .setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG_1x1 })
  }
  await page.getByRole('button', { name: 'Create page' }).click()
  await expect(page).toHaveURL(/\/pages\/[a-z0-9-]+$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name)
  return page.url()
}

async function postAs(page: Page, body: string) {
  await page.getByLabel("What's on your mind?").fill(body)
  await page.getByRole('button', { name: 'Post' }).click()
  await expect(page.getByRole('article').filter({ hasText: body })).toHaveCount(
    1,
  )
}

async function addToTeam(
  admin: Page,
  url: string,
  username: string,
  role: 'Editor' | 'Admin',
) {
  await admin.goto(`${url}/team`)
  await admin.getByLabel('Username').fill(username)
  await admin.getByLabel('Role', { exact: true }).selectOption({ label: role })
  await admin.getByRole('button', { name: 'Add to team' }).click()
  await expect(
    admin.getByRole('region', { name: 'Team' }).getByRole('listitem'),
  ).toHaveCount(2)
}

test('create a page with an avatar; it is listed and the avatar is served', async ({
  browser,
}) => {
  const a = await userIn(browser, 'pga')
  const name = `Bakery ${Date.now()}`
  const url = await createPage(a.page, name, true)
  const src = await a.page
    .getByRole('img', { name })
    .first()
    .getAttribute('src')
  expect(src).toMatch(/^\/uploads\/avatars\/.+\.png$/)
  expect((await a.page.request.get(src!)).status()).toBe(200)

  await a.page.goto('/pages')
  const mine = a.page.getByRole('region', { name: 'Your pages' })
  await expect(mine).toContainText(name)
  await expect(mine).toContainText('Admin')
  // The creator auto-follows, so the page is also under Following
  await expect(a.page.getByRole('region', { name: 'Following' })).toContainText(
    name,
  )
  expect(url).toMatch(/\/pages\/bakery-\d+$/)
})

test('followers see page posts as the page; the admin profile does not show them', async ({
  browser,
}) => {
  const a = await userIn(browser, 'pfa')
  const b = await userIn(browser, 'pfb')
  const name = `Cafe ${Date.now()}`
  const url = await createPage(a.page, name)

  await b.page.goto(`/pages?q=${encodeURIComponent(name.slice(0, 8))}`)
  const row = b.page
    .getByRole('region', { name: 'Find pages' })
    .getByRole('listitem')
    .filter({ hasText: name })
  await row.getByRole('button', { name: 'Follow', exact: true }).click()
  await expect(row.getByRole('button', { name: 'Unfollow' })).toBeVisible()

  await a.page.goto(url)
  await postAs(a.page, 'Fresh bread at 7')
  // The permalink's title names the page, never the acting admin
  const permalink = await a.page
    .getByRole('article')
    .filter({ hasText: 'Fresh bread at 7' })
    .locator('a:has(time)')
    .getAttribute('href')
  await a.page.goto(permalink!)
  await expect(a.page).toHaveTitle(new RegExp(`Post by ${name}`))
  expect(await a.page.title()).not.toContain(a.user.name)

  await b.page.goto('/feed')
  const article = b.page
    .getByRole('article')
    .filter({ hasText: 'Fresh bread at 7' })
  await expect(article).toHaveCount(1)
  await expect(article.getByRole('link', { name })).toBeVisible()
  await expect(article).not.toContainText(a.user.name)

  // Page posts belong to the page, not the person
  await b.page.goto(`/u/${a.user.username}`)
  await expect(b.page.getByText('Fresh bread at 7')).toHaveCount(0)
  await a.page.goto(`/u/${a.user.username}`)
  await expect(a.page.getByText('Fresh bread at 7')).toHaveCount(0)

  // Unfollowing removes the page's posts from the feed
  await b.page.goto(url)
  await b.page.getByRole('button', { name: 'Unfollow' }).click()
  await expect(
    b.page.getByRole('button', { name: 'Follow', exact: true }),
  ).toBeVisible()
  await b.page.goto('/feed')
  await expect(b.page.getByText('Fresh bread at 7')).toHaveCount(0)
})

test('editors post as the page; outsiders cannot; a removed editor is refused', async ({
  browser,
}) => {
  // Three users and many round-trips: give this one triple the usual budget.
  test.slow()
  const a = await userIn(browser, 'pea')
  const b = await userIn(browser, 'peb')
  const c = await userIn(browser, 'pec')
  const name = `Studio ${Date.now()}`
  const url = await createPage(a.page, name)

  // C is not on the team: no composer, team page 404
  await c.page.goto(url)
  await expect(c.page.getByLabel("What's on your mind?")).toHaveCount(0)
  expect((await c.page.goto(`${url}/team`))?.status()).toBe(404)

  // Unknown username gives a readable message
  await a.page.goto(`${url}/team`)
  await a.page.getByLabel('Username').fill('nobody_here_xyz')
  await a.page.getByRole('button', { name: 'Add to team' }).click()
  await expect(a.page.getByText('No user with that username')).toBeVisible()

  // Two successful adds in a row; the form clears after each one
  await addToTeam(a.page, url, b.user.username, 'Editor')
  await expect(a.page.getByLabel('Username')).toHaveValue('')
  await a.page.getByLabel('Username').fill(c.user.username)
  await a.page.getByRole('button', { name: 'Add to team' }).click()
  await expect(
    a.page.getByRole('region', { name: 'Team' }).getByRole('listitem'),
  ).toHaveCount(3)
  await expect(a.page.getByLabel('Username')).toHaveValue('')

  // Adding again is refused
  await a.page.getByLabel('Username').fill(b.user.username)
  await a.page.getByRole('button', { name: 'Add to team' }).click()
  await expect(a.page.getByText('Already on the team')).toBeVisible()

  await b.page.goto(url)
  await postAs(b.page, 'Editor here')
  await expect(
    b.page
      .getByRole('article')
      .filter({ hasText: 'Editor here' })
      .getByRole('link', { name }),
  ).toBeVisible()

  // B opens the page in a second tab, then A removes B; the stale composer is refused
  const stale = await b.page.context().newPage()
  await stale.goto(url)
  await expect(stale.getByLabel("What's on your mind?")).toBeVisible()
  await a.page.goto(`${url}/team`)
  await a.page
    .getByRole('listitem')
    .filter({ hasText: b.user.name })
    .getByRole('button', { name: 'Remove' })
    .click()
  await expect(
    a.page.getByRole('region', { name: 'Team' }).getByRole('listitem'),
  ).toHaveCount(2)
  await stale.getByLabel("What's on your mind?").fill('Still an editor?')
  await stale.getByRole('button', { name: 'Post' }).click()
  await expect(
    stale.getByText("You must be on the page's team to post here"),
  ).toBeVisible()
})

test('the sole admin cannot demote themselves until another admin exists', async ({
  browser,
}) => {
  const a = await userIn(browser, 'pda')
  const b = await userIn(browser, 'pdb')
  const url = await createPage(a.page, `Club ${Date.now()}`)
  await addToTeam(a.page, url, b.user.username, 'Editor')

  const ownRow = a.page.getByRole('listitem').filter({ hasText: a.user.name })
  await a.page.getByLabel(`Role for ${a.user.name}`).selectOption('EDITOR')
  await ownRow.getByRole('button', { name: 'Change role' }).click()
  await expect(ownRow.getByText('Add another admin first')).toBeVisible()

  const bRow = a.page.getByRole('listitem').filter({ hasText: b.user.name })
  await a.page.getByLabel(`Role for ${b.user.name}`).selectOption('ADMIN')
  await bRow.getByRole('button', { name: 'Change role' }).click()
  await expect(a.page.getByLabel(`Role for ${b.user.name}`)).toHaveValue(
    'ADMIN',
  )

  await a.page.getByLabel(`Role for ${a.user.name}`).selectOption('EDITOR')
  await ownRow.getByRole('button', { name: 'Change role' }).click()
  await expect(a.page.getByLabel(`Role for ${a.user.name}`)).toHaveCount(0)
  await expect(ownRow).toContainText('Editor')
})

test('an admin can delete the page', async ({ browser }) => {
  const a = await userIn(browser, 'pxa')
  const b = await userIn(browser, 'pxb')
  const url = await createPage(a.page, `Gone ${Date.now()}`)
  await postAs(a.page, 'Last post')
  expect((await b.page.goto(`${url}/settings`))?.status()).toBe(404)

  await a.page.goto(`${url}/settings`)
  await a.page.getByLabel('I understand, delete this page').check()
  await a.page.getByRole('button', { name: 'Delete page' }).click()
  await expect(a.page).toHaveURL(/\/pages$/)
  expect((await a.page.goto(url))?.status()).toBe(404)
})
