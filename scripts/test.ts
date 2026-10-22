// In-process integration test. Starts the server (import side-effect) and
// exercises every endpoint over real HTTP. Single foreground Node process.
process.env.PORT = process.env.PORT ?? "3999";
process.env.HOST = "127.0.0.1";
process.env.BREACH_PROVIDER = "mock";

const BASE = `http://127.0.0.1:${process.env.PORT}`;
let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean, extra = "") {
  if (cond) { console.log(`  ✓ ${name}`); pass++; }
  else { console.log(`  ✗ ${name} ${extra}`); fail++; }
}

await import("../src/server.ts"); // starts listening
await new Promise((r) => setTimeout(r, 400));

// health
{
  const r = await fetch(`${BASE}/api/health`);
  const j = await r.json();
  ok("health 200 + ok", r.status === 200 && j.status === "ok", `status=${r.status}`);
  ok("health reports mock provider", j.mock === true);
}

// k-anonymity: real known-pwned password P@ssw0rd -> prefix 21BD1
{
  const r = await fetch(`${BASE}/api/pwned-range?prefix=21BD1`);
  const body = await r.text();
  ok("range 200", r.status === 200, `status=${r.status}`);
  ok("range returns many lines", body.split("\n").length > 100);
  // suffix of SHA1("P@ssw0rd") after 21BD1
  const suffix = "2DC183F740EE76F27B78EB39C8AD972A757";
  const hit = body.split("\n").some((l) => l.split(":")[0]?.trim().toUpperCase() === suffix);
  ok("known-pwned suffix present (P@ssw0rd)", hit);
}

// k-anonymity validation
{
  const r = await fetch(`${BASE}/api/pwned-range?prefix=ZZ`);
  ok("bad prefix -> 400", r.status === 400, `status=${r.status}`);
}
{
  const r = await fetch(`${BASE}/api/pwned-range?prefix=abcde`);
  ok("lowercase prefix accepted (normalized) -> 200", r.status === 200, `status=${r.status}`);
}

// email check (mock)
{
  const r = await fetch(`${BASE}/api/email-check`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "someone@example.com" }),
  });
  const j = await r.json();
  ok("email 200", r.status === 200, `status=${r.status}`);
  ok("email response flagged mock", j.mock === true);
  ok("email count is a number", typeof j.count === "number");
}
{
  const r = await fetch(`${BASE}/api/email-check`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "not-an-email" }),
  });
  ok("bad email -> 400", r.status === 400, `status=${r.status}`);
}

// oversized body -> 413
{
  const big = "x".repeat(5000);
  const r = await fetch(`${BASE}/api/email-check`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "a@b.co", pad: big }),
  });
  ok("oversized body -> 413", r.status === 413, `status=${r.status}`);
}

// security headers + static
{
  const r = await fetch(`${BASE}/`);
  const csp = r.headers.get("content-security-policy") ?? "";
  ok("index.html served", r.status === 200);
  ok("CSP present & no unsafe-inline", csp.includes("default-src 'self'") && !csp.includes("unsafe-inline"), csp);
  ok("X-Content-Type-Options nosniff", r.headers.get("x-content-type-options") === "nosniff");
  ok("X-Frame-Options DENY", r.headers.get("x-frame-options") === "DENY");
}

// path traversal blocked
{
  const r = await fetch(`${BASE}/../package.json`);
  ok("path traversal not leaking package.json", r.status === 404 || r.status === 403, `status=${r.status}`);
}

// content pages (legal / accessibility) + permanent footer nav
{
  const pages = ["/privacy.html", "/terms.html", "/cookies.html", "/accessibility.html"];
  for (const path of pages) {
    const r = await fetch(`${BASE}${path}`);
    const html = await r.text();
    ok(`${path} served 200`, r.status === 200, `status=${r.status}`);
    ok(`${path} has footer nav to accessibility`, html.includes('href="/accessibility.html"'));
    ok(`${path} has strict CSP`, (r.headers.get("content-security-policy") ?? "").includes("default-src 'self'"));
  }
  const home = await (await fetch(`${BASE}/`)).text();
  ok("home footer links to privacy page", home.includes('href="/privacy.html"'));
}

// --- password strength module (pure, imported) ---
{
  const { estimateStrength, hasSequentialRun } = await import("../public/strength.js");
  ok("empty password -> score 0", estimateStrength("").score === 0);
  ok("common password -> score 0", estimateStrength("password").score === 0);
  ok("repeated char -> score 0", estimateStrength("aaaaaaaaaaaa").score === 0);
  ok("sequential+2classes -> score 0", estimateStrength("abcd1234").score === 0);
  ok("long mixed -> score 4", estimateStrength("Xk9$mQ2!vLpW7#rT").score === 4);
  ok("strong has non-empty label", estimateStrength("Xk9$mQ2!vLpW7#rT").label.length > 0);
  ok("hasSequentialRun detects abcd", hasSequentialRun("abcd") === true);
  ok("hasSequentialRun ignores acbd", hasSequentialRun("acbd") === false);
}

// --- strength.js served + index markup ---
{
  const r = await fetch(`${BASE}/strength.js`);
  ok("strength.js served 200", r.status === 200, `status=${r.status}`);
  ok("strength.js is javascript", (r.headers.get("content-type") ?? "").includes("javascript"));
  const home = await (await fetch(`${BASE}/`)).text();
  ok("home has strength meter markup", home.includes('id="pw-strength"'));
}

// --- SEO / security hygiene static files ---
{
  const robots = await fetch(`${BASE}/robots.txt`);
  const robotsBody = await robots.text();
  ok("robots.txt 200", robots.status === 200, `status=${robots.status}`);
  ok("robots.txt text/plain", (robots.headers.get("content-type") ?? "").includes("text/plain"));
  ok("robots.txt has sitemap", robotsBody.includes("Sitemap:"));

  const sitemap = await fetch(`${BASE}/sitemap.xml`);
  const sitemapBody = await sitemap.text();
  ok("sitemap.xml 200", sitemap.status === 200, `status=${sitemap.status}`);
  ok("sitemap.xml is xml", (sitemap.headers.get("content-type") ?? "").includes("xml"));
  ok("sitemap.xml has urlset", sitemapBody.includes("<urlset"));

  const sec = await fetch(`${BASE}/.well-known/security.txt`);
  const secBody = await sec.text();
  ok("security.txt 200", sec.status === 200, `status=${sec.status}`);
  ok("security.txt has Contact", secBody.includes("Contact:"));
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
