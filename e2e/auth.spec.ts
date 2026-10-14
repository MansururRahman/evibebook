import { expect, test } from '@playwright/test'
import { logIn, logOut, newUser, signUp } from './helpers'

test('visiting the app logged out redirects to login', async ({ page }) => {
  await page.goto('/feed')
  await expect(page).toHaveURL(/\/login/)
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
})

test('sign up, log out, log in again', async ({ page }) => {
  const user = newUser('auth')
  await signUp(page, user)
  await expect(page.getByRole('navigation')).toContainText(user.name)

  await logOut(page)
  await page.goto('/feed')
  await expect(page).toHaveURL(/\/login/)

  await logIn(page, user)
  await expect(page.getByRole('navigation')).toContainText(user.name)

  // Already logged in: auth pages bounce to the feed
  await page.goto('/login')
  await expect(page).toHaveURL(/\/feed$/)
})

test('wrong password shows a generic error', async ({ page }) => {
  const user = newUser('badpw')
  await signUp(page, user)
  await logOut(page)
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('wrong-password')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Invalid email or password' }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test('duplicate email and username show field errors', async ({ page }) => {
  const user = newUser('dup')
  await signUp(page, user)
  await logOut(page)
  await page.goto('/signup')
  await page.getByLabel('Name', { exact: true }).fill('Someone Else')
  await page.getByLabel('Username').fill(user.username)
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('already')).toBeVisible()
  await expect(page).toHaveURL(/\/signup/)
})
