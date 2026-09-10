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
        <span className="status"><i aria-hidden="true" /> 버튼 제작</span>
      </header>
      <section className="create-intro" aria-labelledby="create-title">
        <p className="eyebrow">새로운 시작 방법</p>
        <h1 id="create-title">하고 싶은 일을<br /><em>그냥 말해주세요.</em></h1>
        <p>한번만이 할 수 있는 생활 작업으로 바꿔, 다음부터 누를 수 있는 버튼으로 남깁니다.</p>
      </section>
      <CreateButtonTool />
      <p className="create-back"><Link href="/">← 처음 화면으로</Link></p>
    </main>
  );
}
