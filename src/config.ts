// Centralized, env-driven configuration. No secrets hardcoded.
function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export type BreachProviderKind = "mock" | "hibp";

export const config = {
  host: process.env.HOST?.trim() || "127.0.0.1",
  port: int("PORT", 3000),
  rateLimit: {
    windowMs: int("RATE_LIMIT_WINDOW_MS", 60_000),
    max: int("RATE_LIMIT_MAX", 30),
  },
  maxBodyBytes: 2_048, // hard cap on request bodies
  breachProvider: (process.env.BREACH_PROVIDER?.trim() as BreachProviderKind) || "mock",
  hibpApiKey: process.env.HIBP_API_KEY?.trim() || "",
} as const;
