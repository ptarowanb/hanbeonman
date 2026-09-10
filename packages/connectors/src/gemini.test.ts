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
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "minimal" });
    expect(String(request.init?.body)).toContain("인천 날씨 버튼을 만들어줘");
    expect(String(request.init?.body)).not.toContain("test-key");
  });

  it("구조화된 후보 텍스트를 ButtonIntent로 검증한다", () => {
    expect(parseGeminiInterpretResponse({
      candidates: [{ content: { parts: [{ text: JSON.stringify(validIntent) }] } }],
    })).toEqual(validIntent);
  });

  it("Gemini 3의 생각 파트가 앞에 있어도 최종 JSON 파트를 읽는다", () => {
    expect(parseGeminiInterpretResponse({
      candidates: [{
        content: {
          parts: [
            { text: "분류 과정을 내부적으로 검토합니다.", thought: true },
            { text: JSON.stringify(validIntent) },
          ],
        },
      }],
    })).toEqual(validIntent);
  });

  it("버스 요청에서 요일만 있으면 실행기가 다가오는 요일을 계산하도록 지시한다", () => {
    const request = buildGeminiInterpretRequest("금요일 서울에서 대전 출장 버튼을 만들어줘", { apiKey: "test-key" });
    const body = JSON.parse(String(request.init?.body)) as { contents: Array<{ parts: Array<{ text: string }> }> };
    const prompt = body.contents[0]?.parts[0]?.text ?? "";

    expect(prompt).toContain("요일");
    expect(prompt).toContain("이미 지난 요일");
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
