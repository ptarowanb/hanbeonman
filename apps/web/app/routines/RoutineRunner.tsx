"use client";

import { useEffect, useId, useState } from "react";
import { parseButtonIntent } from "@hanbeonman/contracts";
import { createTimer, parseTimerState, pauseTimer, remainingTimerMs, resumeTimer, type TimerState } from "./timerState";
import styles from "./routines.module.css";

export type RoutineActionKind = "checklist" | "timer";
export type RoutineRunnerProps = {
  actionKind: RoutineActionKind;
  fixedInputs: Record<string, string | number | boolean>;
  storageKey: string;
};

export default function RoutineRunner({ actionKind, fixedInputs, storageKey }: RoutineRunnerProps) {
  const parsed = parseButtonIntent({ schemaVersion: "1.0", intent: "create_button", actionKind, title: "생활 도구", summary: "생활 도구를 실행합니다.", fixedInputs, requiredInputs: [], clarifyingQuestion: null });
  if (!parsed.success || parsed.data.intent === "unsupported") return <p role="alert">실행할 조건을 먼저 확인해주세요.</p>;
  return actionKind === "timer"
    ? <TimerRunner key={`${storageKey}:${fixedInputs.minutes}`} minutes={Number(fixedInputs.minutes)} storageKey={storageKey} />
    : <ChecklistRunner key={`${storageKey}:${fixedInputs.items}`} items={String(fixedInputs.items).split(/\r?\n/u).map((item) => item.trim())} storageKey={storageKey} />;
}

function ChecklistRunner({ items, storageKey }: { items: string[]; storageKey: string }) {
  const [checked, setChecked] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const id = useId();
  const key = `hanbeonman:routine:checklist:${storageKey}`;
  const signature = JSON.stringify(items);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw && raw.length <= 2_000) {
        const state = JSON.parse(raw) as { items?: unknown; checked?: unknown };
        if (JSON.stringify(state.items) === signature && Array.isArray(state.checked)) {
          setChecked([...new Set(state.checked.filter((index): index is number => Number.isInteger(index) && index >= 0 && index < items.length))]);
        }
      }
    } catch { setStorageError(true); }
    setReady(true);
  }, [key, signature, items.length]);
  function update(next: number[]) {
    setChecked(next);
    try { localStorage.setItem(key, JSON.stringify({ items, checked: next })); setStorageError(false); }
    catch { setStorageError(true); }
  }
  return (
    <section className={styles.runner} aria-label="체크리스트 실행">
      <p role="status">{checked.length === items.length ? "모두 준비됐어요!" : `${items.length}개 중 ${checked.length}개 완료`}</p>
      <progress className={styles.progress} value={checked.length} max={items.length} aria-label="체크리스트 진행률" />
      <ul className={styles.items}>
        {items.map((item, index) => <li key={index}>
          <label htmlFor={`${id}-${index}`} className={checked.includes(index) ? styles.checked : undefined}>
            <input id={`${id}-${index}`} type="checkbox" checked={checked.includes(index)} disabled={!ready}
              onChange={() => update(checked.includes(index) ? checked.filter((value) => value !== index) : [...checked, index])} />
            <span>{item}</span>
          </label>
        </li>)}
      </ul>
      <button type="button" className={styles.secondary} onClick={() => update([])} disabled={!ready || checked.length === 0}>체크 다시 시작</button>
      {storageError && <p className={styles.help} role="alert">체크 상태를 이 기기에 저장하지 못했어요. 화면을 닫으면 사라질 수 있어요.</p>}
    </section>
  );
}

function TimerRunner({ minutes, storageKey }: { minutes: number; storageKey: string }) {
  const [timer, setTimer] = useState<TimerState>(() => createTimer(minutes));
  const [now, setNow] = useState(0);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const key = `hanbeonman:routine:timer:${storageKey}`;
  useEffect(() => {
    try {
      const saved = parseTimerState(localStorage.getItem(key), minutes);
      if (saved) setTimer(saved);
    } catch { setStorageError(true); }
    setNow(Date.now());
    setReady(true);
  }, [key, minutes]);
  useEffect(() => {
    if (timer.deadline === null) return;
    const refresh = () => setNow(Date.now());
    const interval = window.setInterval(refresh, 250);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("focus", refresh); };
  }, [timer.deadline]);
  const remaining = remainingTimerMs(timer, now);
  const complete = ready && remaining === 0;
  const running = timer.deadline !== null && !complete;
  const seconds = Math.ceil(remaining / 1_000);
  function update(next: TimerState) {
    setTimer(next);
    setNow(Date.now());
    try { localStorage.setItem(key, JSON.stringify(next)); setStorageError(false); }
    catch { setStorageError(true); }
  }
  return (
    <section className={styles.runner} aria-label="타이머 실행">
      <p className={styles.help}>{minutes}분 타이머</p>
      <output className={styles.clock} role="timer" aria-label="남은 시간">{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</output>
      <p role="status">{complete ? "설정한 시간이 끝났어요!" : running ? "타이머가 진행 중이에요." : timer.remainingMs < timer.durationMs ? "일시정지했어요." : "준비되면 시작해주세요."}</p>
      <div className={styles.actions}>
        {running
          ? <button type="button" className={styles.primary} onClick={() => update(pauseTimer(timer, Date.now()))}>일시정지</button>
          : <button type="button" className={styles.primary} disabled={!ready || complete} onClick={() => update(resumeTimer(timer, Date.now()))}>{timer.remainingMs < timer.durationMs ? "이어서 시작" : "타이머 시작"}</button>}
        <button type="button" className={styles.secondary} disabled={!ready} onClick={() => update(createTimer(minutes))}>타이머 초기화</button>
      </div>
      <p className={styles.help}>화면을 다시 열면 남은 시간이 복원돼요. 종료 안내는 이 페이지를 열어둔 동안 표시돼요.</p>
      {storageError && <p className={styles.help} role="alert">타이머 상태를 이 기기에 저장하지 못했어요. 이 화면에서 계속 사용할 수 있어요.</p>}
    </section>
  );
}
