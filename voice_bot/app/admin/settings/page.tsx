import { getAdminSupabase } from "@/lib/supabase/admin";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = getAdminSupabase();

  // Fetch the current settings from the DB
  const { data: dbSettings } = await supabase
    .from("system_settings")
    .select("setting_key, setting_value")
    .order("setting_key");

  const initialSettings = (dbSettings || []).reduce((acc, row) => {
    acc[row.setting_key] = row.setting_value;
    return acc;
  }, {} as Record<string, string>);

  return <SettingsClient initialSettings={initialSettings} />;
}
