import { type EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')

  // Always use the public site URL for redirects — request.url resolves
  // to localhost:3000 internally behind Nginx, which breaks browser redirects
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://clinicassistai.online').replace(/\/$/, '')

  const supabase = await createClient()
  let user = null;

  console.log("Auth Callback Hit:", { hasToken: !!token_hash, hasCode: !!code, type });

  // Handle PKCE (Code) exchange if present
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error("PKCE Exchange Error:", error.message);
      return NextResponse.redirect(`${siteUrl}/login?error=${encodeURIComponent(error.message)}`)
    }
    user = data.user;
  } 
  // Handle OTP (Token Hash) verification
  else if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    
    if (error) {
      console.error("OTP Verification Error:", error.message);
      return NextResponse.redirect(`${siteUrl}/login?error=${encodeURIComponent(error.message)}`)
    }
    user = data.user;
  }

  // Backup: if user is not in the data result, try explicit getUser()
  if (!user) {
    console.log("User not found in exchange data, falling back to getUser()");
    const { data: { user: fallbackUser } } = await supabase.auth.getUser()
    user = fallbackUser;
  }
  
  if (user) {
    console.log("User Authenticated Successfully:", user.email);
    
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("onboarding_step")
      .eq("user_id", user.id)
      .single();

    if (clinicError && clinicError.code !== 'PGRST116') {
        console.error("Clinic Data Fetch Error:", clinicError.message);
    }

    if (!clinic || !clinic.onboarding_step || clinic.onboarding_step === "clinic") {
        console.log("Routing to Initial Onboarding");
        return NextResponse.redirect(`${siteUrl}/onboarding/clinic`)
    } else if (clinic.onboarding_step !== "completed" && clinic.onboarding_step !== "completed_deployed") {
        const step = clinic.onboarding_step.startsWith("completed") ? "agent" : clinic.onboarding_step;
        console.log("Routing to Persistent Onboarding Step:", step);
        return NextResponse.redirect(`${siteUrl}/onboarding/${step}`)
    } else {
        console.log("Routing to Dashboard");
        return NextResponse.redirect(`${siteUrl}/dashboard`)
    }
  }

  // Fallback error
  console.warn("Auth Callback reached end with no user. Final redirect to login.");
  return NextResponse.redirect(`${siteUrl}/login?error=${encodeURIComponent('Session creation failed. Please try again.')}`)
}

