import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

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
        },
      },
    }
  );

  // Refresh the auth token to get current user
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (e) {
    console.error("Auth session refresh failed:", e);
  }

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isDashboardPage = pathname.startsWith('/dashboard');
  const isOnboardingPage = pathname.startsWith('/onboarding');
  const isAuthCallbackPage = pathname.startsWith('/auth/callback');
  const isLandingPage = pathname === '/';

  // ─── NOT LOGGED IN ──────────────────────────────────────────────────────────
  // If user is NOT logged in and tries to access dashboard or onboarding → /login
  if (!user && (isDashboardPage || isOnboardingPage) && !isAuthCallbackPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // ─── LOGGED IN ──────────────────────────────────────────────────────────────
  // If user IS logged in and hits / (landing) or /login → smart route them
  if (user && (isAuthPage || isLandingPage)) {
    try {
      const { data: clinic } = await supabase
        .from("clinics")
        .select("onboarding_step")
        .eq("user_id", user.id)
        .single();

      const url = request.nextUrl.clone();

      if (!clinic) {
        // No clinic row → brand new user → send to onboarding start
        url.pathname = '/onboarding/clinic';
      } else if (clinic.onboarding_step?.startsWith('completed')) {
        // Onboarding complete (any variant) → send to dashboard
        url.pathname = '/dashboard/agent';
      } else {
        // Partial onboarding → resume from where they left off
        url.pathname = `/onboarding/${clinic.onboarding_step}`;
      }
      return NextResponse.redirect(url);
    } catch (e) {
      console.error("Middleware clinic lookup failed:", e);
      // Safe fallback: let through (don't block the user)
    }
  }

  return supabaseResponse;
}
