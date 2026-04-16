"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// ── Clinic Data ───────────────────────────────────────────────────────────────
export async function getAllClinics() {
  const sb = getAdminSupabase();
  const { data, error } = await sb
    .from("clinics")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getClinicTransactions(clinicId: string) {
  const sb = getAdminSupabase();
  const { data, error } = await sb
    .from("transactions")
    .select("*")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getClinicNumbers(clinicId: string) {
  const sb = getAdminSupabase();
  const { data } = await sb
    .from("phone_numbers")
    .select("*")
    .eq("clinic_id", clinicId);
  return data || [];
}

// ── Admin Mutations ───────────────────────────────────────────────────────────
export async function adminTopupWallet(clinicId: string, amount: number, currency: string) {
  const sb = getAdminSupabase();
  const { data: clinic } = await sb
    .from("clinics")
    .select("wallet_balance")
    .eq("id", clinicId)
    .single();

  const current = parseFloat(clinic?.wallet_balance || "0");
  const newBalance = current + amount;

  const { error } = await sb
    .from("clinics")
    .update({ wallet_balance: newBalance })
    .eq("id", clinicId);

  if (error) throw new Error(error.message);

  // Insert transaction record
  await sb.from("transactions").insert({
    clinic_id: clinicId,
    amount,
    currency,
    type: "admin_topup",
    description: `Admin Manual Top-up: +${currency} ${amount}`,
    status: "success",
  });

  return { ok: true, new_balance: newBalance };
}

export async function adminDeductWallet(clinicId: string, amount: number, currency: string) {
  const sb = getAdminSupabase();
  const { data: clinic } = await sb
    .from("clinics")
    .select("wallet_balance")
    .eq("id", clinicId)
    .single();

  const current = parseFloat(clinic?.wallet_balance || "0");
  const newBalance = Math.max(0, current - amount);

  await sb.from("clinics").update({ wallet_balance: newBalance }).eq("id", clinicId);

  await sb.from("transactions").insert({
    clinic_id: clinicId,
    amount,
    currency,
    type: "admin_deduction",
    description: `Admin Manual Deduction: -${currency} ${amount}`,
    status: "success",
  });

  return { ok: true, new_balance: newBalance };
}

export async function adminUpdateSubscriptionStatus(clinicId: string, status: string) {
  const sb = getAdminSupabase();
  await sb.from("clinics").update({ subscription_status: status }).eq("id", clinicId);
  return { ok: true };
}

export async function adminToggleAutoRecharge(clinicId: string, enabled: boolean) {
  const res = await fetch(`${BACKEND}/api/v1/billing/toggle-auto-recharge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clinic_id: clinicId, enabled }),
  });
  return await res.json();
}

export async function adminCancelSubscription(clinicId: string) {
  const res = await fetch(`${BACKEND}/api/v1/billing/cancel-subscription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clinic_id: clinicId }),
  });
  return await res.json();
}

export async function adminActivateClinic(clinicId: string) {
  const sb = getAdminSupabase();
  await sb.from("clinics").update({
    subscription_status: "active",
    subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }).eq("id", clinicId);
  await sb.from("transactions").insert({
    clinic_id: clinicId,
    amount: 0,
    currency: "INR",
    type: "admin_activation",
    description: "Admin Manual Activation",
    status: "success",
  });
  return { ok: true };
}

export async function adminGrantTrial(clinicId: string, days = 7) {
  const sb = getAdminSupabase();
  const trialEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  await sb.from("clinics").update({
    subscription_status: "trial",
    trial_ends_at: trialEnd,
  }).eq("id", clinicId);
  return { ok: true };
}

// ── Cron & Webhook ────────────────────────────────────────────────────────────
export async function adminFireCron() {
  const res = await fetch(`${BACKEND}/api/v1/cron/process-number-rentals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return await res.json();
}

export async function adminFireWebhookTest(event: string, clinicId: string, amount = 999) {
  // Build a realistic Razorpay-style test payload
  let payload: Record<string, unknown> = { event };

  if (event === "payment.captured") {
    payload.payload = {
      payment: {
        entity: {
          id: `pay_TEST_${Date.now()}`,
          order_id: `order_TEST_${Date.now()}`,
          amount: amount * 100,
          currency: "INR",
          notes: { clinic_id: clinicId, type: "auto_recharge", amount: String(amount), currency: "INR" },
        },
      },
    };
  } else if (event === "invoice.paid") {
    payload.payload = {
      invoice: {
        entity: {
          id: `inv_TEST_${Date.now()}`,
          amount: amount * 100,
          currency: "INR",
          notes: { clinic_id: clinicId, type: "auto_recharge", amount: String(amount), currency: "INR" },
        },
      },
    };
  } else if (event === "subscription.charged") {
    payload.payload = {
      subscription: {
        entity: {
          id: `sub_TEST`,
          notes: { clinic_id: clinicId },
          current_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
        },
      },
      payment: { entity: { id: `pay_TEST_${Date.now()}`, amount: 49900, currency: "INR" } },
    };
  }

  const res = await fetch(`${BACKEND}/api/v1/billing/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}


// ── API Health ────────────────────────────────────────────────────────────────
export async function adminCheckHealth() {
  const results: Record<string, { status: number; ok: boolean; data?: unknown; error?: string }> = {};

  const endpoints: { key: string; method?: string; url: string }[] = [
    { key: "Backend", url: `${BACKEND}/health` },
    { key: "Billing Webhook", method: "POST", url: `${BACKEND}/api/v1/billing/webhook` },
    { key: "Cron Rentals", method: "POST", url: `${BACKEND}/api/v1/cron/process-number-rentals` },
    { key: "Available Numbers", url: `${BACKEND}/api/v1/payments/available-numbers?country_code=IN&limit=1` },
  ];

  await Promise.all(
    endpoints.map(async ({ key, method = "GET", url }) => {
      try {
        const res = await fetch(url, { method, cache: "no-store" });
        let data: unknown;
        try { data = await res.json(); } catch { data = null; }
        results[key] = { status: res.status, ok: res.ok, data };
      } catch (e: unknown) {
        results[key] = { status: 0, ok: false, error: String(e) };
      }
    })
  );

  return results;
}
