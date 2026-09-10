"use client";

import { FormEvent, useState } from "react";

type WeatherCurrent = {
  observedAt: string;
  temperatureC: number;
  precipitationMm: number;
  weatherCode: number;
  condition: string;
};

type WeatherResponse =
  | { status: "OK"; location: { name: string }; current: WeatherCurrent; fetchedAt: string; source: { provider: string } }
  | { status: "EMPTY"; query: string }
  | { status: "INVALID_INPUT" | "FAILED"; error?: { message: string } };

const QUICK_CITIES = ["서울", "부산", "대전", "제주", "인천"];

function formatObservedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
}

export default function WeatherTool() {
  const [city, setCity] = useState("");
  const [result, setResult] = useState<Extract<WeatherResponse, { status: "OK" }> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function checkWeather(nextCity: string) {
    const query = nextCity.trim();
    if (!query) {
      setNotice("도시를 입력해주세요.");
      setResult(null);
      return;
    }
    setCity(query);
    setNotice(null);
    setResult(null);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/weather?city=${encodeURIComponent(query)}`, { headers: { accept: "application/json" } });
      const payload = (await response.json()) as WeatherResponse;
      if (!response.ok || payload.status !== "OK") {
        const message = payload.status === "EMPTY"
          ? `“${query}”에 해당하는 도시를 찾지 못했습니다.`
          : "error" in payload ? payload.error?.message ?? "날씨를 조회하지 못했습니다." : "날씨를 조회하지 못했습니다.";
        setNotice(message);
        return;
      }
      setResult(payload);
      setNotice(`${payload.location.name} 현재 날씨를 확인했습니다.`);
    } catch {
      setNotice("조회 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void checkWeather(city);
  }

  return (
    <section className="weather-tool" aria-labelledby="weather-tool-title">
      <div className="weather-tool-heading">
        <p className="eyebrow">한 번 누르는 생활 버튼</p>
        <h2 id="weather-tool-title">오늘 외출 준비,<br /><em>날씨부터 볼까요?</em></h2>
      </div>
      <form className="weather-form" onSubmit={handleSubmit}>
        <label htmlFor="weather-city">도시</label>
        <div className="weather-form-row">
          <input id="weather-city" value={city} onChange={(event) => setCity(event.target.value)} placeholder="예: 서울, 부산, 인천" autoComplete="address-level2" />
          <button className="weather-submit" type="submit" disabled={isLoading}>{isLoading ? "확인 중…" : "날씨 확인"}</button>
        </div>
      </form>
      <div className="weather-quick-list" aria-label="자주 보는 도시">
        <span>빠른 선택</span>
        {QUICK_CITIES.map((quickCity) => (
          <button key={quickCity} type="button" onClick={() => void checkWeather(quickCity)} disabled={isLoading}>{quickCity}</button>
        ))}
      </div>
      {notice && <p className="weather-notice" role="status">{notice}</p>}
      {result && (
        <article className="weather-result" aria-live="polite">
          <div className="weather-result-main">
            <div>
              <p className="weather-result-location">{result.location.name} 현재 날씨</p>
              <strong>{result.current.temperatureC.toFixed(1)}°C</strong>
            </div>
            <span className="weather-result-label">{result.current.condition}</span>
          </div>
          <dl className="weather-result-details">
            <div><dt>강수량</dt><dd>{result.current.precipitationMm.toFixed(1)}mm</dd></div>
            <div><dt>관측 시각</dt><dd>{formatObservedAt(result.current.observedAt)}</dd></div>
          </dl>
          <p className="weather-source">{result.source.provider} 공개 데이터 · {formatObservedAt(result.fetchedAt)} 조회</p>
        </article>
      )}
      <p className="weather-boundary">예약이나 알림을 대신하지 않으며, 현재 공개 날씨 정보만 보여줍니다.</p>
    </section>
  );
}
