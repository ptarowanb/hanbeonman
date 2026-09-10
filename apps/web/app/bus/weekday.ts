export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function parseWeekday(value: string): Weekday | null {
  const match = value.match(/(일|월|화|수|목|금|토)요일/u);
  if (!match) return null;
  return WEEKDAY_LABELS.indexOf(match[1] as (typeof WEEKDAY_LABELS)[number]) as Weekday;
}

export function getNextWeekdayDate(date: Date, weekday: Weekday): Date {
  const next = new Date(date);
  const daysUntil = (weekday - next.getDay() + 7) % 7;
  next.setDate(next.getDate() + daysUntil);
  return next;
}

export function getLocalDateInputValue(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
