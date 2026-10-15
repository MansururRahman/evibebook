# Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Private one-to-one text conversations between friends, with an inbox, a thread view that refreshes itself, and an unread badge in the navbar.

**Architecture:** `Conversation` (one per user pair, enforced by a unique `pairKey`), `ConversationParticipant` (holds each side's `lastReadAt`) and `Message` tables. Pure rules (`pairKeyFor`, `canMessage`, `isUnread`) live in `src/features/messages/rules.ts`; queries and the single `sendMessage` action mirror the other feature folders. Thread and inbox pages are server-rendered; a tiny client component calls `router.refresh()` every 10 s while the tab is visible. Opening a thread marks it read.

**Tech Stack:** Next.js 16 App Router (server components + server actions), TypeScript, Prisma 7 + PostgreSQL (one `$queryRaw` for the unread count), zod 4, Tailwind, Vitest (pure units), Playwright (e2e, serial, against `pnpm dev`).

**Spec:** `docs/superpowers/specs/2026-10-15-messaging-design.md`

## Global Constraints

- Follow `AGENTS.md`: this Next.js version differs from training data; consult `node_modules/next/dist/docs/` when unsure. Pages type props with the global `PageProps<'/route'>`; run `pnpm exec next typegen` if a new route's type is unknown.
- Only accepted friends may send; a thread with a former friend stays readable. Self-messaging is refused.
- Message body: 1–2000 chars after trim. Text only. No edit, no delete.
- Exactly one conversation per pair: `pairKey = \`${lowerId}:${higherId}\``.
- Server actions return `ActionResult`; permission failures `fail('...')`, never throw. Revalidate with `revalidatePath('/', 'layout')` (the navbar badge lives in the layout).
- After `prisma migrate dev`, check `ls src/generated/prisma/models` contains `Conversation.ts`; if not run `pnpm prisma generate`; then restart `next dev` (kill the node process on port 3000, `pnpm dev` again).
- Heredocs in the Bash tool fail on backticks: write such files with the Write tool or a Python patch. `pnpm lint` can take several minutes; run it in the background.
- Playwright role-name matching is a case-insensitive substring: use `exact: true` whenever one label contains another.
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Do not commit `prisma/schema.sql`.

## Review Focus

1. A crafted `toUserId` equal to the sender's own id must be refused, never stored; test in Task 2 (`canMessage` self) and the action in Task 4 checks it.
2. An empty or whitespace-only body must show "Write a message" and store nothing; test in Task 2 (schema) and Task 5 e2e test 1.
3. The unread badge must never count the viewer's own messages: after A sends, A's navbar shows no badge; test in Task 2 (`isUnread`) and Task 5 e2e test 1.
4. Two users sending their first message at the same instant must end up in one conversation; `pairKey` is unique and the action retries once on P2002; test in Task 2 (`pairKeyFor` symmetric) — the DB constraint is the backstop.
5. A stale thread tab after unfriending must be refused with "You can only message friends", not post; test in Task 5 e2e test 2.

---

### Task 1: Schema and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_messaging/migration.sql` (generated)

**Interfaces:**
- Produces: models `Conversation` (`pairKey` unique, `lastMessageAt`), `ConversationParticipant` (`@@id([conversationId, userId])`, `lastReadAt`), `Message`; compound unique input `conversationId_userId`.

- [ ] **Step 1: Edit the schema**

Add to `User` after `pageFollows`:

```prisma
  conversations     ConversationParticipant[]
  sentMessages      Message[]
```

Append at the end of the file:

```prisma
model Conversation {
  id            String   @id @default(cuid())
  /// `${lowerUserId}:${higherUserId}` — guarantees one conversation per pair.
  pairKey       String   @unique
  createdAt     DateTime @default(now())
  lastMessageAt DateTime @default(now())

  participants ConversationParticipant[]
  messages     Message[]

  @@index([lastMessageAt(sort: Desc)])
}

model ConversationParticipant {
  conversationId String
  userId         String
  lastReadAt     DateTime @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([conversationId, userId])
  @@index([userId])
}

model Message {
  id             String   @id @default(cuid())
  conversationId String
  senderId       String
  body           String   @db.VarChar(2000)
  createdAt      DateTime @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender       User         @relation(fields: [senderId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt(sort: Desc), id(sort: Desc)])
}
```

- [ ] **Step 2: Validate, migrate, generate, restart**

Run: `pnpm prisma validate && pnpm prisma migrate dev --name messaging`
Expected: `Your database is now in sync with your schema.` and a new `prisma/migrations/<timestamp>_messaging/migration.sql` with the three tables, the unique index on `pairKey`, and cascading foreign keys.

Run: `ls src/generated/prisma/models | grep -c Conversation` → `2` (Conversation, ConversationParticipant); if `0`, run `pnpm prisma generate`.

Restart the dev server.

Run: `pnpm typecheck && pnpm test`
Expected: clean; Vitest 93/93.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Add Conversation, ConversationParticipant and Message tables

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Pure rules and schema

**Files:**
- Create: `src/features/messages/rules.ts`, `src/features/messages/rules.test.ts`
- Create: `src/features/messages/schemas.ts`, `src/features/messages/schemas.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // rules.ts
  export function pairKeyFor(a: string, b: string): string          // sorted, joined with ':'
  export function canMessage(viewerId: string, otherId: string, friendIds: readonly string[]): boolean
  export type LastMessage = { senderId: string; createdAt: Date } | null
  export function isUnread(viewerId: string, lastReadAt: Date, lastMessage: LastMessage): boolean
  // schemas.ts
  export const MESSAGE_BODY_MAX = 2000
  export const messageBodySchema: z.ZodString   // trim, 1..2000, messages 'Write a message' / 'Messages must be 2000 characters or fewer'
  ```

- [ ] **Step 1: Write the failing rules test**

Create `src/features/messages/rules.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { canMessage, isUnread, pairKeyFor } from './rules'

describe('pairKeyFor', () => {
  it('is the same key whichever side sends first', () => {
    expect(pairKeyFor('b', 'a')).toBe('a:b')
    expect(pairKeyFor('a', 'b')).toBe('a:b')
  })
})

describe('canMessage', () => {
  it('allows accepted friends only, never yourself', () => {
    expect(canMessage('me', 'friend', ['friend'])).toBe(true)
    expect(canMessage('me', 'stranger', ['friend'])).toBe(false)
    expect(canMessage('me', 'me', ['me'])).toBe(false)
  })
})

describe('isUnread', () => {
  const t0 = new Date('2026-10-15T10:00:00Z')
  const later = new Date('2026-10-15T10:05:00Z')
  const earlier = new Date('2026-10-15T09:55:00Z')

  it('is false with no messages', () => {
    expect(isUnread('me', t0, null)).toBe(false)
  })
  it('never counts your own message', () => {
    expect(isUnread('me', t0, { senderId: 'me', createdAt: later })).toBe(false)
  })
  it("is true only for the other side's message newer than lastReadAt", () => {
    expect(isUnread('me', t0, { senderId: 'them', createdAt: later })).toBe(true)
    expect(isUnread('me', t0, { senderId: 'them', createdAt: earlier })).toBe(false)
  })
})
```

- [ ] **Step 2: Write the failing schema test**

Create `src/features/messages/schemas.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { messageBodySchema } from './schemas'

describe('messageBodySchema', () => {
  it('trims and requires 1 to 2000 characters', () => {
    expect(messageBodySchema.safeParse('  hi ').data).toBe('hi')
    expect(messageBodySchema.safeParse('   ').success).toBe(false)
    expect(messageBodySchema.safeParse('x'.repeat(2000)).success).toBe(true)
    expect(messageBodySchema.safeParse('x'.repeat(2001)).success).toBe(false)
  })
  it('explains an empty body', () => {
    expect(messageBodySchema.safeParse('').error?.issues[0]?.message).toBe(
      'Write a message',
    )
  })
})
```

- [ ] **Step 3: Run to verify they fail**

Run: `pnpm vitest run src/features/messages`
Expected: FAIL, modules not found.

- [ ] **Step 4: Implement**

`src/features/messages/rules.ts`:

```ts
/** Pure messaging rules shared by queries, actions and components. */

/** One conversation per pair: the two ids sorted and joined. */
export function pairKeyFor(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

/** Only accepted friends may message each other; never yourself. */
export function canMessage(
  viewerId: string,
  otherId: string,
  friendIds: readonly string[],
): boolean {
  return viewerId !== otherId && friendIds.includes(otherId)
}

export type LastMessage = { senderId: string; createdAt: Date } | null

/** Unread when the other side's latest message is newer than the viewer's lastReadAt. */
export function isUnread(
  viewerId: string,
  lastReadAt: Date,
  lastMessage: LastMessage,
): boolean {
  if (!lastMessage || lastMessage.senderId === viewerId) return false
  return lastMessage.createdAt.getTime() > lastReadAt.getTime()
}
```

`src/features/messages/schemas.ts`:

```ts
import { z } from 'zod'

export const MESSAGE_BODY_MAX = 2000

export const messageBodySchema = z
  .string()
  .trim()
  .min(1, 'Write a message')
  .max(
    MESSAGE_BODY_MAX,
    `Messages must be ${MESSAGE_BODY_MAX} characters or fewer`,
  )
```

- [ ] **Step 5: Run to verify they pass, format, commit**

Run: `pnpm vitest run src/features/messages && pnpm exec prettier --write src/features/messages`
Expected: PASS, 2 files, 7 tests.

```bash
git add src/features/messages
git commit -m "Add messaging rules and body schema

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Queries

**Files:**
- Create: `src/features/messages/queries.ts`

**Interfaces:**
- Consumes: `pairKeyFor`, `isUnread` (Task 2); `personSelect`, `Person` from `@/features/friends/queries`; `paginate` from `@/lib/feed`.
- Produces:
  ```ts
  export const THREAD_PAGE_SIZE = 50
  export type ThreadMessage = { id: string; senderId: string; body: string; createdAt: Date }
  export type InboxRow = { conversationId: string; other: Person; lastMessage: { body: string; senderId: string; createdAt: Date } | null; unread: boolean }
  export function getInbox(viewerId: string): Promise<InboxRow[]>
  export function getThread(viewerId: string, otherId: string, cursor?: string): Promise<{ conversationId: string | null; messages: ThreadMessage[]; prevCursor: string | null }>
  export function countUnread(viewerId: string): Promise<number>
  export function markRead(viewerId: string, conversationId: string): Promise<void>
  ```

- [ ] **Step 1: Create the module** (Write tool)

```ts
import 'server-only'
import { prisma } from '@/lib/db'
import { paginate } from '@/lib/feed'
import { personSelect, type Person } from '@/features/friends/queries'
import { isUnread, pairKeyFor } from './rules'

export const THREAD_PAGE_SIZE = 50

export type ThreadMessage = {
  id: string
  senderId: string
  body: string
  createdAt: Date
}

export type InboxRow = {
  conversationId: string
  other: Person
  lastMessage: { body: string; senderId: string; createdAt: Date } | null
  unread: boolean
}

/** The viewer's conversations, newest activity first, with the other person and unread state. */
export async function getInbox(viewerId: string): Promise<InboxRow[]> {
  const rows = await prisma.conversationParticipant.findMany({
    where: { userId: viewerId },
    select: {
      lastReadAt: true,
      conversation: {
        select: {
          id: true,
          lastMessageAt: true,
          participants: {
            where: { userId: { not: viewerId } },
            select: { user: { select: personSelect } },
          },
          messages: {
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 1,
            select: { body: true, senderId: true, createdAt: true },
          },
        },
      },
    },
    orderBy: { conversation: { lastMessageAt: 'desc' } },
  })
  return rows.flatMap((r) => {
    const other = r.conversation.participants[0]?.user
    if (!other) return [] // the other account was deleted; nothing to show
    const lastMessage = r.conversation.messages[0] ?? null
    return [
      {
        conversationId: r.conversation.id,
        other,
        lastMessage,
        unread: isUnread(viewerId, r.lastReadAt, lastMessage),
      },
    ]
  })
}

/**
 * One page of a thread. Fetched newest-first for the cursor, returned
 * oldest-first for display. `prevCursor` points at the next older page.
 */
export async function getThread(
  viewerId: string,
  otherId: string,
  cursor?: string,
): Promise<{
  conversationId: string | null
  messages: ThreadMessage[]
  prevCursor: string | null
}> {
  const conversation = await prisma.conversation.findUnique({
    where: { pairKey: pairKeyFor(viewerId, otherId) },
    select: { id: true },
  })
  if (!conversation) return { conversationId: null, messages: [], prevCursor: null }
  const rows = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: THREAD_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, senderId: true, body: true, createdAt: true },
  })
  const { items, nextCursor } = paginate(rows, THREAD_PAGE_SIZE)
  return {
    conversationId: conversation.id,
    messages: items.reverse(),
    prevCursor: nextCursor,
  }
}

/** Conversations with a message from the other side newer than the viewer's lastReadAt. */
export async function countUnread(viewerId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n
    FROM "ConversationParticipant" p
    WHERE p."userId" = ${viewerId}
      AND EXISTS (
        SELECT 1 FROM "Message" m
        WHERE m."conversationId" = p."conversationId"
          AND m."senderId" <> p."userId"
          AND m."createdAt" > p."lastReadAt"
      )`
  return rows[0]?.n ?? 0
}

/** The viewer has seen everything in this conversation up to now. */
export async function markRead(
  viewerId: string,
  conversationId: string,
): Promise<void> {
  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId: viewerId },
    data: { lastReadAt: new Date() },
  })
}
```

- [ ] **Step 2: Format, typecheck, commit**

Run: `pnpm exec prettier --write src/features/messages/queries.ts && pnpm typecheck`
Expected: clean.

```bash
git add src/features/messages/queries.ts
git commit -m "Add messaging queries: inbox, thread page, unread count, mark read

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Send action, components, routes, navbar badge, entry points

**Files:**
- Create: `src/features/messages/actions.ts`
- Create: `src/features/messages/components/MessageComposer.tsx`
- Create: `src/features/messages/components/ThreadRefresher.tsx`
- Create: `src/features/messages/components/MessageList.tsx`
- Create: `src/features/messages/components/InboxList.tsx`
- Create: `src/features/messages/components/MessageLink.tsx`
- Create: `src/app/(app)/messages/page.tsx`
- Create: `src/app/(app)/messages/[username]/page.tsx`
- Modify: `src/components/Navbar.tsx` (new `unreadMessages` prop, Messages link after Feed)
- Modify: `src/app/(app)/layout.tsx` (fetch `countUnread`)
- Modify: `src/app/(app)/u/[username]/page.tsx:43-49` (Message link next to FriendButton when friends)
- Modify: `src/features/friends/components/FriendList.tsx:20-25` (Message link per row)

**Interfaces:**
- Consumes: Task 2 rules/schema, Task 3 queries, `getFriendIds`, `getProfileByUsername`, `requireUser`, `fail`/`OK`, `FormError`, `Textarea`, `Button`, `Card`, `Avatar`, `PersonRow`, `formatDate` from `PostCard`.
- Produces: `sendMessage(_prev: ActionResult, formData: FormData): Promise<ActionResult>` (fields `toUserId`, `body`); `MessageLink({ username })`.

- [ ] **Step 1: `actions.ts`** (Write tool)

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { OK, fail, type ActionResult } from '@/lib/action-result'
import { getFriendIds } from '@/features/friends/queries'
import { messageBodySchema } from './schemas'
import { canMessage, pairKeyFor } from './rules'

function isUniqueViolation(e: unknown): boolean {
  return (e as { code?: string } | null)?.code === 'P2002'
}

export async function sendMessage(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser()
  const toUserId = formData.get('toUserId')
  if (typeof toUserId !== 'string' || !toUserId) return fail('Recipient missing')

  const parsed = messageBodySchema.safeParse(formData.get('body') ?? '')
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? 'Invalid message')
  const body = parsed.data

  const friendIds = await getFriendIds(user.id)
  if (!canMessage(user.id, toUserId, friendIds))
    return fail('You can only message friends')

  const pairKey = pairKeyFor(user.id, toUserId)
  const now = new Date()
  // Two first messages at the same instant: the unique pairKey rejects the
  // second create; retry once so it lands in the conversation the first made.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await prisma.$transaction(async (tx) => {
        const conversation = await tx.conversation.upsert({
          where: { pairKey },
          create: {
            pairKey,
            lastMessageAt: now,
            participants: {
              create: [{ userId: user.id }, { userId: toUserId }],
            },
          },
          update: { lastMessageAt: now },
          select: { id: true },
        })
        await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderId: user.id,
            body,
            createdAt: now,
          },
        })
        // Your own message never counts as unread for you.
        await tx.conversationParticipant.updateMany({
          where: { conversationId: conversation.id, userId: user.id },
          data: { lastReadAt: now },
        })
      })
      break
    } catch (e) {
      if (!isUniqueViolation(e) || attempt === 1) throw e
    }
  }

  // Thread pages for both sides, the inbox, and the navbar badge in the layout.
  revalidatePath('/', 'layout')
  return OK
}
```

- [ ] **Step 2: Components** (Write tool for each)

`MessageComposer.tsx`:

```tsx
'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/ui/FormError'
import { Textarea } from '@/components/ui/Input'
import type { ActionResult } from '@/lib/action-result'
import { sendMessage } from '../actions'
import { MESSAGE_BODY_MAX } from '../schemas'

const initial: ActionResult = { ok: true }

export function MessageComposer({ toUserId }: { toUserId: string }) {
  const [state, action, pending] = useActionState(sendMessage, initial)
  const formRef = useRef<HTMLFormElement>(null)
  // Clear after a successful send; skip the initial object (see PostComposer).
  useEffect(() => {
    if (state.ok && state !== initial) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <FormError message={!state.ok ? state.error : undefined} />
      <input type="hidden" name="toUserId" value={toUserId} />
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Textarea
            label="Write a message"
            name="body"
            rows={2}
            maxLength={MESSAGE_BODY_MAX}
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </form>
  )
}
```

`ThreadRefresher.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Re-renders the current server page every `intervalMs` while the tab is visible. */
export function ThreadRefresher({ intervalMs = 10_000 }: { intervalMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])
  return null
}
```

`MessageList.tsx`:

```tsx
import Link from 'next/link'
import { formatDate } from '@/features/posts/components/PostCard'
import type { ThreadMessage } from '../queries'

export function MessageList({
  messages,
  viewerId,
  prevCursor,
  basePath,
}: {
  messages: ThreadMessage[]
  viewerId: string
  prevCursor: string | null
  basePath: string
}) {
  return (
    <div className="flex flex-col gap-2">
      {prevCursor ? (
        <Link
          href={`${basePath}?cursor=${encodeURIComponent(prevCursor)}`}
          className="self-center rounded-md bg-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-300"
        >
          Load earlier
        </Link>
      ) : null}
      {messages.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          No messages yet. Say hi!
        </p>
      ) : (
        <ol aria-label="Messages" className="flex flex-col gap-2">
          {messages.map((m) => {
            const mine = m.senderId === viewerId
            return (
              <li
                key={m.id}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    mine ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <time
                    dateTime={m.createdAt.toISOString()}
                    className={`mt-1 block text-[11px] ${mine ? 'text-blue-100' : 'text-zinc-500'}`}
                  >
                    {formatDate(m.createdAt)}
                  </time>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
```

`InboxList.tsx`:

```tsx
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/features/profile/components/Avatar'
import { formatDate } from '@/features/posts/components/PostCard'
import type { InboxRow } from '../queries'

export function InboxList({
  rows,
  viewerId,
}: {
  rows: InboxRow[]
  viewerId: string
}) {
  return (
    <Card>
      <section aria-label="Conversations">
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No conversations yet. Message a friend from their profile.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {rows.map((r) => (
              <li key={r.conversationId}>
                <Link
                  href={`/messages/${r.other.username}`}
                  className="flex items-center gap-3 py-2 hover:bg-zinc-50"
                >
                  <Avatar
                    name={r.other.name}
                    avatarUrl={r.other.avatarUrl}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={r.unread ? 'font-semibold' : 'font-medium'}>
                      {r.other.name}
                      {r.unread ? (
                        <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                          Unread
                        </span>
                      ) : null}
                    </p>
                    {r.lastMessage ? (
                      <p className="truncate text-sm text-zinc-600">
                        {r.lastMessage.senderId === viewerId ? 'You: ' : ''}
                        {r.lastMessage.body}
                      </p>
                    ) : null}
                  </div>
                  {r.lastMessage ? (
                    <time
                      dateTime={r.lastMessage.createdAt.toISOString()}
                      className="shrink-0 text-xs text-zinc-500"
                    >
                      {formatDate(r.lastMessage.createdAt)}
                    </time>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  )
}
```

`MessageLink.tsx`:

```tsx
import Link from 'next/link'

export function MessageLink({ username }: { username: string }) {
  return (
    <Link
      href={`/messages/${username}`}
      className="rounded-md bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-300"
    >
      Message
    </Link>
  )
}
```

- [ ] **Step 3: Routes**

`src/app/(app)/messages/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { InboxList } from '@/features/messages/components/InboxList'
import { ThreadRefresher } from '@/features/messages/components/ThreadRefresher'
import { getInbox } from '@/features/messages/queries'
import { requireUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Messages' }

export default async function MessagesPage() {
  const user = await requireUser()
  const rows = await getInbox(user.id)
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Messages</h1>
      <InboxList rows={rows} viewerId={user.id} />
      <ThreadRefresher />
    </div>
  )
}
```

`src/app/(app)/messages/[username]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { getFriendIds } from '@/features/friends/queries'
import { MessageComposer } from '@/features/messages/components/MessageComposer'
import { MessageList } from '@/features/messages/components/MessageList'
import { ThreadRefresher } from '@/features/messages/components/ThreadRefresher'
import { getThread, markRead } from '@/features/messages/queries'
import { canMessage } from '@/features/messages/rules'
import { getProfileByUsername } from '@/features/profile/queries'
import { Avatar } from '@/features/profile/components/Avatar'
import { requireUser } from '@/lib/session'

export async function generateMetadata({
  params,
}: PageProps<'/messages/[username]'>): Promise<Metadata> {
  const { username } = await params
  const other = await getProfileByUsername(username)
  return { title: other ? `Messages with ${other.name}` : 'Messages' }
}

export default async function ThreadPage({
  params,
  searchParams,
}: PageProps<'/messages/[username]'>) {
  const viewer = await requireUser()
  const { username } = await params
  const { cursor } = await searchParams
  const other = await getProfileByUsername(username)
  if (!other || other.id === viewer.id) notFound()

  const [friendIds, thread] = await Promise.all([
    getFriendIds(viewer.id),
    getThread(viewer.id, other.id, typeof cursor === 'string' ? cursor : undefined),
  ])
  const friends = canMessage(viewer.id, other.id, friendIds)
  // Opening the latest page means the viewer has seen it; idempotent, own row only.
  if (thread.conversationId && !cursor) await markRead(viewer.id, thread.conversationId)

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center gap-3">
        <Avatar name={other.name} avatarUrl={other.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">
            <Link href={`/u/${other.username}`} className="hover:underline">
              {other.name}
            </Link>
          </h1>
          <p className="text-xs text-zinc-500">@{other.username}</p>
        </div>
        <Link href="/messages" className="text-sm text-zinc-700 hover:underline">
          All messages
        </Link>
      </Card>
      <Card className="flex flex-col gap-4">
        <MessageList
          messages={thread.messages}
          viewerId={viewer.id}
          prevCursor={thread.prevCursor}
          basePath={`/messages/${other.username}`}
        />
        {friends ? (
          cursor ? null : <MessageComposer toUserId={other.id} />
        ) : (
          <p className="text-center text-sm text-zinc-500">
            You can only message friends.
          </p>
        )}
      </Card>
      {cursor ? null : <ThreadRefresher />}
    </div>
  )
}
```

- [ ] **Step 4: Navbar badge, layout, entry points**

`Navbar.tsx`: add prop `unreadMessages: number` and, after the Feed link:

```tsx
        <Link href="/messages" className="text-sm text-zinc-700 hover:underline">
          {unreadMessages > 0 ? `Messages (${unreadMessages})` : 'Messages'}
        </Link>
```

`layout.tsx`:

```tsx
import { Navbar } from '@/components/Navbar'
import { requireUser } from '@/lib/session'
import { countIncoming } from '@/features/friends/queries'
import { countUnread } from '@/features/messages/queries'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await requireUser()
  const [pendingRequests, unreadMessages] = await Promise.all([
    countIncoming(user.id),
    countUnread(user.id),
  ])
  return (
    <>
      <Navbar
        user={user}
        pendingRequests={pendingRequests}
        unreadMessages={unreadMessages}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {children}
      </main>
    </>
  )
}
```

`u/[username]/page.tsx`: import `MessageLink` and change the `actions` prop to:

```tsx
        actions={
          <div className="flex items-center gap-2">
            {relationship === 'friends' ? (
              <MessageLink username={profile.username} />
            ) : null}
            <FriendButton
              otherId={profile.id}
              relationship={relationship}
              row={row}
            />
          </div>
        }
```

`FriendList.tsx`: import `MessageLink` and render `<MessageLink username={p.username} />` before the Unfriend form inside each `PersonRow`.

- [ ] **Step 5: Verify and smoke**

Run: `pnpm exec prettier --write src/features/messages src/components/Navbar.tsx "src/app/(app)"  src/features/friends/components/FriendList.tsx && pnpm typecheck` (and `pnpm lint` in the background).
Expected: clean (run `pnpm exec next typegen` first if `PageProps<'/messages/[username]'>` is unknown).

Smoke (throwaway Playwright script in the workspace): alice and bob are seeded friends. As alice, `/u/bob` shows a Message link → `/messages/bob` shows "No messages yet" and the composer; send "Hei Bob"; the bubble appears right-aligned. As bob, navbar shows "Messages (1)", `/messages` lists Alice with "Unread" and the preview; opening the thread clears the badge; reply "Hei!"; alice's open thread shows the reply within 15 s without reload. As dave (not friends with alice), `/messages/alice` shows the notice and no composer.

- [ ] **Step 6: Commit**

```bash
git add src/features/messages src/components/Navbar.tsx "src/app/(app)/layout.tsx" "src/app/(app)/messages" "src/app/(app)/u/[username]/page.tsx" src/features/friends/components/FriendList.tsx
git commit -m "Add messaging: send to friends, inbox, thread with auto-refresh, unread badge

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: End-to-end tests, teardown, README

**Files:**
- Create: `e2e/messages.spec.ts`
- Modify: `e2e/db.ts` (add `seedMessages`; delete orphan conversations in teardown)
- Modify: `README.md:3`

**Interfaces:**
- Consumes: `newUser`, `signUp` from `e2e/helpers.ts`; `createFriendship` from `e2e/db.ts`; labels `Write a message`, `Send`, `Message`, `Load earlier`, `Unread`, `All messages`; regions `Conversations`; list `Messages`.
- Produces: `seedMessages(fromEmail: string, toEmail: string, count: number): Promise<void>`.

- [ ] **Step 1: Teardown and seed helper**

In `e2e/db.ts`, after the orphan-pages block inside `deleteUsersByEmailDomain`, add:

```ts
    // Conversations whose participants are all gone are orphans too.
    await client.query(
      `DELETE FROM "Conversation" c
       WHERE NOT EXISTS (SELECT 1 FROM "ConversationParticipant" p WHERE p."conversationId" = c.id)`,
    )
```

Append to `e2e/db.ts`:

```ts
/** Insert a conversation with `count` messages from `fromEmail` to `toEmail`, one second apart. */
export function seedMessages(
  fromEmail: string,
  toEmail: string,
  count: number,
): Promise<void> {
  return withClient(async (client) => {
    const users = await client.query<{ id: string; email: string }>(
      'SELECT id, email FROM "User" WHERE email = ANY($1)',
      [[fromEmail, toEmail]],
    )
    const from = users.rows.find((u) => u.email === fromEmail)!.id
    const to = users.rows.find((u) => u.email === toEmail)!.id
    const pairKey = from < to ? `${from}:${to}` : `${to}:${from}`
    const conv = await client.query<{ id: string }>(
      `INSERT INTO "Conversation" ("id", "pairKey", "lastMessageAt")
       VALUES (gen_random_uuid()::text, $1, now()) RETURNING id`,
      [pairKey],
    )
    const id = conv.rows[0].id
    await client.query(
      `INSERT INTO "ConversationParticipant" ("conversationId", "userId", "lastReadAt")
       VALUES ($1, $2, now() - interval '1 day'), ($1, $3, now() - interval '1 day')`,
      [id, from, to],
    )
    await client.query(
      `INSERT INTO "Message" ("id", "conversationId", "senderId", "body", "createdAt")
       SELECT gen_random_uuid()::text, $1, $2, 'Seeded message ' || n,
              now() - interval '1 hour' + (n || ' seconds')::interval
       FROM generate_series(1, $3::int) AS n`,
      [id, from, count],
    )
  })
}
```

- [ ] **Step 2: Write the spec** (Write tool)

```ts
import { expect, test, type Browser, type Page } from '@playwright/test'
import { createFriendship, seedMessages } from './db'
import { newUser, signUp, type TestUser } from './helpers'

async function userIn(
  browser: Browser,
  prefix: string,
): Promise<{ page: Page; user: TestUser }> {
  const context = await browser.newContext()
  const page = await context.newPage()
  const user = newUser(prefix)
  await signUp(page, user)
  return { page, user }
}

/** A pending request from B to A, accepted by A on the friends page. */
async function befriend(a: { page: Page; user: TestUser }, b: { page: Page; user: TestUser }) {
  await createFriendship(b.user.email, a.user.email)
  await a.page.goto('/friends')
  await a.page
    .getByRole('listitem')
    .filter({ hasText: b.user.name })
    .getByRole('button', { name: 'Accept' })
    .click()
  await expect(a.page.getByRole('region', { name: 'Friends' })).toContainText(
    b.user.name,
  )
}

async function send(page: Page, body: string) {
  await page.getByLabel('Write a message').fill(body)
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByRole('list', { name: 'Messages' })).toContainText(body)
}

test('friends can message; strangers cannot; unread badge and inbox follow along', async ({
  browser,
}) => {
  test.slow()
  const a = await userIn(browser, 'msa')
  const b = await userIn(browser, 'msb')

  // Strangers: notice, no composer
  await b.page.goto(`/messages/${a.user.username}`)
  await expect(b.page.getByText('You can only message friends')).toBeVisible()
  await expect(b.page.getByLabel('Write a message')).toHaveCount(0)

  await befriend(a, b)

  // Profile shows a Message link for friends; empty body is refused
  await a.page.goto(`/u/${b.user.username}`)
  await a.page.getByRole('link', { name: 'Message' }).click()
  await expect(a.page).toHaveURL(new RegExp(`/messages/${b.user.username}$`))
  await expect(a.page.getByText('No messages yet')).toBeVisible()
  await a.page.getByLabel('Write a message').fill('   ')
  await a.page.getByRole('button', { name: 'Send' }).click()
  await expect(a.page.getByRole('alert')).toHaveText('Write a message')
  await expect(a.page.getByRole('list', { name: 'Messages' })).toHaveCount(0)

  await send(a.page, 'Hei Bob')
  // The sender's own message is not unread for them
  await expect(a.page.getByRole('navigation')).not.toContainText('Messages (')

  // B sees the badge, the inbox row with preview and Unread, then opens it
  await b.page.goto('/feed')
  await expect(b.page.getByRole('navigation')).toContainText('Messages (1)')
  await b.page.goto('/messages')
  const row = b.page
    .getByRole('region', { name: 'Conversations' })
    .getByRole('listitem')
    .filter({ hasText: a.user.name })
  await expect(row).toContainText('Hei Bob')
  await expect(row).toContainText('Unread')
  await row.getByRole('link').click()
  await expect(b.page).toHaveURL(new RegExp(`/messages/${a.user.username}$`))
  await expect(b.page.getByRole('navigation')).not.toContainText('Messages (')

  // B replies; A's open thread picks it up without a reload
  await send(b.page, 'Hei Alice!')
  await expect(a.page.getByRole('list', { name: 'Messages' })).toContainText(
    'Hei Alice!',
    { timeout: 30_000 },
  )
  await a.page.goto('/messages')
  await expect(
    a.page.getByRole('region', { name: 'Conversations' }),
  ).toContainText('Hei Alice!')
})

test('after unfriending the thread stays readable but sending is refused', async ({
  browser,
}) => {
  const a = await userIn(browser, 'mua')
  const b = await userIn(browser, 'mub')
  await befriend(a, b)
  await a.page.goto(`/messages/${b.user.username}`)
  await send(a.page, 'Before we fell out')

  // B keeps the thread open in a tab, then A unfriends
  await b.page.goto(`/messages/${a.user.username}`)
  await expect(b.page.getByLabel('Write a message')).toBeVisible()
  await a.page.goto(`/u/${b.user.username}`)
  await a.page.getByRole('button', { name: 'Unfriend' }).click()
  await expect(a.page.getByRole('button', { name: 'Add friend' })).toBeVisible()

  // Stale tab: the send is refused
  await b.page.getByLabel('Write a message').fill('Still friends?')
  await b.page.getByRole('button', { name: 'Send' }).click()
  await expect(b.page.getByText('You can only message friends')).toBeVisible()

  // Fresh load: history readable, no composer
  await b.page.goto(`/messages/${a.user.username}`)
  await expect(b.page.getByRole('list', { name: 'Messages' })).toContainText(
    'Before we fell out',
  )
  await expect(b.page.getByLabel('Write a message')).toHaveCount(0)
  await expect(b.page.getByText('You can only message friends')).toBeVisible()
})

test('long threads page 50 at a time with Load earlier', async ({ browser }) => {
  const a = await userIn(browser, 'mpa')
  const b = await userIn(browser, 'mpb')
  await befriend(a, b)
  await seedMessages(b.user.email, a.user.email, 60)

  await a.page.goto(`/messages/${b.user.username}`)
  const list = a.page.getByRole('list', { name: 'Messages' })
  await expect(list.getByRole('listitem')).toHaveCount(50)
  await expect(list.getByRole('listitem').first()).toContainText('Seeded message 11')
  await expect(list.getByRole('listitem').last()).toContainText('Seeded message 60')

  await a.page.getByRole('link', { name: 'Load earlier' }).click()
  await expect(list.getByRole('listitem')).toHaveCount(10)
  await expect(list.getByRole('listitem').first()).toContainText('Seeded message 1')
  await expect(a.page.getByRole('link', { name: 'Load earlier' })).toHaveCount(0)
})
```

- [ ] **Step 3: Run the messages spec**

Run: `pnpm exec prettier --write e2e/messages.spec.ts e2e/db.ts && pnpm test:e2e e2e/messages.spec.ts`
Expected: 3 passed.

- [ ] **Step 4: README**

Change line 3 of `README.md` to:

```md
A Facebook-style social network: profiles, posts with images, a friends-only feed, reactions (Like, Love, Care, Haha, Wow, Sad, Angry), comments, friend requests, public or private groups with admins, moderators and join requests, pages that users follow and a team posts as, and private messages between friends.
```

- [ ] **Step 5: Full verification**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e`
Expected: all green (allow environmental timeouts on this throttled machine; every test must pass on this tree in some run).

- [ ] **Step 6: Commit**

```bash
git add e2e/messages.spec.ts e2e/db.ts README.md
git commit -m "Add end-to-end tests for messaging; clean up orphan conversations in teardown; mention messaging in the README

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
