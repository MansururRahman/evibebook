import { expect, type Page } from '@playwright/test'

export type TestUser = {
  email: string
  username: string
  name: string
  password: string
}

export function newUser(prefix: string): TestUser {
  const tag = `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
  return {
    email: `${tag}@example.com`,
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
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/login$/)
}
