import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route.js";

describe("GET /api/supabase/health", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
    vi.unstubAllGlobals();
  });

  it("서버 설정이 없으면 외부 호출 없이 설정 필요 상태를 반환한다", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET();

    expect(response.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      status: "NEEDS_ATTENTION",
      error: { code: "NOT_CONFIGURED", message: "Supabase 서버 연결 설정이 아직 없습니다." },
    });
  });

  it("buttons 테이블 확인 성공 여부만 반환하고 서버 키를 노출하지 않는다", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "server-secret-key";
    let requestUrl = "";
    let requestHeaders: HeadersInit | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        requestUrl = String(input);
        requestHeaders = init?.headers;
        return new Response("[]", { status: 200 });
      }),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "OK",
      source: { provider: "SUPABASE", resource: "buttons" },
    });
    expect(body.checkedAt).toEqual(expect.any(String));
    expect(requestUrl).toBe("https://example.supabase.co/rest/v1/buttons?select=id&limit=1");
    expect(new Headers(requestHeaders).get("apikey")).toBe("server-secret-key");
    expect(JSON.stringify(body)).not.toContain("server-secret-key");
  });

  it("Supabase HTTP 오류를 FAILED 상태로 매핑한다", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "server-secret-key";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("unavailable", { status: 503 })));

    const response = await GET();

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      status: "FAILED",
      error: { code: "HTTP_503", message: "Supabase 연결을 확인하지 못했습니다." },
    });
  });
});
