// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

/**
 * Only these paths are public.
 * Keep this list SHORT. Do NOT include '/' unless your landing page is truly public.
 */
const PUBLIC = new Set<string>([
  '/login',
  '/signup',
  '/signup/avatar',
  '/signup/check-email',
  '/signup/student',
  '/verified',                  // the confirm/code page
]);

/**
 * Allow specific API routes to run unauthenticated (email send & confirm).
 * Keep /api open *only* for what must be public.
 */
function isAllowedApi(pathname: string) {
  return (
    pathname.startsWith('/api/verification/') || // create/resend/confirm
    pathname === '/api/confirm'                  // if you still have it
  );
}

function isPublicPath(pathname: string) {
  if (isAllowedApi(pathname)) return true;
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) return true;
  // exact match or a child of a public path
  for (const base of PUBLIC) {
    if (pathname === base || pathname.startsWith(base + '/')) return true;
  }
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let public paths straight through
  if (isPublicPath(pathname)) return NextResponse.next();

  // Everything else is protected
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // 1) Must have a session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // 2) Must be activated
  //    RLS should allow users to read their own profile row.
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('activated_at')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error || !profile || !profile.activated_at) {
    const url = req.nextUrl.clone();
    url.pathname = '/signup/check-email';
    if (session.user.email) url.searchParams.set('e', session.user.email);
    return NextResponse.redirect(url);
  }

  return res;
}

// Run on all pages except static assets
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
