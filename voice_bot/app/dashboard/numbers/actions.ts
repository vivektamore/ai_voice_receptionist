"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function searchNumbers(provider: string, areaCode: string, countryCode: string = "US") {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    try {
        const url = new URL(`${BACKEND_URL}/api/v1/payments/available-numbers`);
        url.searchParams.append("provider", provider);
        url.searchParams.append("country_code", countryCode);
        // Clean area code for queries (Vobiz sometimes requires exactly 3 digits, etc.)
        if (areaCode) url.searchParams.append("area_code", areaCode);
        
        const response = await fetch(url.toString(), { cache: "no-store" });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to fetch available numbers: ${errorData.detail || response.statusText}`);
        }
        const data = await response.json();
        return data.numbers || []; // Returns [{"number": "+x", "friendly_name": "..."}]
    } catch (e: any) {
        console.error("Number search error:", e);
        throw new Error(e.message || "Failed to search numbers via the telephony backend.");
    }
}

export async function createPaymentOrder(provider: string, phoneNumber: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: clinic } = await supabase.from("clinics").select("id").eq("user_id", user.id).single();
    if (!clinic) throw new Error("You must complete Agent Setup (Step 1) first.");

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    try {
        const response = await fetch(`${BACKEND_URL}/api/v1/payments/create-order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                clinic_id: clinic.id,
                provider: provider,
                phone_number: phoneNumber
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to create order: ${errorData.detail || response.statusText}`);
        }

        return await response.json(); 
        // Returns { "status": "success", "order_id": "...", "amount": 49900, "currency": "INR" }
    } catch (e: any) {
        console.error("Order creation error:", e);
        throw new Error(e.message || "Failed to initialize payment gateway.");
    }
}

export async function verifyPaymentAndProvision(
    paymentData: { razorpay_payment_id: string, razorpay_order_id: string, razorpay_signature: string },
    provider: string, 
    phoneNumber: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: clinic } = await supabase.from("clinics").select("id").eq("user_id", user.id).single();
    if (!clinic) throw new Error("You must complete Agent Setup (Step 1) first.");

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    try {
        const response = await fetch(`${BACKEND_URL}/api/v1/payments/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                razorpay_payment_id: paymentData.razorpay_payment_id,
                razorpay_order_id: paymentData.razorpay_order_id,
                razorpay_signature: paymentData.razorpay_signature,
                clinic_id: clinic.id,
                provider: provider,
                phone_number: phoneNumber
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Payment verification failed: ${errorData.detail || response.statusText}`);
        }

        const data = await response.json();
        revalidatePath("/dashboard/numbers");
        return { success: true, number: data.number };

    } catch (e: any) {
        console.error("Payment verification mapping error:", e);
        throw new Error(e.message || "Payment verified but provisioning failed. Please contact support.");
    }
}

/**
 * DEV ONLY: Directly provision a number without going through Razorpay.
 * Calls POST /api/v1/payments/purchase-number on the backend.
 * Only works when NODE_ENV !== "production".
 */
export async function testDirectPurchase(provider: string, phoneNumber: string) {
    if (process.env.NODE_ENV === "production") {
        throw new Error("Direct test purchase is disabled in production.");
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: clinic } = await supabase.from("clinics").select("id").eq("user_id", user.id).single();
    if (!clinic) throw new Error("Complete Agent Setup first.");

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const response = await fetch(`${BACKEND_URL}/api/v1/payments/purchase-number`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            clinic_id: clinic.id,
            provider: provider,
            phone_number: phoneNumber,
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Provisioning failed: ${response.statusText}`);
    }

    const data = await response.json();
    revalidatePath("/dashboard/numbers");
    return { success: true, number: data.number };
}

export async function togglePhoneNumberStatus(number: string, currentStatus: string) {
    const supabase = await createClient();
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    
    const { error } = await supabase
        .from("phone_numbers")
        .update({ status: newStatus })
        .eq("number", number);

    if (error) throw new Error(error.message);
    revalidatePath("/dashboard/numbers");
    return { success: true, status: newStatus };
}

export async function toggleAiAnswering(number: string, currentVal: boolean) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("phone_numbers")
        .update({ ai_answering: !currentVal })
        .eq("number", number);

    if (error) throw new Error(error.message);
    revalidatePath("/dashboard/numbers");
    return { success: true, ai_answering: !currentVal };
}

export async function updateClinicDirectLine(number: string, directLine: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("phone_numbers")
        .update({ clinic_direct_line: directLine })
        .eq("number", number);

    if (error) throw new Error(error.message);
    revalidatePath("/dashboard/numbers");
    return { success: true };
}

export async function triggerTestCall(targetPhone: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: clinic } = await supabase.from("clinics").select("id").eq("user_id", user.id).single();
    if (!clinic) throw new Error("Clinic not found.");

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const response = await fetch(`${BACKEND_URL}/api/v1/voice/outbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            recipient_phone: targetPhone,
            clinic_id: clinic.id,
            call_context: { type: "general" }
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Test call failed: ${response.statusText}`);
    }

    return { success: true };
}

/**
 * BYO (Bring Your Own Number): Registers a user-owned number into the system
 * without purchasing it. Configures LiveKit SIP trunks and saves to DB.
 */
export async function addBYONumber(phoneNumber: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: clinic } = await supabase.from("clinics").select("id").eq("user_id", user.id).single();
    if (!clinic) throw new Error("Complete Agent Setup first.");

    // Validate E.164 format
    const e164Regex = /^\+[1-9]\d{6,14}$/;
    if (!e164Regex.test(phoneNumber.trim())) {
        throw new Error("Please enter a valid number in E.164 format (e.g. +919240024230)");
    }

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    // Reuse the purchase-number endpoint with provider='custom'
    // The backend will skip provider purchase step and just configure LiveKit trunks
    const response = await fetch(`${BACKEND_URL}/api/v1/payments/purchase-number`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            clinic_id: clinic.id,
            provider: "custom",
            phone_number: phoneNumber.trim(),
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to register number: ${response.statusText}`);
    }

    revalidatePath("/dashboard/numbers");
    return { success: true, number: phoneNumber.trim() };
}

export async function releasePhoneNumber(phoneNumber: string, provider: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: clinic } = await supabase.from("clinics").select("id").eq("user_id", user.id).single();
    if (!clinic) throw new Error("Clinic not found.");

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const response = await fetch(`${BACKEND_URL}/api/v1/payments/release-number`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            clinic_id: clinic.id,
            provider: provider,
            phone_number: phoneNumber,
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to release number: ${response.statusText}`);
    }

    revalidatePath("/dashboard/numbers");
    return await response.json();
}

/**
 * PRODUCTION PURCHASING (via Wallet/Free First Number)
 */
export async function purchaseNumberViaWallet(provider: string, phoneNumber: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: clinic } = await supabase.from("clinics").select("id").eq("user_id", user.id).single();
    if (!clinic) throw new Error("Complete Agent Setup first.");

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const response = await fetch(`${BACKEND_URL}/api/v1/payments/purchase-number`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            clinic_id: clinic.id,
            provider: provider,
            phone_number: phoneNumber,
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Provisioning failed: ${response.statusText}`);
    }

    const data = await response.json();
    revalidatePath("/dashboard/numbers");
    return { success: true, number: data.number };
}
