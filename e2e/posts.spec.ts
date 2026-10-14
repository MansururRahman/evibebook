import { expect, test } from '@playwright/test'
import { newUser, signUp } from './helpers'

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

test('create a text post and an image post; both show at the top of the feed', async ({
  page,
}) => {
  const user = newUser('post')
  await signUp(page, user)

  const first = `First words ${Date.now()}`
  await page.getByLabel("What's on your mind?").fill(first)
  await page.getByRole('button', { name: 'Post' }).click()
  await expect(page.getByRole('article').first()).toContainText(first)

  await page.getByLabel("What's on your mind?").fill('Look at this')
  await page
    .getByLabel('Image')
    .setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: PNG_1x1 })
  await page.getByRole('button', { name: 'Post' }).click()

  const top = page.getByRole('article').first()
  await expect(top).toContainText('Look at this')
  const src = await top
    .getByRole('img', { name: 'Post image' })
    .getAttribute('src')
  expect(src).toMatch(/^\/uploads\/posts\/.+\.png$/)
  expect((await page.request.get(src!)).status()).toBe(200)

  // The earlier post is now second
  await expect(page.getByRole('article').nth(1)).toContainText(first)
})

test('an empty post is rejected', async ({ page }) => {
  const user = newUser('empty')
  await signUp(page, user)
  await page.getByRole('button', { name: 'Post' }).click()
  await expect(page.getByText('Write something or add an image')).toBeVisible()
})

test('the feed only shows your own posts until you have friends', async ({
  page,
}) => {
  const user = newUser('lonely')
  await signUp(page, user)
  await page.getByLabel("What's on your mind?").fill('Only me here')
  await page.getByRole('button', { name: 'Post' }).click()
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(page.getByRole('article')).toContainText('Only me here')
  // Seeded users have posts, but none of them are friends with this user
  await expect(page.getByText('Golden hour over the fjord')).toHaveCount(0)

  // Strangers' profiles do not expose their posts
  await page.goto('/u/bob')
  await expect(page.getByText('Add friend to see posts')).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(0)

  // Your own profile does
  await page.goto(`/u/${user.username}`)
  await expect(page.getByRole('article')).toContainText('Only me here')
})

test('the author can delete a post', async ({ page }) => {
  const user = newUser('del')
  await signUp(page, user)
  await page.getByLabel("What's on your mind?").fill('Temporary thought')
  await page.getByRole('button', { name: 'Post' }).click()
  const article = page
    .getByRole('article')
    .filter({ hasText: 'Temporary thought' })
  await expect(article).toHaveCount(1)
  await article.getByRole('button', { name: 'Delete' }).click()
  await expect(
    page.getByRole('article').filter({ hasText: 'Temporary thought' }),
  ).toHaveCount(0)
})

test('an oversized image is rejected before it is uploaded', async ({
  page,
}) => {
  const user = newUser('big')
  await signUp(page, user)
  const sixMb = Buffer.alloc(6 * 1024 * 1024, 1)
  await page
    .getByLabel('Image')
    .setInputFiles({ name: 'huge.png', mimeType: 'image/png', buffer: sixMb })
  await expect(page.getByText('Images must be 5 MB or smaller')).toBeVisible()
  await page.getByLabel("What's on your mind?").fill('Should not post')
  await expect(page.getByRole('button', { name: 'Post' })).toBeDisabled()
  await expect(
    page.getByRole('article').filter({ hasText: 'Should not post' }),
  ).toHaveCount(0)
})
