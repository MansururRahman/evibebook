import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from '../src/lib/password'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

const PASSWORD = 'password123'

function minutesAgo(m: number) {
  return new Date(Date.now() - m * 60_000)
}

async function main() {
  await prisma.friendship.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.reaction.deleteMany()
  await prisma.post.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await hashPassword(PASSWORD)
  const mk = (username: string, name: string, bio: string) =>
    prisma.user.create({
      data: {
        email: `${username}@example.com`,
        username,
        name,
        bio,
        passwordHash,
      },
    })

  const alice = await mk(
    'alice',
    'Alice Andersen',
    'Coffee, climbing, and code.',
  )
  const bob = await mk('bob', 'Bob Berg', 'Photographer. Mostly fjords.')
  const carol = await mk('carol', 'Carol Chen', 'Runs on playlists and pastry.')
  const dave = await mk('dave', 'Dave Dahl', 'New here. Say hi!')

  await prisma.friendship.createMany({
    data: [
      {
        requesterId: alice.id,
        addresseeId: bob.id,
        status: 'ACCEPTED',
        respondedAt: minutesAgo(600),
      },
      { requesterId: carol.id, addresseeId: alice.id, status: 'PENDING' },
      { requesterId: bob.id, addresseeId: dave.id, status: 'PENDING' },
    ],
  })

  const post = (authorId: string, body: string, m: number) =>
    prisma.post.create({ data: { authorId, body, createdAt: minutesAgo(m) } })

  const a1 = await post(alice.id, 'First post on evibebook!', 500)
  await post(
    alice.id,
    'Climbed the local crag this morning. Forearms are done.',
    300,
  )
  await post(alice.id, 'Anyone have a good sourdough starter to share?', 60)
  const b1 = await post(
    bob.id,
    'Golden hour over the fjord today. Unreal light.',
    400,
  )
  await post(bob.id, 'Testing a new 35mm lens this weekend.', 120)
  await post(carol.id, 'New running playlist is up. 180 bpm all the way.', 350)
  await post(carol.id, 'Cardamom buns: attempt #4. Getting close.', 90)
  await post(dave.id, 'Hello world. Just joined.', 30)

  await prisma.reaction.createMany({
    data: [
      { userId: bob.id, postId: a1.id, type: 'LIKE' },
      { userId: carol.id, postId: a1.id, type: 'LOVE' },
      { userId: dave.id, postId: a1.id, type: 'WOW' },
    ],
  })
  await prisma.comment.create({
    data: { postId: a1.id, authorId: bob.id, body: 'Welcome!' },
  })
  await prisma.comment.create({
    data: { postId: b1.id, authorId: alice.id, body: 'Stunning. Which spot?' },
  })
  await prisma.comment.create({
    data: {
      postId: b1.id,
      authorId: bob.id,
      body: 'Just past the ferry landing.',
    },
  })

  console.log(
    'Seeded: 4 users (password "password123"), 8 posts, 3 friendships',
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
