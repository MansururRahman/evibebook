import { describe, expect, it } from 'vitest'
import {
  canChangeTeamRole,
  canManagePage,
  canPostAsPage,
  canRemoveTeamMember,
  isPageRole,
  keepsAnAdmin,
} from './permissions'

const admin = { id: 'admin', role: 'ADMIN' as const }
const editor = { id: 'editor', role: 'EDITOR' as const }

describe('isPageRole', () => {
  it('accepts ADMIN and EDITOR only', () => {
    expect(isPageRole('ADMIN')).toBe(true)
    expect(isPageRole('EDITOR')).toBe(true)
    expect(isPageRole('MEMBER')).toBe(false)
    expect(isPageRole(undefined)).toBe(false)
  })
})

describe('canPostAsPage / canManagePage', () => {
  it('any team role posts; only admins manage', () => {
    expect(canPostAsPage('ADMIN')).toBe(true)
    expect(canPostAsPage('EDITOR')).toBe(true)
    expect(canPostAsPage(null)).toBe(false)
    expect(canManagePage('ADMIN')).toBe(true)
    expect(canManagePage('EDITOR')).toBe(false)
    expect(canManagePage(null)).toBe(false)
  })
})

describe('canRemoveTeamMember', () => {
  it('admins remove anyone including themselves; editors only themselves', () => {
    expect(canRemoveTeamMember(admin, 'editor')).toBe(true)
    expect(canRemoveTeamMember(admin, 'admin')).toBe(true)
    expect(canRemoveTeamMember(editor, 'editor')).toBe(true)
    expect(canRemoveTeamMember(editor, 'admin')).toBe(false)
  })
})

describe('canChangeTeamRole', () => {
  it('only admins', () => {
    expect(canChangeTeamRole(admin)).toBe(true)
    expect(canChangeTeamRole(editor)).toBe(false)
  })
})

describe('keepsAnAdmin', () => {
  it('refuses removing or demoting the last admin', () => {
    expect(keepsAnAdmin('ADMIN', 1, null)).toBe(false)
    expect(keepsAnAdmin('ADMIN', 1, 'EDITOR')).toBe(false)
    expect(keepsAnAdmin('ADMIN', 2, null)).toBe(true)
    expect(keepsAnAdmin('ADMIN', 2, 'EDITOR')).toBe(true)
  })
  it('never objects to changes on editors or to promotions', () => {
    expect(keepsAnAdmin('EDITOR', 1, null)).toBe(true)
    expect(keepsAnAdmin('EDITOR', 1, 'ADMIN')).toBe(true)
    expect(keepsAnAdmin('ADMIN', 1, 'ADMIN')).toBe(true)
  })
})
