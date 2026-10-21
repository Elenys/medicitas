import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/constants';
import { verifySession } from '@/server/session';

// Protección de rutas (especificacion/05 §1). Solo verifica firma y vigencia del
// token; la autorización fina vive en la API. El cliente nunca es la única barrera.

const HOME_BY_ROLE: Record<string, string> = {
  PATIENT: '/paciente',
  DOCTOR: '/medico',
  ADMIN: '/admin',
};
const PUBLIC_PATHS = ['/login', '/registro'];
const ROLE_PREFIXES: Array<[string, string]> = [
  ['/paciente', 'PATIENT'],
  ['/medico', 'DOCTOR'],
  ['/admin', 'ADMIN'],
];

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!session) {
    if (isPublic) return NextResponse.next();
    const login = new URL('/login', request.url);
    if (pathname !== '/') login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  const home = HOME_BY_ROLE[session.role] ?? '/login';
  if (isPublic || pathname === '/') return NextResponse.redirect(new URL(home, request.url));

  const mismatch = ROLE_PREFIXES.some(
    ([prefix, role]) => pathname.startsWith(prefix) && session.role !== role,
  );
  if (mismatch) return NextResponse.redirect(new URL(home, request.url));

  return NextResponse.next();
}

export const config = {
  // Todo salvo la API, los recursos estáticos y los archivos públicos.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)).*)'],
};
