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

export const ButtonIntentSchema = z.discriminatedUnion("intent", [
  createButtonIntentSchema,
  clarifyIntentSchema,
  runNowIntentSchema,
  unsupportedIntentSchema,
]);

export type ButtonIntent = z.infer<typeof ButtonIntentSchema>;

export function parseButtonIntent(value: unknown) {
  return ButtonIntentSchema.safeParse(value);
}
