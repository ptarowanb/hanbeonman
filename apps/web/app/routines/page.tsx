import Link from "next/link";
import RoutinesTool from "./RoutinesTool";
import styles from "./routines.module.css";

export default function RoutinesPage() {
  return <main className={`shell ${styles.page}`}>
    <header className="site-header"><Link className="brand" href="/" aria-label="한번만 처음으로"><span className="brand-mark" aria-hidden="true">한</span><span>한번만</span></Link><Link href="/create">내 버튼</Link></header>
    <section className={styles.intro}><p className="eyebrow">매일 반복하는 일</p><h1>챙길 것과 집중할 시간,<br />한곳에서 시작하세요.</h1><p>외출 준비, 장보기, 25분 집중까지. 항목과 시간을 정하면 바로 사용할 수 있어요.</p></section>
    <RoutinesTool />
    <p><Link href="/create">반복해서 쓸 내 버튼 만들기 →</Link></p>
  </main>;
}
