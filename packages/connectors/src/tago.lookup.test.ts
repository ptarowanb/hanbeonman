import { describe, expect, it } from "vitest";
import {
  buildTagoLookupUrl,
  createTagoClient,
  parseTagoCityResponse,
  parseTagoGradeResponse,
  parseTagoTerminalResponse,
} from "./tago.js";

function responseFor(body: unknown, resultCode = "00") {
  return new Response(
    JSON.stringify({
      response: {
        header: { resultCode, resultMsg: "NORMAL SERVICE." },
        body,
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("TAGO 고속버스 코드 조회 계약", () => {
  it("터미널 이름과 페이지 조건을 URL에 넣는다", () => {
    const url = buildTagoLookupUrl(
      "terminals",
      { terminalNm: "서울", pageNo: 2, numOfRows: 20 },
      "key%2Fwith%3Dequals",
    );

    expect(url.pathname).toBe(
      "/1613000/ExpBusInfo/GetExpBusTrminlList",
    );
    expect(url.searchParams.get("serviceKey")).toBe("key/with=equals");
    expect(url.searchParams.get("terminalNm")).toBe("서울");
    expect(url.searchParams.get("pageNo")).toBe("2");
    expect(url.searchParams.get("numOfRows")).toBe("20");
    expect(url.searchParams.get("_type")).toBe("json");
  });

  it("터미널·등급·도시 응답을 같은 결과 계약으로 정규화한다", () => {
    expect(
      parseTagoTerminalResponse({
        response: {
          header: { resultCode: "00" },
          body: {
            totalCount: 1,
            items: { item: { terminalId: "NAEK010", terminalNm: "서울경부" } },
          },
        },
      }),
    ).toEqual({
      status: "OK",
      totalCount: 1,
      items: [{ id: "NAEK010", name: "서울경부" }],
    });

    expect(
      parseTagoGradeResponse({
        response: {
          header: { resultCode: "00" },
          body: {
            totalCount: "2",
            items: {
              item: [
                { gradeId: "1", gradeNm: "고속" },
                { gradeId: "2", gradeNm: "우등" },
              ],
            },
          },
        },
      }),
    ).toEqual({
      status: "OK",
      totalCount: 2,
      items: [
        { id: "1", name: "고속" },
        { id: "2", name: "우등" },
      ],
    });

    expect(
      parseTagoCityResponse({
        response: {
          header: { resultCode: 0 },
          body: { totalCount: 0, items: { item: [] } },
        },
      }),
    ).toEqual({ status: "EMPTY", totalCount: 0, items: [] });
  });

  it("클라이언트가 세 코드 조회를 올바른 TAGO 작업으로 호출한다", async () => {
    const requestedPaths: string[] = [];
    const client = createTagoClient({
      serviceKey: "test-key",
      fetchImpl: async (input) => {
        const url = new URL(String(input));
        requestedPaths.push(url.pathname);
        if (url.pathname.endsWith("GetExpBusTrminlList")) {
          return responseFor({
            totalCount: 1,
            items: { item: { terminalId: "NAEK010", terminalNm: "서울경부" } },
          });
        }
        if (url.pathname.endsWith("GetExpBusGradList")) {
          return responseFor({
            totalCount: 1,
            items: { item: { gradeId: "1", gradeNm: "고속" } },
          });
        }
        return responseFor({
          totalCount: 1,
          items: { item: { cityCode: 11, cityName: "서울" } },
        });
      },
    });

    await expect(client.getTerminals({ terminalNm: "서울" })).resolves.toEqual({
      status: "OK",
      totalCount: 1,
      items: [{ id: "NAEK010", name: "서울경부" }],
    });
    await expect(client.getGrades({})).resolves.toEqual({
      status: "OK",
      totalCount: 1,
      items: [{ id: "1", name: "고속" }],
    });
    await expect(client.getCities({})).resolves.toEqual({
      status: "OK",
      totalCount: 1,
      items: [{ id: "11", name: "서울" }],
    });

    expect(requestedPaths).toEqual([
      "/1613000/ExpBusInfo/GetExpBusTrminlList",
      "/1613000/ExpBusInfo/GetExpBusGradList",
      "/1613000/ExpBusInfo/GetCtyCodeList",
    ]);
  });
});
