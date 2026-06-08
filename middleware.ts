// middleware.ts
// Bảo vệ các route nội bộ. Yêu cầu đăng nhập (JWT cookie) trước khi vào /dashboard, /line, v.v.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJWT } from './lib/auth'

const PROTECTED_PREFIXES = ['/dashboard', '/line', '/machines', '/reports', '/settings']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (!isProtected) {
    return NextResponse.next()
  }

  const token = request.cookies.get('fii_session')?.value

  if (!token) {
    const url = new URL('/', request.url)
    url.searchParams.set('error', 'login_required')
    return NextResponse.redirect(url)
  }

  const user = await verifyJWT(token)
  if (!user) {
    const url = new URL('/', request.url)
    url.searchParams.set('error', 'session_expired')
    return NextResponse.redirect(url)
  }

  // Có thể inject user vào header nếu cần cho server components
  const response = NextResponse.next()
  response.headers.set('x-user-id', user.id)
  response.headers.set('x-user-role', user.role)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|api/public).*)'],
}
