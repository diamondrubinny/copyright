# 🛡️ מָגֵן (Magen)

מערכת ניטור דליפות **פרטיות־מתכנונו**: בודקת אם סיסמה או אימייל נחשפו בדליפות מידע ידועות,
בלי לאסוף, לרכוש או לאחסן מידע גנוב, ובלי לשמור מספרי כרטיסי אשראי.

הסיסמה **לעולם לא עוזבת את הדפדפן** — נשלחים לשרת רק 5 תווים של טביעת אצבע (k-anonymity).

## דרישות
- Node.js ≥ 22.6 (מריץ TypeScript נייטיבית, ללא build ו ללא תלויות חיצוניות).

## הרצה
```bash
cp .env.example .env   # אופציונלי
npm start
# http://localhost:3000
```

## משתני סביבה
ראו `.env.example`. ברירת המחדל: ספק אימייל `mock` (נתוני הדגמה). למעבר ל-HIBP אמיתי:
`BREACH_PROVIDER=hibp` + `HIBP_API_KEY=...` (דורש מפתח מורשה).

## API
- `GET /api/health`
- `GET /api/pwned-range?prefix=XXXXX` — 5 תווי hex, מחזיר suffixes (k-anonymity).
- `POST /api/email-check` `{ "email": "..." }`

## אבטחה ופרטיות
- הסיסמה מעובדת רק בדפדפן; השרת רואה prefix בן 5 תווים בלבד.
- Validation בצד שרת, rate limiting, security headers (CSP/HSTS/וכו'), ללא לוג של מידע רגיש.
- Stateless — לא נשמר מידע. מעבר לניטור מתמשך ידרוש הסכמה, Data Map ו-Retention (ראו `PLAN.md`).

## בדיקות
```bash
npm run typecheck    # דורש התקנת typescript (devDependency), אופציונלי
./scripts/smoke.sh   # בדיקות עשן מול שרת רץ
```

> כל טענה לתאימות מלאה לחוק/GDPR/נגישות דורשת אימות מקצועי. ראו `PLAN.md`.
