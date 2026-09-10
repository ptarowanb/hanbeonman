"use client";

import { FormEvent, useEffect, useState } from "react";
import GradePicker from "./GradePicker";
import TerminalPicker from "./TerminalPicker";
import type { LookupItem } from "./lookup";

type Schedule = {
  routeId: string;
  gradeName: string;
  departureTime: string;
  arrivalTime: string;
  departurePlace: string;
  arrivalPlace: string;
  fare: number;
};

type SearchResponse = {
  status: "OK" | "EMPTY" | "NEEDS_ATTENTION" | "FAILED" | "INVALID_INPUT";
  totalCount?: number;
  schedules?: Schedule[];
  fetchedAt?: string;
  source?: { provider: string; reservationsSupported: boolean };
  error?: { code: string; message: string };
};

type Notice = { kind: "error" | "success"; message: string };

type LookupResponse = {
  status: "OK" | "EMPTY" | "NEEDS_ATTENTION" | "FAILED";
  items?: LookupItem[];
  error?: { message: string };
};

type LookupState = {
  items: LookupItem[];
  isLoading: boolean;
  error: string;
};

const initialLookupState: LookupState = {
  items: [],
  isLoading: true,
  error: "",
};

async function fetchLookup(
  path: string,
  emptyMessage: string,
  failureMessage: string,
): Promise<LookupState> {
  try {
    const response = await fetch(path, { headers: { accept: "application/json" } });
    const payload = (await response.json()) as LookupResponse;
    if (!response.ok || payload.status === "NEEDS_ATTENTION" || payload.status === "FAILED") {
      return { items: [], isLoading: false, error: payload.error?.message ?? failureMessage };
    }
    if (payload.status === "EMPTY" || !payload.items?.length) {
      return { items: [], isLoading: false, error: emptyMessage };
    }
    return { items: payload.items, isLoading: false, error: "" };
  } catch {
    return { items: [], isLoading: false, error: failureMessage };
  }
}

function formatTime(value: string): string {
  if (!/^\d{12}$/.test(value)) return value;
  return `${value.slice(8, 10)}:${value.slice(10, 12)}`;
}

function formatFare(value: number): string {
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

export default function BusSearchForm() {
  const [departure, setDeparture] = useState("NAEK010");
  const [arrival, setArrival] = useState("NAEK300");
  const [grade, setGrade] = useState("");
  const [terminals, setTerminals] = useState<LookupState>(initialLookupState);
  const [grades, setGrades] = useState<LookupState>(initialLookupState);
  const [date, setDate] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    Promise.all([
      fetchLookup(
        "/api/tago/terminals?numOfRows=100",
        "터미널 목록이 없습니다.",
        "터미널 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
      ),
      fetchLookup(
        "/api/tago/grades?numOfRows=100",
        "사용할 수 있는 버스 등급이 없습니다.",
        "버스 등급을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
      ),
    ]).then(([terminalState, gradeState]) => {
      if (!isCurrent) return;
      setTerminals(terminalState);
      setGrades(gradeState);
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setResult(null);

    if (!departure.trim() || !arrival.trim() || !date) {
      setNotice({ kind: "error", message: "출발지, 도착지, 출발일을 입력해주세요." });
      return;
    }

    const params = new URLSearchParams({
      depTerminalId: departure.trim(),
      arrTerminalId: arrival.trim(),
      depPlandTime: date.replaceAll("-", ""),
    });
    if (grade) params.set("busGradeId", grade);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tago/schedules?${params.toString()}`, {
        headers: { accept: "application/json" },
      });
      const payload = (await response.json()) as SearchResponse;
      if (!response.ok || payload.status === "NEEDS_ATTENTION" || payload.status === "FAILED" || payload.status === "INVALID_INPUT") {
        setNotice({ kind: "error", message: payload.error?.message ?? "시간표를 조회하지 못했습니다." });
        return;
      }
      setResult(payload);
      setNotice({
        kind: "success",
        message: payload.status === "EMPTY" ? "조건에 맞는 시간표가 없습니다." : `${payload.totalCount ?? payload.schedules?.length ?? 0}개 시간표를 확인했습니다.`,
      });
    } catch {
      setNotice({ kind: "error", message: "조회 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="bus-tool" aria-labelledby="bus-form-title">
      <div className="bus-tool-heading">
        <p className="eyebrow">조회 조건</p>
        <h2 id="bus-form-title">어디에서 어디로<br />갈까요?</h2>
      </div>
      <form className="bus-form" onSubmit={handleSubmit}>
        <TerminalPicker
          label="출발"
          value={departure}
          onChange={setDeparture}
          items={terminals.items}
          isLoading={terminals.isLoading}
          error={terminals.error}
        />
        <TerminalPicker
          label="도착"
          value={arrival}
          onChange={setArrival}
          items={terminals.items}
          isLoading={terminals.isLoading}
          error={terminals.error}
        />
        <label className="bus-form-field" htmlFor="bus-date">
          출발일
          <input id="bus-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <GradePicker
          value={grade}
          onChange={setGrade}
          items={grades.items}
          isLoading={grades.isLoading}
          error={grades.error}
        />
        <button className="bus-form-submit" type="submit" disabled={isLoading}>
          {isLoading ? "조회하는 중…" : "시간표 조회"}
        </button>
      </form>

      <p className="bus-tool-help">터미널 ID를 직접 입력하지 않고 TAGO 공개 목록에서 선택합니다.</p>
      <p className="bus-tool-boundary">예약·결제·잔여석은 제공하지 않습니다.</p>

      {notice && <p className={`bus-notice ${notice.kind}`} role="status">{notice.message}</p>}

      {result?.status === "OK" && result.schedules && (
        <div className="bus-results" aria-live="polite">
          <div className="bus-results-heading">
            <h2>조회 결과</h2>
            <span>{result.source?.provider ?? "TAGO"} 공개 정보</span>
          </div>
          <ul>
            {result.schedules.map((schedule) => (
              <li key={`${schedule.routeId}-${schedule.departureTime}`}>
                <div className="bus-result-time">
                  <strong>{formatTime(schedule.departureTime)}</strong>
                  <span>→</span>
                  <strong>{formatTime(schedule.arrivalTime)}</strong>
                </div>
                <p>{schedule.departurePlace} → {schedule.arrivalPlace}</p>
                <span>{schedule.gradeName} · {formatFare(schedule.fare)}</span>
              </li>
            ))}
          </ul>
          {result.fetchedAt && <p className="bus-fetched-at">조회 시각 {new Date(result.fetchedAt).toLocaleString("ko-KR")}</p>}
        </div>
      )}
    </section>
  );
}
