import { estimateStrength } from "/strength.js";
// Magen frontend. Zero dependencies. Privacy-by-design:
// the password is hashed locally and never leaves the browser in full.

/** Compute uppercase hex SHA-1 of a string using Web Crypto. */
async function sha1Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-1", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function el(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node;
}

function alertBox(kind, title, html) {
  const icon = kind === "ok" ? "✅" : kind === "danger" ? "⚠️" : "ℹ️";
  return `<div class="alert alert-${kind}"><span class="icon" aria-hidden="true">${icon}</span>
    <div><strong>${title}</strong>${html ?? ""}</div></div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderStrength(pw) {
  const box = document.getElementById("pw-strength");
  const bar = document.getElementById("pw-strength-bar");
  const fill = document.getElementById("pw-strength-fill");
  const label = document.getElementById("pw-strength-label");
  const tipsEl = document.getElementById("pw-strength-tips");
  if (!box || !bar || !fill || !label || !tipsEl) return;
  if (!pw) { box.hidden = true; return; }
  box.hidden = false;
  const { score, label: text, tips } = estimateStrength(pw);
  fill.style.width = `${(score / 4) * 100}%`;
  bar.setAttribute("data-score", String(score));
  bar.setAttribute("aria-valuenow", String(score));
  bar.setAttribute("aria-valuetext", text);
  label.textContent = `חוזק: ${text}`;
  tipsEl.innerHTML = tips.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
}

// --- Password check (k-anonymity) ---------------------------------------
const pwForm = el("pw-form");
const pwInput = el("pw-input");
const pwResult = el("pw-result");
const pwSubmit = el("pw-submit");

pwInput.addEventListener("input", () => renderStrength(pwInput.value));

el("pw-toggle").addEventListener("click", (e) => {
  const btn = e.currentTarget;
  const show = pwInput.type === "password";
  pwInput.type = show ? "text" : "password";
  btn.textContent = show ? "הסתר" : "הצג";
  btn.setAttribute("aria-pressed", String(show));
  pwInput.focus();
});

pwForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pw = pwInput.value;
  if (!pw) {
    pwResult.innerHTML = alertBox("warn", "נא להזין סיסמה לבדיקה.");
    return;
  }
  pwSubmit.disabled = true;
  pwResult.innerHTML = alertBox("warn", "בודק…");
  try {
    const hash = await sha1Hex(pw);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5); // stays in the browser
    const res = await fetch(`/api/pwned-range?prefix=${prefix}`, { headers: { Accept: "text/plain" } });
    if (!res.ok) throw new Error("upstream");
    const body = await res.text();
    // Each line: SUFFIX:COUNT . Match locally.
    let count = 0;
    for (const line of body.split("\n")) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      if (line.slice(0, idx).trim().toUpperCase() === suffix) {
        count = parseInt(line.slice(idx + 1).trim(), 10) || 0;
        break;
      }
    }
    if (count > 0) {
      pwResult.innerHTML = alertBox(
        "danger",
        "הסיסמה הזו נמצאה בדליפות מידע.",
        `<p>הסיסמה הופיעה ב-<strong>${count.toLocaleString("he-IL")}</strong> דליפות ידועות.
         אל תשתמשו בה. החליפו אותה בכל שירות והפעילו אימות דו-שלבי.</p>`,
      );
    } else {
      pwResult.innerHTML = alertBox(
        "ok",
        "הסיסמה לא נמצאה בדליפות הידועות.",
        `<p>זו אינה ערובה לאבטחה — עדיין מומלץ סיסמה ייחודית וארוכה לכל שירות.</p>`,
      );
    }
  } catch {
    pwResult.innerHTML = alertBox("warn", "שירות הבדיקה אינו זמין כרגע. נסו שוב מאוחר יותר.");
  } finally {
    pwSubmit.disabled = false;
  }
});

// --- Email check --------------------------------------------------------
const emForm = el("em-form");
const emInput = el("em-input");
const emResult = el("em-result");
const emSubmit = el("em-submit");

emForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = emInput.value.trim();
  if (!email) {
    emResult.innerHTML = alertBox("warn", "נא להזין כתובת אימייל.");
    return;
  }
  emSubmit.disabled = true;
  emResult.innerHTML = alertBox("warn", "בודק…");
  try {
    const res = await fetch("/api/email-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      emResult.innerHTML = alertBox("warn", data.message || "הבדיקה נכשלה.");
      return;
    }
    const mockBadge = data.mock ? `<span class="badge">נתוני הדגמה</span>` : "";
    if (data.count > 0) {
      const items = data.breaches
        .map(
          (b) =>
            `<li><strong>${escapeHtml(b.name)}</strong> (${escapeHtml(b.breachDate)}) —
             ${escapeHtml(b.dataClasses.join(", "))}</li>`,
        )
        .join("");
      emResult.innerHTML = alertBox(
        "danger",
        `האימייל נמצא ב-${data.count} דליפות ${mockBadge}`,
        `<ul class="breach-list">${items}</ul>
         <p>החליפו סיסמאות בשירותים הרלוונטיים והפעילו אימות דו-שלבי.</p>`,
      );
    } else {
      emResult.innerHTML = alertBox(
        "ok",
        `לא נמצאו דליפות עבור כתובת זו ${mockBadge}`,
        `<p>המשיכו לשמור על סיסמאות ייחודיות ואימות דו-שלבי.</p>`,
      );
    }
  } catch {
    emResult.innerHTML = alertBox("warn", "הבדיקה נכשלה. נסו שוב מאוחר יותר.");
  } finally {
    emSubmit.disabled = false;
  }
});

// --- Provider note in footer -------------------------------------------
fetch("/api/health")
  .then((r) => r.json())
  .then((h) => {
    const note = document.getElementById("provider-note");
    if (note && h.mock) note.textContent = "מצב הדגמה: בדיקת האימייל מחזירה נתוני דוגמה (לא ממצא אמיתי).";
  })
  .catch(() => {});
