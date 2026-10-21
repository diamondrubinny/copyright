import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";
import { config } from "./config.ts";
import { applySecurityHeaders } from "./lib/securityHeaders.ts";
import { RateLimiter } from "./lib/rateLimit.ts";
import { isValidHashPrefix, isValidEmail } from "./lib/validate.ts";
import { fetchRange } from "./lib/pwnedPasswords.ts";
import { createBreachProvider } from "./lib/breachProvider.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");

const limiter = new RateLimiter(config.rateLimit.windowMs, config.rateLimit.max);
setInterval(() => limiter.sweep(), 60_000).unref();
const breachProvider = createBreachProvider();

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function clientIp(req: IncomingMessage): string {
  return req.socket.remoteAddress ?? "unknown";
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

function enforceRate(req: IncomingMessage, res: ServerResponse): boolean {
  const { allowed, retryAfterSec } = limiter.check(clientIp(req));
  if (!allowed) {
    res.setHeader("Retry-After", String(retryAfterSec));
    sendJson(res, 429, { error: "rate_limited", message: "יותר מדי בקשות. נסו שוב מאוחר יותר." });
    return false;
  }
  return true;
}

type BodyResult = { tooLarge: true } | { tooLarge: false; body: string };

function readBody(req: IncomingMessage, limit: number): Promise<BodyResult> {
  return new Promise((resolve) => {
    let size = 0;
    let tooLarge = false;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > limit) {
        tooLarge = true;
        resolve({ tooLarge: true });
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!tooLarge) resolve({ tooLarge: false, body: Buffer.concat(chunks).toString("utf8") });
    });
    req.on("error", () => { if (!tooLarge) resolve({ tooLarge: false, body: "" }); });
  });
}

async function serveStatic(req: IncomingMessage, res: ServerResponse, urlPath: string): Promise<void> {
  const rel = urlPath === "/" ? "/index.html" : urlPath;
  // Prevent path traversal: normalize and ensure it stays within PUBLIC_DIR.
  const filePath = normalize(join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "forbidden" });
    return;
  }
  try {
    const data = await readFile(filePath);
    const type = MIME[extname(filePath)] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 — העמוד לא נמצא");
  }
}

const server = createServer(async (req, res) => {
  applySecurityHeaders(res);
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const path = url.pathname;

    // --- API: health -----------------------------------------------------
    if (req.method === "GET" && path === "/api/health") {
      sendJson(res, 200, { status: "ok", provider: breachProvider.name, mock: breachProvider.isMock });
      return;
    }

    // --- API: k-anonymity password range --------------------------------
    if (req.method === "GET" && path === "/api/pwned-range") {
      if (!enforceRate(req, res)) return;
      const prefix = url.searchParams.get("prefix")?.toUpperCase() ?? "";
      if (!isValidHashPrefix(prefix)) {
        sendJson(res, 400, { error: "bad_prefix", message: "prefix חייב להיות 5 תווי hex." });
        return;
      }
      const result = await fetchRange(prefix);
      if (!result.ok) {
        sendJson(res, 502, { error: "upstream", message: "שירות הבדיקה אינו זמין כרגע." });
        return;
      }
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      res.end(result.body);
      return;
    }

    // --- API: email breach check ----------------------------------------
    if (req.method === "POST" && path === "/api/email-check") {
      if (!enforceRate(req, res)) return;
      const bodyResult = await readBody(req, config.maxBodyBytes);
      if (bodyResult.tooLarge) {
        res.setHeader("Connection", "close");
        sendJson(res, 413, { error: "payload_too_large", message: "הבקשה גדולה מדי." });
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(bodyResult.body || "{}");
      } catch {
        sendJson(res, 400, { error: "bad_json", message: "גוף הבקשה אינו תקין." });
        return;
      }
      const email = (parsed as { email?: unknown }).email;
      if (!isValidEmail(email)) {
        sendJson(res, 400, { error: "bad_email", message: "כתובת אימייל לא תקינה." });
        return;
      }
      try {
        const lookup = await breachProvider.lookupEmail(email);
        res.setHeader("Cache-Control", "no-store");
        sendJson(res, 200, lookup);
      } catch {
        sendJson(res, 502, { error: "provider", message: "בדיקת האימייל נכשלה. נסו שוב מאוחר יותר." });
      }
      return;
    }

    // --- Static (frontend) ----------------------------------------------
    if (req.method === "GET") {
      await serveStatic(req, res, path);
      return;
    }

    sendJson(res, 405, { error: "method_not_allowed" });
  } catch {
    // Never leak internals to the client.
    if (!res.headersSent) sendJson(res, 500, { error: "internal", message: "אירעה שגיאה." });
  }
});

server.listen(config.port, config.host, () => {
  console.log(`[magen] listening on http://${config.host}:${config.port} (provider=${breachProvider.name}, mock=${breachProvider.isMock})`);
});
