# Groups — design

Date: 2026-10-14
Status: approved in conversation, pending written review

## Purpose

evibebook is a Facebook-style social network being built as a prototype for a
real product. Pages, Groups and Marketplace are all missing; Groups is built
first because it reuses the most existing machinery (posts, reactions,
comments, friends-style request handling). Pages and Marketplace get their own
specs later and are out of scope here.

A group is a named container with members and its own post stream. Group posts
reuse the existing `Post` model and therefore keep reactions, comments, images
and the `/p/[id]` page unchanged.

## Decisions made with the user

- Build Groups first; Pages and Marketplace later.
- Privacy: PUBLIC (anyone can see posts and join instantly) and PRIVATE
  (posts visible only to members; joining needs admin approval).
- Group posts also appear in members' main `/feed`, labelled with the group.
- Storage: nullable `groupId` on `Post` (not a separate GroupPost model, not a
  generic container abstraction).
- Roles: ADMIN, MODERATOR, MEMBER.
- A private group's name, description and member count are visible to any
  logged-in user so it can be found and joined; its posts are not.

## Section 1: Data model

One Prisma migration adds:

```prisma
enum GroupPrivacy { PUBLIC PRIVATE }
enum GroupRole { ADMIN MODERATOR MEMBER }

model Group {
  id          String       @id @default(cuid())
  slug        String       @unique
  name        String       @db.VarChar(80)
  description String?      @db.VarChar(500)
  privacy     GroupPrivacy @default(PUBLIC)
  creatorId   String
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  creator      User               @relation("GroupCreator", fields: [creatorId], references: [id], onDelete: Cascade)
  members      GroupMember[]
  joinRequests GroupJoinRequest[]
  posts        Post[]
}

model GroupMember {
  groupId  String
  userId   String
  role     GroupRole @default(MEMBER)
  joinedAt DateTime  @default(now())

  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([groupId, userId])
  @@index([userId])
}

model GroupJoinRequest {
  groupId   String
  userId    String
  createdAt DateTime @default(now())

  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([groupId, userId])
  @@index([userId])
}
```

`Post` gains `groupId String?` with
`group Group? @relation(fields: [groupId], references: [id], onDelete: Cascade)`
and `@@index([groupId, createdAt(sort: Desc), id(sort: Desc)])`.
`User` gains the inverse relations (`createdGroups`, `groupMemberships`,
`groupJoinRequests`).

Slug: lower-cased name, non-alphanumerics collapsed to `-`, trimmed, capped at
60 chars; on a unique-constraint collision append `-` plus a 4-char random
suffix and retry (bounded to a few attempts). Slugs never change after
creation, even when the group is renamed.

Deleting a group cascades to its members, join requests and posts. Before the
row is deleted, the action collects the group's post image URLs and removes the
files after the delete succeeds, mirroring `deletePost`.

The creator is inserted as an ADMIN member in the same transaction that creates
the group.

## Section 2: Visibility and permissions

### Post visibility

Replace the friends-only check with one pure function in `src/lib/feed.ts`:

```ts
type PostVisibilityInput = {
  authorId: string
  group: { id: string; privacy: GroupPrivacy } | null
}
canViewPost(viewerId, post, friendIds, memberGroupIds): boolean
```

- Group post: visible when `group.privacy === 'PUBLIC'` or `memberGroupIds`
  contains `group.id`.
- Non-group post: visible when viewer is the author or an accepted friend
  (today's rule).

`getPost`, `canAccessPost` and `getUserPosts` call this function, so reacting
and commenting inherit the rule. On a profile page, a user's group posts are
shown only when the viewer may see them under the same rule (public group, or
viewer is a member); this is done by including the group in the profile query
and filtering with `canViewPost`.

### Main feed

`getFeed` returns, newest first with the existing cursor pagination:

- non-group posts whose author is the viewer or an accepted friend, OR
- posts whose `groupId` is in the viewer's member group ids.

Implemented as one `findMany` with an `OR` where-clause; no union query.

### Group page access

| Viewer | Public group | Private group |
| --- | --- | --- |
| Non-member | header + posts + Join | header + "This group is private" + Request to join / Cancel request |
| Member | header + composer + posts + Leave | same as public |

### Role matrix

| Action | MEMBER | MODERATOR | ADMIN |
| --- | --- | --- | --- |
| Post in group | yes | yes | yes |
| Delete own post | yes | yes | yes |
| Delete any post in group | — | yes | yes |
| Leave group | yes | yes | yes, unless last admin |
| Remove member with role MEMBER | — | yes | yes |
| Remove MODERATOR or ADMIN | — | — | yes (not self) |
| Change a member's role | — | — | yes (not own role) |
| Approve / decline join requests | — | — | yes |
| Edit name, description, privacy | — | — | yes |
| Delete group | — | — | yes |

Encoded in a pure helper `src/features/groups/permissions.ts`
(`canDeletePost`, `canRemoveMember`, `canManage`, …) that takes roles and ids,
so it is unit-testable without a database.

Switching a group from PUBLIC to PRIVATE keeps existing members; pending
requests on a group switched to PUBLIC are auto-accepted in the same
transaction as the update.

### Joining

- Public: `joinGroup` upserts a MEMBER row (`createMany` with
  `skipDuplicates`, as friend requests do). Idempotent.
- Private: `joinGroup` creates a `GroupJoinRequest` with `skipDuplicates`;
  `cancelJoinRequest` deletes it. `respondToJoinRequest(accept)` runs in one
  transaction: delete the request, insert the member; if the request is gone
  (already handled) the action returns a plain failure and the page
  re-renders. Decline just deletes the request.

## Section 3: Routes and UI

All pages live under `src/app/(app)/` and use `requireUser()`.

| Route | Content |
| --- | --- |
| `/groups` | "Your groups" list (name, privacy badge, member count, role) with a Create group button; below, a search box over all groups by name (same pattern as `/people`), each row with Join / Requested / View |
| `/groups/new` | Form: name, description, privacy radio. Redirects to `/g/[slug]` |
| `/g/[slug]` | Header (name, description, badge, member count, membership button, Members link; Settings link for admins). Composer for members. Paginated `PostList` with `basePath=/g/[slug]`. 404 on unknown slug |
| `/g/[slug]/members` | Member list with roles. Moderators/admins see Remove where allowed; admins see a role selector. On private groups admins see pending requests at the top with Approve / Decline |
| `/g/[slug]/settings` | Admin only (others get not-found). Edit form plus Delete group with a confirm step |

Other UI changes:

- `Navbar` gets a Groups link between Friends and People.
- `PostCard` shows `in <Group name>` (link to `/g/[slug]`) after the author
  name when `post.group` is set. `FeedPost` gains
  `group: { slug: string; name: string } | null`.
- `PostCard`'s Delete button appears when the viewer is the author or
  `post.canDelete` (computed server-side from the viewer's role) is true.
- `PostComposer` accepts an optional `groupId` and forwards it as a hidden
  field; the same component serves `/feed` and `/g/[slug]`.

## Section 4: Actions, errors and testing

### Feature folder

`src/features/groups/` with `schemas.ts` (zod: name 1–80, description ≤500,
privacy enum), `slug.ts`, `permissions.ts`, `queries.ts`, `actions.ts`,
`components/`.

Actions (all `'use server'`, all return `ActionResult`, all re-read the
viewer's membership/role from the database before acting):
`createGroup`, `updateGroup`, `deleteGroup`, `joinGroup`, `leaveGroup`,
`cancelJoinRequest`, `respondToJoinRequest`, `removeMember`, `setMemberRole`.
Form-action wrappers follow the existing `refreshOnFailure` pattern.

Changes to existing post actions:

- `createPost` reads an optional `groupId`; when present it verifies
  membership and stores it. Revalidates `/g/[slug]` as well as `/feed`.
- `deletePost` allows the author, or a MODERATOR/ADMIN of the post's group.

Queries: `getGroupBySlug(viewerId, slug)` returns the group plus the viewer's
role (or null) and pending-request flag; `getGroupPosts` (paginated, applies
visibility); `getMyGroups`; `searchGroups(q, viewerId)`; `getMembers`;
`getJoinRequests`; `getMemberGroupIds(viewerId)` used by feed and visibility.

### Error handling

- Unknown slug → `notFound()`.
- Permission failures (non-member posting, non-admin settings, last admin
  leaving, removing self, changing own role) → `fail('...')` with a plain
  message; never throw.
- Lost races (request already handled, member already removed) → `fail` and
  the page re-renders through `refreshOnFailure`.
- Group delete removes post image files after the row delete succeeds; a
  failed file delete is logged, not surfaced (as today for posts).

### Testing

Vitest (pure, no DB):

- `canViewPost` for all branches (public group, private member, private
  non-member, non-group friend, non-group stranger, self).
- `permissions.ts` role matrix.
- `slug.ts` normalisation and cap.
- `schemas.ts` limits.

Playwright (`e2e/groups.spec.ts`, serial, with cleanup in the existing
teardown):

1. User A creates a public group; it appears under Your groups and in search.
2. User B joins instantly and posts; the post shows on the group page and in
   both A's and B's `/feed` labelled with the group name.
3. A (admin) promotes B to moderator; B deletes a post by A.
4. A creates a private group; B requests to join; B cannot see posts; A
   approves; B now sees posts and can post.
5. Last admin cannot leave; admin deletes the group; `/g/[slug]` is 404.

## Out of scope

Pages, Marketplace, group cover images, hidden/secret groups, group invites,
post pinning, notifications for join requests (notifications are a separate
planned phase), and group search beyond name match.
