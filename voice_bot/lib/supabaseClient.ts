import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// WARNING: For local dev we are using the service key so we don't have to battle RLS policies.
// In a real production deployment, you MUST use the ANON key here and set up Row Level Security.
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);
