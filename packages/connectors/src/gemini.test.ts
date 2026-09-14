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

  it.each(["날씨", "날씨 버튼", "날씨 버튼 만들어줘"])("%s만 입력하면 지역을 추가로 묻는다", async (message) => {
    await expect(interpretButtonRequest(message)).resolves.toMatchObject({
      intent: "clarify", actionKind: "weather", fixedInputs: {},
      requiredInputs: [{ key: "city", type: "city", required: true }],
      clarifyingQuestion: expect.stringContaining("도시"),
    });
  });

  it("날씨 질문에 대한 추가 도시 답변을 키 없이 이어서 처리한다", async () => {
    await expect(interpretButtonRequest("날씨\n추가 정보: 인천")).resolves.toMatchObject({
      intent: "create_button", actionKind: "weather", fixedInputs: { city: "인천" }, requiredInputs: [],
    });
  });

  it("잘못된 시간 답변이면 올바른 분 수를 다시 입력받는다", async () => {
    await expect(interpretButtonRequest("타이머\n추가 정보: 500분")).resolves.toMatchObject({
      intent: "clarify", actionKind: "timer", fixedInputs: {}, requiredInputs: [{ key: "minutes", required: true }],
    });
  });

  it("더치페이의 누락 금액과 인원을 차례로 받고 버튼을 완성한다", async () => {
    await expect(interpretButtonRequest("더치페이")).resolves.toMatchObject({ intent: "clarify", clarifyingQuestion: expect.stringContaining("총금액") });
    await expect(interpretButtonRequest("더치페이\n추가 정보: 10,000원")).resolves.toMatchObject({
      intent: "clarify", fixedInputs: { amount: 10000 }, requiredInputs: [{ key: "people", required: true }], clarifyingQuestion: expect.stringContaining("몇 명"),
    });
    await expect(interpretButtonRequest("더치페이\n추가 정보: 10,000원\n추가 정보: 3명")).resolves.toMatchObject({
      intent: "create_button", actionKind: "split_bill", fixedInputs: { amount: 10000, people: 3 }, requiredInputs: [],
    });
  });

  it("잘못된 중간 답변은 건너뛰고 다음 유효한 답변으로 같은 입력을 채운다", async () => {
    await expect(interpretButtonRequest("더치페이\n추가 정보: -100\n추가 정보: 10000\n추가 정보: 0")).resolves.toMatchObject({
      intent: "clarify", fixedInputs: { amount: 10000 }, requiredInputs: [{ key: "people", required: true }],
    });
    await expect(interpretButtonRequest("더치페이\n추가 정보: -100\n추가 정보: 10000\n추가 정보: 0\n추가 정보: 3")).resolves.toMatchObject({
      intent: "create_button", fixedInputs: { amount: 10000, people: 3 },
    });
  });

  it("출발지와 도착지를 순서대로 받고 날짜를 임의로 고정하지 않는다", async () => {
    await expect(interpretButtonRequest("버스\n추가 정보: 서울경부")).resolves.toMatchObject({
      intent: "clarify", fixedInputs: { departure: "서울경부" }, requiredInputs: [{ key: "arrival", required: true }],
    });
    await expect(interpretButtonRequest("버스\n추가 정보: 서울경부\n추가 정보: 대전복합")).resolves.toMatchObject({
      intent: "create_button", actionKind: "bus_schedule", fixedInputs: { departure: "서울경부", arrival: "대전복합" },
    });
  });

  it("단위의 값과 두 단위를 입력받고 호환되지 않는 답변은 다시 묻는다", async () => {
    await expect(interpretButtonRequest("단위 변환\n추가 정보: 1500\n추가 정보: m\n추가 정보: kg")).resolves.toMatchObject({
      intent: "clarify", fixedInputs: { value: 1500, from: "m" }, requiredInputs: [{ key: "to", required: true }],
    });
    await expect(interpretButtonRequest("단위 변환\n추가 정보: 1500\n추가 정보: m\n추가 정보: kg\n추가 정보: km")).resolves.toMatchObject({
      intent: "create_button", actionKind: "unit_convert", fixedInputs: { value: 1500, from: "m", to: "km" },
    });
  });

  it.each(["25분 타이머", "타이머\n추가 정보: 25분"])("%s를 생활 타이머로 만든다", async (message) => {
    await expect(interpretButtonRequest(message)).resolves.toMatchObject({
      intent: "create_button", actionKind: "timer", fixedInputs: { minutes: 25 },
    });
  });

  it.each([
    ["타이머", "timer"], ["체크리스트", "checklist"], ["버스", "bus_schedule"],
    ["디데이", "dday"], ["더치페이", "split_bill"], ["단위 변환", "unit_convert"], ["무작위 선택", "random_pick"],
  ])("%s만 입력해도 필요한 값을 질문한다", async (message, actionKind) => {
    await expect(interpretButtonRequest(message)).resolves.toMatchObject({ intent: "clarify", actionKind });
  });

  it("등록된 11개 작업과 생성 우선 흐름을 프롬프트에 제공한다", () => {
    const request = buildGeminiInterpretRequest("다음 휴가 디데이", { apiKey: "test-key" });
    const body = JSON.parse(String(request.init.body));
    const prompt = body.contents[0].parts[0].text as string;
    for (const action of ["weather", "bus_schedule", "photo_compress", "timer", "checklist", "dday", "split_bill", "unit_convert", "text_cleanup", "random_pick", "counter"]) expect(prompt).toContain(action);
    expect(prompt).toContain("기본 의도는 create_button");
  });

  it("서버 전용 키와 JSON 응답 스키마를 포함한 요청을 만든다", () => {
    const request = buildGeminiInterpretRequest("인천 날씨 버튼을 만들어줘", {
      apiKey: "test-key",
      model: "gemini-test",
    });
    const body = JSON.parse(String(request.init?.body)) as { generationConfig: Record<string, unknown> };

    expect(request.url.toString()).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent");
    expect(request.init?.headers).toEqual(expect.objectContaining({ "x-goog-api-key": "test-key" }));
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseJsonSchema).toEqual(expect.objectContaining({ type: "object" }));
    expect(body.generationConfig.responseSchema).toBeUndefined();
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

  it("도시와 날씨만 입력해도 날씨 버튼 초안으로 만든다", async () => {
    const fetchImpl = vi.fn();

    await expect(interpretButtonRequest("인천 날씨", { apiKey: "", fetchImpl })).resolves.toMatchObject({
      intent: "create_button",
      actionKind: "weather",
      title: "인천 날씨 조회",
      fixedInputs: { city: "인천" },
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("구조화 응답에 포함된 선택적 unsupportedReason null을 허용한다", () => {
    expect(parseGeminiInterpretResponse({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ ...validIntent, unsupportedReason: null }) }] } }],
    })).toMatchObject(validIntent);
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
