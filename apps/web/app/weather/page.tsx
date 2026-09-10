import Link from "next/link";
import WeatherTool from "./WeatherTool";

export default function WeatherPage() {
  return (
    <main className="weather-page shell">
      <header className="site-header weather-header">
        <Link className="brand" href="/" aria-label="한번만 처음으로">
          <span className="brand-mark" aria-hidden="true">한</span>
          <span>한번만</span>
        </Link>
        <span className="status"><i aria-hidden="true" /> 생활 정보 조회</span>
      </header>
      <section className="weather-intro" aria-labelledby="weather-title">
        <p className="eyebrow">실생활 버튼</p>
        <h1 id="weather-title">외출 전 날씨를<br /><em>한 번에 확인하세요.</em></h1>
        <p>도시만 고르면 현재 기온과 강수량을 확인합니다. 별도 가입이나 API 키 없이 공개 날씨 데이터를 사용해요.</p>
      </section>
      <WeatherTool />
      <p className="weather-back"><Link href="/">← 처음 화면으로</Link></p>
    </main>
  );
}
