"use server";

import { createClient } from "@supabase/supabase-js";

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function debugGetAllClinicIds() {
  const sb = adminSupabase();
  const { data } = await sb.from("clinics").select("id, name, email").order("created_at", { ascending: false });
  return data || [];
}

export async function debugRunAllChecks(clinicId: string) {
  const sb = adminSupabase();
  const results: Record<string, { ok: boolean; label: string; data?: unknown; error?: string }> = {};

  // Step 1: Clinic DB Record
  try {
    const { data, error } = await sb.from("clinics").select("*").eq("id", clinicId).single();
    results["clinic_db"] = {
      ok: !!data && !error,
      label: "Clinic DB Record",
      data: data || null,
      error: error?.message,
    };
  } catch (e) {
    results["clinic_db"] = { ok: false, label: "Clinic DB Record", error: String(e) };
  }

  // Step 2: Razorpay Sync
  try {
    const res = await fetch(`${BACKEND}/api/v1/billing/check-status/${clinicId}`, { cache: "no-store" });
    const data = await res.json();
    results["razorpay_sync"] = {
      ok: res.ok && data.status !== "error",
      label: "Razorpay Subscription Sync",
      data,
    };
  } catch (e) {
    results["razorpay_sync"] = { ok: false, label: "Razorpay Subscription Sync", error: String(e) };
  }

  // Step 3: Phone Numbers
  try {
    const { data } = await sb.from("phone_numbers").select("*").eq("clinic_id", clinicId);
    results["phone_numbers"] = {
      ok: true,
      label: "Phone Numbers",
      data: data || [],
    };
  } catch (e) {
    results["phone_numbers"] = { ok: false, label: "Phone Numbers", error: String(e) };
  }

  // Step 4: Transactions (last 10)
  try {
    const { data } = await sb
      .from("transactions")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(10);
    results["transactions"] = {
      ok: true,
      label: "Transaction History (last 10)",
      data: data || [],
    };
  } catch (e) {
    results["transactions"] = { ok: false, label: "Transaction History", error: String(e) };
  }

  // Step 5: Cron Simulation (dry-run what WOULD happen)
  try {
    const { data: clinic } = await sb
      .from("clinics")
      .select("wallet_balance, subscription_status, auto_recharge, currency")
      .eq("id", clinicId)
      .single();

    const { data: dueNumbers } = await sb
      .from("phone_numbers")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("status", "Active");

    const dryRunResult = (dueNumbers || []).map((num) => {
      const wallet = parseFloat(clinic?.wallet_balance || "0");
      const fee = parseFloat(num.rental_fee || "10");
      const hasBalance = wallet >= fee;
      const autoR = clinic?.auto_recharge;

      let action = "No action (not due)";
      if (num.next_billing_date && new Date(num.next_billing_date) <= new Date()) {
        if (hasBalance) action = `✅ Deduct ${clinic?.currency || "₹"}${fee} from wallet`;
        else if (autoR) action = `⚡ Trigger auto-recharge invoice (₹999 standard topup)`;
        else action = `❌ Deactivate number (insufficient funds, auto-recharge OFF)`;
      }

      return {
        number: num.number,
        status: num.status,
        next_billing_date: num.next_billing_date,
        rental_fee: fee,
        wallet_balance: wallet,
        auto_recharge: autoR,
        simulated_action: action,
      };
    });

    results["cron_simulation"] = {
      ok: true,
      label: "Cron Dry-Run Simulation",
      data: {
        clinic_wallet: clinic?.wallet_balance,
        subscription_status: clinic?.subscription_status,
        auto_recharge: clinic?.auto_recharge,
        numbers_evaluated: dryRunResult,
      },
    };
  } catch (e) {
    results["cron_simulation"] = { ok: false, label: "Cron Dry-Run Simulation", error: String(e) };
  }

  // Step 6: Backend health
  try {
    const res = await fetch(`${BACKEND}/`, { cache: "no-store" });
    results["backend_health"] = {
      ok: res.ok,
      label: "Backend Health",
      data: { status: res.status, url: BACKEND },
    };
  } catch (e) {
    results["backend_health"] = { ok: false, label: "Backend Health", error: String(e) };
  }

  return results;
}

export async function debugFireAutoRecharge(clinicId: string) {
  const sb = adminSupabase();
  const { data: clinic } = await sb
    .from("clinics")
    .select("currency")
    .eq("id", clinicId)
    .single();

  const res = await fetch(`${BACKEND}/api/v1/billing/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "invoice.paid",
      payload: {
        invoice: {
          entity: {
            id: `inv_DEBUG_${Date.now()}`,
            amount: 99900,
            currency: clinic?.currency || "INR",
            notes: {
              clinic_id: clinicId,
              type: "auto_recharge",
              amount: "999",
              currency: clinic?.currency || "INR",
            },
          },
        },
      },
    }),
  });

  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}
