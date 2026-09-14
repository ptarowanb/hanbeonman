import "./home.css";

function HomeIcon({ kind }: { kind: "weather" | "bus" | "photo" | "checklist" | "timer" }) {
  const paths = {
    weather: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
    bus: <><rect x="5" y="3" width="14" height="16" rx="3" /><path d="M5 11h14M8 19v2m8-2v2M9 6h6M8 15h1m6 0h1" /></>,
    photo: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 6-6 4 4 3-3 5 5" /></>,
    checklist: <><rect x="4" y="3" width="16" height="18" rx="3" /><path d="m8 9 1 1 2-2m2 1h3m-8 6 1 1 2-2m2 1h3" /></>,
    timer: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6m-3 0v3m6 1 1-1" /></>,
  };
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}

function Arrow() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
}

export default function Home() {
  return (
    <main className="home-page" id="top">
      <header className="site-header shell home-header">
        <a className="brand" href="#top" aria-label="한번만 처음으로"><span className="brand-mark" aria-hidden="true">한</span><span>한번만</span></a>
        <nav aria-label="주요 메뉴" className="home-nav"><a href="/create#action-templates">생활 도구</a><a href="/create#saved-buttons" className="home-nav-library">내 버튼 <Arrow /></a></nav>
      </header>
      <section className="home-hero shell">
        <div className="home-hero-copy">
          <p className="home-eyebrow">매일의 일을 더 간단하게</p>
          <h1>한 번 만들어두면,<br /><span>다음엔 버튼 하나.</span></h1>
          <p className="home-lede">날씨부터 여행 준비, 생활 계산까지.<br />자주 하는 일을 나만의 버튼으로 모아보세요.</p>
          <div className="home-hero-actions"><a className="home-primary-link" href="/create">말로 버튼 만들기 <Arrow /></a><a className="home-secondary-link" href="#how-it-works">어떻게 사용하는지 보기 <span aria-hidden="true">↓</span></a></div>
          <p className="home-start-note">가입 없이 시작하고, 이 브라우저에 저장해요.</p>
        </div>
        <div className="home-preview" aria-label="요청을 나만의 버튼으로 만드는 사용 예시">
          <div className="home-preview-heading"><span>나의 작은 도구함</span><span className="home-preview-label">사용 예시</span></div>
          <div className="home-preview-request"><span className="home-preview-request-label">이렇게 말해보세요</span><p>인천 날씨 버튼 만들어줘</p><span className="home-preview-request-arrow" aria-hidden="true"><Arrow /></span></div>
          <div className="home-preview-divider"><span />내게 필요한 버튼으로<span /></div>
          <div className="home-preview-row"><span className="home-tool-icon"><HomeIcon kind="weather" /></span><div><strong>인천 날씨</strong><p>외출하기 전에 가볍게 확인</p></div><Arrow /></div>
          <div className="home-preview-row"><span className="home-tool-icon"><HomeIcon kind="checklist" /></span><div><strong>여행 준비물</strong><p>챙긴 것은 하나씩 체크</p></div><Arrow /></div>
          <div className="home-preview-row"><span className="home-tool-icon"><HomeIcon kind="timer" /></span><div><strong>25분 집중하기</strong><p>내 리듬에 맞춘 타이머</p></div><Arrow /></div>
          <p className="home-preview-note">매번 설명하지 않아도, 저장한 조건 그대로.</p>
        </div>
      </section>
      <section className="home-principles shell" aria-label="서비스 원칙"><div className="promise-grid"><p><span>01</span> 자주 쓰는 조건을 기억해요</p><p><span>02</span> 필요한 것만 다시 물어요</p><p><span>03</span> 내 버튼으로 모아두세요</p></div></section>
      <section className="home-tools shell" aria-labelledby="home-tools-title">
        <div className="home-section-heading"><div><p className="home-eyebrow">일상에 바로 쓰는 도구</p><h2 id="home-tools-title">작은 일부터, 하나씩.</h2></div><a className="home-text-link" href="/create#action-templates">11가지 도구 모두 보기 <Arrow /></a></div>
        <div className="home-tool-grid">
          <article className="home-tool-card"><span className="home-tool-icon"><HomeIcon kind="weather" /></span><h3>외출 전, 오늘 날씨</h3><p>자주 확인하는 도시를 저장하고,<br />현재 날씨와 오늘 예보를 확인해요.</p><a href="/weather">오늘 날씨 보기 <Arrow /></a></article>
          <article className="home-tool-card"><span className="home-tool-icon"><HomeIcon kind="bus" /></span><h3>늘 가는 길의 시간표</h3><p>출발지와 도착지를 정해두고,<br />고속버스 운행 시간을 찾아봐요.</p><a href="/bus">고속버스 버튼 만들기 <Arrow /></a></article>
          <article className="home-tool-card"><span className="home-tool-icon"><HomeIcon kind="photo" /></span><h3>사진을 원하는 크기로</h3><p>보내기 무거운 사진을 줄여요.<br />사진은 내 기기 안에서 처리돼요.</p><a href="/photo">사진 도구 열기 <Arrow /></a></article>
        </div>
        <p className="home-more-tools">체크리스트 · 타이머 · 디데이 · 더치페이 · 단위 변환 · 글 정리 · 무작위 선택 · 횟수 세기</p>
      </section>
      <section className="home-how shell" id="how-it-works" aria-labelledby="home-how-title">
        <div className="home-section-heading"><div><p className="home-eyebrow">복잡한 설정 없이</p><h2 id="home-how-title">말하고, 저장하고, 누르세요.</h2></div></div>
        <ol className="home-steps"><li><span>01</span><h3>원하는 일을 말해요</h3><p>“날씨”처럼 짧게 입력해도 괜찮아요. 부족한 정보는 이어서 물어볼게요.</p></li><li><span>02</span><h3>내 조건으로 저장해요</h3><p>버튼 이름과 조건을 확인해요. 실행할 때마다 바꿀 정보도 정할 수 있어요.</p></li><li><span>03</span><h3>필요할 때 눌러요</h3><p>내 버튼을 열고 바로 시작해요. 같은 일을 다시 설명할 필요가 없어요.</p></li></ol>
      </section>
      <section className="home-bottom shell" aria-labelledby="home-bottom-title"><div><h2 id="home-bottom-title">매일의 번거로움을, 한 번만.</h2><p>지금 필요한 버튼 하나부터 만들어보세요.</p></div><a className="home-primary-link" href="/create">내 첫 버튼 만들기 <Arrow /></a></section>
      <footer className="home-footer shell"><a className="brand" href="#top"><span className="brand-mark" aria-hidden="true">한</span><span>한번만</span></a><p>자주 하는 일을, 더 간단하게.</p><a href="/create">내 도구함 열기 <Arrow /></a></footer>
    </main>
  );
}
