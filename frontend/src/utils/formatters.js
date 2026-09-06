export function toRomanSemester(sem) {
  if (sem === null || sem === undefined || sem === "") return "—";
  const str = String(sem).trim();
  const parsed = parseInt(str.replace(/\D/g, ""), 10);
  if (isNaN(parsed)) return str;
  const romanMap = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X" };
  return romanMap[parsed] || str;
}
