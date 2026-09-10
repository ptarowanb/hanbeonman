import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route.js";

describe("GET /api/tago/terminals", () => {
  afterEach(() => {
    delete process.env.TAGO_SERVICE_KEY;
    vi.unstubAllGlobals();
  });

  it("키가 없으면 외부 호출 없이 설정 필요 상태를 반환한다", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(new Request("http://localhost/api/tago/terminals?terminalNm=서울"));

    expect(response.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      status: "NEEDS_ATTENTION",
      error: { code: "NOT_CONFIGURED", message: "TAGO 연동 키가 아직 설정되지 않았습니다." },
    });
  });

  it("터미널 결과와 조회 시각을 반환하며 인증키는 노출하지 않는다", async () => {
    process.env.TAGO_SERVICE_KEY = "test-key";
    let requestUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        requestUrl = String(input);
        return new Response(
          JSON.stringify({
            response: {
              header: { resultCode: "00" },
              body: {
                totalCount: 1,
                items: { item: { terminalId: "NAEK010", terminalNm: "서울경부" } },
              },
            },
          }),
          { status: 200 },
        );
      }),
    );

    const response = await GET(
      new Request("http://localhost/api/tago/terminals?terminalNm=%EC%84%9C%EC%9A%B8"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "OK",
      totalCount: 1,
      items: [{ id: "NAEK010", name: "서울경부" }],
      source: { provider: "TAGO", resource: "terminals" },
    });
    expect(body.fetchedAt).toEqual(expect.any(String));
    expect(new URL(requestUrl).searchParams.get("terminalNm")).toBe("서울");
    expect(JSON.stringify(body)).not.toContain("test-key");
  });

  it("검색어 없이 조회하면 모든 터미널 페이지를 합친다", async () => {
    process.env.TAGO_SERVICE_KEY = "test-key";
    const requestedPages: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        const pageNo = url.searchParams.get("pageNo") ?? "1";
        requestedPages.push(pageNo);
        const item = pageNo === "1"
          ? [{ terminalId: "NAEK010", terminalNm: "서울경부" }, { terminalId: "NAEK300", terminalNm: "대전복합" }]
          : [{ terminalId: "NAEK200", terminalNm: "강릉" }];
        return new Response(
          JSON.stringify({
            response: {
              header: { resultCode: "00" },
              body: { totalCount: 3, items: { item } },
            },
          }),
          { status: 200 },
        );
      }),
    );

    const response = await GET(
      new Request("http://localhost/api/tago/terminals?numOfRows=2"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(requestedPages).toEqual(["1", "2"]);
    expect(body.items).toEqual([
      { id: "NAEK010", name: "서울경부" },
      { id: "NAEK300", name: "대전복합" },
      { id: "NAEK200", name: "강릉" },
    ]);
  });

  it("잘못된 페이지 조건은 400으로 거절한다", async () => {
    process.env.TAGO_SERVICE_KEY = "test-key";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(
      new Request("http://localhost/api/tago/terminals?pageNo=0"),
    );

    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      status: "INVALID_INPUT",
      error: { code: "INVALID_INPUT", message: "페이지 조건 형식이 올바르지 않습니다." },
    });
  });
});
