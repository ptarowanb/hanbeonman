import { describe, expect, it } from "vitest";
import {
  createGeneratedButton,
  parseGeneratedButtons,
} from "./buttonStorage.js";

const draft = {
  intent: "create_button" as const,
  schemaVersion: "1.0" as const,
  actionKind: "weather" as const,
  title: "  인천 날씨 확인  ",
  summary: "인천의 현재 날씨를 조회합니다.",
  fixedInputs: { city: "인천" },
  requiredInputs: [],
  clarifyingQuestion: null,
};

describe("자연어 생성 버튼 저장소", () => {
  it("해석 초안을 버튼으로 정규화한다", () => {
    const button = createGeneratedButton(draft, new Date("2026-09-10T12:00:00.000Z"));

    expect(button).toMatchObject({
      id: "generated-1789041600000",
      title: "인천 날씨 확인",
      actionKind: "weather",
      fixedInputs: { city: "인천" },
    });
  });

  it("저장 문자열에서 유효한 버튼만 복원한다", () => {
    const button = createGeneratedButton(draft, new Date("2026-09-10T12:00:00.000Z"));
    const parsed = parseGeneratedButtons(JSON.stringify([button, { id: "bad" }]));

    expect(parsed).toEqual([button]);
  });
});
