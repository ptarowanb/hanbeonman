import type { WeatherCurrent, WeatherToday } from "@hanbeonman/connectors";
import styles from "./WeatherResultCard.module.css";

export type WeatherApiResult = {
  status: "OK";
  location: { name: string };
  current: WeatherCurrent;
  today?: WeatherToday;
  fetchedAt: string;
  source: { provider: string };
};

function formatKoreanTime(value: string): string {
  const withTimezone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value) ? `${value}+09:00` : value;
  const date = new Date(withTimezone);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function getOutingAdvice({ current, today }: WeatherApiResult): string[] {
  const advice: string[] = [];
  const snowy = [71, 73, 75, 77, 85, 86].includes(current.weatherCode);
  if (snowy) advice.push("눈이 내리는 날씨예요. 미끄럽지 않은 신발을 준비하세요.");
  else if (current.precipitationMm > 0 || [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(current.weatherCode)) {
    advice.push("비 소식이 있어요. 외출할 때 우산을 챙겨주세요.");
  } else if (today?.precipitationProbability !== undefined && today.precipitationProbability >= 50) {
    advice.push(`오늘 최대 강수확률이 ${Math.round(today.precipitationProbability)}%예요. 우산을 챙겨주세요.`);
  }
  if (today?.minC !== undefined && today.maxC !== undefined && today.maxC - today.minC >= 8) {
    advice.push("오늘은 기온 차이가 커요. 벗고 입기 편한 겉옷을 준비하세요.");
  }
  if (current.windSpeedKmh !== undefined && current.windSpeedKmh >= 25) {
    advice.push(`현재 바람이 ${current.windSpeedKmh.toFixed(1)} km/h로 불어요. 바람을 막을 겉옷을 준비하세요.`);
  }
  if (advice.length === 0) advice.push("기온에 맞게 옷을 준비하고, 외출 직전에 날씨를 다시 확인하세요.");
  return advice;
}

export function WeatherResultCard({ result }: { result: WeatherApiResult }) {
  const { current, today } = result;
  const symbol = [71, 73, 75, 77, 85, 86].includes(current.weatherCode) ? "❄"
    : [95, 96, 99].includes(current.weatherCode) ? "ϟ"
      : current.precipitationMm > 0 ? "☂" : current.weatherCode <= 1 ? "☀" : "☁";

  return (
    <article className={styles.card} aria-label={`${result.location.name} 현재 날씨`} aria-live="polite">
      <div className={styles.header}>
        <div>
          <p className={styles.location}>{result.location.name} 현재 날씨</p>
          <strong className={styles.temperature}>{current.temperatureC.toFixed(1)}°C</strong>
          <p className={styles.condition}>{current.condition}</p>
        </div>
        <span className={styles.symbol} aria-hidden="true">{symbol}</span>
      </div>
      <dl className={styles.metrics}>
        {current.feelsLikeC !== undefined && <div><dt>체감온도</dt><dd>{current.feelsLikeC.toFixed(1)}°C</dd></div>}
        {current.humidityPercent !== undefined && <div><dt>습도</dt><dd>{Math.round(current.humidityPercent)}%</dd></div>}
        {current.windSpeedKmh !== undefined && <div><dt>바람</dt><dd>{current.windSpeedKmh.toFixed(1)} km/h</dd></div>}
        <div><dt>현재 강수량</dt><dd>{current.precipitationMm.toFixed(1)}mm</dd></div>
      </dl>
      <div className={styles.today}>
        <h3>오늘 예보{today && <span>{today.date.slice(5).replace("-", "/")}</span>}</h3>
        {today ? <dl className={styles.metrics}>
          {today.minC !== undefined && <div><dt>최저 기온</dt><dd>{today.minC.toFixed(1)}°C</dd></div>}
          {today.maxC !== undefined && <div><dt>최고 기온</dt><dd>{today.maxC.toFixed(1)}°C</dd></div>}
          {today.precipitationProbability !== undefined && <div><dt>최대 강수확률</dt><dd>{Math.round(today.precipitationProbability)}%</dd></div>}
        </dl> : <p className={styles.unavailable}>오늘 예보를 받아오지 못했습니다.</p>}
      </div>
      <div className={styles.advice}>
        <h3>외출 준비</h3>
        {getOutingAdvice(result).map((tip) => <p key={tip}>{tip}</p>)}
      </div>
      <div className={styles.source}>
        <p>날씨 기준 {formatKoreanTime(current.observedAt)} · 한국시간</p>
        <p><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">{result.source.provider}</a> 예보 모델 기반 · {formatKoreanTime(result.fetchedAt)} 조회</p>
      </div>
    </article>
  );
}
