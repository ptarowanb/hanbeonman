import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route.js";

describe("POST /api/buttons/interpret", () => {
  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
    vi.unstubAllGlobals();
  });

  it("자연어 요청 형식이 잘못되면 400을 반환한다", async () => {
    const response = await POST(new Request("http://localhost/api/buttons/interpret", {
      method: "POST",
      body: JSON.stringify({ message: "" }),
      headers: { "content-type": "application/json" },
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      status: "INVALID_INPUT",
      error: { code: "INVALID_INPUT", message: "만들고 싶은 작업을 입력해주세요." },
    });
  });

  it("Gemini 키가 없으면 외부 호출 없이 503을 반환한다", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(new Request("http://localhost/api/buttons/interpret", {
      method: "POST",
      body: JSON.stringify({ message: "인천 날씨 버튼을 만들어줘" }),
      headers: { "content-type": "application/json" },
    }));

    expect(response.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      status: "NEEDS_ATTENTION",
      error: { code: "NOT_CONFIGURED", message: "Gemini 연동 키가 아직 설정되지 않았습니다." },
    });
  });

  it("검증된 Gemini 해석 결과만 반환한다", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        schemaVersion: "1.0",
        intent: "create_button",
        actionKind: "weather",
        title: "인천 날씨 확인",
        summary: "인천의 현재 날씨를 조회합니다.",
        fixedInputs: { city: "인천" },
        requiredInputs: [],
        clarifyingQuestion: null,
      }) }] } }],
    }))));

    const response = await POST(new Request("http://localhost/api/buttons/interpret", {
      method: "POST",
      body: JSON.stringify({ message: "인천 날씨 버튼을 만들어줘" }),
      headers: { "content-type": "application/json" },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ intent: "create_button", actionKind: "weather", fixedInputs: { city: "인천" } });
  });

  it("Gemini 연결 오류는 502와 안전한 메시지로 반환한다", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network details must not leak");
    }));

    const response = await POST(new Request("http://localhost/api/buttons/interpret", {
      method: "POST",
      body: JSON.stringify({ message: "인천 날씨 버튼을 만들어줘" }),
      headers: { "content-type": "application/json" },
    }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      status: "FAILED",
      error: { code: "NETWORK_ERROR", message: "버튼 요청을 해석하지 못했습니다. 잠시 후 다시 시도해주세요." },
    });
  });
});
