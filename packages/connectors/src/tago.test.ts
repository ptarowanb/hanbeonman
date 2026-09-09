import { describe, expect, it } from "vitest";
import {
  TagoUpstreamError,
  buildTagoScheduleUrl,
  createTagoClient,
  parseTagoScheduleResponse,
} from "./tago.js";

const query = {
  depTerminalId: "NAEK010",
  arrTerminalId: "NAEK300",
  depPlandTime: "20260910",
};

describe("TAGO 고속버스 커넥터", () => {
  it("URL 인코딩된 일반 인증키를 한 번만 디코딩해 요청한다", () => {
    const url = buildTagoScheduleUrl(query, "key%2Fwith%3Dequals");

    expect(url.searchParams.get("serviceKey")).toBe("key/with=equals");
  });

  it("서비스 키와 조회 조건을 안전하게 URL에 넣고 일정을 정규화한다", async () => {
    let requestedUrl = "";
    const client = createTagoClient({
      serviceKey: "decoded key+/=",
      fetchImpl: async (input) => {
        requestedUrl = String(input);
        return new Response(
          JSON.stringify({
            response: {
              header: { resultCode: "00", resultMsg: "NORMAL SERVICE." },
              body: {
                numOfRows: 10,
                pageNo: 1,
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
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });

    const result = await client.getSchedules(query);
    const url = new URL(requestedUrl);

    expect(url.pathname).toBe(
      "/1613000/ExpBusInfo/GetStrtpntAlocFndExpbusInfo",
    );
    expect(url.searchParams.get("serviceKey")).toBe("decoded key+/=");
    expect(url.searchParams.get("_type")).toBe("json");
    expect(url.searchParams.get("depTerminalId")).toBe("NAEK010");
    expect(result).toEqual({
      status: "OK",
      totalCount: 1,
      schedules: [
        {
          routeId: "R-1",
          gradeName: "우등",
          departureTime: "202609101030",
          arrivalTime: "202609101230",
          departurePlace: "서울경부",
          arrivalPlace: "대전복합",
          fare: 12300,
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("decoded key");
  });

  it("TAGO가 숫자로 반환한 시간과 요금도 일정 형식으로 정규화한다", () => {
    const result = parseTagoScheduleResponse({
      response: {
        header: { resultCode: "00" },
        body: {
          totalCount: 1,
          items: {
            item: {
              routeId: "R-2",
              gradeNm: "고속",
              depPlandTime: 202609101030,
              arrPlandTime: 202609101230,
              depPlaceNm: "서울경부",
              arrPlaceNm: "대전복합",
              charge: 7800,
            },
          },
        },
      },
    });

    expect(result).toMatchObject({
      status: "OK",
      schedules: [
        {
          departureTime: "202609101030",
          arrivalTime: "202609101230",
          fare: 7800,
        },
      ],
    });
  });

  it("정상 응답의 일정이 없으면 EMPTY를 반환한다", async () => {
    const client = createTagoClient({
      serviceKey: "test-key",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            response: {
              header: { resultCode: "00", resultMsg: "NORMAL SERVICE." },
              body: { totalCount: 0, items: { item: [] } },
            },
          }),
          { status: 200 },
        ),
    });

    await expect(client.getSchedules(query)).resolves.toEqual({
      status: "EMPTY",
      totalCount: 0,
      schedules: [],
    });
  });

  it("공급자 오류 코드를 키 없이 전달한다", async () => {
    const client = createTagoClient({
      serviceKey: "test-key",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            response: {
              header: { resultCode: "30", resultMsg: "SERVICE KEY IS NOT REGISTERED ERROR." },
              body: { totalCount: 0, items: { item: [] } },
            },
          }),
          { status: 200 },
        ),
    });

    await expect(client.getSchedules(query)).rejects.toMatchObject({
      name: "TagoUpstreamError",
      code: "PROVIDER_30",
    } satisfies Partial<TagoUpstreamError>);
  });

  it("HTTP 오류는 FAILED 성격의 예외로 구분한다", async () => {
    const client = createTagoClient({
      serviceKey: "test-key",
      fetchImpl: async () => new Response("upstream unavailable", { status: 503 }),
    });

    await expect(client.getSchedules(query)).rejects.toEqual(
      expect.objectContaining({
        name: "TagoUpstreamError",
        code: "HTTP_503",
      }),
    );
  });
});
