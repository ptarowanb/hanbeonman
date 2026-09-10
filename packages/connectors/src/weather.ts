import { z } from "zod";

const GEOCODING_BASE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_BASE_URL = "https://api.open-meteo.com/v1/forecast";

export type WeatherLocation = {
  name: string;
  latitude: number;
  longitude: number;
};

export type WeatherCurrent = {
  observedAt: string;
  temperatureC: number;
  precipitationMm: number;
  weatherCode: number;
};

export type WeatherResult =
  | { status: "OK"; location: WeatherLocation; current: WeatherCurrent }
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
  url.searchParams.set("current", "temperature_2m,precipitation,weather_code");
  url.searchParams.set("timezone", "Asia/Seoul");
  return url;
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
  const location = parseWeatherLocationResponse(await fetchJson(fetchImpl, buildWeatherGeocodingUrl(query)));
  if (!location) return { status: "EMPTY", query };
  const current = parseWeatherForecastResponse(await fetchJson(fetchImpl, buildWeatherForecastUrl(location)));
  return { status: "OK", location, current };
}
