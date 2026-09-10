import { z } from "zod";

export const ButtonIntentKindSchema = z.enum(["create_button", "clarify", "run_now", "unsupported"]);
export type ButtonIntentKind = z.infer<typeof ButtonIntentKindSchema>;

export const ButtonActionKindSchema = z.enum(["weather", "bus_schedule", "photo_compress"]);
export type ButtonActionKind = z.infer<typeof ButtonActionKindSchema>;

export const ButtonInputTypeSchema = z.enum(["city", "date", "terminal", "grade", "image_files", "text"]);
export type ButtonInputType = z.infer<typeof ButtonInputTypeSchema>;

const safeScalarSchema = z.union([
  z.string().trim().min(1).max(200),
  z.number().finite(),
  z.boolean(),
]);

const fixedInputsSchema = z.record(
  z.string().regex(/^[a-z][a-z0-9_]*$/u).max(64),
  safeScalarSchema,
);

const requiredInputSchema = z
  .object({
    key: z.string().regex(/^[a-z][a-z0-9_]*$/u).max(64),
    label: z.string().trim().min(1).max(80),
    type: ButtonInputTypeSchema,
    required: z.boolean(),
  })
  .strict();

const sharedDraftFields = {
  schemaVersion: z.literal("1.0"),
  actionKind: ButtonActionKindSchema,
  title: z.string().trim().min(1).max(80),
  summary: z.string().trim().min(1).max(240),
  fixedInputs: fixedInputsSchema,
  requiredInputs: z.array(requiredInputSchema).max(10),
};

const createButtonIntentSchema = z
  .object({
    ...sharedDraftFields,
    intent: z.literal("create_button"),
    clarifyingQuestion: z.null(),
  })
  .strict();

const clarifyIntentSchema = z
  .object({
    ...sharedDraftFields,
    intent: z.literal("clarify"),
    requiredInputs: z.array(requiredInputSchema).min(1).max(10),
    clarifyingQuestion: z.string().trim().min(1).max(240),
  })
  .strict();

const runNowIntentSchema = z
  .object({
    ...sharedDraftFields,
    intent: z.literal("run_now"),
    clarifyingQuestion: z.null(),
  })
  .strict();

const unsupportedIntentSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    intent: z.literal("unsupported"),
    actionKind: z.null(),
    title: z.null(),
    summary: z.null(),
    fixedInputs: z.object({}).strict(),
    requiredInputs: z.array(requiredInputSchema).max(0),
    clarifyingQuestion: z.null(),
    unsupportedReason: z.string().trim().min(1).max(240),
  })
  .strict();

const buttonIntentSchema = z.discriminatedUnion("intent", [
  createButtonIntentSchema,
  clarifyIntentSchema,
  runNowIntentSchema,
  unsupportedIntentSchema,
]);

const allowedInputTypes: Record<ButtonActionKind, Record<string, ButtonInputType>> = {
  weather: { city: "city" },
  bus_schedule: { departure: "terminal", arrival: "terminal", grade: "grade", date: "date" },
  photo_compress: { photos: "image_files" },
};

export const ButtonIntentSchema = buttonIntentSchema.superRefine((intent, context) => {
  if (intent.intent === "unsupported") return;

  const allowed = allowedInputTypes[intent.actionKind];
  for (const key of Object.keys(intent.fixedInputs)) {
    if (!(key in allowed)) {
      context.addIssue({ code: "custom", path: ["fixedInputs", key], message: "작업에 허용되지 않은 고정 입력입니다." });
    }
  }

  const requiredKeys = new Set<string>();
  for (const [index, input] of intent.requiredInputs.entries()) {
    if (!(input.key in allowed)) {
      context.addIssue({ code: "custom", path: ["requiredInputs", index, "key"], message: "작업에 허용되지 않은 실행 입력입니다." });
      continue;
    }
    if (requiredKeys.has(input.key) || input.key in intent.fixedInputs) {
      context.addIssue({ code: "custom", path: ["requiredInputs", index, "key"], message: "같은 입력을 중복 정의할 수 없습니다." });
    }
    requiredKeys.add(input.key);
    if (allowed[input.key] !== input.type) {
      context.addIssue({ code: "custom", path: ["requiredInputs", index, "type"], message: "작업에 맞지 않는 입력 형식입니다." });
    }
  }

  if (intent.actionKind === "weather" && !("city" in intent.fixedInputs) && !requiredKeys.has("city")) {
    context.addIssue({ code: "custom", path: ["fixedInputs"], message: "날씨 작업에는 도시 입력이 필요합니다." });
  }
});

export type ButtonIntent = z.infer<typeof ButtonIntentSchema>;

export function parseButtonIntent(value: unknown) {
  return ButtonIntentSchema.safeParse(value);
}
