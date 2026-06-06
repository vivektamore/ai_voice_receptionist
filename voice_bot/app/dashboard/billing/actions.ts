"use server";

import { createClient } from "@/lib/supabase/server";

export async function getBillingData() {
    const supabase = await createClient();
    let user = null;
    try {
        const { data } = await supabase.auth.getUser();
        user = data.user;
    } catch (e) {
        console.error("Auth getUser failed in getBillingData:", e);
    }
    if (!user) throw new Error("Unauthorized");

    const { data: clinic } = await supabase.from("clinics").select("*").eq("user_id", user.id).single();
    if (!clinic) return null;

    // 1. Fetch Active Numbers
    const { data: numbers } = await supabase
        .from("phone_numbers")
        .select("number, status")
        .eq("clinic_id", clinic.id);

    // 2. Fetch Transaction History
    const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("clinic_id", clinic.id)
        .order("created_at", { ascending: false });

    return {
        clinic,
        numbers: numbers || [],
        transactions: transactions || [],
    };
}


// ─── Razorpay: Create Subscription ────────────────────────────────────────────

export async function createRazorpaySubscription(currency: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: clinic } = await supabase.from("clinics").select("id").eq("user_id", user.id).single();
    if (!clinic) throw new Error("Clinic not found");

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/billing/create-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: clinic.id, currency })
    });

    return await response.json();
}


// ─── Razorpay: Create Wallet Top-up Order ─────────────────────────────────────

export async function createTopupOrder(amount: number, currency: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: clinic } = await supabase.from("clinics").select("id").eq("user_id", user.id).single();
    if (!clinic) throw new Error("Clinic not found");

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/billing/create-topup-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: clinic.id, amount, currency })
    });

    return await response.json();
}


// ─── Razorpay: Cancel Subscription ───────────────────────────────────────────

export async function cancelSubscription() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: clinic } = await supabase.from("clinics").select("id").eq("user_id", user.id).single();
    if (!clinic) throw new Error("Clinic not found");

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/billing/cancel-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: clinic.id })
    });

    return await response.json();
}


// ─── Razorpay: Resume Subscription ───────────────────────────────────────────

export async function resumeSubscription() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: clinic } = await supabase.from("clinics").select("id").eq("user_id", user.id).single();
    if (!clinic) throw new Error("Clinic not found");

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/billing/resume-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: clinic.id })
    });

    return await response.json();
}


// ─── Toggle Auto-Recharge ─────────────────────────────────────────────────────

export async function toggleAutoRecharge(enabled: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: clinic } = await supabase.from("clinics").select("id").eq("user_id", user.id).single();
    if (!clinic) throw new Error("Clinic not found");

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/billing/toggle-auto-recharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: clinic.id, enabled })
    });

    return await response.json();
}


// ─── Start Free Trial ─────────────────────────────────────────────────────────

export async function startTrial() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: clinic } = await supabase.from("clinics").select("id").eq("user_id", user.id).single();
    if (!clinic) throw new Error("Clinic not found");

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/billing/start-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: clinic.id })
    });

    return await response.json();
}
