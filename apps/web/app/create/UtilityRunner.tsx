"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cleanText, convertUnit, countDateDays, parseChoices, splitBill } from "./utilityActions";
import styles from "./UtilityRunner.module.css";

type UtilityKind = "dday" | "split_bill" | "unit_convert" | "text_cleanup" | "random_pick" | "counter";
type UtilityRunnerProps = {
  actionKind: UtilityKind;
  fixedInputs: Record<string, string | number | boolean>;
  storageKey: string;
};
const UNIT_LABELS: Record<string, string> = { mm: "mm", cm: "cm", m: "m", km: "km", g: "g", kg: "kg", celsius: "°C", fahrenheit: "°F" };
const formatNumber = (value: number) => new Intl.NumberFormat("ko-KR", { maximumSignificantDigits: 12 }).format(value);
const formatWon = (value: number) => `${value.toLocaleString("ko-KR")}원`;

function DateCountdown({ date, event }: { date: string; event: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 30_000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, []);
  const days = countDateDays(date, now);
  return <section className={styles.card} aria-label="디데이 결과">
    <p className={styles.eyebrow}>{event || "기다리는 날"}</p>
    <output className={styles.hero} aria-label="남은 날짜">{days === 0 ? "D-DAY" : days > 0 ? `D-${days}` : `D+${Math.abs(days)}`}</output>
    <p>{days === 0 ? "바로 오늘이에요." : days > 0 ? `${days.toLocaleString("ko-KR")}일 남았어요.` : `${Math.abs(days).toLocaleString("ko-KR")}일 지났어요.`}</p>
    <p className={styles.hint}>{date} · 한국 날짜 기준</p>
  </section>;
}

function TextCleaner({ initialText, mode }: { initialText: string; mode: string }) {
  const fieldId = useId();
  const [input, setInput] = useState(initialText);
  const [output, setOutput] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const outputRef = useRef<HTMLTextAreaElement>(null);
  function tidy() {
    if (!input.trim()) { setNotice("정리할 글을 입력해주세요."); return; }
    try { setOutput(cleanText(input, mode)); setNotice("글을 정리했습니다."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "글을 정리하지 못했습니다."); }
  }
  async function copy() {
    if (output === null) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(output);
      setNotice("정리된 글을 복사했습니다.");
    } catch {
      outputRef.current?.focus();
      outputRef.current?.select();
      setNotice("자동 복사가 차단되어 결과를 선택했습니다. 직접 복사해주세요.");
    }
  }
  return <section className={styles.card} aria-label="글 정리 도구">
    <h3>글 정리</h3>
    <p className={styles.hint}>{mode === "deduplicate" ? "중복된 줄, 빈 줄과 불필요한 공백을 정리해요." : "빈 줄과 불필요한 공백을 정리해요."} 글은 이 기기에서 처리합니다.</p>
    <label className={styles.label} htmlFor={`${fieldId}-input`}>정리할 글</label>
    <textarea className={styles.textarea} id={`${fieldId}-input`} value={input} maxLength={20_000} onChange={event => { setInput(event.target.value); setNotice(""); setOutput(null); }} />
    <p className={styles.hint}>{input.length.toLocaleString("ko-KR")} / 20,000자</p>
    <button type="button" className={styles.primary} onClick={tidy}>글 정리하기</button>
    {output !== null && <div className={styles.result}>
      <label className={styles.label} htmlFor={`${fieldId}-output`}>정리된 글</label>
      <textarea className={styles.textarea} id={`${fieldId}-output`} ref={outputRef} value={output} readOnly />
      <button type="button" className={styles.secondary} onClick={() => void copy()}>정리된 글 복사</button>
    </div>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
  </section>;
}

function ChoicePicker({ choices }: { choices: string[] }) {
  const [picked, setPicked] = useState<string | null>(null);
  function choose() {
    setPicked(choices[Math.floor(Math.random() * choices.length)] ?? null);
  }
  return <section className={styles.card} aria-label="무작위 선택 도구">
    <h3>오늘은 무엇을 고를까요?</h3>
    <div className={styles.choices} aria-label="선택지">{choices.map(choice => <span key={choice}>{choice}</span>)}</div>
    <output className={styles.choiceResult} aria-label="선택 결과" aria-live="polite">{picked ?? "아직 고르지 않았어요"}</output>
    <button type="button" className={styles.primary} onClick={choose}>하나 골라줘</button>
    <p className={styles.hint}>입력한 선택지에서 무작위로 하나를 골라요. 같은 결과가 다시 나올 수도 있어요.</p>
  </section>;
}

function Counter({ step, storageKey }: { step: number; storageKey: string }) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let initialCount = 0;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored !== null) {
        const parsed: unknown = JSON.parse(stored);
        if (typeof parsed !== "number" || !Number.isSafeInteger(parsed) || parsed < 0) throw new Error("Invalid saved count");
        initialCount = parsed;
      }
    } catch {
      setNotice("저장된 횟수를 읽지 못했습니다. 이 화면에서는 0부터 시작합니다.");
    }
    countRef.current = initialCount;
    setCount(initialCount);
    setReady(true);
  }, [storageKey]);

  function update(next: number) {
    if (!Number.isSafeInteger(next) || next < 0) { setNotice("기록할 수 있는 최대 횟수에 도달했습니다."); return; }
    countRef.current = next;
    setCount(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setNotice("횟수를 이 기기에 저장했습니다.");
    } catch {
      setNotice("횟수를 저장하지 못해 이 화면에만 반영했습니다. 새로고침하면 사라질 수 있어요.");
    }
  }
  return <section className={styles.card} aria-label="횟수 기록 도구">
    <h3>하나씩 쌓는 기록</h3>
    <output className={styles.hero} aria-label="현재 횟수" aria-live="polite">{count}</output>
    <p className={styles.hint}>한 번에 {step.toLocaleString("ko-KR")}씩 · 이 버튼의 기록을 기기에 보관해요.</p>
    <div className={styles.actions}>
      <button type="button" className={styles.secondary} aria-label="횟수 빼기" disabled={!ready || count === 0} onClick={() => update(Math.max(0, countRef.current - step))}>− {step}</button>
      <button type="button" className={styles.primary} aria-label="횟수 추가" disabled={!ready} onClick={() => update(countRef.current + step)}>+ {step}</button>
      <button type="button" className={styles.secondary} disabled={!ready || count === 0} onClick={() => update(0)}>횟수 초기화</button>
    </div>
    {notice && <p className={styles.notice} role="status">{notice}</p>}
  </section>;
}

export default function UtilityRunner({ actionKind, fixedInputs, storageKey }: UtilityRunnerProps) {
  if (actionKind === "text_cleanup") return <TextCleaner initialText={String(fixedInputs.text ?? "")} mode={String(fixedInputs.mode ?? "trim")} />;
  if (actionKind === "counter") return <Counter step={Number(fixedInputs.step ?? 1)} storageKey={storageKey} />;
  if (actionKind === "dday") return <DateCountdown date={String(fixedInputs.date)} event={String(fixedInputs.event ?? "")} />;
  try {
    if (actionKind === "random_pick") return <ChoicePicker choices={parseChoices(String(fixedInputs.options))} />;
    if (actionKind === "split_bill") {
      const amount = Number(fixedInputs.amount);
      const people = Number(fixedInputs.people);
      const { base, extra, extraPeople } = splitBill(amount, people);
      return <section className={styles.card} aria-label="더치페이 결과">
        <p className={styles.eyebrow}>함께 쓴 금액 나누기</p>
        <p className={styles.hero}>{formatWon(base)}</p>
        <p>총 {formatWon(amount)} · {people.toLocaleString("ko-KR")}명</p>
        {extraPeople > 0 ? <div className={styles.breakdown}>
          <p>{people - extraPeople}명은 <strong>{formatWon(base)}</strong>씩</p>
          <p>{extraPeople}명은 <strong>{formatWon(extra)}</strong>씩</p>
          <p className={styles.hint}>남은 {formatWon(extraPeople)}은 {extraPeople}명이 1원씩 더 부담하면 정확히 나눌 수 있어요.</p>
        </div> : <p className={styles.hint}>모두 같은 금액으로 나눌 수 있어요.</p>}
      </section>;
    }
    const value = Number(fixedInputs.value);
    const from = String(fixedInputs.from);
    const to = String(fixedInputs.to);
    const converted = convertUnit(value, from, to);
    return <section className={styles.card} aria-label="단위 변환 도구">
      <p className={styles.eyebrow}>단위 변환</p>
      <p>{formatNumber(value)}{UNIT_LABELS[from]}</p>
      <output className={styles.hero} aria-label="변환 결과">{formatNumber(converted)}{UNIT_LABELS[to]}</output>
      <p className={styles.hint}>결과는 유효숫자 최대 12자리로 표시해요.</p>
    </section>;
  } catch (error) {
    return <p className={styles.notice} role="alert">{error instanceof Error ? error.message : "입력값을 확인해주세요."}</p>;
  }
}
