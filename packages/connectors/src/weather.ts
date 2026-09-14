import { z } from "zod";

const GEOCODING_BASE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_BASE_URL = "https://api.open-meteo.com/v1/forecast";

export type WeatherLocation = {
  name: string;
  latitude: number;
  longitude: number;
};

const KNOWN_CITY_LOCATIONS: Record<string, WeatherLocation> = {
  서울: { name: "서울", latitude: 37.5665, longitude: 126.978 },
  서울특별시: { name: "서울", latitude: 37.5665, longitude: 126.978 },
  seoul: { name: "서울", latitude: 37.5665, longitude: 126.978 },
  부산: { name: "부산", latitude: 35.1796, longitude: 129.0756 },
  부산광역시: { name: "부산", latitude: 35.1796, longitude: 129.0756 },
  pusan: { name: "부산", latitude: 35.1796, longitude: 129.0756 },
  busan: { name: "부산", latitude: 35.1796, longitude: 129.0756 },
  대전: { name: "대전", latitude: 36.3504, longitude: 127.3845 },
  대전광역시: { name: "대전", latitude: 36.3504, longitude: 127.3845 },
  daejeon: { name: "대전", latitude: 36.3504, longitude: 127.3845 },
  제주: { name: "제주", latitude: 33.4996, longitude: 126.5312 },
  제주도: { name: "제주", latitude: 33.4996, longitude: 126.5312 },
  제주특별자치도: { name: "제주", latitude: 33.4996, longitude: 126.5312 },
  jeju: { name: "제주", latitude: 33.4996, longitude: 126.5312 },
  인천: { name: "인천", latitude: 37.4563, longitude: 126.7052 },
  인천광역시: { name: "인천", latitude: 37.4563, longitude: 126.7052 },
  incheon: { name: "인천", latitude: 37.4563, longitude: 126.7052 },
};

export type WeatherCurrent = {
  observedAt: string;
  temperatureC: number;
  precipitationMm: number;
  weatherCode: number;
  condition: string;
  feelsLikeC?: number;
  humidityPercent?: number;
  windSpeedKmh?: number;
};

export type WeatherToday = {
  date: string;
  minC?: number;
  maxC?: number;
  precipitationProbability?: number;
};

export type WeatherResult =
  | { status: "OK"; location: WeatherLocation; current: WeatherCurrent; today?: WeatherToday }
  | { status: "EMPTY"; query: string };

export class WeatherUpstreamError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "WeatherUpstreamError";
  }
}

export type WeatherFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const locationResponseSchema = z.object({
  results: z.array(z.object({
    name: z.string().min(1),
    latitude: z.number().finite(),
    longitude: z.number().finite(),
  })).optional(),
}).passthrough();

const forecastResponseSchema = z.object({
  current: z.object({
    time: z.string().min(1),
    temperature_2m: z.number().finite(),
    precipitation: z.number().finite().nonnegative(),
    weather_code: z.number().int().min(0).max(99),
    apparent_temperature: z.number().finite().optional().catch(undefined),
    relative_humidity_2m: z.number().finite().min(0).max(100).optional().catch(undefined),
    wind_speed_10m: z.number().finite().nonnegative().optional().catch(undefined),
  }),
}).passthrough();

export function buildWeatherGeocodingUrl(city: string): URL {
  const url = new URL(GEOCODING_BASE_URL);
  url.searchParams.set("name", city.trim());
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "ko");
  url.searchParams.set("format", "json");
  return url;
}

export function buildWeatherForecastUrl(location: Pick<WeatherLocation, "latitude" | "longitude">): URL {
  const url = new URL(FORECAST_BASE_URL);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("current", "temperature_2m,precipitation,weather_code,apparent_temperature,relative_humidity_2m,wind_speed_10m");
  url.searchParams.set("daily", "temperature_2m_min,temperature_2m_max,precipitation_probability_max");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("precipitation_unit", "mm");
  url.searchParams.set("timezone", "Asia/Seoul");
  return url;
}

export function getKnownWeatherLocation(city: string): WeatherLocation | null {
  const normalized = city.trim().replace(/\s+/g, "").toLocaleLowerCase("en-US");
  return KNOWN_CITY_LOCATIONS[normalized] ?? null;
}

export function getWeatherCondition(code: number): string {
  if (code === 0) return "맑음";
  if (code === 1) return "대체로 맑음";
  if (code === 2) return "구름 조금";
  if (code === 3) return "흐림";
  if (code === 45 || code === 48) return "안개";
  if ([51, 53, 55].includes(code)) return "이슬비";
  if (code === 56 || code === 57) return "어는 이슬비";
  if ([61, 63, 65].includes(code)) return "비";
  if (code === 66 || code === 67) return "어는 비";
  if ([71, 73, 75].includes(code)) return "눈";
  if (code === 77) return "싸락눈";
  if (code >= 80 && code <= 82) return "소나기";
  if (code === 85 || code === 86) return "눈 소나기";
  if (code === 95) return "뇌우";
  if (code === 96 || code === 99) return "우박을 동반한 뇌우";
  return "날씨 정보 없음";
}

export function parseWeatherLocationResponse(payload: unknown): WeatherLocation | null {
  const parsed = locationResponseSchema.safeParse(payload);
  if (!parsed.success) throw new WeatherUpstreamError("UPSTREAM_CONTRACT", "날씨 위치 응답 형식이 바뀌었습니다.");
  const location = parsed.data.results?.[0];
  return location
    ? { name: location.name, latitude: location.latitude, longitude: location.longitude }
    : null;
}

export function parseWeatherForecastResponse(payload: unknown): WeatherCurrent {
  const parsed = forecastResponseSchema.safeParse(payload);
  if (!parsed.success) throw new WeatherUpstreamError("UPSTREAM_CONTRACT", "날씨 응답 형식이 바뀌었습니다.");
  return {
    observedAt: parsed.data.current.time,
    temperatureC: parsed.data.current.temperature_2m,
    precipitationMm: parsed.data.current.precipitation,
    weatherCode: parsed.data.current.weather_code,
    condition: getWeatherCondition(parsed.data.current.weather_code),
    ...(parsed.data.current.apparent_temperature !== undefined ? { feelsLikeC: parsed.data.current.apparent_temperature } : {}),
    ...(parsed.data.current.relative_humidity_2m !== undefined ? { humidityPercent: parsed.data.current.relative_humidity_2m } : {}),
    ...(parsed.data.current.wind_speed_10m !== undefined ? { windSpeedKmh: parsed.data.current.wind_speed_10m } : {}),
  };
}

function parseWeatherToday(payload: unknown, observedAt: string): WeatherToday | undefined {
  const parsed = z.object({ daily: z.object({
    time: z.array(z.string()),
    temperature_2m_min: z.array(z.unknown()).optional().catch(undefined),
    temperature_2m_max: z.array(z.unknown()).optional().catch(undefined),
    precipitation_probability_max: z.array(z.unknown()).optional().catch(undefined),
  }) }).safeParse(payload);
  if (!parsed.success) return undefined;
  const date = observedAt.slice(0, 10);
  const daily = parsed.data.daily;
  const index = daily.time.indexOf(date);
  if (index < 0) return undefined;
  const min = z.number().finite().safeParse(daily.temperature_2m_min?.[index]);
  const max = z.number().finite().safeParse(daily.temperature_2m_max?.[index]);
  const probability = z.number().finite().min(0).max(100).safeParse(daily.precipitation_probability_max?.[index]);
  if (!min.success && !max.success && !probability.success) return undefined;
  return {
    date,
    ...(min.success ? { minC: min.data } : {}),
    ...(max.success ? { maxC: max.data } : {}),
    ...(probability.success ? { precipitationProbability: probability.data } : {}),
  };
}

async function fetchJson(fetchImpl: WeatherFetch, url: URL): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(url, { headers: { accept: "application/json" } });
  } catch {
    throw new WeatherUpstreamError("NETWORK_ERROR", "날씨 서비스에 연결하지 못했습니다.");
  }
  if (!response.ok) throw new WeatherUpstreamError(`HTTP_${response.status}`, "날씨 조회에 실패했습니다.");
  try {
    return await response.json();
  } catch {
    throw new WeatherUpstreamError("UPSTREAM_CONTRACT", "날씨 응답을 읽지 못했습니다.");
  }
}

export async function getWeather(city: string, fetchImpl: WeatherFetch = fetch): Promise<WeatherResult> {
  const query = city.trim();
  const location = getKnownWeatherLocation(query)
    ?? parseWeatherLocationResponse(await fetchJson(fetchImpl, buildWeatherGeocodingUrl(query)));
  if (!location) return { status: "EMPTY", query };
  const payload = await fetchJson(fetchImpl, buildWeatherForecastUrl(location));
  const current = parseWeatherForecastResponse(payload);
  const today = parseWeatherToday(payload, current.observedAt);
  return { status: "OK", location, current, ...(today ? { today } : {}) };
}
