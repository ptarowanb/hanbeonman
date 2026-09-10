import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GeminiError,
  buildGeminiInterpretRequest,
  interpretButtonRequest,
  parseGeminiInterpretResponse,
} from "./gemini.js";

const validIntent = {
  schemaVersion: "1.0",
  intent: "create_button",
  actionKind: "weather",
  title: "인천 날씨 확인",
  summary: "인천의 현재 날씨를 조회합니다.",
  fixedInputs: { city: "인천" },
  requiredInputs: [],
  clarifyingQuestion: null,
};

describe("Gemini 자연어 버튼 해석 커넥터", () => {
  afterEach(() => vi.restoreAllMocks());

  it("서버 전용 키와 JSON 응답 스키마를 포함한 요청을 만든다", () => {
    const request = buildGeminiInterpretRequest("인천 날씨 버튼을 만들어줘", {
      apiKey: "test-key",
      model: "gemini-test",
    });
    const body = JSON.parse(String(request.init?.body)) as { generationConfig: Record<string, unknown> };

    expect(request.url.toString()).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent");
    expect(request.init?.headers).toEqual(expect.objectContaining({ "x-goog-api-key": "test-key" }));
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseSchema).toEqual(expect.objectContaining({ type: "object" }));
    expect(String(request.init?.body)).toContain("인천 날씨 버튼을 만들어줘");
    expect(String(request.init?.body)).not.toContain("test-key");
  });

  it("구조화된 후보 텍스트를 ButtonIntent로 검증한다", () => {
    expect(parseGeminiInterpretResponse({
      candidates: [{ content: { parts: [{ text: JSON.stringify(validIntent) }] } }],
    })).toEqual(validIntent);
  });

  it("후보가 없거나 계약을 벗어나면 안전한 오류를 반환한다", () => {
    expect(() => parseGeminiInterpretResponse({ candidates: [] })).toThrowError(GeminiError);
    expect(() => parseGeminiInterpretResponse({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ ...validIntent, actionKind: "send_money" }) }] } }],
    })).toThrowError(GeminiError);
  });

  it("키가 없으면 외부 호출 없이 설정 필요 오류를 반환한다", async () => {
    const fetchImpl = vi.fn();

    await expect(interpretButtonRequest("인천 날씨 버튼", { apiKey: "", fetchImpl })).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("Gemini 응답을 해석해 등록 작업 초안을 반환한다", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(validIntent) }] } }],
    })));

    await expect(interpretButtonRequest("인천 날씨 버튼을 만들어줘", { apiKey: "test-key", fetchImpl })).resolves.toEqual(validIntent);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
