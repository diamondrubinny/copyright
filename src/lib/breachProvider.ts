import { createHash } from "node:crypto";
import { config } from "../config.ts";

// A breach record as surfaced to the user.
export interface BreachRecord {
  name: string;
  domain: string;
  breachDate: string; // YYYY-MM-DD
  dataClasses: string[]; // what leaked, e.g. ["Email addresses","Passwords"]
}

export interface BreachLookup {
  provider: string;
  mock: boolean; // true => demo data, NOT a real result
  count: number;
  breaches: BreachRecord[];
}

export interface BreachProvider {
  readonly name: string;
  readonly isMock: boolean;
  lookupEmail(email: string): Promise<BreachLookup>;
}

// --- Mock provider -------------------------------------------------------
// Deterministic demo data derived from a hash of the email, so the UI is
// demonstrable WITHOUT any paid API key and WITHOUT storing anything.
// Clearly flagged as mock so it is never mistaken for a real finding.
const SAMPLE: BreachRecord[] = [
  { name: "ExampleForum", domain: "example-forum.com", breachDate: "2019-07-14", dataClasses: ["Email addresses", "Passwords", "Usernames"] },
  { name: "ShopDemo", domain: "shopdemo.example", breachDate: "2021-02-03", dataClasses: ["Email addresses", "Names", "Phone numbers"] },
  { name: "OldService", domain: "oldservice.example", breachDate: "2016-11-22", dataClasses: ["Email addresses", "Passwords"] },
];

export class MockBreachProvider implements BreachProvider {
  readonly name = "mock";
  readonly isMock = true;
  async lookupEmail(email: string): Promise<BreachLookup> {
    const digest = createHash("sha256").update(email.trim().toLowerCase()).digest();
    const n = digest[0]! % (SAMPLE.length + 1); // 0..3 deterministic
    const breaches = SAMPLE.slice(0, n);
    return { provider: this.name, mock: true, count: breaches.length, breaches };
  }
}

// --- HIBP provider (real) ------------------------------------------------
// Requires a licensed API key and explicit opt-in. Shapes HIBP's response
// into our neutral BreachRecord. Does not persist anything.
export class HibpBreachProvider implements BreachProvider {
  readonly name = "hibp";
  readonly isMock = false;
  private readonly apiKey: string;
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async lookupEmail(email: string): Promise<BreachLookup> {
    const url =
      "https://haveibeenpwned.com/api/v3/breachedaccount/" +
      encodeURIComponent(email) +
      "?truncateResponse=false";
    const res = await fetch(url, {
      headers: { "hibp-api-key": this.apiKey, "User-Agent": "Magen-BreachMonitor/0.1" },
    });
    if (res.status === 404) return { provider: this.name, mock: false, count: 0, breaches: [] };
    if (!res.ok) throw new Error("provider_error");
    const raw = (await res.json()) as Array<Record<string, unknown>>;
    const breaches: BreachRecord[] = raw.map((b) => ({
      name: String(b.Name ?? ""),
      domain: String(b.Domain ?? ""),
      breachDate: String(b.BreachDate ?? ""),
      dataClasses: Array.isArray(b.DataClasses) ? (b.DataClasses as string[]) : [],
    }));
    return { provider: this.name, mock: false, count: breaches.length, breaches };
  }
}

export function createBreachProvider(): BreachProvider {
  if (config.breachProvider === "hibp") {
    if (!config.hibpApiKey) {
      // Fail safe to mock rather than crash, but make the choice explicit in logs.
      console.warn("[magen] BREACH_PROVIDER=hibp but HIBP_API_KEY is empty; using mock.");
      return new MockBreachProvider();
    }
    return new HibpBreachProvider(config.hibpApiKey);
  }
  return new MockBreachProvider();
}
