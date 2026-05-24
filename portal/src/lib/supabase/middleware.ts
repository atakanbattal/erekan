import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function copyAuthCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

function clearSupabaseCookies(request: NextRequest, response: NextResponse) {
  request.cookies.getAll().forEach((cookie) => {
    if (cookie.name.startsWith('sb-')) {
      response.cookies.set(cookie.name, '', { path: '/', maxAge: 0 });
    }
  });
}

function createSupabase(request: NextRequest, onCookies: (cookies: NextResponse) => void) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          onCookies(supabaseResponse);
        },
      },
    }
  );

  return { supabase, getResponse: () => supabaseResponse };
}

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path === '/auth/signout') {
    let cookieResponse = NextResponse.next({ request });
    const { supabase, getResponse } = createSupabase(request, (response) => {
      cookieResponse = response;
    });

    await supabase.auth.signOut({ scope: 'local' });
    cookieResponse = getResponse();

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    const redirect = NextResponse.redirect(loginUrl);
    redirect.headers.set('Cache-Control', 'no-store');

    copyAuthCookies(cookieResponse, redirect);
    clearSupabaseCookies(request, redirect);
    return redirect;
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // Stale or invalid session — clear cookies so the client can recover
      if (
        error.message?.includes('Refresh Token') ||
        error.message?.includes('fetch failed')
      ) {
        clearSupabaseCookies(request, supabaseResponse);
      }
    } else {
      user = data.user;
    }
  } catch {
    // Network / edge fetch failure — treat as unauthenticated
  }

  if (!user && !path.startsWith('/login') && !path.startsWith('/setup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && path === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith('/admin')) {
    const { data: staff } = await supabase
      .from('staff_profiles')
      .select('is_admin')
      .eq('auth_user_id', user.id)
      .single();

    if (!staff?.is_admin) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
