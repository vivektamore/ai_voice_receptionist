import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Root Onboarding Entry Point
 * Logic: Checks the user's saved 'onboarding_step' in the database and 
 * redirects them immediately before rendering any HTML. 
 * This eliminates the loading spinner and double-fetches in dev mode.
 */
export default async function OnboardingRedirect() {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // If there's no user, the middleware handles the /login redirect, 
    // but just in case:
    if (authError || !user) {
        redirect("/login");
    }

    // Fetch current progress from DB
    const { data: clinic } = await supabase
        .from("clinics")
        .select("onboarding_step")
        .eq("user_id", user.id)
        .single();

    if (clinic?.onboarding_step && clinic.onboarding_step !== "completed") {
        redirect(`/onboarding/${clinic.onboarding_step}`);
    } else if (clinic?.onboarding_step === "completed") {
        redirect("/dashboard/agent");
    } else {
        redirect("/onboarding/clinic");
    }
}
