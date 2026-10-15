import { expect, type Page } from '@playwright/test'

export type TestUser = {
  email: string
  username: string
  name: string
  password: string
}

/** Every user the e2e suite creates uses this domain so global-teardown can remove them. */
export const E2E_EMAIL_DOMAIN = 'e2e.test'

export function newUser(prefix: string): TestUser {
  const tag = `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
  return {
    email: `${tag}@${E2E_EMAIL_DOMAIN}`,
    username: tag.slice(0, 20),
    name: `${prefix} Test`,
    password: 'password123',
  }
}

export async function signUp(page: Page, user: TestUser) {
  await page.goto('/signup')
  await page.getByLabel('Name', { exact: true }).fill(user.name)
  await page.getByLabel('Username').fill(user.username)
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/feed$/)
}

export async function logIn(
  page: Page,
  user: Pick<TestUser, 'email' | 'password'>,
) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL(/\/feed$/)
}

export async function logOut(page: Page) {
  await openAccountMenu(page)
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/login$/)
}

/** Opens the avatar dropdown at the top right (profile, settings, log out). */
export async function openAccountMenu(page: Page) {
  await page.getByRole('button', { name: 'Account menu' }).click()
  await expect(page.getByRole('menu')).toBeVisible()
}
