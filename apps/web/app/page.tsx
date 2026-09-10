const Arrow = () => <span aria-hidden="true">↘</span>;

export default function Home() {
  return (
    <main>
      <header className="site-header shell">
        <a className="brand" href="#top" aria-label="한번만 처음으로">
          <span className="brand-mark" aria-hidden="true">한</span>
          <span>한번만</span>
        </a>
        <span className="status"><i aria-hidden="true" /> 개인용 작업 도구</span>
      </header>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">도움을, 다음에도 쓸 수 있게</p>
          <h1><span>한 번의 도움,</span><em>다음부터 스스로.</em></h1>
          <p className="lede">
            내가 한 번 보여준 일을 기억해 두었다가, 가족이 필요할 때 직접 누르는
            작은 버튼으로 만들어요.
          </p>
          <a className="jump-link" href="#how-it-works">
            어떻게 사용하는지 보기 <Arrow />
          </a>
        </div>

        <div className="hero-art" aria-label="도움이 개인용 버튼으로 바뀌는 화면 예시">
          <span className="mockup-label">사용 예시 · 버튼으로 바로 실행</span>
          <div className="note note-top">
            <span>한 번 도와주기</span>
            <strong>사진을 작게<br />줄여줄게</strong>
          </div>
          <div className="thread" aria-hidden="true"><span>1</span><span>2</span><span>3</span></div>
          <div className="button-card">
            <span className="mini-label">엄마의 버튼</span>
            <div className="sun" aria-hidden="true">✦</div>
            <strong>사진 줄여서<br />파일 만들기</strong>
            <span className="example-caption">필요한 사진을 고르는 화면이 이어져요</span>
          </div>
        </div>
      </section>

      <section className="promise-band" aria-label="서비스 원칙">
        <div className="shell promise-grid">
          <p><span>하나.</span> 매번 같은 설명은 줄이고</p>
          <p><span>둘.</span> 달라지는 것만 물어보고</p>
          <p><span>셋.</span> 결과를 직접 확인해요</p>
        </div>
      </section>

      <section className="workflow shell" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow">어떻게 사용하나요?</p>
          <h2>도와준 순간이<br />다음의 방법이 됩니다.</h2>
          <p>자주 하는 조건을 한 번 저장하면, 다음부터 필요한 입력만 바꿔 바로 실행할 수 있어요.</p>
        </div>

        <ol className="steps">
          <li>
            <span className="step-number">01</span>
            <div className="step-icon" aria-hidden="true">☝</div>
            <h3>한 번 보여주기</h3>
            <p>지원하는 웹페이지나 사진 도구에서 평소처럼 작업해요.</p>
          </li>
          <li>
            <span className="step-number">02</span>
            <div className="step-icon" aria-hidden="true">✎</div>
            <h3>만들고 검토하기</h3>
            <p>무엇을 기억하고 무엇을 물어볼지 제안받아 직접 확인해요.</p>
          </li>
          <li>
            <span className="step-number">03</span>
            <div className="step-icon" aria-hidden="true">↗</div>
            <h3>버튼 누르고 다시 쓰기</h3>
            <p>저장한 버튼을 누르면, 필요한 값만 넣어 같은 작업을 다시 할 수 있어요.</p>
          </li>
        </ol>
      </section>

      <section className="examples">
        <div className="shell examples-inner">
          <div className="section-heading compact">
            <p className="eyebrow">생활에서 바로 쓰는 세 가지</p>
            <h2>서로 다른 일도,<br />같은 마음으로.</h2>
          </div>
          <div className="example-list">
            <article className="example-card transit">
              <span className="example-type">공개 정보 조회</span>
              <div className="route" aria-hidden="true"><b>서울</b><i /><b>대전</b></div>
              <h3>딸네 집 가는<br />차편 찾기</h3>
              <p>정해 둔 노선과 시간대로 공개된 차편 정보를 찾아보는 예시예요. 실제 좌석 예약과는 구분됩니다.</p>
            <a className="example-action" href="/bus">고속버스 버튼 만들기 ↗</a>
            </article>
            <article className="example-card photo">
              <span className="example-type">기기 안에서 사진 처리</span>
              <div className="crop-mark" aria-hidden="true"><span>원본</span><b>작게</b></div>
              <h3>사진 줄여서<br />파일 만들기</h3>
              <p>정해 둔 크기와 형식으로 사진을 바꾸는 예시예요. 사진은 사용하는 사람의 브라우저에서 처리합니다.</p>
              <a className="example-action" href="/photo">사진 도구 열기 ↗</a>
            </article>
            <article className="example-card weather">
              <span className="example-type">공개 생활 정보 조회</span>
              <div className="weather-sun" aria-hidden="true">☼</div>
              <h3>외출 전<br />오늘 날씨 확인</h3>
              <p>도시를 한 번 고르면 현재 기온과 강수량을 바로 확인하는 생활 버튼이에요.</p>
              <a className="example-action" href="/weather">오늘 날씨 보기 ↗</a>
            </article>
          </div>
        </div>
      </section>

      <section className="ready shell" aria-labelledby="ready-title">
        <span className="ready-stamp" aria-hidden="true">한 번</span>
        <div>
          <p className="eyebrow">지금 바로 사용하세요</p>
          <h2 id="ready-title">반복해서 하던 일을<br />버튼 하나로 시작해요.</h2>
          <p>고속버스 조회 조건은 이름을 붙여 저장할 수 있습니다. 사진과 날씨 도구도 필요한 입력만 넣으면 바로 결과를 받을 수 있어요.</p>
          <div className="ready-actions">
            <a className="example-action" href="/bus">버스 버튼 만들기 ↗</a>
            <a className="example-action" href="/weather">날씨 확인하기 ↗</a>
          </div>
        </div>
      </section>

      <footer className="shell">
        <a className="brand" href="#top"><span className="brand-mark" aria-hidden="true">한</span><span>한번만</span></a>
        <p>도움을 받는 사람이 다음에는 스스로 할 수 있도록.</p>
      </footer>
    </main>
  );
}
