// lib/billing/regionConfig.ts
// Central source of truth for billing region routing — Razorpay only

export type BillingProvider = "razorpay";

export interface RegionConfig {
  currency: string;        // ISO 4217 code
  symbol: string;          // Display symbol
  provider: BillingProvider;
  priceDisplay: string;    // Human-readable price
}

// ─── Country → Region Config ──────────────────────────────────────────────────

const REGION_MAP: Record<string, RegionConfig> = {
  // ── India → Razorpay (INR) ──────────────────────────────────────────────────
  IN: { currency: "INR", symbol: "₹", provider: "razorpay", priceDisplay: "8,000" },

  // ── USA ────────────────────────────────────────────────────────────────────
  US: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },

  // ── United Kingdom ─────────────────────────────────────────────────────────
  GB: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },

  // ── Eurozone ───────────────────────────────────────────────────────────────
  DE: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },
  FR: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },
  IT: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },
  ES: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },
  NL: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },
  BE: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },
  AT: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },
  PT: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },
  FI: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },
  IE: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },
  PL: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },

  // ── Australia & New Zealand ────────────────────────────────────────────────
  AU: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },
  NZ: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },

  // ── Canada ─────────────────────────────────────────────────────────────────
  CA: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },

  // ── Middle East (USD via Razorpay) ─────────────────────────────────────────
  AE: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },
  SA: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },
  QA: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },
  KW: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },
  BH: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },

  // ── Singapore & SEA ────────────────────────────────────────────────────────
  SG: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },
  MY: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },
  PH: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },
  ID: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },
  TH: { currency: "USD", symbol: "$", provider: "razorpay", priceDisplay: "99" },
};

// ─── Fallback (all other countries) ───────────────────────────────────────────
const DEFAULT_REGION: RegionConfig = {
  currency: "USD",
  symbol: "$",
  provider: "razorpay",
  priceDisplay: "99",
};

// ─── Main lookup function ──────────────────────────────────────────────────────

/**
 * Get billing config for a country code.
 * Falls back to USD/Razorpay for unknown countries.
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
