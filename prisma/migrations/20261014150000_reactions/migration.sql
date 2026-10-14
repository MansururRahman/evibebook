-- Likes become reactions: the same one-row-per-user-per-post table, plus a
-- type. Existing likes are kept as LIKE reactions, so this is a rename and an
-- added column rather than the drop-and-recreate `prisma migrate` would write.

CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'LOVE', 'CARE', 'HAHA', 'WOW', 'SAD', 'ANGRY');

ALTER TABLE "Like" RENAME TO "Reaction";
ALTER TABLE "Reaction" ADD COLUMN "type" "ReactionType" NOT NULL DEFAULT 'LIKE';

-- Keep constraint and index names in step with what Prisma expects for the new model name.
ALTER TABLE "Reaction" RENAME CONSTRAINT "Like_pkey" TO "Reaction_pkey";
ALTER TABLE "Reaction" RENAME CONSTRAINT "Like_userId_fkey" TO "Reaction_userId_fkey";
ALTER TABLE "Reaction" RENAME CONSTRAINT "Like_postId_fkey" TO "Reaction_postId_fkey";
ALTER INDEX "Like_postId_idx" RENAME TO "Reaction_postId_idx";
