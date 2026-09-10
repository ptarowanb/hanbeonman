export type BusQuickButton = {
  id: string;
  name: string;
  departure: { id: string; name: string };
  arrival: { id: string; name: string };
  grade: { id: string; name: string } | null;
  createdAt: string;
};

type QuickButtonInput = Omit<BusQuickButton, "id" | "createdAt">;

function trimPlace(place: { id: string; name: string }): { id: string; name: string } {
  return { id: place.id.trim(), name: place.name.trim() };
}

function createId(now: Date): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `bus-${crypto.randomUUID()}`;
  }
  return `bus-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createQuickButton(input: QuickButtonInput, now = new Date()): BusQuickButton {
  const name = input.name.trim();
  if (!name) throw new Error("버튼 이름을 입력해주세요.");
  return {
    id: createId(now),
    name,
    departure: trimPlace(input.departure),
    arrival: trimPlace(input.arrival),
    grade: input.grade ? trimPlace(input.grade) : null,
    createdAt: now.toISOString(),
  };
}

export function serializeQuickButtons(buttons: BusQuickButton[]): string {
  return JSON.stringify(buttons);
}

function isPlace(value: unknown): value is { id: string; name: string } {
  if (!value || typeof value !== "object") return false;
  const place = value as Record<string, unknown>;
  return typeof place.id === "string" && place.id.trim().length > 0
    && typeof place.name === "string" && place.name.trim().length > 0;
}

function isBusQuickButton(value: unknown): value is BusQuickButton {
  if (!value || typeof value !== "object") return false;
  const button = value as Record<string, unknown>;
  return typeof button.id === "string" && button.id.startsWith("bus-")
    && typeof button.name === "string" && button.name.trim().length > 0
    && isPlace(button.departure)
    && isPlace(button.arrival)
    && (button.grade === null || isPlace(button.grade))
    && typeof button.createdAt === "string";
}

export function parseQuickButtons(value: string | null): BusQuickButton[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "null");
    return Array.isArray(parsed) ? parsed.filter(isBusQuickButton) : [];
  } catch {
    return [];
  }
}

export function getLocalDateInputValue(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
