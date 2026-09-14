import { parseButtonIntent, type ButtonIntent } from "@hanbeonman/contracts";

export type CreateIntent = Extract<ButtonIntent, { intent: "create_button" }>;
export type GeneratedButton = Pick<CreateIntent, "title" | "summary" | "actionKind" | "fixedInputs" | "requiredInputs"> & {
  id: string; createdAt: string; updatedAt?: string; favorite?: boolean;
};
export const STORAGE_KEY = "hanbeonman.generated-buttons";
export const MAX_BUTTONS = 50;
export const MAX_BACKUP_SIZE = 200_000;

function exceedsSizeLimit(value: string): boolean {
  return value.length > MAX_BACKUP_SIZE || new TextEncoder().encode(value).byteLength > MAX_BACKUP_SIZE;
}

function assertButtonCount(buttons: GeneratedButton[]): void {
  if (buttons.length > MAX_BUTTONS) throw new Error("버튼은 최대 50개까지 저장할 수 있습니다. 백업 후 사용하지 않는 버튼을 정리해주세요.");
}

export function buttonToIntent(button: GeneratedButton): CreateIntent {
  return { schemaVersion: "1.0", intent: "create_button", actionKind: button.actionKind, title: button.title, summary: button.summary, fixedInputs: { ...button.fixedInputs }, requiredInputs: button.requiredInputs.map(input => ({ ...input })), clarifyingQuestion: null };
}
export function createGeneratedButton(intent: CreateIntent, now = new Date()): GeneratedButton {
  const parsed = parseButtonIntent(intent);
  if (!parsed.success || parsed.data.intent !== "create_button") throw new Error("버튼 설정을 확인해주세요.");
  const value = parsed.data;
  return { id: `generated-${crypto.randomUUID()}`, title: value.title, summary: value.summary, actionKind: value.actionKind, fixedInputs: { ...value.fixedInputs }, requiredInputs: value.requiredInputs.map(input => ({ ...input })), createdAt: now.toISOString() };
}
function readButton(value: unknown): GeneratedButton | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const button = value as Record<string, unknown>;
  if (typeof button.id !== "string" || !/^generated-[a-zA-Z0-9-]{1,80}$/u.test(button.id)
    || typeof button.createdAt !== "string" || !Number.isFinite(Date.parse(button.createdAt))
    || (button.favorite !== undefined && typeof button.favorite !== "boolean")
    || (button.updatedAt !== undefined && (typeof button.updatedAt !== "string" || !Number.isFinite(Date.parse(button.updatedAt))))) return null;
  const parsed = parseButtonIntent({ schemaVersion: "1.0", intent: "create_button", actionKind: button.actionKind, title: button.title, summary: button.summary, fixedInputs: button.fixedInputs, requiredInputs: button.requiredInputs, clarifyingQuestion: null });
  if (!parsed.success || parsed.data.intent !== "create_button") return null;
  const intent = parsed.data;
  return { id: button.id, createdAt: button.createdAt, title: intent.title, summary: intent.summary, actionKind: intent.actionKind, fixedInputs: intent.fixedInputs, requiredInputs: intent.requiredInputs, ...(typeof button.favorite === "boolean" ? { favorite: button.favorite } : {}), ...(typeof button.updatedAt === "string" ? { updatedAt: button.updatedAt } : {}) };
}
function readLocalButton(value: unknown): GeneratedButton | null {
  const current = readButton(value);
  if (current) return current;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const legacy = value as Record<string, unknown>;
  if (legacy.actionKind !== "bus_schedule" || typeof legacy.id !== "string" || !/^generated-\d+$/u.test(legacy.id)
    || !legacy.fixedInputs || typeof legacy.fixedInputs !== "object" || Array.isArray(legacy.fixedInputs)
    || !Array.isArray(legacy.requiredInputs)) return null;

  const requiredInputs: unknown[] = [...legacy.requiredInputs];
  for (const [key, label] of [["departure", "출발 터미널"], ["arrival", "도착 터미널"]] as const) {
    if (Object.hasOwn(legacy.fixedInputs, key)) continue;
    const index = requiredInputs.findIndex((input) => input && typeof input === "object" && !Array.isArray(input) && (input as Record<string, unknown>).key === key);
    if (index === -1) requiredInputs.push({ key, label, type: "terminal", required: true });
    else requiredInputs[index] = { ...(requiredInputs[index] as Record<string, unknown>), required: true };
  }
  return readButton({ ...legacy, requiredInputs });
}

export function serializeGeneratedButtons(buttons: GeneratedButton[]): string {
  assertButtonCount(buttons);
  const serialized = JSON.stringify(buttons);
  if (exceedsSizeLimit(serialized)) throw new Error("버튼 설정은 200KB 이내로 저장할 수 있습니다.");
  return serialized;
}
export function parseGeneratedButtons(value: string | null): GeneratedButton[] {
  try {
    if (!value || exceedsSizeLimit(value)) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed.map(readLocalButton).filter((button): button is GeneratedButton => {
      if (!button || seen.has(button.id)) return false;
      seen.add(button.id); return true;
    }).slice(0, MAX_BUTTONS);
  } catch { return []; }
}
export function writeGeneratedButtons(storage: Pick<Storage, "setItem">, buttons: GeneratedButton[]) {
  const serialized = serializeGeneratedButtons(buttons);
  try { storage.setItem(STORAGE_KEY, serialized); }
  catch { throw new Error("기기에 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인해주세요."); }
}
export function exportButtonBackup(buttons: GeneratedButton[]): string {
  assertButtonCount(buttons);
  const backup = JSON.stringify({ format: "hanbeonman-buttons", version: 1, buttons }, null, 2);
  if (exceedsSizeLimit(backup)) throw new Error("백업 파일은 200KB 이하여야 합니다.");
  return backup;
}
export function importButtonBackup(raw: string): GeneratedButton[] {
  if (exceedsSizeLimit(raw)) throw new Error("백업 파일은 200KB 이하여야 합니다.");
  try {
    const payload = JSON.parse(raw);
    if (payload?.format !== "hanbeonman-buttons" || payload.version !== 1 || !Array.isArray(payload.buttons) || payload.buttons.length > MAX_BUTTONS) throw new Error();
    const buttons = payload.buttons.map(readButton) as Array<GeneratedButton | null>;
    if (buttons.some(button => !button)) throw new Error();
    const valid = buttons as GeneratedButton[];
    if (new Set(valid.map(button => button.id)).size !== valid.length) throw new Error();
    return valid;
  } catch { throw new Error("올바른 한번만 백업 파일이 아닙니다. 기존 버튼은 그대로 보관됩니다."); }
}
export function mergeButtonBackup(existing: GeneratedButton[], incoming: GeneratedButton[]): GeneratedButton[] {
  const ids = new Set(existing.map(button => button.id));
  const result = [...existing, ...incoming.filter(button => !ids.has(button.id))];
  if (result.length > MAX_BUTTONS) throw new Error("합치면 50개를 초과합니다. 기존 버튼을 정리한 뒤 다시 불러와주세요.");
  return result;
}
export function buildButtonShareUrl(button: GeneratedButton, origin: string): string {
  const fragment = `button=${encodeURIComponent(JSON.stringify(buttonToIntent(button)))}`;
  if (fragment.length > 16_000) throw new Error("설정이 길어 링크로 복사할 수 없습니다. 백업 파일을 이용해주세요.");
  return `${origin}/create#${fragment}`;
}
export function parseSharedButton(hash: string): CreateIntent | null {
  if (!hash.startsWith("#button=")) return null;
  try {
    if (hash.length > 16_000) throw new Error();
    const parsed = parseButtonIntent(JSON.parse(decodeURIComponent(hash.slice(8))));
    if (!parsed.success || parsed.data.intent !== "create_button") throw new Error();
    return parsed.data;
  } catch { throw new Error("버튼 링크를 읽지 못했습니다. 보낸 사람에게 링크를 다시 받아주세요."); }
}
