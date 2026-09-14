import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route.js";

describe("GET /api/weather", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("도시가 없으면 400을 반환한다", async () => {
    const response = await GET(new Request("http://localhost/api/weather"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      status: "INVALID_INPUT",
      error: { code: "INVALID_INPUT", message: "도시를 입력해주세요." },
    });
  });

  it("Open-Meteo 결과와 조회 시각을 반환한다", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.hostname.startsWith("geocoding")) {
        return new Response(JSON.stringify({
          results: [{ name: "서울", latitude: 37.5665, longitude: 126.978 }],
        }));
      }
      return new Response(JSON.stringify({
        current: { time: "2026-09-10T12:00", temperature_2m: 25.4, precipitation: 0, weather_code: 1 },
      }));
    }));

    const response = await GET(new Request("http://localhost/api/weather?city=서울"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "OK",
      location: { name: "서울" },
      current: { temperatureC: 25.4, precipitationMm: 0, weatherCode: 1, condition: "대체로 맑음" },
      source: { provider: "Open-Meteo" },
    });
    expect(body.fetchedAt).toEqual(expect.any(String));
  });

  it("검색 결과가 없으면 404 EMPTY를 반환한다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ results: [] }))));

    const response = await GET(new Request("http://localhost/api/weather?city=없는도시"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ status: "EMPTY", query: "없는도시" });
  });

  it("오늘 예보와 추가 현재 정보를 HTTP 응답에 포함한다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      current: { time: "2026-09-14T12:00", temperature_2m: 25.4, precipitation: 0, weather_code: 3, apparent_temperature: 28, relative_humidity_2m: 70, wind_speed_10m: 8 },
      daily: { time: ["2026-09-14"], temperature_2m_min: [22], temperature_2m_max: [29], precipitation_probability_max: [65] },
    })));
    const response = await GET(new Request("http://localhost/api/weather?city=인천"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      current: { feelsLikeC: 28, humidityPercent: 70, windSpeedKmh: 8 },
      today: { date: "2026-09-14", minC: 22, maxC: 29, precipitationProbability: 65 },
    });
  });
});
