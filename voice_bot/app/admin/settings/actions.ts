"use server";

import { getAdminSupabase } from "@/lib/supabase/admin";

export async function saveGlobalSettings(formData: Record<string, string>) {
  const supabase = getAdminSupabase();
  
  const entries = Object.entries(formData).map(([key, value]) => ({
    setting_key: key,
    setting_value: value,
    updated_at: new Date().toISOString()
  }));

  if (entries.length === 0) return { status: "ok" };

  const { error } = await supabase
    .from("system_settings")
    .upsert(entries, { onConflict: "setting_key" });

  if (error) {
    console.error("Failed to save global settings:", error);
    return { status: "error", error: error.message };
  }

  // Trigger backend reload
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
    await fetch(`${backendUrl}/api/v1/system/reload-settings`, {
      method: "POST"
    });
  } catch (e) {
    console.error("Failed to ping backend reload:", e);
    // Even if ping fails, the DB is updated, but backend might need manual restart or we report warn
    return { status: "warn", message: "Saved to DB but backend reload ping failed." };
  }

  return { status: "ok" };
}
