import { expect, test } from '@playwright/test'
import { newUser, signUp } from './helpers'

test('liking a post toggles the count and button label', async ({ page }) => {
  const user = newUser('like')
  await signUp(page, user)
  await page.getByLabel("What's on your mind?").fill('Like me')
  await page.getByRole('button', { name: 'Post' }).click()
  const article = page.getByRole('article').filter({ hasText: 'Like me' })
  await expect(article).toContainText('0 likes')

  await article.getByRole('button', { name: 'Like', exact: true }).click()
  await expect(article).toContainText('1 like')
  await expect(article.getByRole('button', { name: 'Unlike' })).toBeVisible()

  await article.getByRole('button', { name: 'Unlike' }).click()
  await expect(article).toContainText('0 likes')
  await expect(
    article.getByRole('button', { name: 'Like', exact: true }),
  ).toBeVisible()
})

test('comments can be added and removed by their author', async ({ page }) => {
  const user = newUser('cmt')
  await signUp(page, user)
  await page.getByLabel("What's on your mind?").fill('Comment on this')
  await page.getByRole('button', { name: 'Post' }).click()
  const article = page
    .getByRole('article')
    .filter({ hasText: 'Comment on this' })

  await article.getByLabel('Write a comment').fill('First!')
  await article.getByRole('button', { name: 'Comment', exact: true }).click()
  const comments = article.getByRole('list', { name: 'Comments' })
  await expect(comments.getByRole('listitem')).toHaveCount(1)
  await expect(comments).toContainText('First!')
  await expect(comments).toContainText(user.name)
  await expect(article).toContainText('1 comment')

  await comments.getByRole('button', { name: 'Delete comment' }).click()
  await expect(comments.getByRole('listitem')).toHaveCount(0)
  await expect(article).toContainText('0 comments')
})

test('an empty comment is rejected', async ({ page }) => {
  const user = newUser('ecmt')
  await signUp(page, user)
  await page.getByLabel("What's on your mind?").fill('No empty comments')
  await page.getByRole('button', { name: 'Post' }).click()
  const article = page
    .getByRole('article')
    .filter({ hasText: 'No empty comments' })
  await article.getByRole('button', { name: 'Comment', exact: true }).click()
  await expect(
    article.getByText('Write a comment', { exact: true }),
  ).toHaveCount(1) // the label only
  await expect(
    article.getByRole('list', { name: 'Comments' }).getByRole('listitem'),
  ).toHaveCount(0)
})
