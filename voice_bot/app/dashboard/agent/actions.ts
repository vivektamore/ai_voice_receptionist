"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveClinicSettings(formData: FormData) {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // --- Extract all form values ---
    const voice             = formData.get("voice") as string;
    const language          = formData.get("language") as string;
    const secondary_lang    = formData.get("secondary_lang") as string;
    const auto_detect       = formData.get("auto_detect") === "true";
    const personality       = formData.get("personality") as string;
    const custom_tone       = formData.get("custom_tone") as string;
    const custom_prompt     = formData.get("custom_prompt") as string;
    const clinic_name       = formData.get("clinic_name") as string;
    const greeting_message  = formData.get("greeting_message") as string;
    const working_hours     = formData.get("working_hours") as string;
    const emergency_handling    = formData.get("emergency_handling") === "true";
    const post_call_follow_up   = formData.get("post_call_follow_up") === "true";
    const call_handling_mode    = formData.get("call_handling_mode") as string;
    const booking_focus         = formData.get("booking_focus") === "true";
    const inquiry_answering     = formData.get("inquiry_answering") === "true";
    
    // Collection fields — these come as a comma-separated string from the hidden input
    const collection_fields_raw = formData.get("collection_fields") as string;
    const collection_fields = collection_fields_raw 
        ? collection_fields_raw.split(",").map(f => f.trim()).filter(Boolean)
        : ["Full Name", "Phone", "Date/Time", "Service Type"];

    // Special offers / custom message for the AI
    const custom_message = (formData.get("custom_message") as string) || "";

    let clinicId: string | null = null;

    // Check if the user already has a clinic row
    const { data: existing } = await supabase
        .from("clinics")
        .select("id")
        .eq("user_id", user.id)
        .single();

    const clinicPayload = {
        name: clinic_name,
        voice,
        language,
        personality: personality === "custom" ? `custom:${custom_tone}` : personality,
        custom_prompt: custom_prompt || null,
        greeting_message: greeting_message || null,
        working_hours: working_hours || null,
        emergency_handling,
        call_handling_mode,
        post_call_follow_up,
        secondary_language: secondary_lang,
        collection_fields: collection_fields.join(", "),
        custom_message: custom_message || null,
    };

    if (existing) {
        const { error } = await supabase
            .from("clinics").update(clinicPayload).eq("id", existing.id);
            
        if (error) {
            console.error("Failed to update clinic:", error);
            throw new Error(`Clinic update failed: ${error.message}`);
        }
        clinicId = existing.id;
    } else {
        const { data, error } = await supabase
            .from("clinics")
            .insert({ user_id: user.id, email: user.email, ...clinicPayload })
            .select().single();
            
        if (error || !data) throw new Error(`Clinic insert failed: ${error?.message}`);
        clinicId = data.id;
    }

    // ─── BUILD THE CLINIC-SPECIFIC RULES BLOCK ─────────────────────────────────
    // This block is APPENDED to the hardcoded inbound/outbound core prompts
    // by livekit_agent.py → resolve_agent_settings(). Core prompts are NEVER modified.

    const lines: string[] = [];

    // 1. Voice/Gender identity
    const voiceGenderMap: Record<string, string> = {
        priya: "female", meera: "female",
        tarun: "male",   arjun: "male",
    };
    const gender = voiceGenderMap[voice] || "female";
    lines.push(`IDENTITY: You are a ${gender} clinical receptionist for ${clinic_name || "this clinic"}.`);

    // 2. Greeting Template
    if (greeting_message) {
        lines.push(`GREETING RULE: Always begin the call exactly with: "${greeting_message}"`);
    }

    // 3. Personality / Tone
    const personalityMap: Record<string, string> = {
        friendly:     "TONE: Warm, bubbly, and extremely approachable. Use conversational empathy.",
        professional: "TONE: Highly professional, precise, and efficient. Focus on clinic standards.",
        sales:        "TONE: Persuasive and upbeat. Highlight the benefits of booking and our services.",
        empathetic:   "TONE: Soft-spoken, patient, and deeply caring. Prioritize the caller's emotional comfort.",
        direct:       "TONE: Direct, efficient, and concise. No small talk — get to the point quickly.",
        enthusiastic: "TONE: Energetic and enthusiastic. Make callers feel welcomed and excited.",
    };
    if (personality === "custom" && custom_tone) {
        lines.push(`TONE: ${custom_tone}`);
    } else if (personalityMap[personality]) {
        lines.push(personalityMap[personality]);
    }

    // 4. Conversation Controls
    if (booking_focus || call_handling_mode === "booking_only") {
        lines.push("FLOW RULE: Prioritize scheduling appointments. Gently redirect all conversations towards booking.");
    }
    if (inquiry_answering || call_handling_mode === "booking_inquiry") {
        lines.push("FLOW RULE: Answer general FAQ and clinic inquiries helpfully before offering to book an appointment.");
    }
    if (emergency_handling) {
        lines.push("EMERGENCY RULE: If the patient mentions severe pain, bleeding, or a life-threatening emergency, immediately prioritize connecting them to a human or advising them to call emergency services.");
    }
    if (post_call_follow_up) {
        lines.push("POST-CALL RULE: Inform the patient that a follow-up SMS confirmation will be sent to their phone after the call ends.");
    }

    // 5. Collection Fields
    if (collection_fields.length > 0) {
        lines.push(`DATA COLLECTION RULE: You must collect the following details from the patient before booking: ${collection_fields.join(", ")}. Do NOT book without all required fields.`);
    }

    // 6. Operating Hours
    if (working_hours) {
        lines.push(`HOURS RULE: Our clinic operates ${working_hours}. If a patient requests a time outside these hours, politely inform them and suggest the next available slot within operating hours.`);
    }

    // 7. Language Stack
    if (auto_detect) {
        const secLangLabel = secondary_lang !== "none" ? ` and ${secondary_lang}` : "";
        lines.push(`LANGUAGE RULE: Auto-detect the caller's language. Primary: ${language}${secLangLabel}. Respond in the same language the caller uses.`);
    } else {
        lines.push(`LANGUAGE RULE: Respond strictly in ${language} regardless of what language the caller uses.`);
    }

    // 8. Special Offers & Custom Message
    if (custom_message && custom_message.trim()) {
        lines.push(`CLINIC OFFERS RULE: ${custom_message.trim()} Mention this naturally and proactively during the conversation.`);
    }

    // 8b. Custom Prompt / Extra Instructions
    if (custom_prompt && custom_prompt.trim()) {
        lines.push(`CLINIC RULE EXTRA CONTEXT: ${custom_prompt.trim()}`);
    }

    const dynamicPrompt = lines.join("\n");

    // ─── SYNC TO PYTHON BACKEND (agent_settings table) ─────────────────────────
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    try {
        const toneValue = personality === "custom" ? custom_tone : (personalityMap[personality] ? personality : "professional");
        const response = await fetch(`${BACKEND_URL}/api/v1/agent/${clinicId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voice, language, prompt: dynamicPrompt, tone: toneValue })
        });
        if (!response.ok) {
            console.error(`Backend sync failed: ${response.status} ${response.statusText}`);
        } else {
            console.log("Agent settings synced to backend successfully.");
        }
    } catch (apiError) {
        console.error("Could not reach Python backend:", apiError);
    }

    // Redirect to clear any ?setup_required query parameters and show clean state
    revalidatePath("/", "layout");
    const { redirect } = await import("next/navigation");
    redirect("/dashboard/agent");
}
