import { describe, expect, it } from "vitest";

import {
  AdapterContractSchema,
  imageResizeAdapter,
  validateWorkflow,
  type AdapterContract,
  type Workflow,
} from "./workflow.js";

const photoWorkflow: Workflow = {
  schemaVersion: "1.0",
  taskKind: "local_image_batch",
  title: "사진 줄여서 파일 만들기",
  executionTarget: "recipient_browser",
  adapter: { id: "image.resize_export", version: "1" },
  inputs: [
    {
      key: "photos",
      label: "줄일 사진을 골라주세요",
      type: "image_files",
      required: true,
      minItems: 1,
      maxItems: 10,
      localOnly: true,
    },
  ],
  constants: {
    maxEdge: 1600,
    quality: 0.82,
    format: "jpeg",
    stripMetadata: true,
  },
  steps: [
    { operation: "validate_images", inputRef: "photos" },
    {
      operation: "resize_export",
      inputRef: "photos",
      configRef: "constants",
    },
    { operation: "package_zip" },
  ],
  completion: { type: "all_outputs_created", countMatchesInput: true },
  output: { type: "download", filename: "hanbeonman-photos.zip" },
};

const validatePhoto = (value: unknown) =>
  validateWorkflow(value, [imageResizeAdapter]);

describe("validateWorkflow", () => {
  it("SDD의 사진 명세를 허용한다", () => {
    expect(validatePhoto(photoWorkflow)).toEqual({
      success: true,
      data: photoWorkflow,
    });
  });

  it("메타데이터 제거를 끈 명세를 거부한다", () => {
    const value = structuredClone(photoWorkflow);
    value.constants.stripMetadata = false;
    expect(validatePhoto(value).success).toBe(false);
  });

  it("사진을 서버로 올리는 입력을 거부한다", () => {
    const value = structuredClone(photoWorkflow);
    value.inputs[0]!.localOnly = false;
    expect(validatePhoto(value).success).toBe(false);
  });

  it("존재하지 않는 입력을 참조하는 단계를 거부한다", () => {
    const value = structuredClone(photoWorkflow);
    value.steps[0]!.inputRef = "missing";
    expect(validatePhoto(value).success).toBe(false);
  });

  it("중복 입력 키를 거부한다", () => {
    const value = structuredClone(photoWorkflow);
    value.inputs.push(structuredClone(value.inputs[0]!));
    expect(validatePhoto(value).success).toBe(false);
  });

  it("등록되지 않은 어댑터 버전을 거부한다", () => {
    const value = structuredClone(photoWorkflow);
    value.adapter.version = "2";
    expect(validatePhoto(value).success).toBe(false);
  });

  it("등록된 실행 대상을 바꾼 명세를 거부한다", () => {
    const value = structuredClone(photoWorkflow);
    value.executionTarget = "server";
    expect(validatePhoto(value).success).toBe(false);
  });

  it("단계 순서를 바꾼 사진 명세를 거부한다", () => {
    const value = structuredClone(photoWorkflow);
    value.steps.reverse();
    expect(validatePhoto(value).success).toBe(false);
  });

  it.each([
    ["사진 검증 입력 참조 삭제", 0, "inputRef"],
    ["사진 변환 입력 참조 삭제", 1, "inputRef"],
    ["사진 변환 설정 참조 삭제", 1, "configRef"],
  ] as const)("%s를 거부한다", (_name, stepIndex, field) => {
    const value = structuredClone(photoWorkflow);
    delete value.steps[stepIndex]![field];
    expect(validatePhoto(value).success).toBe(false);
  });

  it("ZIP 단계에 사진 입력 참조를 추가한 명세를 거부한다", () => {
    const value = structuredClone(photoWorkflow);
    value.steps[2]!.inputRef = "photos";
    expect(validatePhoto(value).success).toBe(false);
  });

  it("사진 완료 계약을 조회 완료로 바꾼 명세를 거부한다", () => {
    const value = structuredClone(photoWorkflow);
    value.completion = { type: "query_completed" };
    expect(validatePhoto(value).success).toBe(false);
  });

  it("사진 출력을 구조화 결과로 바꾼 명세를 거부한다", () => {
    const value = structuredClone(photoWorkflow);
    value.output = { type: "structured_result" };
    expect(validatePhoto(value).success).toBe(false);
  });

  it("파일 업로드 단계를 넣은 명세를 거부한다", () => {
    const value = structuredClone(photoWorkflow);
    value.steps.splice(2, 0, { operation: "upload_files", inputRef: "photos" });
    expect(validatePhoto(value).success).toBe(false);
  });

  it("허용 범위 안의 사진 크기와 품질 설정을 허용한다", () => {
    const value = structuredClone(photoWorkflow);
    value.constants.maxEdge = 800;
    value.constants.quality = 0.7;
    expect(validatePhoto(value).success).toBe(true);
  });

  it("등록 계약이 허용해도 사진의 업로드 단계와 결과 계약 변경을 거부한다", () => {
    const value = structuredClone(photoWorkflow);
    value.steps = [
      { operation: "validate_images", inputRef: "photos" },
      { operation: "upload_files", inputRef: "photos" },
    ];
    value.completion = { type: "query_completed" };
    value.output = { type: "structured_result" };
    const weakenedAdapter: AdapterContract = {
      ...imageResizeAdapter,
      capabilities: ["validate_images", "upload_files"],
      stepPolicy: structuredClone(value.steps),
      completionPolicy: structuredClone(value.completion),
      outputPolicy: structuredClone(value.output),
    };

    expect(validateWorkflow(value, [weakenedAdapter]).success).toBe(false);
  });

  it.each([
    ["0인 긴 변", "maxEdge", 0],
    ["범위를 넘은 긴 변", "maxEdge", 4097],
    ["범위보다 낮은 품질", "quality", 0.09],
    ["범위를 넘은 품질", "quality", 1.01],
  ] as const)("%s을 거부한다", (_name, key, setting) => {
    const value = structuredClone(photoWorkflow);
    value.constants[key] = setting;
    expect(validatePhoto(value).success).toBe(false);
  });

  it("등록되지 않은 공개 조회를 지원하는 것처럼 허용하지 않는다", () => {
    expect(
      validateWorkflow(
        {
          ...photoWorkflow,
          taskKind: "public_query",
          executionTarget: "server",
          adapter: { id: "query.unregistered", version: "1" },
        },
        [],
      ).success,
    ).toBe(false);
  });

  it("허용 동작과 단계 정책이 모순된 공개 조회 계약을 거부한다", () => {
    const adapter: AdapterContract = {
      id: "query.example",
      version: "1",
      taskKind: "public_query",
      executionTarget: "server",
      capabilities: ["query.safe"],
      inputPolicy: [],
      constantPolicy: {},
      stepPolicy: [{ operation: "upload_files" }],
      completionPolicy: { type: "query_completed" },
      outputPolicy: { type: "structured_result" },
    };

    expect(
      validateWorkflow(
        {
          schemaVersion: "1.0",
          taskKind: "public_query",
          title: "공개 정보 조회하기",
          executionTarget: "server",
          adapter: { id: "query.example", version: "1" },
          inputs: [],
          constants: {},
          steps: [{ operation: "upload_files" }],
          completion: { type: "query_completed" },
          output: { type: "structured_result" },
        },
        [adapter],
      ).success,
    ).toBe(false);
  });

  it("단계가 입력 정책에 없는 키를 참조하는 어댑터 계약을 거부한다", () => {
    expect(
      AdapterContractSchema.safeParse({
        id: "query.example",
        version: "1",
        taskKind: "public_query",
        executionTarget: "server",
        capabilities: ["query.safe"],
        inputPolicy: [],
        constantPolicy: {},
        stepPolicy: [{ operation: "query.safe", inputRef: "date" }],
        completionPolicy: { type: "query_completed" },
        outputPolicy: { type: "structured_result" },
      }).success,
    ).toBe(false);
  });

  it("공개 조회를 수신자 브라우저에서 실행하도록 한 계약과 명세를 거부한다", () => {
    const adapter: AdapterContract = {
      id: "query.example",
      version: "1",
      taskKind: "public_query",
      executionTarget: "recipient_browser",
      capabilities: ["query.safe"],
      inputPolicy: [],
      constantPolicy: {},
      stepPolicy: [{ operation: "query.safe" }],
      completionPolicy: { type: "query_result_validated" },
      outputPolicy: { type: "structured_result" },
    };

    expect(
      validateWorkflow(
        {
          schemaVersion: "1.0",
          taskKind: "public_query",
          title: "공개 정보 조회하기",
          executionTarget: "recipient_browser",
          adapter: { id: "query.example", version: "1" },
          inputs: [],
          constants: {},
          steps: [{ operation: "query.safe" }],
          completion: { type: "query_result_validated" },
          output: { type: "structured_result" },
        },
        [adapter],
      ).success,
    ).toBe(false);
  });
});
