import Link from "next/link";
import PhotoTool from "./PhotoTool";

export default function PhotoPage() {
  return (
    <main className="photo-page shell">
      <header className="site-header photo-header">
        <Link className="brand" href="/" aria-label="한번만 처음으로">
          <span className="brand-mark" aria-hidden="true">한</span>
          <span>한번만</span>
        </Link>
        <span className="status"><i aria-hidden="true" /> 기기 안에서 처리</span>
      </header>
      <section className="photo-intro" aria-labelledby="photo-title">
        <p className="eyebrow">개발 중인 첫 번째 도구</p>
        <h1 id="photo-title">사진을 골라서,<br /><em>가볍게 보내세요.</em></h1>
        <p>사진은 서버로 올라가지 않아요. 이 브라우저에서 크기와 형식을 바꾼 뒤 ZIP 파일 하나로 내려받습니다.</p>
      </section>
      <PhotoTool />
      <p className="photo-back"><Link href="/">← 처음 화면으로</Link></p>
    </main>
  );
}
