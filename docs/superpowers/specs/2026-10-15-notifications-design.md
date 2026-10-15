# Notifications — design

Date: 2026-10-15
Status: decisions taken by Claude under the user's standing instruction ("implement all recommended versions without asking"); written spec committed for the record

## Purpose

evibebook is a Facebook-style social network being built as a prototype for a
real product. Groups, Pages and Messaging shipped on 2026-10-15. Notifications
is the last phase the user named: an in-app list of things that happened to
you (someone reacted to your post, commented, sent or accepted a friend
request, asked to join your group, added you to a page team), with a navbar
badge for the unread ones. Messages keep their own badge and are not
duplicated here.

## Decisions (recommended options, taken without asking)

- **In-app only.** No email, no push, no real-time; the navbar badge is
  rendered by the layout on each server render, like the Friends and Messages
  badges.
- **Events that create a notification** (recipient → trigger):
  - `FRIEND_REQUEST`: addressee ← someone sent you a friend request.
  - `FRIEND_ACCEPTED`: requester ← your friend request was accepted.
  - `REACTION`: post author ← someone reacted to your post (one notification
    per actor per post; changing the reaction type updates it instead of
    adding another).
  - `COMMENT`: post author ← someone commented on your post (one per comment).
  - `GROUP_JOIN_REQUEST`: every ADMIN of a private group ← someone asked to join.
  - `GROUP_JOIN_APPROVED`: requester ← your request to join a group was
    approved.
  - `PAGE_TEAM_ADDED`: the added user ← an admin added you to a page's team.
  - Never notify yourself (reacting to or commenting on your own post).
- **Reading:** opening `/notifications` marks everything as read. The badge
  counts unread rows. There is no per-row "mark read".
- **Retention:** the list shows the newest 50. Rows are never deleted by the
  app except by cascade when the recipient or the actor is deleted.
- **Targets are stored as a link, not a foreign key.** Each row stores `href`
  (e.g. `/p/<postId>`, `/friends`, `/g/<slug>/members`, `/pages/<slug>/team`)
  computed when the event happens, plus an optional short `subject` (the first
  80 characters of the post body, or the group/page name) so the row reads
  well without joining the target. If the target is later deleted the link
  404s, which is acceptable for a prototype.

## Section 1: Data model

One Prisma migration adds:

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

model Notification {
  id        String           @id @default(cuid())
  userId    String           // recipient
  type      NotificationType
  actorId   String
  href      String
  subject   String?          @db.VarChar(80)
  /// Set for events that must not pile up (one REACTION per actor per post):
  /// `${type}:${actorId}:${targetId}`. Null for events that may repeat.
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

`User` gains `notifications Notification[] @relation("NotificationRecipient")`
and `notificationsSent Notification[] @relation("NotificationActor")`.

## Section 2: Rules

Pure module `src/features/notifications/rules.ts`:

- `describe(type, actorName, subject)` → the row's text, e.g.
  `"Bob Berg reacted to your post “Golden hour…”"`,
  `"Carol Chen sent you a friend request"`,
  `"Alice Andersen accepted your friend request"`,
  `"Dave Dahl commented on your post “…”"`,
  `"Erin asked to join Oslo Hikers"`,
  `"Your request to join Oslo Hikers was approved"`,
  `"Alice Andersen added you to the team of Nordic Bakery"`.
- `dedupeKeyFor(type, actorId, targetId)` → string for `REACTION`
  (`REACTION:<actorId>:<postId>`), `FRIEND_REQUEST` (`FRIEND_REQUEST:<actorId>`),
  `GROUP_JOIN_REQUEST` (`GROUP_JOIN_REQUEST:<actorId>:<groupId>`); null for the
  others.
- `subjectFrom(text)` → first 80 characters, trimmed, with `…` when cut.

Server module `src/features/notifications/service.ts` (`'server-only'`):

- `notify(input: { userId, type, actorId, href, subject?, targetId? })`:
  skips when `userId === actorId`; computes the dedupe key; upserts by
  `(userId, dedupeKey)` when a key exists (bumping `createdAt` to now and
  clearing `readAt`), otherwise inserts. Never throws to the caller: a failure
  is logged and swallowed, because a missed notification must not fail the
  action that caused it.
- `notifyMany(userIds, input)` for the group-admins case.

Call sites (existing actions):

- `sendFriendRequest` → `FRIEND_REQUEST` to the addressee (`/friends`).
  When the request is auto-accepted because the other side had already asked,
  send `FRIEND_ACCEPTED` to the other side instead.
- `acceptFriendRequest` → `FRIEND_ACCEPTED` to the requester (`/u/<accepter>`).
- `setReaction` → `REACTION` to the post author (`/p/<postId>`, subject from
  the body).
- `addComment` → `COMMENT` to the post author (`/p/<postId>`).
- `joinGroup` on a PRIVATE group → `GROUP_JOIN_REQUEST` to all admins
  (`/g/<slug>/members`, subject = group name).
- `respondToJoinRequest(accept=true)` and the public-flip auto-accept in
  `updateGroup` → `GROUP_JOIN_APPROVED` to the requester (`/g/<slug>`).
- `addTeamMember` → `PAGE_TEAM_ADDED` to the added user (`/pages/<slug>`).

Queries: `listNotifications(userId)` (newest 50 with actor Person),
`countUnreadNotifications(userId)`, `markAllRead(userId)`.

## Section 3: Routes and UI

| Route | Content |
| --- | --- |
| `/notifications` | Newest 50 rows; each row: actor avatar, the `describe` text as a link to `href`, the time; unread rows (unread at render time, i.e. before this visit marked them) are bold with an "New" marker. Empty state: "Nothing yet. Notifications about your posts, friend requests, groups and pages will show here." |

- `Navbar` gets a Notifications link after Messages showing
  `Notifications (n)` when n > 0.
- Opening `/notifications` calls `markAllRead` during render (same pattern
  and caveat as the messages thread) and mounts the existing
  `ThreadRefresher` with `refreshOnMount` when anything was marked, so the
  badge clears immediately.

## Section 4: Actions, errors and testing

No new server actions: notifications are created inside existing actions and
read inside the page. `notify` failures never surface to the user.

### Testing

Vitest (pure): `describe` for every type; `dedupeKeyFor` (keyed types vs
null); `subjectFrom` (short text untouched, long text cut to 80 with `…`).

Playwright (`e2e/notifications.spec.ts`):

1. B sends A a friend request → A's navbar shows "Notifications (1)";
   `/notifications` lists "… sent you a friend request" linking to `/friends`;
   opening the page clears the badge; A accepts → B gets "… accepted your
   friend request".
2. A posts; B (friend) reacts twice (Like, then Love) and comments → A has
   exactly one reaction notification and one comment notification; A reacting
   to their own post creates nothing.
3. A creates a private group; B requests to join → A gets a group join request
   notification linking to the members page; A approves → B gets the approved
   notification linking to the group.
4. A creates a page and adds B to the team → B gets the team notification
   linking to the page.

## Out of scope

Email or push delivery, real-time delivery, per-row read/unread, deleting or
muting notifications, notification settings, notifications for page posts,
group posts or messages, Marketplace.
