"use server";

import { createClient } from "@/lib/supabase/server";

export async function triggerCallBack(targetPhone: string, patientName: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: clinic } = await supabase.from("clinics").select("id, name").eq("user_id", user.id).single();
    if (!clinic) throw new Error("Clinic not found.");

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const response = await fetch(`${BACKEND_URL}/api/v1/voice/outbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            recipient_phone: targetPhone,
            clinic_id: clinic.id,
            call_context: { 
                type: "lead_followup",
                patient_name: patientName,
                clinic_name: clinic.name
            }
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Call back failed: ${response.statusText}`);
    }

    return { success: true };
}
