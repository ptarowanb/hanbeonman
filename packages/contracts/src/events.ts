import { z } from "zod";

export const SanitizedEventSchema = z
  .object({
    sequence: z.number().int().positive(),
    relativeTimeMs: z.number().int().nonnegative(),
    sourceId: z.string().min(1),
    operation: z.string().min(1),
    fieldKey: z.string().min(1),
    safeValue: z.string(),
  })
  .strict();

export type SanitizedEvent = z.infer<typeof SanitizedEventSchema>;

const EventFieldContractSchema = z
  .object({
    operations: z.array(z.string().min(1)).min(1),
    safeValues: z.array(z.string()).min(1),
  })
  .strict();

export const EventSourceContractSchema = z
  .object({
    sourceId: z.string().min(1),
    fields: z.record(z.string(), EventFieldContractSchema),
  })
  .strict();

export type EventSourceContract = z.infer<typeof EventSourceContractSchema>;

export type SanitizedEventsValidationResult =
  | { success: true; data: SanitizedEvent[] }
  | { success: false; issues: string[] };

export function validateSanitizedEvents(
  value: unknown,
  registry: readonly EventSourceContract[],
): SanitizedEventsValidationResult {
  const parsed = z.array(SanitizedEventSchema).safeParse(value);
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "events"}: ${issue.message}`,
      ),
    };
  }

  const parsedRegistry = z.array(EventSourceContractSchema).safeParse(registry);
  if (!parsedRegistry.success) {
    return { success: false, issues: ["이벤트 소스 레지스트리 계약이 올바르지 않습니다."] };
  }

  const issues: string[] = [];
  parsed.data.forEach((event, index) => {
    const previous = parsed.data[index - 1];
    if (
      previous &&
      (event.sequence <= previous.sequence ||
        event.relativeTimeMs < previous.relativeTimeMs)
    ) {
      issues.push("이벤트 순번과 상대 시각은 앞으로 진행해야 합니다.");
    }
    const source = parsedRegistry.data.find(
      (item) => item.sourceId === event.sourceId,
    );
    if (!source || !Object.hasOwn(source.fields, event.fieldKey)) {
      issues.push("등록되지 않은 이벤트 소스 또는 필드입니다.");
      return;
    }
    const field = source.fields[event.fieldKey]!;
    if (!field.operations.includes(event.operation)) {
      issues.push("필드에 등록되지 않은 동작입니다.");
    }
    if (!field.safeValues.includes(event.safeValue)) {
      issues.push("필드에 등록되지 않은 안전 값입니다.");
    }
    if (
      event.fieldKey === "photos" &&
      event.operation === "select_files" &&
      event.safeValue !== "recipient_file_input"
    ) {
      issues.push("사진 선택 값은 수신자 파일 입력 자리표시자여야 합니다.");
    }
    if (
      event.safeValue === "recipient_file_input" &&
      event.fieldKey !== "photos"
    ) {
      issues.push("사진 자리표시자는 사진 입력 필드에서만 사용할 수 있습니다.");
    }
  });

  return issues.length === 0
    ? { success: true, data: parsed.data }
    : { success: false, issues };
}
