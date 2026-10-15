# Pages — design

Date: 2026-10-15
Status: approved in conversation, pending written review

## Purpose

evibebook is a Facebook-style social network being built as a prototype for a
real product. Groups shipped on 2026-10-15; Pages is the second of the three
missing features (Pages, Groups, Marketplace). A Page is a public presence for
a brand, organisation or public figure: any user can create one, other users
follow it with one click, and posts made on the page appear on the page and in
followers' feeds. Marketplace is out of scope and gets its own spec.

Page posts reuse the existing `Post` model (reactions, comments, images and
`/p/[id]` keep working), exactly as group posts do.

## Decisions made with the user

- Page posts appear to come from **the page itself** (page name and avatar as
  the author); the acting admin is stored for audit but not shown.
- Roles: **ADMIN** and **EDITOR**. Followers can react and comment but not post.
- Storage: own tables (`Page`, `PageMember`, `PageFollow`) and a nullable
  `pageId` on `Post` — not a `kind` column on `Group`, not pseudo-users.
- A page has an **avatar** (existing upload machinery) but no cover photo.
- The creator **auto-follows** their own page.

## Section 1: Data model

One Prisma migration adds:

```prisma
enum PageRole {
  ADMIN
  EDITOR
}

model Page {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String   @db.VarChar(80)
  description String?  @db.VarChar(500)
  avatarUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members   PageMember[]
  followers PageFollow[]
  posts     Post[]
}

/// The page's team. The creator is the first ADMIN; there is no creator column,
/// so deleting a user who handed the page off never deletes the page.
model PageMember {
  pageId   String
  userId   String
  role     PageRole @default(EDITOR)
  joinedAt DateTime @default(now())

  page Page @relation(fields: [pageId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([pageId, userId])
  @@index([userId])
}

model PageFollow {
  pageId    String
  userId    String
  createdAt DateTime @default(now())

  page Page @relation(fields: [pageId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([pageId, userId])
  @@index([userId])
}
```

`Post` gains `pageId String?` with
`page Page? @relation(fields: [pageId], references: [id], onDelete: Cascade)`
and `@@index([pageId, createdAt(sort: Desc), id(sort: Desc)])`. `User` gains
`pageMemberships PageMember[]` and `pageFollows PageFollow[]`.

A post belongs to at most one container. The migration SQL adds, by hand,
`ALTER TABLE "Post" ADD CONSTRAINT "Post_one_container_check" CHECK ("groupId" IS NULL OR "pageId" IS NULL);`
and `createPost` refuses a request that names both.

Slugs: the group slug helpers (`slugify`, `withSuffix`, `SLUG_MAX`) move to a
shared module `src/lib/slug.ts` (with their tests) and both features import it.
Page slugs are unique among pages; the `/pages/[slug]` and `/g/[slug]`
namespaces are independent.

Deleting a page cascades to its team, followers and posts; the action collects
post image URLs first and removes the files after the row delete succeeds,
mirroring `deleteGroup`. Deleting a user cascades only their team rows and
follows.

Creating a page inserts the page, the creator as ADMIN and the creator as a
follower in one transaction.

## Section 2: Visibility and permissions

### Post visibility

`PostVisibilityInput` gains `pageId: string | null`. `canViewPost` returns
`true` for any post with a `pageId`; the group and friends branches are
unchanged. `getPost`, `canAccessPost` and the profile query all go through it,
so reactions and comments inherit the rule.

### Main feed

`getFeed` returns, newest first with the existing cursor pagination, posts that
match any of:

- `groupId` null AND `pageId` null AND author is the viewer or an accepted friend
  (timeline posts);
- `groupId` in the viewer's member groups;
- `pageId` in the pages the viewer follows.

Still one `findMany` with an `OR` where-clause.

### Profiles

`getUserPosts` adds `pageId: null` to its where-clause: page posts belong to the
page and never appear on the acting user's profile.

### Rendering

When `post.page` is set, `PostCard` shows the page's avatar and name as the
author, linking to `/pages/[slug]`, and shows no person and no "in Group"
label. `FeedPost` gains `page: { id, slug, name, avatarUrl } | null`.
`canDelete` is true for the acting author or any team member of the post's page.

### Role matrix

| Action | Follower | EDITOR | ADMIN |
| --- | --- | --- | --- |
| Follow / unfollow, react, comment | yes | yes | yes |
| Post as the page | — | yes | yes |
| Delete any page post | — | yes | yes |
| Leave the team | — | yes | yes, unless last admin |
| Add team member (by username, with role) | — | — | yes |
| Change a member's role | — | — | yes (own role only if another admin remains) |
| Remove a member | — | — | yes (self only if another admin remains) |
| Edit name, description, avatar | — | — | yes |
| Delete page | — | — | yes |

Encoded in a pure `src/features/pages/permissions.ts` (`canPostAsPage`,
`canManagePage`, `canRemoveTeamMember`, `canChangeTeamRole`, `isPageRole`,
`PAGE_ROLES`). "At least one admin" is enforced inside a transaction that first
locks the page row (`SELECT … FOR UPDATE`), the pattern Groups uses, for
`setTeamRole`, `removeTeamMember` and leaving.

### Following

`followPage` / `unfollowPage` are idempotent (`createMany` with
`skipDuplicates` / `deleteMany`). A team member may also follow or unfollow;
the two relationships are independent.

## Section 3: Routes and UI

All pages live under `src/app/(app)/` and use `requireUser()`.

| Route | Content |
| --- | --- |
| `/pages` | "Your pages" (team membership with role) and "Following" lists, a Create page button, and a name search (same pattern as `/groups`); search rows show Follow / Following |
| `/pages/new` | Form: name, description, avatar. Redirects to `/pages/[slug]` |
| `/pages/[slug]` | Header: avatar, name, description, follower count, Follow / Unfollow. Team link for team members; Settings link for admins. Composer for team members. Paginated `PostList` with `basePath=/pages/[slug]`; posts render as the page. 404 on unknown slug |
| `/pages/[slug]/team` | Team members only (others 404). Member list with roles. Admins: "Add team member" form (username + role), role selector per row, Remove. Editors: list plus Leave for themselves |
| `/pages/[slug]/settings` | Admins only (others 404). Edit form (name, description, avatar) and Delete page with a required confirm checkbox |

Other UI changes:

- `Navbar` gets a Pages link after Groups.
- `PostComposer` accepts an optional `pageId` (hidden field), alongside the
  existing `groupId`; a composer never receives both.
- `PostCard` renders the page-as-author variant described above.

## Section 4: Actions, errors and testing

### Feature folder

`src/features/pages/` with `schemas.ts` (zod: name 1–80, description ≤500 →
null when empty), `permissions.ts`, `queries.ts`, `actions.ts`, `components/`.

Actions (all `'use server'`, all return `ActionResult`, all re-read the
viewer's role from the database): `createPage`, `updatePage`, `deletePage`,
`followPage`, `unfollowPage`, `addTeamMember(pageId, formData: username, role)`,
`setTeamRole`, `removeTeamMember`. Form-action wrappers follow the existing
`refreshOnFailure` pattern; leaving the team is `removeTeamMember` on oneself.

Changes to existing post code:

- `createPost` reads an optional `pageId`; when present it requires a team
  role and stores it; a request naming both `groupId` and `pageId` fails with
  "A post belongs to a group or a page, not both". Revalidates `/pages/[slug]`.
- `deletePost` allows the acting author or any team member of the post's page.
- `postInclude` adds `page: { id, slug, name, avatarUrl }`.

Queries: `getPageRoles(userId)` → `Map<pageId, PageRole>`;
`getFollowedPageIds(userId)`; `getPageBySlug(viewerId, slug)` → `PageView`
(summary + `viewerRole` + `following` + `followerCount`); `getMyPages`;
`getFollowedPages`; `searchPages(q, viewerId)`; `getTeam(pageId)`;
`getPagePosts(viewerId, pageId, cursor)` in the posts queries.

### Error handling

- Unknown slug → `notFound()`; team and settings pages also `notFound()` for
  users without the required role.
- Permission failures → `fail('...')`, never thrown: posting without a team
  role ("You must be on the page's team to post here"), unknown username on add
  ("No user with that username"), adding someone already on the team ("Already
  on the team"), last-admin demote/remove ("Add another admin first").
- Avatar upload failures reuse the profile form's field-error path; a page
  update with a new avatar deletes the previous file after the row update, as
  `updateProfile` does.
- Lost races (member already removed) → `fail` and the page re-renders.

### Testing

Vitest (pure, no DB):

- `canViewPost` page branch (public to non-friends and non-followers).
- `permissions.ts` role matrix for pages.
- `schemas.ts` limits.
- Shared slug tests move with the module to `src/lib/slug.test.ts`.

Playwright (`e2e/pages.spec.ts`, serial, cleanup through the existing
teardown — pages created by test users are deleted when the last admin user
is deleted only if cascades reach them; because `Page` has no creator column,
the spec adds a teardown step that deletes pages with no remaining team
members):

1. User A creates a page with an avatar; it appears under Your pages; the
   avatar is served.
2. User B follows from search; A posts as the page; B's feed shows the post
   with the page's name as author and no person; A's profile does not show it.
3. A adds B as EDITOR by username; B can post as the page; a third user C,
   not on the team, has no composer and gets 404 on `/pages/[slug]/team`.
4. A cannot demote themselves while sole admin ("Add another admin first");
   after promoting B, A can.
5. B unfollows; the page's posts leave B's feed.
6. A deletes the page from settings; `/pages/[slug]` is 404.

## Out of scope

Cover photos, categories, page likes as distinct from follows, insights,
messaging, verification, page invitations, Marketplace.
