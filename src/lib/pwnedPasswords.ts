// k-anonymity client for the Pwned Passwords Range API.
// We receive ONLY a 5-char hash prefix from the browser and forward it.
// The full password/hash never reaches us. Add-Padding defeats size-based inference.
const RANGE_URL = "https://api.pwnedpasswords.com/range/";

export type RangeResult =
  | { ok: true; body: string }
  | { ok: false; status: number };

export async function fetchRange(prefix: string): Promise<RangeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(RANGE_URL + prefix, {
      method: "GET",
      headers: {
        "Add-Padding": "true",
        "User-Agent": "Magen-BreachMonitor/0.1 (privacy-by-design)",
      },
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, body: await res.text() };
  } catch {
    return { ok: false, status: 502 };
  } finally {
    clearTimeout(timeout);
  }
}
