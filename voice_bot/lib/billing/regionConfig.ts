// lib/billing/regionConfig.ts
// Central source of truth for billing region routing
// Used by billing page, onboarding, and Stripe checkout

export type BillingProvider = "razorpay" | "stripe";

export interface RegionConfig {
  currency: string;        // ISO 4217 code
  symbol: string;          // Display symbol
  provider: BillingProvider;
  priceDisplay: string;    // Human-readable price
  stripePriceId?: string;  // Stripe Price ID for this currency (optional — falls back to USD)
}

// ─── Country → Region Config ──────────────────────────────────────────────────

const REGION_MAP: Record<string, RegionConfig> = {
  // ── India → Razorpay (INR) ──────────────────────────────────────────────────
  IN: { currency: "INR", symbol: "₹", provider: "razorpay", priceDisplay: "8,000" },

  // ── USA ────────────────────────────────────────────────────────────────────
  US: { currency: "USD", symbol: "$", provider: "stripe", priceDisplay: "99" },

  // ── United Kingdom ─────────────────────────────────────────────────────────
  GB: { currency: "GBP", symbol: "£", provider: "stripe", priceDisplay: "79" },

  // ── Eurozone ───────────────────────────────────────────────────────────────
  DE: { currency: "EUR", symbol: "€", provider: "stripe", priceDisplay: "89" },
  FR: { currency: "EUR", symbol: "€", provider: "stripe", priceDisplay: "89" },
  IT: { currency: "EUR", symbol: "€", provider: "stripe", priceDisplay: "89" },
  ES: { currency: "EUR", symbol: "€", provider: "stripe", priceDisplay: "89" },
  NL: { currency: "EUR", symbol: "€", provider: "stripe", priceDisplay: "89" },
  BE: { currency: "EUR", symbol: "€", provider: "stripe", priceDisplay: "89" },
  AT: { currency: "EUR", symbol: "€", provider: "stripe", priceDisplay: "89" },
  PT: { currency: "EUR", symbol: "€", provider: "stripe", priceDisplay: "89" },
  FI: { currency: "EUR", symbol: "€", provider: "stripe", priceDisplay: "89" },
  IE: { currency: "EUR", symbol: "€", provider: "stripe", priceDisplay: "89" },
  PL: { currency: "EUR", symbol: "€", provider: "stripe", priceDisplay: "89" },

  // ── Australia & New Zealand ────────────────────────────────────────────────
  AU: { currency: "AUD", symbol: "A$", provider: "stripe", priceDisplay: "149" },
  NZ: { currency: "AUD", symbol: "A$", provider: "stripe", priceDisplay: "149" },

  // ── Canada ─────────────────────────────────────────────────────────────────
  CA: { currency: "CAD", symbol: "C$", provider: "stripe", priceDisplay: "129" },

  // ── Middle East (USD via Stripe) ───────────────────────────────────────────
  AE: { currency: "USD", symbol: "$", provider: "stripe", priceDisplay: "99" },
  SA: { currency: "USD", symbol: "$", provider: "stripe", priceDisplay: "99" },
  QA: { currency: "USD", symbol: "$", provider: "stripe", priceDisplay: "99" },
  KW: { currency: "USD", symbol: "$", provider: "stripe", priceDisplay: "99" },
  BH: { currency: "USD", symbol: "$", provider: "stripe", priceDisplay: "99" },

  // ── Singapore & SEA ────────────────────────────────────────────────────────
  SG: { currency: "USD", symbol: "$", provider: "stripe", priceDisplay: "99" },
  MY: { currency: "USD", symbol: "$", provider: "stripe", priceDisplay: "99" },
  PH: { currency: "USD", symbol: "$", provider: "stripe", priceDisplay: "99" },
  ID: { currency: "USD", symbol: "$", provider: "stripe", priceDisplay: "99" },
  TH: { currency: "USD", symbol: "$", provider: "stripe", priceDisplay: "99" },
};

// ─── Fallback (all other countries) ───────────────────────────────────────────
const DEFAULT_REGION: RegionConfig = {
  currency: "USD",
  symbol: "$",
  provider: "stripe",
  priceDisplay: "99",
};

// ─── Main lookup function ──────────────────────────────────────────────────────

/**
 * Get billing config for a country code.
 * Falls back to USD/Stripe for unknown countries.
 */
export function getRegionConfig(countryCode: string | null | undefined): RegionConfig {
  if (!countryCode) return DEFAULT_REGION;
  return REGION_MAP[countryCode.toUpperCase()] ?? DEFAULT_REGION;
}

/**
 * Detect user's country code using IP geolocation.
 * Falls back to timezone-based detection if IP API fails.
 */
export async function detectCountryCode(): Promise<string> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
    const geo = await res.json();
    if (geo.country_code) return geo.country_code;
  } catch {
    // fallback below
  }

  // Timezone-based fallback
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz.includes("Kolkata") || tz.includes("Calcutta")) return "IN";
  if (tz.includes("London"))   return "GB";
  if (tz.includes("Sydney") || tz.includes("Melbourne")) return "AU";
  if (tz.includes("Toronto") || tz.includes("Vancouver")) return "CA";
  if (tz.includes("Berlin") || tz.includes("Paris") || tz.includes("Rome")) return "DE";
  if (tz.includes("Singapore")) return "SG";
  if (tz.includes("Dubai"))     return "AE";

  return "US"; // Final fallback
}

// ─── Overage Pricing ──────────────────────────────────────────────────────────

export function getOveragePricing(currency: string) {
  const isINR = currency === "INR";
  return {
    minuteRate:  isINR ? "₹12" : "$0.15",
    smsRate:     isINR ? "₹1.5" : "$0.02",
    numberRate:  isINR ? "₹1,200/mo" : "$15/mo",
    topupAmount: isINR ? 4000 : 50,
    autoRechargeThreshold: isINR ? 800 : 10,
  };
}
