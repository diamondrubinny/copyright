// Server-side input validation. Never trust the client.

// Pwned Passwords range prefix: exactly 5 uppercase hex chars.
const PREFIX_RE = /^[0-9A-F]{5}$/;

export function isValidHashPrefix(value: unknown): value is string {
  return typeof value === "string" && PREFIX_RE.test(value);
}

// Pragmatic email validation (RFC-ish). Length-bounded to avoid abuse.
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 320 && EMAIL_RE.test(value);
}
