import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route.js";

const validUrl =
  "http://localhost/api/tago/schedules?depTerminalId=NAEK010&arrTerminalId=NAEK300&depPlandTime=20260910";

describe("GET /api/tago/schedules", () => {
  afterEach(() => {
    delete process.env.TAGO_SERVICE_KEY;
    vi.unstubAllGlobals();
  });

  it("필수 조회 조건이 없으면 400을 반환한다", async () => {
    const response = await GET(new Request("http://localhost/api/tago/schedules"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      status: "INVALID_INPUT",
      error: { code: "INVALID_INPUT", message: "출발지, 도착지, 출발일을 입력해주세요." },
    });
  });

  it("TAGO 키가 없으면 외부 호출 없이 설정 필요 상태를 반환한다", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(new Request(validUrl));

    expect(response.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      status: "NEEDS_ATTENTION",
      error: { code: "NOT_CONFIGURED", message: "TAGO 연동 키가 아직 설정되지 않았습니다." },
    });
  });

  it("정상 조회 결과와 출처 시각을 반환하고 키는 응답에 포함하지 않는다", async () => {
    process.env.TAGO_SERVICE_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            response: {
              header: { resultCode: "00", resultMsg: "NORMAL SERVICE." },
              body: {
                totalCount: 1,
                items: {
                  item: {
                    routeId: "R-1",
                    gradeNm: "우등",
                    depPlandTime: "202609101030",
                    arrPlandTime: "202609101230",
                    depPlaceNm: "서울경부",
                    arrPlaceNm: "대전복합",
                    charge: "12300",
                  },
                },
              },
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const response = await GET(new Request(validUrl));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "OK",
      totalCount: 1,
      schedules: [
        expect.objectContaining({ routeId: "R-1", fare: 12300 }),
      ],
      source: { provider: "TAGO", reservationsSupported: false },
    });
    expect(body.fetchedAt).toEqual(expect.any(String));
    expect(JSON.stringify(body)).not.toContain("test-key");
  });

  it("공급자 거부는 NEEDS_ATTENTION으로 전달한다", async () => {
    process.env.TAGO_SERVICE_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            response: {
              header: { resultCode: "30", resultMsg: "SERVICE KEY ERROR" },
              body: { totalCount: 0, items: { item: [] } },
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const response = await GET(new Request(validUrl));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      status: "NEEDS_ATTENTION",
      error: { code: "PROVIDER_30", message: "TAGO 조회를 확인해야 합니다." },
    });
  });
});
