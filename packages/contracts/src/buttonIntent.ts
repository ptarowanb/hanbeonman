import { z } from "zod";

export const ButtonIntentKindSchema = z.enum(["create_button", "clarify", "run_now", "unsupported"]);
export type ButtonIntentKind = z.infer<typeof ButtonIntentKindSchema>;

export const ButtonActionKindSchema = z.enum([
  "weather", "bus_schedule", "photo_compress", "checklist", "timer", "dday",
  "split_bill", "unit_convert", "text_cleanup", "random_pick", "counter",
]);
export type ButtonActionKind = z.infer<typeof ButtonActionKindSchema>;

export const ButtonInputTypeSchema = z.enum(["city", "date", "terminal", "grade", "image_files", "text"]);
export type ButtonInputType = z.infer<typeof ButtonInputTypeSchema>;

const safeScalarSchema = z.union([
  z.string().trim().min(1).max(200),
  z.number().finite(),
  z.boolean(),
]);

const fixedInputsSchema = z.unknown().superRefine((value, context) => {
  if (value && typeof value === "object" && ["__proto__", "constructor", "prototype"].some((key) => Object.hasOwn(value, key))) {
    context.addIssue({ code: "custom", message: "예약된 입력 이름은 사용할 수 없습니다." });
  }
}).pipe(z.record(
  z.string().regex(/^[a-z][a-zA-Z0-9_]*$/u).max(64),
  safeScalarSchema,
));

const requiredInputSchema = z
  .object({
    key: z.string().regex(/^[a-z][a-zA-Z0-9_]*$/u).max(64),
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
  bus_schedule: { departure: "terminal", arrival: "terminal", grade: "grade", date: "date", weekday: "text" },
  photo_compress: { photos: "image_files", maxEdge: "text", quality: "text" },
  checklist: { items: "text" },
  timer: { minutes: "text" },
  dday: { date: "date", event: "text" },
  split_bill: { amount: "text", people: "text" },
  unit_convert: { value: "text", from: "text", to: "text" },
  text_cleanup: { mode: "text", text: "text" },
  random_pick: { options: "text" },
  counter: { step: "text" },
};

const listSchema = (minimum: number) => z.string().trim().min(1).max(200).refine((value) => {
  const items = value.split(/\r?\n/u);
  return items.length >= minimum && items.length <= 20 && items.every((item) => item.trim().length > 0) && new Set(items.map((item) => item.trim())).size >= minimum;
}, `항목은 빈 줄 없이 ${minimum}~20개를 입력해주세요.`);
const boundedNumber = z.number().finite().min(-1e12).max(1e12);
const unitSchema = z.enum(["mm", "cm", "m", "km", "g", "kg", "celsius", "fahrenheit"]);
const fixedValueSchemas: Record<ButtonActionKind, Record<string, z.ZodType>> = {
  weather: { city: z.string().trim().min(1).max(40) },
  bus_schedule: { departure: z.string().trim().min(1).max(80), arrival: z.string().trim().min(1).max(80), grade: z.string().trim().min(1).max(40), date: z.iso.date(), weekday: z.number().int().min(0).max(6) },
  photo_compress: { maxEdge: z.number().int().min(320).max(4096), quality: z.number().finite().min(0.1).max(1) },
  checklist: { items: listSchema(1) },
  timer: { minutes: z.number().int().min(1).max(180) },
  dday: { date: z.iso.date(), event: z.string().trim().min(1).max(80) },
  split_bill: { amount: boundedNumber.int().min(0), people: z.number().int().min(1).max(1000) },
  unit_convert: { value: boundedNumber, from: unitSchema, to: unitSchema },
  text_cleanup: { mode: z.enum(["trim", "deduplicate"]), text: z.string().trim().min(1).max(200) },
  random_pick: { options: listSchema(2) },
  counter: { step: z.number().int().min(1).max(1000) },
};
const essentialInputs: Partial<Record<ButtonActionKind, string[]>> = {
  weather: ["city"], bus_schedule: ["departure", "arrival"], checklist: ["items"], timer: ["minutes"],
  dday: ["date"], split_bill: ["amount", "people"], unit_convert: ["value", "from", "to"], random_pick: ["options"],
};
const unitDimensions: Record<string, string> = {
  mm: "length", cm: "length", m: "length", km: "length", g: "mass", kg: "mass", celsius: "temperature", fahrenheit: "temperature",
};

export const ButtonIntentSchema = buttonIntentSchema.superRefine((intent, context) => {
  if (intent.intent === "unsupported") return;

  const allowed = allowedInputTypes[intent.actionKind];
  const fixedSchemas = fixedValueSchemas[intent.actionKind];
  for (const [key, value] of Object.entries(intent.fixedInputs)) {
    if (!Object.hasOwn(fixedSchemas, key)) {
      context.addIssue({ code: "custom", path: ["fixedInputs", key], message: "작업에 허용되지 않은 고정 입력입니다." });
    } else if (!fixedSchemas[key]!.safeParse(value).success) {
      context.addIssue({ code: "custom", path: ["fixedInputs", key], message: "입력값의 형식이나 범위를 확인해주세요." });
    }
  }

  const requiredKeys = new Set<string>();
  for (const [index, input] of intent.requiredInputs.entries()) {
    if (!Object.hasOwn(allowed, input.key)) {
      context.addIssue({ code: "custom", path: ["requiredInputs", index, "key"], message: "작업에 허용되지 않은 실행 입력입니다." });
      continue;
    }
    if (requiredKeys.has(input.key) || Object.hasOwn(intent.fixedInputs, input.key)) {
      context.addIssue({ code: "custom", path: ["requiredInputs", index, "key"], message: "같은 입력을 중복 정의할 수 없습니다." });
    }
    requiredKeys.add(input.key);
    if (allowed[input.key] !== input.type) {
      context.addIssue({ code: "custom", path: ["requiredInputs", index, "type"], message: "작업에 맞지 않는 입력 형식입니다." });
    }
  }

  for (const key of essentialInputs[intent.actionKind] ?? []) {
    if (!Object.hasOwn(intent.fixedInputs, key) && !intent.requiredInputs.some((input) => input.key === key && input.required)) {
      context.addIssue({ code: "custom", path: ["fixedInputs", key], message: "작업에 필요한 입력을 고정하거나 필수 실행 입력으로 지정해주세요." });
    }
  }
  if (intent.actionKind === "unit_convert") {
    const { from, to } = intent.fixedInputs;
    if (typeof from === "string" && typeof to === "string" && unitDimensions[from] !== unitDimensions[to]) {
      context.addIssue({ code: "custom", path: ["fixedInputs", "to"], message: "같은 종류의 단위끼리만 변환할 수 있습니다." });
    }
  }
});

export type ButtonIntent = z.infer<typeof ButtonIntentSchema>;

export function parseButtonIntent(value: unknown) {
  return ButtonIntentSchema.safeParse(value);
}
