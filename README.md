# evibebook

A Facebook-style social network: profiles, posts with images, a friends-only feed, likes, comments, and friend requests.

Stack: Next.js (App Router) + TypeScript, Prisma + PostgreSQL, Auth.js credentials login, Tailwind CSS.

## Local development

Requirements: Node 22+, pnpm 10+, Docker Desktop.

```powershell
Copy-Item .env.example .env   # then set AUTH_SECRET (see comment in the file)
pnpm install
pnpm db:up                    # Postgres 17 in Docker on localhost:5433
pnpm db:migrate               # apply migrations and generate the Prisma client
pnpm db:seed                  # alice / bob / carol / dave, password "password123"
pnpm dev                      # http://localhost:3000
```

Other scripts:

| Script                         | What it does                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `pnpm test`                    | Unit tests (Vitest)                                                             |
| `pnpm test:e2e`                | End-to-end tests (Playwright; run `pnpm exec playwright install chromium` once) |
| `pnpm typecheck` / `pnpm lint` | TypeScript and ESLint                                                           |
| `pnpm db:studio`               | Prisma Studio                                                                   |
| `pnpm db:reset`                | Drop, migrate, and re-seed the database                                         |
| `pnpm db:down`                 | Stop the database container                                                     |

Uploaded images are stored in `./uploads` (gitignored) and served from `/uploads/...`.
