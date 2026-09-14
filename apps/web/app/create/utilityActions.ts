const DAY_MS = 86_400_000;
function dateValue(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) throw new Error("날짜를 선택해주세요.");
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) throw new Error("올바른 날짜를 선택해주세요.");
  return timestamp;
}
export function countDateDays(target: string, now = new Date()): number {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return Math.round((dateValue(target) - dateValue(today)) / DAY_MS);
}
export function splitBill(amount: number, people: number) {
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1e12 || !Number.isInteger(people) || people < 1 || people > 1000) throw new Error("금액은 0 이상 원 단위, 인원은 1~1,000명으로 입력해주세요.");
  const base = Math.floor(amount / people);
  return { base, extraPeople: amount % people, extra: base + 1 };
}
const UNITS: Record<string, { group: string; scale: number }> = { mm: { group: "length", scale: .001 }, cm: { group: "length", scale: .01 }, m: { group: "length", scale: 1 }, km: { group: "length", scale: 1000 }, g: { group: "mass", scale: .001 }, kg: { group: "mass", scale: 1 }, celsius: { group: "temperature", scale: 1 }, fahrenheit: { group: "temperature", scale: 1 } };
export function convertUnit(value: number, from: string, to: string): number {
  const a = Object.hasOwn(UNITS, from) ? UNITS[from] : undefined;
  const b = Object.hasOwn(UNITS, to) ? UNITS[to] : undefined;
  if (!Number.isFinite(value) || Math.abs(value) > 1e12 || !a || !b || a.group !== b.group) throw new Error("같은 종류의 단위를 선택해주세요. 길이·무게·온도를 변환할 수 있습니다.");
  if (from === to) return value;
  if (a.group === "temperature") return from === "celsius" ? value * 9 / 5 + 32 : (value - 32) * 5 / 9;
  return value * a.scale / b.scale;
}
export function cleanText(text: string, mode: string): string {
  if (text.length > 20_000) throw new Error("글은 20,000자 이내로 입력해주세요.");
  const lines = text.split(/\r?\n/u).map(line => line.trim().replace(/[\t ]+/gu, " ")).filter(Boolean);
  return (mode === "deduplicate" ? [...new Set(lines)] : lines).join("\n");
}
export function parseChoices(value: string): string[] {
  const values = [...new Set(value.split(/\r?\n/u).map(item => item.trim()).filter(Boolean))];
  if (values.length < 2 || values.length > 20 || value.length > 200) throw new Error("서로 다른 선택지를 2~20개, 전체 200자 이내로 한 줄씩 입력해주세요.");
  return values;
}
