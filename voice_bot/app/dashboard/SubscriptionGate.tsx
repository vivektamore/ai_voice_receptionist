"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface SubscriptionGateProps {
  subscriptionStatus: string;
}

/**
 * Client-side subscription guard.
 * 
 * - 'active'     → full access ✅
 * - 'cancelling' → grace period: still active until billing cycle ends ✅
 * - 'inactive'   → truly expired 🔒 → redirected to /dashboard/billing
 * - 'pending'    → payment pending (show billing page)
 */
export default function SubscriptionGate({ subscriptionStatus }: SubscriptionGateProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isActive = ["active", "cancelling", "trial"].includes(subscriptionStatus);
    const isOnBillingPage = pathname === "/dashboard/billing";

    // If subscription is truly expired AND not already on billing page → redirect
    if (!isActive && !isOnBillingPage) {
      router.replace("/dashboard/billing?reason=subscription_required");
    }
  }, [subscriptionStatus, pathname, router]);

  return null; // invisible guard component
}
