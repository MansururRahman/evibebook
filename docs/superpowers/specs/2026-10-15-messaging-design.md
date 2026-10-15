# Messaging — design

Date: 2026-10-15
Status: decisions taken by Claude under the user's standing instruction ("implement all recommended versions without asking"); written spec committed for the record

## Purpose

evibebook is a Facebook-style social network being built as a prototype for a
real product. Groups and Pages shipped on 2026-10-15. Messaging is the next
phase the user named: private one-to-one conversations between friends, with
an inbox, a thread view and an unread badge in the navbar. Notifications is a
separate phase and gets its own spec.

## Decisions (recommended options, taken without asking)

- **Who can message whom:** accepted friends only. A thread with a former
  friend stays readable, but sending is refused until they are friends again.
  Message requests from strangers are out of scope.
- **Shape:** one-to-one conversations only, exactly one conversation per pair
  of users. The data model still uses a participants table so group chats can
  be added later without a migration of the message table.
- **Content:** text only, 1–2000 characters after trim. No images, no edits,
  no deletes in this version.
- **Freshness:** no WebSockets. The thread and inbox pages are server-rendered;
  a small client component calls `router.refresh()` every 10 seconds while the
  tab is visible, so a conversation updates without a manual reload.
- **Unread tracking:** per participant `lastReadAt`. Opening a thread marks it
  read. The navbar shows "Messages (n)" where n is the number of conversations
  with at least one message from the other person newer than `lastReadAt`.
- **Entry points:** a "Message" button on a friend's profile and on each row
  of the friends list; the navbar link; the inbox.

## Section 1: Data model

One Prisma migration adds:

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

`User` gains `conversations ConversationParticipant[]` and
`sentMessages Message[]`.

`pairKey` is computed by a pure helper `pairKeyFor(a, b)` that sorts the two
ids. A conversation is created lazily on the first message, in the same
transaction as that message, with both participants. Deleting a user cascades
their participant rows and messages; the conversation row itself is deleted by
the same cascade only when it is reached through the participant relation —
Prisma cannot express that, so a conversation whose participants are all gone
is an orphan (the e2e teardown deletes orphan conversations, as it does for
pages).

## Section 2: Rules

- `canMessage(viewerId, otherId, friendIds)`: pure; false for self, true only
  when `otherId` is an accepted friend. Checked in `sendMessage` on every send.
- Reading a thread requires being a participant. A viewer may open
  `/messages/[username]` with any existing user; if they are friends and no
  conversation exists yet, the page shows an empty thread with the composer
  (nothing is created until the first send). If they are not friends and no
  conversation exists, the page shows "You can only message friends" and no
  composer. If a conversation exists but they are no longer friends, the
  history shows and the composer is replaced by the same notice.
- Opening a thread sets the viewer's `lastReadAt` to now (a server action
  called from the page via a form-less server call is not possible; instead the
  thread page performs the update inside its server component render, which is
  acceptable here because it only touches the viewer's own row and is
  idempotent).
- Unread count for the badge: conversations where the other participant has a
  message with `createdAt > viewer.lastReadAt`. Computed with one query that
  joins participants and messages.
- Thread pagination: newest 50 messages, oldest first on screen; a "Load
  earlier" link uses a cursor (same `paginate` helper as posts), rendering the
  earlier page on its own.

## Section 3: Routes and UI

| Route | Content |
| --- | --- |
| `/messages` | Inbox: conversations ordered by `lastMessageAt` desc, each row with the other person's avatar and name, the last message preview (sender prefix "You:" when the viewer sent it), its time, and a bold style plus "Unread" marker when unread. Empty state: "No conversations yet. Message a friend from their profile." |
| `/messages/[username]` | Thread: header with the other person (link to profile); messages oldest-first with the viewer's on the right; a "Load earlier" link when more exist; composer (textarea + Send) when friends; the friends-only notice otherwise. 404 for an unknown username. |

Other UI:

- `Navbar` gets a Messages link after Feed showing `Messages (n)` when n > 0,
  same style as the Friends badge; the app layout fetches the count.
- `FriendButton` gains nothing; instead the profile header's actions and each
  `FriendList` row render a "Message" link to `/messages/[username]` when the
  relationship is `friends`.
- `ThreadRefresher`: client component, no UI, calls `router.refresh()` every
  10 s while `document.visibilityState === 'visible'`. Mounted on the thread
  and inbox pages.

## Section 4: Actions, errors and testing

### Feature folder

`src/features/messages/` with `schemas.ts` (zod: body 1–2000 trimmed),
`rules.ts` (pure: `pairKeyFor`, `canMessage`, `isUnread`), `queries.ts`,
`actions.ts`, `components/`.

Actions:

- `sendMessage(_prev, formData)` with fields `toUserId`, `body`. Re-reads the
  friendship; refuses non-friends with "You can only message friends"; in one
  transaction upserts the conversation by `pairKey` (creating both participant
  rows), inserts the message, bumps `lastMessageAt`, and sets the sender's
  `lastReadAt` to the message time. Revalidates `/messages` and
  `/messages/[username]` for both usernames.

Queries:

- `getInbox(viewerId)` → rows `{ conversationId, other: Person, lastMessage: { body, senderId, createdAt } | null, unread: boolean }`.
- `getThread(viewerId, otherId, cursor?)` → `{ conversationId | null, messages: Message[] (oldest first), prevCursor: string | null }`.
- `countUnread(viewerId)` → number, for the navbar.
- `markRead(viewerId, conversationId)` → updates the viewer's `lastReadAt`.

### Error handling

- Unknown username → `notFound()`.
- Sending to a non-friend, to oneself, or an empty body → `fail('...')`
  shown by the composer's `FormError`; never thrown.
- Two users sending their first message at the same instant: the `pairKey`
  unique constraint makes the second upsert find the first one's row (Prisma
  `upsert` on a unique key); no duplicate conversations.

### Testing

Vitest (pure): `pairKeyFor` ordering, `canMessage` (self, friend, stranger),
`isUnread` (no message, own message, other's older/newer message), body
schema limits.

Playwright (`e2e/messages.spec.ts`):

1. Two strangers: the thread page shows "You can only message friends" and no
   composer; after they become friends the composer appears; A sends; B's
   navbar shows "Messages (1)"; B's inbox lists A with the preview and the
   Unread marker; opening the thread clears the badge; B replies; A's thread
   shows the reply within the refresh interval without a manual reload.
2. Unfriend after a conversation: both can still open the thread and read, but
   the composer is gone and the notice shows; sending from a stale tab is
   refused with the same message.
3. Pagination: seed 60 messages directly (e2e/db helper), the thread shows the
   newest 50 oldest-first, "Load earlier" shows the first 10.

## Out of scope

Group chats, attachments, message deletion or editing, typing indicators,
read receipts beyond the unread badge, message requests from non-friends,
push or email notifications, blocking, Marketplace.
