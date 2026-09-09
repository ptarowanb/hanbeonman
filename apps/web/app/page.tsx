const Arrow = () => <span aria-hidden="true">↘</span>;

export default function Home() {
  return (
    <main>
      <header className="site-header shell">
        <a className="brand" href="#top" aria-label="한번만 처음으로">
          <span className="brand-mark" aria-hidden="true">한</span>
          <span>한번만</span>
        </a>
        <span className="status"><i aria-hidden="true" /> 지금은 개발 중</span>
      </header>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">도움을, 다음에도 쓸 수 있게</p>
          <h1><span>한 번의 도움,</span><em>다음부터 스스로.</em></h1>
          <p className="lede">
            내가 한 번 보여준 일을 기억해 두었다가, 가족이 필요할 때 직접 누르는
            작은 버튼으로 만드는 서비스를 준비하고 있어요.
          </p>
          <a className="jump-link" href="#how-it-works">
            어떻게 사용하는지 보기 <Arrow />
          </a>
        </div>

        <div className="hero-art" aria-label="도움이 개인용 버튼으로 바뀌는 화면 예시">
          <span className="mockup-label">화면 예시 · 아직 작동하지 않아요</span>
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
          <p>만드는 사람이 먼저 확인한 뒤, 받는 사람에게 개인 버튼을 전달하는 흐름을 만들고 있습니다.</p>
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
            <h3>전달하고 다시 쓰기</h3>
            <p>개인 버튼 링크를 전하면, 필요한 값만 넣어 다시 사용할 수 있어요.</p>
          </li>
        </ol>
      </section>

      <section className="examples">
        <div className="shell examples-inner">
          <div className="section-heading compact">
            <p className="eyebrow">먼저 준비하는 두 가지</p>
            <h2>서로 다른 일도,<br />같은 마음으로.</h2>
          </div>
          <div className="example-list">
            <article className="example-card transit">
              <span className="example-type">공개 정보 조회</span>
              <div className="route" aria-hidden="true"><b>서울</b><i /><b>대전</b></div>
              <h3>딸네 집 가는<br />차편 찾기</h3>
              <p>정해 둔 노선과 시간대로 공개된 차편 정보를 찾아보는 예시예요. 실제 좌석 예약과는 구분됩니다.</p>
            </article>
            <article className="example-card photo">
              <span className="example-type">기기 안에서 사진 처리</span>
              <div className="crop-mark" aria-hidden="true"><span>원본</span><b>작게</b></div>
              <h3>사진 줄여서<br />파일 만들기</h3>
              <p>정해 둔 크기와 형식으로 사진을 바꾸는 예시예요. 사진은 사용하는 사람의 브라우저에서 처리합니다.</p>
              <a className="example-action" href="/photo">사진 처리 도구 열기 ↗</a>
            </article>
          </div>
        </div>
      </section>

      <section className="coming shell" aria-labelledby="coming-title">
        <span className="coming-stamp" aria-hidden="true">준비 중</span>
        <div>
          <p className="eyebrow">아직 만드는 중이에요</p>
          <h2 id="coming-title">실제로 다시 쓸 수 있을 때까지<br />차근차근 확인하고 있습니다.</h2>
          <p>현재는 시작 화면과 개발 기반을 준비한 단계입니다. 버튼 생성, 로그인, 공유와 실제 작업 실행 기능은 아직 제공하지 않습니다.</p>
        </div>
      </section>

      <footer className="shell">
        <a className="brand" href="#top"><span className="brand-mark" aria-hidden="true">한</span><span>한번만</span></a>
        <p>도움을 받는 사람이 다음에는 스스로 할 수 있도록.</p>
      </footer>
    </main>
  );
}
