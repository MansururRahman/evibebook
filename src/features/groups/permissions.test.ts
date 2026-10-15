import { describe, expect, it } from 'vitest'
import {
  canChangeRole,
  canDeleteGroupPost,
  canLeave,
  canManage,
  canModerate,
  canRemoveMember,
  isGroupRole,
} from './permissions'

const admin = { id: 'admin', role: 'ADMIN' as const }
const mod = { id: 'mod', role: 'MODERATOR' as const }
const member = { id: 'member', role: 'MEMBER' as const }
const admin2 = { id: 'admin2', role: 'ADMIN' as const }

describe('isGroupRole', () => {
  it('accepts the three roles and nothing else', () => {
    expect(isGroupRole('ADMIN')).toBe(true)
    expect(isGroupRole('MODERATOR')).toBe(true)
    expect(isGroupRole('MEMBER')).toBe(true)
    expect(isGroupRole('OWNER')).toBe(false)
    expect(isGroupRole(null)).toBe(false)
  })
})

describe('canModerate / canManage', () => {
  it('moderators and admins moderate; only admins manage', () => {
    expect(canModerate('ADMIN')).toBe(true)
    expect(canModerate('MODERATOR')).toBe(true)
    expect(canModerate('MEMBER')).toBe(false)
    expect(canModerate(null)).toBe(false)
    expect(canManage('ADMIN')).toBe(true)
    expect(canManage('MODERATOR')).toBe(false)
    expect(canManage(null)).toBe(false)
  })
})

describe('canDeleteGroupPost', () => {
  it('allows the author, moderators and admins', () => {
    expect(canDeleteGroupPost('member', 'member', 'MEMBER')).toBe(true)
    expect(canDeleteGroupPost('mod', 'member', 'MODERATOR')).toBe(true)
    expect(canDeleteGroupPost('admin', 'member', 'ADMIN')).toBe(true)
  })
  it('denies other members and non-members', () => {
    expect(canDeleteGroupPost('other', 'member', 'MEMBER')).toBe(false)
    expect(canDeleteGroupPost('other', 'member', null)).toBe(false)
  })
})

describe('canRemoveMember', () => {
  it('moderators remove plain members only', () => {
    expect(canRemoveMember(mod, member)).toBe(true)
    expect(canRemoveMember(mod, { id: 'mod2', role: 'MODERATOR' })).toBe(false)
    expect(canRemoveMember(mod, admin)).toBe(false)
  })
  it('admins remove anyone but themselves', () => {
    expect(canRemoveMember(admin, member)).toBe(true)
    expect(canRemoveMember(admin, mod)).toBe(true)
    expect(canRemoveMember(admin, admin2)).toBe(true)
    expect(canRemoveMember(admin, admin)).toBe(false)
  })
  it('members remove no one', () => {
    expect(canRemoveMember(member, { id: 'm2', role: 'MEMBER' })).toBe(false)
  })
})

describe('canChangeRole', () => {
  it('only admins, and never their own role', () => {
    expect(canChangeRole(admin, 'member')).toBe(true)
    expect(canChangeRole(admin, 'admin')).toBe(false)
    expect(canChangeRole(mod, 'member')).toBe(false)
  })
})

describe('canLeave', () => {
  it('blocks the last admin and nobody else', () => {
    expect(canLeave('ADMIN', 1)).toBe(false)
    expect(canLeave('ADMIN', 2)).toBe(true)
    expect(canLeave('MODERATOR', 1)).toBe(true)
    expect(canLeave('MEMBER', 1)).toBe(true)
  })
})
