import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/auth.config'

const { auth } = NextAuth(authConfig)

const AUTH_PAGES = ['/login', '/signup']
const PUBLIC_PREFIXES = ['/api/auth', '/uploads']

export default auth((req) => {
  const { pathname, search } = req.nextUrl
  const loggedIn = Boolean(req.auth?.user?.id)

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)))
    return NextResponse.next()

  // Auth pages are always reachable. The (auth) layout redirects logged-in users
  // using a database-backed check, so a stale JWT (user deleted) cannot loop.
  if (AUTH_PAGES.includes(pathname)) return NextResponse.next()

  if (!loggedIn) {
    const login = new URL('/login', req.nextUrl)
    if (pathname !== '/') login.searchParams.set('next', pathname + search)
    return NextResponse.redirect(login)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
