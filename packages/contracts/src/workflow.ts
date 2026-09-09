import { z } from "zod";

export const TaskKindSchema = z.enum(["public_query", "local_image_batch"]);
export type TaskKind = z.infer<typeof TaskKindSchema>;

export const ExecutionTargetSchema = z.enum(["server", "recipient_browser"]);
export type ExecutionTarget = z.infer<typeof ExecutionTargetSchema>;

const koreanText = z.string().min(1).refine((value) => /[가-힣]/u.test(value), {
  message: "한국어 문구가 필요합니다.",
});

export const WorkflowInputSchema = z
  .object({
    key: z.string().regex(/^[a-z][a-z0-9_]*$/u),
    label: koreanText,
    type: z.enum(["image_files", "date", "text", "select"]),
    required: z.boolean(),
    minItems: z.number().int().positive().optional(),
    maxItems: z.number().int().positive().optional(),
    localOnly: z.boolean().optional(),
  })
  .strict();

export const WorkflowStepSchema = z
  .object({
    operation: z.string().regex(/^[a-z][a-z0-9_.]*$/u),
    inputRef: z.string().optional(),
    configRef: z.literal("constants").optional(),
  })
  .strict();

const JsonScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const CompletionSchema = z
  .object({
    type: z.enum([
      "all_outputs_created",
      "query_result_validated",
      "query_completed",
    ]),
    countMatchesInput: z.boolean().optional(),
  })
  .strict();

const OutputSchema = z
  .object({
    type: z.enum(["download", "structured_result"]),
    filename: z.string().optional(),
  })
  .strict();

export const WorkflowSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    taskKind: TaskKindSchema,
    title: koreanText,
    executionTarget: ExecutionTargetSchema,
    adapter: z
      .object({ id: z.string().min(1), version: z.string().min(1) })
      .strict(),
    inputs: z.array(WorkflowInputSchema),
    constants: z.record(z.string(), JsonScalarSchema),
    steps: z.array(WorkflowStepSchema).min(1),
    completion: CompletionSchema,
    output: OutputSchema,
  })
  .strict()
  .superRefine((workflow, context) => {
    const expectedTarget =
      workflow.taskKind === "public_query" ? "server" : "recipient_browser";
    if (workflow.executionTarget !== expectedTarget) {
      context.addIssue({
        code: "custom",
        path: ["executionTarget"],
        message: "작업 유형에 허용된 실행 대상이 아닙니다.",
      });
    }
  });

export type Workflow = z.infer<typeof WorkflowSchema>;

export const AdapterInputPolicySchema = z
  .object({
    key: z.string(),
    type: WorkflowInputSchema.shape.type,
    required: z.boolean(),
    minItems: z.number().int().positive().optional(),
    maxItems: z.number().int().positive().optional(),
    localOnly: z.boolean().optional(),
  })
  .strict();

export const AdapterContractSchema = z
  .object({
    id: z.string().min(1),
    version: z.string().min(1),
    taskKind: TaskKindSchema,
    executionTarget: ExecutionTargetSchema,
    capabilities: z.array(z.string().min(1)).min(1),
    inputPolicy: z.array(AdapterInputPolicySchema),
    constantPolicy: z.record(
      z.string(),
      z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("literal"), value: JsonScalarSchema }).strict(),
        z
          .object({
            kind: z.literal("number_range"),
            min: z.number(),
            max: z.number(),
            integer: z.boolean().optional(),
          })
          .strict(),
      ]),
    ),
    stepPolicy: z.array(WorkflowStepSchema).min(1),
    completionPolicy: CompletionSchema,
    outputPolicy: OutputSchema,
  })
  .strict()
  .superRefine((contract, context) => {
    const expectedTarget =
      contract.taskKind === "public_query" ? "server" : "recipient_browser";
    if (contract.executionTarget !== expectedTarget) {
      context.addIssue({
        code: "custom",
        path: ["executionTarget"],
        message: "작업 유형에 허용된 실행 대상이 아닙니다.",
      });
    }

    const policyOperations = contract.stepPolicy.map((step) => step.operation);
    if (
      contract.capabilities.length !== policyOperations.length ||
      contract.capabilities.some(
        (operation, index) => operation !== policyOperations[index],
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["stepPolicy"],
        message: "단계 정책은 허용 동작 목록과 순서대로 일치해야 합니다.",
      });
    }

    const inputKeys = new Set(contract.inputPolicy.map((input) => input.key));
    contract.stepPolicy.forEach((step, index) => {
      if (step.inputRef !== undefined && !inputKeys.has(step.inputRef)) {
        context.addIssue({
          code: "custom",
          path: ["stepPolicy", index, "inputRef"],
          message: "단계 입력 참조가 입력 정책에 등록되어 있지 않습니다.",
        });
      }
    });
  });

export type AdapterContract = z.infer<typeof AdapterContractSchema>;

export const imageResizeAdapter: AdapterContract = {
  id: "image.resize_export",
  version: "1",
  taskKind: "local_image_batch",
  executionTarget: "recipient_browser",
  capabilities: ["validate_images", "resize_export", "package_zip"],
  inputPolicy: [
    {
      key: "photos",
      type: "image_files",
      required: true,
      minItems: 1,
      maxItems: 10,
      localOnly: true,
    },
  ],
  constantPolicy: {
    maxEdge: { kind: "number_range", min: 1, max: 4096, integer: true },
    quality: { kind: "number_range", min: 0.1, max: 1 },
    format: { kind: "literal", value: "jpeg" },
    stripMetadata: { kind: "literal", value: true },
  },
  stepPolicy: [
    { operation: "validate_images", inputRef: "photos" },
    {
      operation: "resize_export",
      inputRef: "photos",
      configRef: "constants",
    },
    { operation: "package_zip" },
  ],
  completionPolicy: {
    type: "all_outputs_created",
    countMatchesInput: true,
  },
  outputPolicy: { type: "download", filename: "hanbeonman-photos.zip" },
};

export const defaultAdapterRegistry: readonly AdapterContract[] = [
  imageResizeAdapter,
];

export type WorkflowValidationResult =
  | { success: true; data: Workflow }
  | { success: false; issues: string[] };

function sameRecord(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): boolean {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) =>
      key === rightKeys[index] && Object.is(left[key], right[key]),
    )
  );
}

function matchesConstantPolicy(
  constants: Record<string, string | number | boolean | null>,
  policy: AdapterContract["constantPolicy"],
): boolean {
  const constantKeys = Object.keys(constants).sort();
  const policyKeys = Object.keys(policy).sort();
  if (
    constantKeys.length !== policyKeys.length ||
    constantKeys.some((key, index) => key !== policyKeys[index])
  ) {
    return false;
  }
  return policyKeys.every((key) => {
    const rule = policy[key]!;
    const value = constants[key];
    if (rule.kind === "literal") return Object.is(value, rule.value);
    return (
      typeof value === "number" &&
      value >= rule.min &&
      value <= rule.max &&
      (!rule.integer || Number.isInteger(value))
    );
  });
}

function sameSteps(left: Workflow["steps"], right: Workflow["steps"]): boolean {
  return (
    left.length === right.length &&
    left.every((step, index) => sameRecord(step, right[index]!))
  );
}

function photoInvariantIssues(workflow: Workflow): string[] {
  if (workflow.taskKind !== "local_image_batch") return [];
  const issues: string[] = [];
  const photoInput = workflow.inputs.find((input) => input.key === "photos");
  if (
    workflow.executionTarget !== "recipient_browser" ||
    photoInput?.type !== "image_files" ||
    photoInput.localOnly !== true ||
    photoInput.required !== true ||
    photoInput.minItems !== 1 ||
    photoInput.maxItems !== 10
  ) {
    issues.push("사진 작업의 로컬 입력 규칙을 변경할 수 없습니다.");
  }
  if (
    !matchesConstantPolicy(workflow.constants, imageResizeAdapter.constantPolicy)
  ) {
    issues.push("사진 변환 상수가 허용 범위를 벗어났습니다.");
  }
  if (!sameSteps(workflow.steps, imageResizeAdapter.stepPolicy)) {
    issues.push("사진 처리 단계와 참조를 변경할 수 없습니다.");
  }
  if (!sameRecord(workflow.completion, imageResizeAdapter.completionPolicy)) {
    issues.push("사진 완료 계약을 변경할 수 없습니다.");
  }
  if (!sameRecord(workflow.output, imageResizeAdapter.outputPolicy)) {
    issues.push("사진 출력 계약을 변경할 수 없습니다.");
  }
  return issues;
}

export function validateWorkflow(
  value: unknown,
  registry: readonly AdapterContract[],
): WorkflowValidationResult {
  const parsed = WorkflowSchema.safeParse(value);
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "workflow"}: ${issue.message}`,
      ),
    };
  }

  const workflow = parsed.data;
  const issues: string[] = [];
  const parsedRegistry = z.array(AdapterContractSchema).safeParse(registry);
  if (!parsedRegistry.success) {
    return { success: false, issues: ["어댑터 레지스트리 계약이 올바르지 않습니다."] };
  }
  const adapter = parsedRegistry.data.find(
    (candidate) =>
      candidate.id === workflow.adapter.id &&
      candidate.version === workflow.adapter.version,
  );
  if (!adapter) {
    return { success: false, issues: ["등록된 어댑터 ID와 버전이 아닙니다."] };
  }

  if (workflow.taskKind !== adapter.taskKind) {
    issues.push("작업 유형이 어댑터 계약과 다릅니다.");
  }
  if (workflow.executionTarget !== adapter.executionTarget) {
    issues.push("실행 대상이 어댑터 계약과 다릅니다.");
  }

  const keys = workflow.inputs.map((input) => input.key);
  if (new Set(keys).size !== keys.length) {
    issues.push("입력 키는 중복될 수 없습니다.");
  }
  if (
    workflow.inputs.length !== adapter.inputPolicy.length ||
    adapter.inputPolicy.some((policy) => {
      const input = workflow.inputs.find((candidate) => candidate.key === policy.key);
      if (!input) return true;
      return Object.entries(policy).some(
        ([key, expected]) => input[key as keyof typeof input] !== expected,
      );
    })
  ) {
    issues.push("입력이 어댑터의 허용 정책과 다릅니다.");
  }
  if (!matchesConstantPolicy(workflow.constants, adapter.constantPolicy)) {
    issues.push("상수가 어댑터의 고정 정책과 다릅니다.");
  }

  if (!sameSteps(workflow.steps, adapter.stepPolicy)) {
    issues.push("단계와 참조가 등록된 정책과 다릅니다.");
  }
  for (const step of workflow.steps) {
    if (step.inputRef !== undefined && !keys.includes(step.inputRef)) {
      issues.push(`단계가 존재하지 않는 입력 '${step.inputRef}'을 참조합니다.`);
    }
    if (step.configRef !== undefined && step.configRef !== "constants") {
      issues.push("단계의 설정 참조가 허용되지 않습니다.");
    }
  }
  if (!sameRecord(workflow.completion, adapter.completionPolicy)) {
    issues.push("완료 계약이 어댑터 정책과 다릅니다.");
  }
  if (!sameRecord(workflow.output, adapter.outputPolicy)) {
    issues.push("출력 계약이 어댑터 정책과 다릅니다.");
  }
  issues.push(...photoInvariantIssues(workflow));

  return issues.length === 0
    ? { success: true, data: workflow }
    : { success: false, issues };
}
