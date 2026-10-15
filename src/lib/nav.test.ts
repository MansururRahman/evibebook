import { describe, expect, it } from 'vitest'
import { isActive } from './nav'

describe('isActive', () => {
  it('matches the exact route', () => {
    expect(isActive('/feed', '/feed')).toBe(true)
    expect(isActive('/friends', '/friends')).toBe(true)
    expect(isActive('/people', '/people')).toBe(true)
  })

  it('does not match a different route', () => {
    expect(isActive('/groups', '/feed')).toBe(false)
    expect(isActive('/feed', '/friends')).toBe(false)
  })

  it('treats groups as covering group sub-routes and group pages', () => {
    expect(isActive('/groups/new', '/groups')).toBe(true)
    expect(isActive('/g/hiking', '/groups')).toBe(true)
    expect(isActive('/g/hiking/members', '/groups')).toBe(true)
  })

  it('treats pages as covering page sub-routes but not posts or people', () => {
    expect(isActive('/pages/new', '/pages')).toBe(true)
    expect(isActive('/pages/acme/team', '/pages')).toBe(true)
    expect(isActive('/p/abc', '/pages')).toBe(false)
    expect(isActive('/people', '/pages')).toBe(false)
  })

  it('treats messages and notifications as covering their sub-routes', () => {
    expect(isActive('/messages/alice', '/messages')).toBe(true)
    expect(isActive('/notifications', '/notifications')).toBe(true)
  })

  it('does not match a route that merely shares a prefix', () => {
    expect(isActive('/friendship', '/friends')).toBe(false)
    expect(isActive('/feedback', '/feed')).toBe(false)
  })
})
