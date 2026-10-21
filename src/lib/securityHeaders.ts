import type { ServerResponse } from "node:http";

// Strict, framework-free security headers applied to every response.
export function applySecurityHeaders(res: ServerResponse): void {
  // CSP: everything from same origin, no inline scripts/styles, no framing.
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "connect-src 'self'",
      "img-src 'self' data:",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
    ].join("; "),
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  // HSTS is meaningful only over HTTPS; safe to send and ignored on http.
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
}
