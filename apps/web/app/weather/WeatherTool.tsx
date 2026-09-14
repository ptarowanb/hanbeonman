"use client";

import { FormEvent, useState } from "react";
import { WeatherResultCard, type WeatherApiResult } from "./WeatherResultCard";

type WeatherResponse =
  | WeatherApiResult
  | { status: "EMPTY"; query: string }
  | { status: "INVALID_INPUT" | "FAILED"; error?: { message: string } };

const QUICK_CITIES = ["서울", "부산", "대전", "제주", "인천"];

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
      {result && <WeatherResultCard result={result} />}
      <p className="weather-boundary">도시별 현재 날씨와 오늘 예보를 확인하세요. 예보는 시간이 지나면 달라질 수 있어요.</p>
    </section>
  );
}
