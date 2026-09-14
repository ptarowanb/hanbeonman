import { describe, expect, it } from "vitest";
import {
  buildWeatherForecastUrl,
  buildWeatherGeocodingUrl,
  getWeather,
  getKnownWeatherLocation,
  getWeatherCondition,
  parseWeatherForecastResponse,
  parseWeatherLocationResponse,
} from "./weather.js";

describe("Open-Meteo 날씨 커넥터", () => {
  it("도시 검색 URL에 한국어 검색 조건을 넣는다", () => {
    const url = buildWeatherGeocodingUrl("서울");

    expect(url.hostname).toBe("geocoding-api.open-meteo.com");
    expect(url.pathname).toBe("/v1/search");
    expect(url.searchParams.get("name")).toBe("서울");
    expect(url.searchParams.get("count")).toBe("1");
    expect(url.searchParams.get("language")).toBe("ko");
    expect(url.searchParams.get("format")).toBe("json");
  });

  it("좌표와 현재 날씨 조건으로 예보 URL을 만든다", () => {
    const url = buildWeatherForecastUrl({ latitude: 37.5665, longitude: 126.978 });

    expect(url.hostname).toBe("api.open-meteo.com");
    expect(url.pathname).toBe("/v1/forecast");
    expect(url.searchParams.get("latitude")).toBe("37.5665");
    expect(url.searchParams.get("longitude")).toBe("126.978");
    expect(url.searchParams.get("current")?.split(",")).toEqual(expect.arrayContaining(["temperature_2m", "precipitation", "weather_code", "apparent_temperature", "relative_humidity_2m", "wind_speed_10m"]));
    expect(url.searchParams.get("daily")).toBe("temperature_2m_min,temperature_2m_max,precipitation_probability_max");
    expect(url.searchParams.get("forecast_days")).toBe("1");
    expect(url.searchParams.get("wind_speed_unit")).toBe("kmh");
    expect(url.searchParams.get("timezone")).toBe("Asia/Seoul");
  });

  it("위치와 현재 날씨 응답을 앱 계약으로 정규화한다", () => {
    expect(parseWeatherLocationResponse({
      results: [{ name: "서울", latitude: 37.5665, longitude: 126.978, country_code: "KR" }],
    })).toEqual({ name: "서울", latitude: 37.5665, longitude: 126.978 });

    expect(parseWeatherForecastResponse({
      current: { time: "2026-09-10T12:00", temperature_2m: 25.4, precipitation: 0.2, weather_code: 2 },
    })).toEqual({ observedAt: "2026-09-10T12:00", temperatureC: 25.4, precipitationMm: 0.2, weatherCode: 2, condition: "구름 조금" });
  });

  it("도시 검색부터 현재 날씨까지 한 번에 조회한다", async () => {
    const requested: string[] = [];
    const result = await getWeather("세종", async (input) => {
      requested.push(new URL(String(input)).hostname);
      if (requested.length === 1) {
        return new Response(JSON.stringify({
          results: [{ name: "세종", latitude: 36.48, longitude: 127.289 }],
        }));
      }
      return new Response(JSON.stringify({
        current: { time: "2026-09-10T12:00", temperature_2m: 25.4, precipitation: 0, weather_code: 1 },
      }));
    });

    expect(result).toEqual({
      status: "OK",
      location: { name: "세종", latitude: 36.48, longitude: 127.289 },
      current: { observedAt: "2026-09-10T12:00", temperatureC: 25.4, precipitationMm: 0, weatherCode: 1, condition: "대체로 맑음" },
    });
    expect(requested).toEqual(["geocoding-api.open-meteo.com", "api.open-meteo.com"]);
  });

  it.each([
    ["서울", "서울", 37.5665, 126.978],
    ["부산", "부산", 35.1796, 129.0756],
    ["대전", "대전", 36.3504, 127.3845],
    ["제주", "제주", 33.4996, 126.5312],
    ["인천", "인천", 37.4563, 126.7052],
  ])("한국 주요 도시 %s는 한글 표준 위치를 사용한다", async (query, name, latitude, longitude) => {
    const requested: string[] = [];
    const result = await getWeather(query, async (input) => {
      requested.push(new URL(String(input)).hostname);
      return new Response(JSON.stringify({
        current: { time: "2026-09-10T12:00", temperature_2m: 27.1, precipitation: 0, weather_code: 0 },
      }));
    });

    expect(result).toMatchObject({
      status: "OK",
      location: { name, latitude, longitude },
    });
    expect(requested).toEqual(["api.open-meteo.com"]);
  });

  it("영문으로 반환되는 부산 별칭도 부산으로 표준화한다", () => {
    expect(getKnownWeatherLocation("Pusan")).toEqual({ name: "부산", latitude: 35.1796, longitude: 129.0756 });
  });

  it("체감온도·습도·바람과 같은 날짜의 일일 예보를 전달한다", async () => {
    const result = await getWeather("인천", async () => Response.json({
      current: { time: "2026-09-14T12:00", temperature_2m: 24, precipitation: 0, weather_code: 3, apparent_temperature: 25.6, relative_humidity_2m: 81, wind_speed_10m: 14.2 },
      daily: { time: ["2026-09-13", "2026-09-14"], temperature_2m_min: [8, 20.2], temperature_2m_max: [10, 28.1], precipitation_probability_max: [0, 75] },
    }));
    expect(result).toMatchObject({
      current: { feelsLikeC: 25.6, humidityPercent: 81, windSpeedKmh: 14.2 },
      today: { date: "2026-09-14", minC: 20.2, maxC: 28.1, precipitationProbability: 75 },
    });
  });

  it("누락·null·잘못된 추가 관측값을 0으로 만들지 않고 기존 현재 날씨를 유지한다", async () => {
    const result = await getWeather("서울", async () => Response.json({
      current: { time: "2026-09-14T12:00", temperature_2m: 24, precipitation: 0, weather_code: 3, apparent_temperature: null, relative_humidity_2m: 101, wind_speed_10m: null },
      daily: { time: ["2026-09-14"], temperature_2m_min: [null], temperature_2m_max: [27], precipitation_probability_max: [null] },
    }));
    expect(result).toEqual({
      status: "OK", location: { name: "서울", latitude: 37.5665, longitude: 126.978 },
      current: { observedAt: "2026-09-14T12:00", temperatureC: 24, precipitationMm: 0, weatherCode: 3, condition: "흐림" },
      today: { date: "2026-09-14", maxC: 27 },
    });
  });

  it("다른 날짜의 예보를 오늘 정보로 표시하지 않는다", async () => {
    const result = await getWeather("서울", async () => Response.json({
      current: { time: "2026-09-14T12:00", temperature_2m: 24, precipitation: 0, weather_code: 3 },
      daily: { time: ["2026-09-15"], temperature_2m_min: [18], temperature_2m_max: [30], precipitation_probability_max: [50] },
    }));
    expect(result).not.toHaveProperty("today");
  });

  it.each([[56, "어는 이슬비"], [66, "어는 비"], [77, "싸락눈"], [96, "우박을 동반한 뇌우"], [97, "날씨 정보 없음"]])("WMO 코드 %i를 정의된 상태로 해석한다", (code, condition) => {
    expect(getWeatherCondition(code as number)).toBe(condition);
  });

  it("검색 결과가 없으면 EMPTY를 반환한다", async () => {
    await expect(getWeather("없는도시", async () => new Response(JSON.stringify({ results: [] })))).resolves.toEqual({
      status: "EMPTY",
      query: "없는도시",
    });
  });
});
