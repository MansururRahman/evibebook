# Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An in-app notifications list and navbar badge for friend requests and acceptances, reactions and comments on your posts, group join requests and approvals, and page team additions.

**Architecture:** One `Notification` table keyed by recipient, with the actor, a precomputed `href`, an optional short `subject`, and a nullable `dedupeKey` (unique per recipient) so repeated reactions by the same person on the same post collapse into one row. A `notify()` service is called from the existing friend, post, group and page actions and never throws. `/notifications` lists the newest 50, marks all read during render, and reuses `ThreadRefresher` to refresh the badge once.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 7 + PostgreSQL, Tailwind, Vitest (pure units), Playwright (e2e).

**Spec:** `docs/superpowers/specs/2026-10-15-notifications-design.md`

## Global Constraints

- Follow `AGENTS.md`; run `pnpm exec next typegen` if a new route's `PageProps` type is unknown.
- Never notify yourself. `notify` must never throw to its caller.
- Seven types exactly: `FRIEND_REQUEST`, `FRIEND_ACCEPTED`, `REACTION`, `COMMENT`, `GROUP_JOIN_REQUEST`, `GROUP_JOIN_APPROVED`, `PAGE_TEAM_ADDED`. Dedupe keys only for `REACTION`, `FRIEND_REQUEST`, `GROUP_JOIN_REQUEST`.
- `subject` ≤ 80 chars. List shows the newest 50.
- After `prisma migrate dev`, check `ls src/generated/prisma/models` contains `Notification.ts`; if not run `pnpm prisma generate`; then restart `next dev`.
- Heredocs with backticks: use the Write tool or a Python patch. `pnpm lint` is slow: background it. Playwright role names are substring matches: use `exact: true` where labels overlap ("Notifications" vs nothing else here, but "Message"/"Messages" exists).
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Do not commit `prisma/schema.sql`.

## Review Focus

1. Reacting to your own post, commenting on it, or being auto-accepted into your own group must create no notification; test in Task 2 (`notify` skips self is in the service — covered by e2e test 2) and e2e test 2.
2. Changing a reaction (Like → Love) must update the single existing row, not add a second; test in Task 2 (`dedupeKeyFor`) and e2e test 2 (exactly one reaction row).
3. A failing notification write must not fail the user's action (e.g. the actor row missing): test by unit-testing the service's catch path with a stubbed Prisma call is out of scope; instead the service wraps in try/catch and logs — reviewer to inspect.
4. Opening `/notifications` must clear the badge immediately, not after the next navigation; test in e2e test 1 (badge gone within 8 s).
5. Deleting the actor or recipient must remove rows (cascade), so the list never shows "undefined sent you…"; Task 1 schema cascades; the teardown's user deletion exercises it.

---

### Task 1: Schema and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_notifications/migration.sql` (generated)

- [ ] **Step 1: Edit the schema**

Add to `User` after `sentMessages`:

```prisma
  notifications     Notification[] @relation("NotificationRecipient")
  notificationsSent Notification[] @relation("NotificationActor")
```

Append:

```prisma
enum NotificationType {
  FRIEND_REQUEST
  FRIEND_ACCEPTED
  REACTION
  COMMENT
  GROUP_JOIN_REQUEST
  GROUP_JOIN_APPROVED
  PAGE_TEAM_ADDED
}

/// Something that happened to `userId`, caused by `actorId`. `href` is where
/// the row links; `subject` is a short excerpt so the row reads well without
/// joining the target. `dedupeKey` collapses repeats (one REACTION per actor
/// per post); null when repeats are fine.
model Notification {
  id        String           @id @default(cuid())
  userId    String
  type      NotificationType
  actorId   String
  href      String
  subject   String?          @db.VarChar(80)
  dedupeKey String?
  createdAt DateTime         @default(now())
  readAt    DateTime?

  user  User @relation("NotificationRecipient", fields: [userId], references: [id], onDelete: Cascade)
  actor User @relation("NotificationActor", fields: [actorId], references: [id], onDelete: Cascade)

  @@unique([userId, dedupeKey])
  @@index([userId, readAt])
  @@index([userId, createdAt(sort: Desc)])
}
```

- [ ] **Step 2: Validate, migrate, generate, restart, typecheck, test**

Run: `pnpm prisma validate && pnpm prisma migrate dev --name notifications`
Expected: in sync; new migration folder.
Run: `ls src/generated/prisma/models | grep -c Notification` → `1`, else `pnpm prisma generate`.
Restart the dev server. Run: `pnpm typecheck && pnpm test` → clean, 100/100.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Add Notification table

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Pure rules

**Files:**
- Create: `src/features/notifications/rules.ts`, `src/features/notifications/rules.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const NOTIFICATION_TYPES = [...7] as const
  export type NotificationType = (typeof NOTIFICATION_TYPES)[number]
  export function describe(type: NotificationType, actorName: string, subject: string | null): string
  export function dedupeKeyFor(type: NotificationType, actorId: string, targetId: string | null): string | null
  export const SUBJECT_MAX = 80
  export function subjectFrom(text: string | null | undefined): string | null
  ```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe as group, expect, it } from 'vitest'
import { dedupeKeyFor, describe, subjectFrom } from './rules'

group('describe', () => {
  it('reads naturally for every type', () => {
    expect(describe('FRIEND_REQUEST', 'Carol Chen', null)).toBe('Carol Chen sent you a friend request')
    expect(describe('FRIEND_ACCEPTED', 'Alice Andersen', null)).toBe('Alice Andersen accepted your friend request')
    expect(describe('REACTION', 'Bob Berg', 'Golden hour')).toBe('Bob Berg reacted to your post “Golden hour”')
    expect(describe('REACTION', 'Bob Berg', null)).toBe('Bob Berg reacted to your post')
    expect(describe('COMMENT', 'Dave Dahl', 'Hello')).toBe('Dave Dahl commented on your post “Hello”')
    expect(describe('GROUP_JOIN_REQUEST', 'Erin', 'Oslo Hikers')).toBe('Erin asked to join Oslo Hikers')
    expect(describe('GROUP_JOIN_APPROVED', 'Alice Andersen', 'Oslo Hikers')).toBe('Your request to join Oslo Hikers was approved')
    expect(describe('PAGE_TEAM_ADDED', 'Alice Andersen', 'Nordic Bakery')).toBe('Alice Andersen added you to the team of Nordic Bakery')
  })
})

group('dedupeKeyFor', () => {
  it('keys reactions, friend requests and group join requests; nothing else', () => {
    expect(dedupeKeyFor('REACTION', 'u1', 'p1')).toBe('REACTION:u1:p1')
    expect(dedupeKeyFor('FRIEND_REQUEST', 'u1', null)).toBe('FRIEND_REQUEST:u1')
    expect(dedupeKeyFor('GROUP_JOIN_REQUEST', 'u1', 'g1')).toBe('GROUP_JOIN_REQUEST:u1:g1')
    expect(dedupeKeyFor('COMMENT', 'u1', 'p1')).toBeNull()
    expect(dedupeKeyFor('FRIEND_ACCEPTED', 'u1', null)).toBeNull()
  })
})

group('subjectFrom', () => {
  it('keeps short text, trims, and cuts long text to 80 with an ellipsis', () => {
    expect(subjectFrom('  hi  ')).toBe('hi')
    expect(subjectFrom('')).toBeNull()
    expect(subjectFrom(null)).toBeNull()
    const long = subjectFrom('x'.repeat(100))!
    expect(long.length).toBe(80)
    expect(long.endsWith('…')).toBe(true)
  })
})
```

- [ ] **Step 2: Run → FAIL (module not found). Step 3: Implement**

```ts
/** Pure helpers for notification text and de-duplication. */

export const NOTIFICATION_TYPES = [
  'FRIEND_REQUEST',
  'FRIEND_ACCEPTED',
  'REACTION',
  'COMMENT',
  'GROUP_JOIN_REQUEST',
  'GROUP_JOIN_APPROVED',
  'PAGE_TEAM_ADDED',
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

const quoted = (s: string | null) => (s ? ` “${s}”` : '')

/** The row's sentence, built from the type, the actor's current name and the stored subject. */
export function describe(
  type: NotificationType,
  actorName: string,
  subject: string | null,
): string {
  switch (type) {
    case 'FRIEND_REQUEST':
      return `${actorName} sent you a friend request`
    case 'FRIEND_ACCEPTED':
      return `${actorName} accepted your friend request`
    case 'REACTION':
      return `${actorName} reacted to your post${quoted(subject)}`
    case 'COMMENT':
      return `${actorName} commented on your post${quoted(subject)}`
    case 'GROUP_JOIN_REQUEST':
      return `${actorName} asked to join ${subject ?? 'your group'}`
    case 'GROUP_JOIN_APPROVED':
      return `Your request to join ${subject ?? 'the group'} was approved`
    case 'PAGE_TEAM_ADDED':
      return `${actorName} added you to the team of ${subject ?? 'a page'}`
  }
}

/** Events that must not pile up get a key; one row per (recipient, key). */
export function dedupeKeyFor(
  type: NotificationType,
  actorId: string,
  targetId: string | null,
): string | null {
  switch (type) {
    case 'REACTION':
    case 'GROUP_JOIN_REQUEST':
      return `${type}:${actorId}:${targetId ?? ''}`
    case 'FRIEND_REQUEST':
      return `${type}:${actorId}`
    default:
      return null
  }
}

export const SUBJECT_MAX = 80

/** A short excerpt for the row: trimmed, cut to SUBJECT_MAX with an ellipsis. */
export function subjectFrom(text: string | null | undefined): string | null {
  const t = (text ?? '').trim()
  if (!t) return null
  return t.length <= SUBJECT_MAX ? t : `${t.slice(0, SUBJECT_MAX - 1)}…`
}
```

- [ ] **Step 4: Run → PASS (3 tests). Step 5: Commit**

```bash
git add src/features/notifications
git commit -m "Add notification text and dedupe rules

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Service and queries

**Files:**
- Create: `src/features/notifications/service.ts`
- Create: `src/features/notifications/queries.ts`

**Interfaces:**
- Produces:
  ```ts
  // service.ts ('server-only')
  export type NotifyInput = { userId: string; type: NotificationType; actorId: string; href: string; subject?: string | null; targetId?: string | null }
  export function notify(input: NotifyInput): Promise<void>          // skips self; upserts when keyed; never throws
  export function notifyMany(userIds: string[], input: Omit<NotifyInput, 'userId'>): Promise<void>
  // queries.ts ('server-only')
  export type NotificationRow = { id: string; type: NotificationType; actor: Person; href: string; subject: string | null; createdAt: Date; unread: boolean }
  export function listNotifications(userId: string): Promise<NotificationRow[]>  // newest 50
  export function countUnreadNotifications(userId: string): Promise<number>
  export function markAllRead(userId: string): Promise<boolean>  // true when any row changed
  ```

- [ ] **Step 1: `service.ts`**

```ts
import 'server-only'
import { prisma } from '@/lib/db'
import { dedupeKeyFor, type NotificationType } from './rules'

export type NotifyInput = {
  userId: string
  type: NotificationType
  actorId: string
  href: string
  subject?: string | null
  targetId?: string | null
}

/**
 * Record that something happened to `userId`. Never notifies the actor about
 * their own action, collapses keyed repeats into one row (bumping it to the
 * top and marking it unread again), and never throws: a missed notification
 * must not fail the action that caused it.
 */
export async function notify(input: NotifyInput): Promise<void> {
  if (input.userId === input.actorId) return
  const dedupeKey = dedupeKeyFor(input.type, input.actorId, input.targetId ?? null)
  const data = {
    userId: input.userId,
    type: input.type,
    actorId: input.actorId,
    href: input.href,
    subject: input.subject ?? null,
    dedupeKey,
  }
  try {
    if (dedupeKey) {
      await prisma.notification.upsert({
        where: { userId_dedupeKey: { userId: input.userId, dedupeKey } },
        create: data,
        update: { href: input.href, subject: data.subject, createdAt: new Date(), readAt: null },
      })
    } else {
      await prisma.notification.create({ data })
    }
  } catch (e) {
    console.error('notify failed', input.type, e)
  }
}

export async function notifyMany(
  userIds: string[],
  input: Omit<NotifyInput, 'userId'>,
): Promise<void> {
  await Promise.all(userIds.map((userId) => notify({ ...input, userId })))
}
```

- [ ] **Step 2: `queries.ts`**

```ts
import 'server-only'
import { prisma } from '@/lib/db'
import { personSelect, type Person } from '@/features/friends/queries'
import type { NotificationType } from './rules'

export const NOTIFICATIONS_PAGE_SIZE = 50

export type NotificationRow = {
  id: string
  type: NotificationType
  actor: Person
  href: string
  subject: string | null
  createdAt: Date
  unread: boolean
}

export async function listNotifications(userId: string): Promise<NotificationRow[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: NOTIFICATIONS_PAGE_SIZE,
    select: {
      id: true, type: true, href: true, subject: true, createdAt: true, readAt: true,
      actor: { select: personSelect },
    },
  })
  return rows.map((r) => ({
    id: r.id, type: r.type, actor: r.actor, href: r.href, subject: r.subject,
    createdAt: r.createdAt, unread: r.readAt === null,
  }))
}

export function countUnreadNotifications(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } })
}

/** Everything is read now; true when at least one row changed. */
export async function markAllRead(userId: string): Promise<boolean> {
  const { count } = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  })
  return count > 0
}
```

- [ ] **Step 3: Format, typecheck, commit**

```bash
git add src/features/notifications/service.ts src/features/notifications/queries.ts
git commit -m "Add notification service and queries

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Wire the events into existing actions

**Files:**
- Modify: `src/features/friends/actions.ts` (`sendFriendRequest` both branches, `transition` accept)
- Modify: `src/features/posts/actions.ts` (`setReaction`, `addComment`)
- Modify: `src/features/groups/actions.ts` (`joinGroup` private branch, `respondToJoinRequest` accept, `updateGroup` auto-accept)
- Modify: `src/features/pages/actions.ts` (`addTeamMember`)

**Interfaces:** consumes `notify`, `notifyMany`, `subjectFrom`.

- [ ] **Step 1: friends**

`sendFriendRequest`: after the auto-accept `update` (the "they already asked us" branch), before `revalidateFriends()`:
```ts
        await notify({ userId: userId, type: 'FRIEND_ACCEPTED', actorId: user.id, href: `/u/${user.username}` })
```
After the successful `prisma.friendship.create`, before `revalidateFriends()`:
```ts
      await notify({ userId, type: 'FRIEND_REQUEST', actorId: user.id, href: '/friends' })
```
`transition`, inside `if (action === 'accept')` after the update:
```ts
    await notify({ userId: row.requesterId, type: 'FRIEND_ACCEPTED', actorId: user.id, href: `/u/${user.username}` })
```

- [ ] **Step 2: posts**

`canAccessPost` already returns `{ id, authorId, author, group, page }` — extend its select with `body: true`. In `setReaction` after the upsert:
```ts
  await notify({ userId: post.authorId, type: 'REACTION', actorId: user.id, href: `/p/${postId}`, subject: subjectFrom(post.body), targetId: postId })
```
In `addComment` after the create:
```ts
  await notify({ userId: post.authorId, type: 'COMMENT', actorId: user.id, href: `/p/${postId}`, subject: subjectFrom(post.body) })
```

- [ ] **Step 3: groups**

`joinGroup`: select `privacy, slug, name, id` and, in the PRIVATE branch after the request createMany:
```ts
    const admins = await prisma.groupMember.findMany({ where: { groupId, role: 'ADMIN' }, select: { userId: true } })
    await notifyMany(admins.map((a) => a.userId), { type: 'GROUP_JOIN_REQUEST', actorId: user.id, href: `/g/${group.slug}/members`, subject: group.name, targetId: groupId })
```
`respondToJoinRequest`: fetch `{ slug, name }` with the role check; when `accept && handled`:
```ts
  await notify({ userId, type: 'GROUP_JOIN_APPROVED', actorId: user.id, href: `/g/${group.slug}`, subject: group.name })
```
`updateGroup` auto-accept: return `pending` user ids from the transaction and, after it, `notifyMany(ids, { type: 'GROUP_JOIN_APPROVED', actorId: user.id, href: `/g/${slug}`, subject: parsed.data.name })`.

- [ ] **Step 4: pages**

`addTeamMember`: select the page `{ slug, name }` (already has `pageId`), and after a successful createMany:
```ts
  await notify({ userId: target.id, type: 'PAGE_TEAM_ADDED', actorId: user.id, href: `/pages/${page.slug}`, subject: page.name })
```

- [ ] **Step 5: Typecheck, lint (background), unit tests, run friends + engagement e2e specs** (regression, no behaviour change expected), commit:

```bash
git add src/features/friends/actions.ts src/features/posts/actions.ts src/features/posts/queries.ts src/features/groups/actions.ts src/features/pages/actions.ts
git commit -m "Create notifications from friend, reaction, comment, group and page events

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Page, navbar badge, e2e, README

**Files:**
- Create: `src/features/notifications/components/NotificationList.tsx`
- Create: `src/app/(app)/notifications/page.tsx`
- Modify: `src/components/Navbar.tsx` (`unreadNotifications` prop, link after Messages)
- Modify: `src/app/(app)/layout.tsx` (`countUnreadNotifications`)
- Create: `e2e/notifications.spec.ts`
- Modify: `README.md:3`

- [ ] **Step 1: `NotificationList`**

```tsx
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/features/profile/components/Avatar'
import { formatDate } from '@/features/posts/components/PostCard'
import type { NotificationRow } from '../queries'
import { describe } from '../rules'

export function NotificationList({ rows }: { rows: NotificationRow[] }) {
  return (
    <Card>
      <section aria-label="Notifications">
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Nothing yet. Notifications about your posts, friend requests, groups and pages will show here.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {rows.map((n) => (
              <li key={n.id} className="flex items-center gap-3 py-2">
                <Avatar name={n.actor.name} avatarUrl={n.actor.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <Link href={n.href} className={`hover:underline ${n.unread ? 'font-semibold' : ''}`}>
                    {describe(n.type, n.actor.name, n.subject)}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    <time dateTime={n.createdAt.toISOString()}>{formatDate(n.createdAt)}</time>
                  </p>
                </div>
                {n.unread ? (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">New</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  )
}
```

- [ ] **Step 2: Page** — list first (so `unread` reflects the state before this visit), then mark read, then mount `ThreadRefresher refreshOnMount={marked}`:

```tsx
import type { Metadata } from 'next'
import { ThreadRefresher } from '@/features/messages/components/ThreadRefresher'
import { NotificationList } from '@/features/notifications/components/NotificationList'
import { listNotifications, markAllRead } from '@/features/notifications/queries'
import { requireUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const user = await requireUser()
  const rows = await listNotifications(user.id)
  // Listing first keeps the "New" markers for this visit; the badge in the
  // layout renders in parallel, so refresh once when anything was marked.
  const marked = await markAllRead(user.id)
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Notifications</h1>
      <NotificationList rows={rows} />
      <ThreadRefresher refreshOnMount={marked} />
    </div>
  )
}
```

- [ ] **Step 3: Navbar + layout** — add `unreadNotifications: number`; link after Messages: `{unreadNotifications > 0 ? \`Notifications (${unreadNotifications})\` : 'Notifications'}`; layout adds `countUnreadNotifications(user.id)` to the `Promise.all`.

- [ ] **Step 4: e2e** — `e2e/notifications.spec.ts` with helpers `userIn`, `befriend` (as in messages.spec) and:

```ts
test('friend request and acceptance notify each side; opening the page clears the badge', ...)
  // B sends A a request via A's profile ("Add friend")
  // A: navbar "Notifications (1)"; /notifications lists `${b.user.name} sent you a friend request` with href /friends; "New" marker
  // badge gone within 8 s on that page
  // A accepts on /friends; B: /notifications lists `${a.user.name} accepted your friend request`

test('reactions collapse to one row, comments add rows, and you never notify yourself', ...)
  // befriend; A posts "Notify me"; A reacts Like to own post → A's /notifications empty
  // B reacts Like then Love (picker), and comments "Nice" → A's list: exactly one "reacted" row, one "commented" row (count rows by text)

test('private group join request and approval', ...)
  // A creates private group; B requests; A: "asked to join <name>" linking to /g/<slug>/members; A approves on members page; B: "Your request to join <name> was approved" linking to /g/<slug>

test('being added to a page team', ...)
  // A creates page, adds B as editor on /pages/<slug>/team; B: `${a.user.name} added you to the team of <name>` linking to /pages/<slug>
```

Use `getByRole('region', { name: 'Notifications' })` for the list and `getByRole('link', { name: /sent you a friend request/ })` style locators; assert `href` with `toHaveAttribute('href', ...)`.

- [ ] **Step 5: README line** — append ", and in-app notifications" before the final period of line 3.

- [ ] **Step 6: Verify** — `pnpm test:e2e e2e/notifications.spec.ts` → 4 passed; then full `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e`.

- [ ] **Step 7: Commit**

```bash
git add src/features/notifications src/components/Navbar.tsx "src/app/(app)/layout.tsx" "src/app/(app)/notifications" e2e/notifications.spec.ts README.md
git commit -m "Add notifications page and navbar badge; end-to-end tests; README

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
