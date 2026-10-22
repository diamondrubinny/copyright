# צ'קליסט חובה לפני פרודקשן — מָגֵן

> סטטוס: טיוטה. פריטים מסומנים ⚠️ דורשים אישור מקצועי (עו"ד / ממונה פרטיות / יועץ נגישות / בודק חדירות) לפני הצהרת תאימות.

## פונקציונליות
- [x] בדיקת סיסמה (k-anonymity) עובדת מקצה לקצה.
- [x] בדיקת אימייל מול ספק (mock כברירת מחדל, HIBP בהפעלה).
- [x] הודעות הצלחה/שגיאה/ריק ברורות בכל זרימה.
- [ ] בדיקת דפדפנים: Chrome, Firefox, Safari, Edge + מובייל.

## אימות והרשאות
- [ ] ⚠️ אם ייווספו חשבונות: אימות חזק, hashing (argon2/bcrypt), MFA, איפוס סיסמה מאובטח, הגנת brute-force.
- [x] MVP נוכחי stateless — אין חשבונות, אין אחסון, אין הרשאות לנהל.

## אבטחה
- [x] Validation בצד שרת לכל קלט (prefix hex, אימייל, גודל payload).
- [x] Rate limiting לפי IP (להחליף ל-Redis בפרודקשן מרובת-instance).
- [x] Security headers: CSP (ללא unsafe-inline), HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy.
- [x] חסימת path traversal בהגשת קבצים סטטיים.
- [x] אין לוג של סיסמאות / hash מלא / אימיילים.
- [ ] ⚠️ Pen-test חיצוני לפני השקה ציבורית.
- [ ] HTTPS בלבד בפרודקשן (TLS termination + הפניית 80→443).

## תלויות
- [x] אפס תלויות runtime (Node native TS). devDependencies: typescript, @types/node בלבד.
- [ ] Dependency scanning (npm audit / Dependabot) ב-CI — מומלץ להוסיף.

## פרטיות (תיקון 13 / GDPR) — ⚠️ בדיקה משפטית
- [x] מינימיזציה: MVP אינו אוסף ואינו שומר מידע אישי.
- [ ] ⚠️ טבלת מידע אישי (Data Map) — נדרשת רק אם יעבור לניטור מתמשך/חשבונות.
- [ ] ⚠️ בסיס עיבוד, זכויות נושא מידע, Retention — אם ייאסף מידע.
- [ ] ⚠️ DPA מול ספק ה-TI (למשל HIBP) לפני שימוש מסחרי.

## עוגיות / Trackers
- [x] האפליקציה אינה מגדירה עוגיות ואינה טוענת כלי מעקב/אנליטיקה.
- [ ] אם ייווספו — Cookie Inventory + באנר הסכמה (אישור/דחייה/ניהול) + יכולת משיכה.

## נגישות (WCAG 2.1 AA / ת"י 5568) — ⚠️ בדיקה מקצועית
- [x] RTL מלא, HTML סמנטי, labels, focus נראה, aria-live, ניווט מקלדת, ניגודיות.
- [ ] בדיקת קורא מסך (NVDA/VoiceOver) + זום 200% + מובייל.
- [ ] ⚠️ אימות הצהרת הנגישות ע"י יועץ.

## מסמכים (טיוטות — ⚠️ אישור עו"ד)
- [x] מדיניות פרטיות — `docs/PRIVACY-DRAFT.md`
- [x] תנאי שימוש — `docs/TERMS-DRAFT.md`
- [x] מדיניות עוגיות — `docs/COOKIES-DRAFT.md`
- [x] הצהרת נגישות — `docs/ACCESSIBILITY-STATEMENT-DRAFT.md`

## תפעול
- [ ] ניטור ו-alerting לשגיאות ולפעילות חריגה.
- [ ] גיבוי/שחזור — רלוונטי רק אם ייווסף אחסון.
- [x] CI: בדיקות אינטגרציה + typecheck על כל PR.
