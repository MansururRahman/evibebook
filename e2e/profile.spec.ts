import { expect, test } from '@playwright/test'
import { newUser, signUp } from './helpers'

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

test('own profile shows name, handle, and an edit link', async ({ page }) => {
  const user = newUser('prof')
  await signUp(page, user)
  await page.goto(`/u/${user.username}`)
  await expect(page.getByRole('heading', { name: user.name })).toBeVisible()
  await expect(page.getByText(`@${user.username}`)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Edit profile' })).toBeVisible()
})

test('editing name, bio and avatar is reflected on the profile and navbar', async ({
  page,
}) => {
  const user = newUser('edit')
  await signUp(page, user)
  await page.goto('/settings/profile')
  await page.getByLabel('Name', { exact: true }).fill('Renamed Person')
  await page.getByLabel('Bio').fill('I climb rocks.')
  await page
    .getByLabel('Avatar')
    .setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG_1x1 })
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page).toHaveURL(new RegExp(`/u/${user.username}$`))
  await expect(
    page.getByRole('heading', { name: 'Renamed Person' }),
  ).toBeVisible()
  await expect(page.getByText('I climb rocks.')).toBeVisible()
  await expect(page.getByRole('navigation')).toContainText('Renamed Person')

  const avatar = page.getByRole('img', { name: 'Renamed Person' }).first()
  const src = await avatar.getAttribute('src')
  expect(src).toMatch(/^\/uploads\/avatars\/.+\.png$/)
  const res = await page.request.get(src!)
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toBe('image/png')
})

test('unknown usernames 404 and other profiles have no edit link', async ({
  page,
}) => {
  const user = newUser('view')
  await signUp(page, user)
  const res = await page.goto('/u/this_user_does_not_exist')
  expect(res?.status()).toBe(404)
  await page.goto('/u/alice')
  await expect(
    page.getByRole('heading', { name: 'Alice Andersen' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Edit profile' })).toHaveCount(0)
})

test('upload route refuses path traversal and missing files', async ({
  page,
}) => {
  const user = newUser('trav')
  await signUp(page, user)
  expect((await page.request.get('/uploads/avatars/nope.png')).status()).toBe(
    404,
  )
  expect((await page.request.get('/uploads/..%2F.env')).status()).toBe(404)
})

test('uploads are served with nosniff so a browser cannot reinterpret them', async ({
  page,
}) => {
  const user = newUser('sniff')
  await signUp(page, user)
  await page.goto('/settings/profile')
  await page
    .getByLabel('Avatar')
    .setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG_1x1 })
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(new RegExp(`/u/${user.username}$`))
  const src = await page
    .getByRole('img', { name: user.name })
    .first()
    .getAttribute('src')
  const res = await page.request.get(src!)
  expect(res.headers()['x-content-type-options']).toBe('nosniff')
})

test('a file that claims to be an image but is not is rejected', async ({
  page,
}) => {
  const user = newUser('forge')
  await signUp(page, user)
  await page.goto('/settings/profile')
  await page.getByLabel('Avatar').setInputFiles({
    name: 'evil.png',
    mimeType: 'image/png',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
  })
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('That file is not a valid image')).toBeVisible()
  await expect(page).toHaveURL(/\/settings\/profile/)
})
