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
        <span className="status"><i aria-hidden="true" /> 나의 생활 버튼</span>
      </header>
      <section className="create-intro" aria-labelledby="create-title">
        <p className="eyebrow">오늘도, 버튼 하나로</p>
        <h1 id="create-title">자주 하는 일을<br /><em>나만의 버튼으로.</em></h1>
        <p>11가지 생활 작업을 내 조건으로 저장하고, 다음에는 필요한 정보만 바꿔 실행하세요.</p>
      </section>
      <CreateButtonTool />
      <p className="create-back"><Link href="/">← 처음 화면으로</Link></p>
    </main>
  );
}
