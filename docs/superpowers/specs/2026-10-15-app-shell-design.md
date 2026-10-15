# App shell (top bar, left sidebar, feed column) — design

Date: 2026-10-15
Status: decisions taken by Claude under the user's standing instruction ("implement all recommended versions without asking"); written spec committed for the record

## Purpose

The user shared a screenshot of Facebook's home page and asked for "our design
like top bar, sidebar and middle section". Today evibebook has a single-row
text navbar and a centred 768 px column. This phase replaces that with a
Facebook-style shell: a sticky icon top bar, a left sidebar of shortcuts, and
a centred content column with a Facebook-style composer. No new data, no new
routes.

## Decisions (recommended options, taken without asking)

- **Light theme.** The screenshot is in dark mode, but the whole app is styled
  light (zinc on white) and Facebook's default is light. Dark mode would touch
  every component and is deferred.
- **Only what was asked.** Top bar, left sidebar and the middle column.
  No right column (ads, birthdays), no stories strip, no Meta AI / Reels /
  Marketplace items; Marketplace is still unbuilt.
- **Icons are inline SVG** in one file (`src/components/icons.tsx`,
  Heroicons-style outline paths). No icon dependency added.
- **Existing routes and labels are kept.** The e2e suite asserts the single
  `navigation` landmark contains the user's name, `Friends (1)`,
  `Messages (1)` and `Notifications (1)`, and that a `Log out` button exists.
  Icon buttons therefore carry a visually hidden label with exactly that text,
  and the visible red badge is `aria-hidden`.
- **One `<nav>`.** The top bar is the only `navigation` landmark (Playwright
  strict mode would reject two). The sidebar is an `<aside>` with a plain
  list.
- **Account menu.** The avatar at the top right opens a dropdown with "See
  your profile", "Edit profile" and "Log out". The e2e `logOut` helper opens
  the menu first.
- **Composer.** Keeps the form contract (`body`, `image`, hidden `groupId` /
  `pageId`, label text "What's on your mind?") so the server action and tests
  are unchanged. Visually: avatar + rounded textarea with the placeholder
  "What's on your mind, {first name}?", a "Photo" button that opens the file
  picker and shows the chosen file name, and a Post button.
- **Content width.** The column stays `max-w-3xl` for every page so the
  existing pages (groups, messages, settings) are not re-flowed; the feed uses
  the same column.

## Section 1: Layout

`src/app/(app)/layout.tsx` renders:

```
<TopBar …/>                                  sticky, h-14, white, shadow, z-20
<div class="mx-auto flex w-full max-w-7xl">
  <Sidebar user=… />                         hidden <lg; lg: w-72 sticky top-14, self-start
  <main class="min-w-0 flex-1 px-4 py-6">
    <div class="mx-auto max-w-3xl">{children}</div>
  </main>
</div>
```

The layout still fetches the three badge counts in parallel and passes them
to `TopBar`.

## Section 2: Top bar (`src/components/TopBar.tsx`, server; tabs are client)

Three zones in one `<nav aria-label="Main">`:

- **Left:** round blue "e" logo linking to `/feed`, and a pill search form
  (`GET /people?q=`, `role="search"`, `aria-label="Search evibebook"`).
  The input is hidden below `md`; the logo always shows.
- **Centre (`NavTabs`, client):** Home `/feed`, Friends `/friends`,
  Groups `/groups`, Pages `/pages`. The active tab has a blue icon and a
  3 px blue bottom border; `isActive(pathname, href)` in `src/lib/nav.ts`
  treats `/feed` as exact, `/groups` as covering `/groups/*` and `/g/*`, and
  `/pages` as covering `/pages/*`. Friends shows the pending-request badge.
- **Right:** round grey icon buttons for Messages (`/messages`) and
  Notifications (`/notifications`) with red count badges (hidden at 0, `9+`
  above nine), then `AccountMenu` (client): the user's avatar with a chevron;
  the dropdown contains the profile link (avatar + name), "Edit profile" and
  the `Log out` form. Closes on outside click and Escape.

Badge text rule: visible `<span aria-hidden>{n}</span>` plus
`<span class="sr-only">{Label} ({n})</span>`; with no count the sr-only text
is just the label.

## Section 3: Sidebar (`src/components/Sidebar.tsx`, client)

`<aside>` with a `<ul>` of rows, each a `Link` with a round icon and a label,
`rounded-lg hover:bg-zinc-200`, active row `bg-zinc-200`:

1. Avatar + user's name → `/u/{username}`
2. Friends → `/friends`
3. Messages → `/messages`
4. Notifications → `/notifications`
5. Groups → `/groups`
6. Pages → `/pages`
7. People → `/people`
8. Settings → `/settings/profile`

Only visible at `lg` and up. Below that the top bar's tabs and account menu
reach everything (People and Settings are in the account menu too).

## Section 4: Middle column

- `PostComposer`: card with avatar row; textarea styled as a rounded grey
  field with no visible label (label is `sr-only`); footer row with a
  "Photo" button (hidden file input, chosen file name shown) and Post.
- `PostCard`: keep structure; make the footer a Facebook-style action row
  (reaction button, comment count) and drop the visible border in favour of
  a soft shadow via the shared `Card`.
- `Card` gets `rounded-lg bg-white shadow-sm` without the border.

## Section 5: Error handling

No new failure modes: the shell is server-rendered from the same data as the
current navbar. The account menu and tabs are client components that degrade
to plain links (the Log out form posts without JS when the menu is rendered
open on hydration failure is not a concern for a prototype).

## Section 6: Testing

- Unit (vitest): `src/lib/nav.test.ts` for `isActive`.
- e2e: existing suites must stay green (`navigation` text assertions, Log
  out via the account menu, composer label). Add one case to `auth.spec.ts`
  that the account menu opens and shows "Edit profile".
- Manual: screenshot of `/feed` at desktop and at 390 px width.
