import { getWeather, WeatherUpstreamError } from "@hanbeonman/connectors";

export const runtime = "nodejs";

const MAX_REQUEST_MS = 8_000;

export async function GET(request: Request): Promise<Response> {
  const city = new URL(request.url).searchParams.get("city")?.trim() ?? "";
  if (!city) {
    return Response.json(
      { status: "INVALID_INPUT", error: { code: "INVALID_INPUT", message: "도시를 입력해주세요." } },
      { status: 400 },
    );
  }
  if (city.length > 40) {
    return Response.json(
      { status: "INVALID_INPUT", error: { code: "INVALID_INPUT", message: "도시는 40자 이내로 입력해주세요." } },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MAX_REQUEST_MS);
  try {
    const result = await getWeather(city, (input, init) => fetch(input, { ...init, signal: controller.signal }));
    if (result.status === "EMPTY") return Response.json(result, { status: 404 });
    return Response.json({
      ...result,
      fetchedAt: new Date().toISOString(),
      source: { provider: "Open-Meteo" },
    });
  } catch (error) {
    if (error instanceof WeatherUpstreamError) {
      return Response.json(
        { status: "FAILED", error: { code: error.code, message: "날씨를 조회하지 못했습니다. 같은 도시로 다시 시도해주세요." } },
        { status: 502 },
      );
    }
    return Response.json(
      { status: "FAILED", error: { code: "INTERNAL_ERROR", message: "날씨 조회 중 문제가 발생했습니다." } },
      { status: 500 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
