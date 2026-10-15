-- CreateEnum
CREATE TYPE "PageRole" AS ENUM ('ADMIN', 'EDITOR');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "pageId" TEXT;

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(500),
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageMember" (
    "pageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PageRole" NOT NULL DEFAULT 'EDITOR',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageMember_pkey" PRIMARY KEY ("pageId","userId")
);

-- CreateTable
CREATE TABLE "PageFollow" (
    "pageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageFollow_pkey" PRIMARY KEY ("pageId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

-- CreateIndex
CREATE INDEX "PageMember_userId_idx" ON "PageMember"("userId");

-- CreateIndex
CREATE INDEX "PageFollow_userId_idx" ON "PageFollow"("userId");

-- CreateIndex
CREATE INDEX "Post_pageId_createdAt_id_idx" ON "Post"("pageId", "createdAt" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageMember" ADD CONSTRAINT "PageMember_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageMember" ADD CONSTRAINT "PageMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageFollow" ADD CONSTRAINT "PageFollow_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageFollow" ADD CONSTRAINT "PageFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A post belongs to at most one container (hand-written; Prisma cannot express CHECK constraints).
ALTER TABLE "Post" ADD CONSTRAINT "Post_one_container_check" CHECK ("groupId" IS NULL OR "pageId" IS NULL);
