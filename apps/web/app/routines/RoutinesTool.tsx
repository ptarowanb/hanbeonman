"use client";

import { useEffect, useState, type FormEvent } from "react";
import { parseButtonIntent } from "@hanbeonman/contracts";
import RoutineRunner, { type RoutineActionKind } from "./RoutineRunner";
import styles from "./routines.module.css";

export default function RoutinesTool() {
  const [actionKind, setActionKind] = useState<RoutineActionKind>("checklist");
  const [items, setItems] = useState("지갑\n휴대폰\n열쇠");
  const [minutes, setMinutes] = useState("25");
  const [active, setActive] = useState<{ actionKind: RoutineActionKind; fixedInputs: Record<string, string | number | boolean> } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("hanbeonman:routines:active");
      if (!raw || raw.length > 2_000) return;
      const parsed = parseButtonIntent(JSON.parse(raw));
      if (!parsed.success || parsed.data.intent !== "create_button" || (parsed.data.actionKind !== "checklist" && parsed.data.actionKind !== "timer") || parsed.data.requiredInputs.length) return;
      const { actionKind: savedKind, fixedInputs } = parsed.data;
      setActionKind(savedKind);
      if (savedKind === "checklist") setItems(String(fixedInputs.items));
      else setMinutes(String(fixedInputs.minutes));
      setActive({ actionKind: savedKind, fixedInputs });
    } catch { /* The tool remains usable when storage is unavailable. */ }
  }, []);
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fixedInputs: Record<string, string | number | boolean> = actionKind === "checklist" ? { items: items.trim() } : { minutes: Number(minutes) };
    const parsed = parseButtonIntent({ schemaVersion: "1.0", intent: "create_button", actionKind, title: "생활 도구", summary: "생활 도구를 실행합니다.", fixedInputs, requiredInputs: [], clarifyingQuestion: null });
    if (!parsed.success) { setError(actionKind === "timer" ? "시간은 1~180분 사이의 정수로 입력해주세요." : "항목은 빈 줄 없이 1~20개, 전체 200자 이내로 입력해주세요."); return; }
    setError("");
    setActive({ actionKind, fixedInputs });
    try { localStorage.setItem("hanbeonman:routines:active", JSON.stringify(parsed.data)); }
    catch { setError("도구 설정을 저장하지 못했어요. 이 화면에서는 계속 사용할 수 있어요."); }
  }
  return <section className={styles.tool} aria-label="생활 도구">
    <div className={styles.choices}>
      <button type="button" className={actionKind === "checklist" ? styles.primary : styles.secondary} aria-pressed={actionKind === "checklist"} onClick={() => { setActionKind("checklist"); setError(""); }}>체크리스트</button>
      <button type="button" className={actionKind === "timer" ? styles.primary : styles.secondary} aria-pressed={actionKind === "timer"} onClick={() => { setActionKind("timer"); setError(""); }}>타이머</button>
    </div>
    <form onSubmit={prepare}>
      {actionKind === "checklist"
        ? <label className={styles.field}>체크할 항목<textarea value={items} maxLength={200} onChange={(event) => setItems(event.target.value)} placeholder="한 줄에 하나씩 적어주세요" required /></label>
        : <label className={styles.field}>시간(분)<input type="number" min={1} max={180} step={1} value={minutes} onChange={(event) => setMinutes(event.target.value)} required /></label>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button type="submit" className={styles.primary}>도구 열기</button>
    </form>
    {active && <RoutineRunner key={`${active.actionKind}:${JSON.stringify(active.fixedInputs)}`} {...active} storageKey="standalone" />}
  </section>;
}
