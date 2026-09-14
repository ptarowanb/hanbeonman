import Link from "next/link";
import CreateButtonTool from "./CreateButtonTool";

export default function CreateButtonPage() {
  return (
    <main className="create-page shell">
      <header className="site-header create-header">
        <Link className="brand" href="/" aria-label="한번만 처음으로">
          <span className="brand-mark" aria-hidden="true">한</span>
          <span>한번만</span>
        </Link>
        <nav className="header-nav" aria-label="주요 메뉴"><a href="#create-tool-title" aria-current="page">버튼 만들기</a><a href="#saved-buttons">내 보관함</a></nav>
      </header>
      <section className="create-intro" aria-labelledby="create-title">
        <p className="eyebrow">조금 더 간단한 일상</p>
        <h1 id="create-title">한 번 만들고,<br className="mobile-break" /> <em>가볍게 누르세요.</em></h1>
        <p>자주 하는 일에 나만의 버튼을 더하세요.</p>
      </section>
      <CreateButtonTool />
      <p className="create-back"><Link href="/">← 처음 화면으로</Link></p>
    </main>
  );
}
