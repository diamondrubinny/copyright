# מָגֵן (Magen) — מערכת ניטור דליפות פרטיות־מתכנונו

> טיוטה טכנית. כל קביעה משפטית/רגולטורית דורשת אימות מול עו"ד וממונה פרטיות לפני פרודקשן.

## 1. מטרת המוצר
לעזור לאדם לדעת אם פרטיו (סיסמה, אימייל) נחשפו בדליפות מידע ידועות, ולהנחות אותו כיצד להתגונן —
**בלי** לאסוף, לרכוש או לאחסן מידע גנוב, ובפרט **ללא** אחסון מספרי כרטיסי אשראי (PAN/CVV).

## 2. הקו האדום (Legal / Ethical boundary)
- ❌ לא לגרד שווקי Dark Web, לא לרכוש/לאחסן נתוני כרטיס גנובים (עבירה פלילית + הפרת PCI-DSS).
- ❌ לא לבצע גישה בלתי מורשית.
- ✅ הסתמכות על מקורות מודיעין מורשים (HIBP וכו') מאחורי ממשק Provider מופשט.
- ✅ פרטיות מתכנונו: k-anonymity — הסיסמה לעולם לא עוזבת את הדפדפן.

## 3. הפיצ'ר המרכזי ב-MVP: בדיקת סיסמה ב-k-anonymity
1. הדפדפן מחשב SHA-1 מקומית לסיסמה.
2. נשלחים לשרת רק 5 התווים הראשונים של ה-hash (prefix) — ולא יותר.
3. השרת מתשאל את Pwned Passwords Range API ומחזיר את רשימת ה-suffixes.
4. ההשוואה הסופית מתבצעת **בדפדפן**. השרת לא יודע איזו סיסמה נבדקה.
   → פרטיות כפולה: גם השרת שלנו רואה רק prefix בן 5 תווים.

## 4. פיצ'ר משני: ניטור אימייל (מאחורי ממשק Provider)
- `BreachProvider` עם מימוש `MockBreachProvider` (דמו, מסומן בבירור) ו-`HibpBreachProvider` (דורש מפתח + הפעלה מפורשת).
- לא נחשף אם אימייל "קיים במערכת" מעבר למה שהספק מספק; תשובות אחידות.

## 5. ארכיטקטורה
- Backend: Node 22, `node:http` + `node:crypto` + `fetch` — **אפס תלויות חיצוניות**, רץ ב-type-stripping נייטיבי.
- שכבות: `server` (routing) → `lib/*` (validate, rateLimit, securityHeaders, pwnedPasswords, breachProvider) → `config`.
- Frontend: HTML סמנטי + CSS + JS (Web Crypto API), עברית/RTL, נגיש WCAG 2.1 AA, CSP מחמיר ללא inline.

## 6. API Endpoints
- `GET  /api/health` — בריאות.
- `GET  /api/pwned-range?prefix=XXXXX` — ציבורי, מוגבל קצב. מחזיר suffixes (text/plain).
- `POST /api/email-check` `{ "email": "..." }` — מוגבל קצב. מחזיר מספר דליפות + שמות (מהספק).

## 7. אבטחה (Security by Design)
- Validation קשיח בצד שרת (prefix = 5 hex, אימייל תקין, payload ≤ 2KB).
- Rate limiting לפי IP (in-memory; בפרודקשן → Redis).
- Security headers: CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy.
- אין לוג של סיסמאות/hash מלא/אימיילים; שגיאות ידידותיות בלי stack traces.
- Add-Padding ל-HIBP כדי למנוע הסקה לפי גודל תשובה.

## 8. פרטיות (תיקון 13 / GDPR) — לבדיקה משפטית
- מינימיזציה: לא נשמר דבר ב-MVP (stateless). מעבר ל-monitoring מתמשך → הסכמה + Data Map + Retention.
- בסיס עיבוד, זכויות נושא מידע, DPA מול ספקים — דורש בדיקה משפטית.

## 9. נגישות
- RTL, labels, focus נראה, aria-live לתוצאות, ניווט מקלדת, ניגודיות, זום 200%.

## 10. מה לא בתוך MVP (סיכונים/המשך)
- אחסון/חשבונות משתמש, התראות מתמשכות, SMS, אינטגרציית TI בתשלום, ניטור כרטיסים ברמת BIN מול ספק מורשה.

## 11. הרצה
`npm start` (= `node --experimental-strip-types src/server.ts`). ברירת מחדל: http://localhost:3000
