-- At most one friendship row per unordered pair of users, whichever direction
-- it was sent. Closes the race where two users request each other at once and
-- both pass the application's "no existing row" check.

-- Existing duplicates (both directions present) are collapsed first: keep the
-- accepted row if there is one, otherwise the oldest.
DELETE FROM "Friendship" f
USING (
  SELECT id,
         row_number() OVER (
           PARTITION BY LEAST("requesterId", "addresseeId"),
                        GREATEST("requesterId", "addresseeId")
           ORDER BY (status = 'ACCEPTED') DESC, "createdAt" ASC, id ASC
         ) AS rn
  FROM "Friendship"
) ranked
WHERE f.id = ranked.id AND ranked.rn > 1;

-- Prisma's schema language cannot express an expression index, so this lives
-- only in SQL; `prisma migrate` leaves indexes it does not model alone.
CREATE UNIQUE INDEX "Friendship_pair_key" ON "Friendship" (
  LEAST("requesterId", "addresseeId"),
  GREATEST("requesterId", "addresseeId")
);
