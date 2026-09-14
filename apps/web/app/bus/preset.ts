import type { LookupItem } from "./lookup";

export const UNRESOLVED_GRADE = "__unresolved__";
const TERMINAL_ALIASES: Record<string, string> = { 서울: "서울경부", 대전: "대전복합" };
const normalize = (value: string) => value.trim().toLocaleLowerCase("ko-KR");

export function resolveBusLookup(value: string, items: LookupItem[], terminal = false): string | null {
  const query = normalize(value);
  if (!query) return null;
  const idMatches = items.filter((item) => normalize(item.id) === query);
  if (idMatches.length === 1) return idMatches[0]!.id;
  if (idMatches.length > 1) return null;
  const names = items.filter((item) => normalize(item.name) === query);
  if (names.length === 1) return names[0]!.id;
  if (names.length > 1) return null;
  const alias = terminal ? TERMINAL_ALIASES[query] : undefined;
  if (!alias) return null;
  const aliases = items.filter((item) => item.name === alias);
  return aliases.length === 1 ? aliases[0]!.id : null;
}

export function getKoreanDateInputValue(now = new Date(), weekday?: number): string {
  const koreanDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  if (weekday !== undefined) {
    koreanDate.setUTCDate(koreanDate.getUTCDate() + (weekday - koreanDate.getUTCDay() + 7) % 7);
  }
  return koreanDate.toISOString().slice(0, 10);
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function readBusPreset(
  params: Pick<URLSearchParams, "get">,
  terminals: LookupItem[],
  grades: LookupItem[],
  now = new Date(),
) {
  const issues: string[] = [];
  const departure = resolveBusLookup(params.get("departure") ?? "", terminals, true) ?? "";
  const arrival = resolveBusLookup(params.get("arrival") ?? "", terminals, true) ?? "";
  if (!departure) issues.push("저장된 출발 터미널을 특정할 수 없습니다. 출발 터미널을 선택해주세요.");
  if (!arrival) issues.push("저장된 도착 터미널을 특정할 수 없습니다. 도착 터미널을 선택해주세요.");
  if (departure && departure === arrival) issues.push("출발지와 도착지는 다르게 선택해주세요.");

  const rawGrade = params.get("grade")?.trim() ?? "";
  const grade = rawGrade ? resolveBusLookup(rawGrade, grades) ?? UNRESOLVED_GRADE : "";
  if (grade === UNRESOLVED_GRADE) issues.push(`저장된 버스 등급 '${rawGrade}'을 찾지 못했습니다. 버스 등급을 다시 선택해주세요.`);

  const rawDate = params.get("date");
  const rawWeekday = params.get("weekday");
  let date = getKoreanDateInputValue(now);
  if (rawDate && isValidDate(rawDate)) {
    date = rawDate;
  } else {
    if (rawDate !== null) issues.push("저장된 출발일이 올바르지 않습니다. 출발일을 확인해주세요.");
    if (rawWeekday !== null) {
      if (/^[0-6]$/u.test(rawWeekday)) date = getKoreanDateInputValue(now, Number(rawWeekday));
      else issues.push("저장된 요일이 올바르지 않습니다. 출발일을 확인해주세요.");
    }
  }

  return {
    input: { departure, arrival, grade, date },
    issues,
    canAutoRun: params.get("auto") === "1" && issues.length === 0,
  };
}
