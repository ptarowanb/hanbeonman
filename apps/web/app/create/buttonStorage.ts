import type { ButtonIntent } from "@hanbeonman/contracts";

export type GeneratedButton = {
  id: string;
  title: string;
  summary: string;
  actionKind: Extract<ButtonIntent, { intent: "create_button" }>["actionKind"];
  fixedInputs: Record<string, string | number | boolean>;
  requiredInputs: Extract<ButtonIntent, { intent: "create_button" }>["requiredInputs"];
  createdAt: string;
};

type CreateButtonIntent = Extract<ButtonIntent, { intent: "create_button" }>;

export function createGeneratedButton(intent: CreateButtonIntent, now = new Date()): GeneratedButton {
  return {
    id: `generated-${now.getTime()}`,
    title: intent.title.trim(),
    summary: intent.summary.trim(),
    actionKind: intent.actionKind,
    fixedInputs: { ...intent.fixedInputs },
    requiredInputs: intent.requiredInputs.map((input) => ({ ...input })),
    createdAt: now.toISOString(),
  };
}

export function serializeGeneratedButtons(buttons: GeneratedButton[]): string {
  return JSON.stringify(buttons);
}

function isSafeScalar(value: unknown): value is string | number | boolean {
  return (typeof value === "string" && value.trim().length > 0 && value.length <= 200)
    || (typeof value === "number" && Number.isFinite(value))
    || typeof value === "boolean";
}

function isGeneratedButton(value: unknown): value is GeneratedButton {
  if (!value || typeof value !== "object") return false;
  const button = value as Record<string, unknown>;
  if (typeof button.id !== "string" || !button.id.startsWith("generated-")
    || typeof button.title !== "string" || button.title.trim().length === 0
    || typeof button.summary !== "string" || button.summary.trim().length === 0
    || !["weather", "bus_schedule", "photo_compress"].includes(String(button.actionKind))
    || typeof button.createdAt !== "string"
    || !button.fixedInputs || typeof button.fixedInputs !== "object"
    || !Array.isArray(button.requiredInputs)) return false;

  return Object.values(button.fixedInputs as Record<string, unknown>).every(isSafeScalar)
    && button.requiredInputs.every((input) => {
      if (!input || typeof input !== "object") return false;
      const field = input as Record<string, unknown>;
      return typeof field.key === "string" && /^[a-z][a-z0-9_]*$/u.test(field.key)
        && typeof field.label === "string" && field.label.trim().length > 0
        && ["city", "date", "terminal", "grade", "image_files", "text"].includes(String(field.type))
        && typeof field.required === "boolean";
    });
}

export function parseGeneratedButtons(value: string | null): GeneratedButton[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "null");
    return Array.isArray(parsed) ? parsed.filter(isGeneratedButton) : [];
  } catch {
    return [];
  }
}
