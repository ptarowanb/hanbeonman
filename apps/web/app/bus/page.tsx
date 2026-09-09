import Link from "next/link";
import BusSearchForm from "./BusSearchForm";

export default function BusPage() {
  return (
    <main className="bus-page shell">
      <header className="site-header bus-header">
        <Link className="brand" href="/" aria-label="한번만 처음으로">
          <span className="brand-mark">한</span>
          <span>한번만</span>
        </Link>
        <span className="status"><i aria-hidden="true" /> 공개 정보 조회</span>
      </header>

      <section className="bus-intro" aria-labelledby="bus-title">
        <p className="eyebrow">TAGO 공개 정보 조회</p>
        <h1 id="bus-title">고속버스 시간표를<br /><em>한 번에 확인하세요.</em></h1>
        <p>출발지·도착지·날짜를 입력하면 공공데이터포털의 공개 시간표를 조회합니다. 이 도구는 예약이나 결제를 처리하지 않아요.</p>
      </section>

      <BusSearchForm />

      <p className="bus-back"><Link href="/">← 처음 화면으로</Link></p>
    </main>
  );
}
