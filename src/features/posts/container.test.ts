import { describe, expect, it } from 'vitest'
import { postContainer } from './container'

function form(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

describe('postContainer', () => {
  it('is a timeline post when neither field is set or both are empty', () => {
    expect(postContainer(form({}))).toEqual({ groupId: null, pageId: null })
    expect(postContainer(form({ groupId: '', pageId: '' }))).toEqual({
      groupId: null,
      pageId: null,
    })
  })

  it('passes through a single container', () => {
    expect(postContainer(form({ groupId: 'g1' }))).toEqual({
      groupId: 'g1',
      pageId: null,
    })
    expect(postContainer(form({ pageId: 'p1' }))).toEqual({
      groupId: null,
      pageId: 'p1',
    })
  })

  it('refuses a post that names both a group and a page', () => {
    expect(postContainer(form({ groupId: 'g1', pageId: 'p1' }))).toEqual({
      error: 'A post belongs to a group or a page, not both',
    })
  })
})
