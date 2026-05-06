"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sendMagicLink(formData: FormData) {
  const email = formData.get("email") as string;

  console.log("Sending magic link to:", email);

  try {
    const supabase = await createClient();
    
    // Fallback for local dev if NEXT_PUBLIC_SITE_URL is not set
    // Strip trailing slash to prevent double-slash in redirect URL
    const origin = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
    
    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        shouldCreateUser: true, // Auto-signup new users
      }
    });

    if (error) {
      console.error("Supabase Magic Link Error:", error.message);
      const errUrl = `/login?error=${encodeURIComponent(error.message)}`;
      redirect(errUrl);
    }

  } catch (err: any) {
    // Re-throw redirect errors so Next.js handles them properly
    if (err.digest?.includes("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("Unexpected Magic Link Error:", err);
    redirect(`/login?error=${encodeURIComponent("An unexpected error occurred.")}`);
  }
  
  // Redirect to self with a success parameter to show the "Check Email" state
  redirect(`/login?success=true&email=${encodeURIComponent(email)}`);
}

export async function signInWithGoogle(): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  // Strip trailing slash to prevent double-slash in redirect URL
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    return { url: data.url };
  }

  return { error: 'No OAuth URL returned from Supabase.' };
}



export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
