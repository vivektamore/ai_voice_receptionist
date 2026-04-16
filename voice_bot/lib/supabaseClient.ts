import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

// createBrowserClient is session-aware via cookies in Next.js
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
