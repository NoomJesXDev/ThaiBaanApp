import { NextResponse, type NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  const user = token ? await verifyJWT(token) : null;

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register');
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

  // Protect Admin routes
  if (isAdminRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect logged-in admin users away from login/register to dashboard
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/billing';
    return NextResponse.redirect(url);
  }

  // Add the user info to request headers so Server Components can read them
  const requestHeaders = new Headers(request.headers);
  if (user) {
    requestHeaders.set('x-user-id', user.userId);
    requestHeaders.set('x-user-email', user.email);
    requestHeaders.set('x-user-community-id', user.communityId);
    requestHeaders.set('x-user-role', user.role);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
