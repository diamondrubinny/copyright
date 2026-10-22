// Local, dependency-free password-strength heuristic.
// Pure functions — importable by the browser and by tests. Never sends data.

export const COMMON_PW = new Set([
  "123456", "password", "123456789", "12345678", "12345", "qwerty", "111111",
  "123123", "abc123", "1234567", "password1", "iloveyou", "000000", "admin",
  "letmein", "welcome", "monkey", "dragon", "1q2w3e4r", "qwerty123", "123321",
]);

export function hasSequentialRun(str, n = 4) {
  let asc = 1, desc = 1;
  for (let i = 1; i < str.length; i++) {
    const d = str.charCodeAt(i) - str.charCodeAt(i - 1);
    asc = d === 1 ? asc + 1 : 1;
    desc = d === -1 ? desc + 1 : 1;
    if (asc >= n || desc >= n) return true;
  }
  return false;
}

export function estimateStrength(pw) {
  if (!pw) return { score: 0, label: "", tips: [] };
  const len = pw.length;
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length;
  const tips = [];

  let score = 0;
  if (len >= 8) score++;
  if (len >= 12) score++;
  if (classes >= 3) score++;
  if (len >= 16 && classes >= 3) score++;

  const lc = pw.toLowerCase();
  if (COMMON_PW.has(lc)) { score = 0; tips.push("זו סיסמה נפוצה מאוד — אל תשתמשו בה."); }
  if (/^(.)\1+$/.test(pw)) { score = 0; tips.push("תו אחד שחוזר אינו מאובטח."); }
  if (hasSequentialRun(lc) || lc.includes("qwerty")) {
    score = Math.max(0, score - 1);
    tips.push("רצפים (abc / 123 / qwerty) קלים לניחוש.");
  }

  if (len < 12) tips.push("השתמשו ב-12 תווים ומעלה (עדיף 16+).");
  if (classes < 3) tips.push("שלבו אותיות, ספרות וסמלים — או ביטוי-סיסמה ארוך.");

  score = Math.max(0, Math.min(4, score));
  const labels = ["חלשה מאוד", "חלשה", "בינונית", "חזקה", "חזקה מאוד"];
  return { score, label: labels[score], tips: tips.slice(0, 3) };
}
