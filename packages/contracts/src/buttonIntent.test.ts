import { describe, expect, it } from "vitest";
import { ButtonIntentSchema, parseButtonIntent } from "./buttonIntent.js";

describe("자연어 버튼 해석 계약", () => {
  it("날씨 버튼 생성 초안을 허용한다", () => {
    const result = parseButtonIntent({
      schemaVersion: "1.0",
      intent: "create_button",
      actionKind: "weather",
      title: "인천 날씨 확인",
      summary: "인천의 현재 날씨를 조회합니다.",
      fixedInputs: { city: "인천" },
      requiredInputs: [],
      clarifyingQuestion: null,
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.fixedInputs).toEqual({ city: "인천" });
  });

  it("필수 입력이 빠진 clarify 결과를 허용한다", () => {
    const result = parseButtonIntent({
      schemaVersion: "1.0",
      intent: "clarify",
      actionKind: "weather",
      title: "날씨 확인",
      summary: "도시의 현재 날씨를 조회합니다.",
      fixedInputs: {},
      requiredInputs: [{ key: "city", label: "날씨를 확인할 도시", type: "city", required: true }],
      clarifyingQuestion: "어느 도시의 날씨를 확인할까요?",
    });

    expect(result.success).toBe(true);
  });

  it("등록되지 않은 작업과 임의 필드를 거부한다", () => {
    expect(ButtonIntentSchema.safeParse({
      schemaVersion: "1.0",
      intent: "create_button",
      actionKind: "send_money",
      title: "송금 버튼",
      summary: "송금합니다.",
      fixedInputs: { account: "1234" },
      requiredInputs: [],
      clarifyingQuestion: null,
      code: "fetch('/bank')",
    }).success).toBe(false);
  });
});
