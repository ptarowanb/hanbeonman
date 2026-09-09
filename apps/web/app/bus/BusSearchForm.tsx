"use client";

import { FormEvent, useState } from "react";

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
  const [date, setDate] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
        <label>
          출발 터미널 ID
          <input value={departure} onChange={(event) => setDeparture(event.target.value)} autoComplete="off" />
        </label>
        <label>
          도착 터미널 ID
          <input value={arrival} onChange={(event) => setArrival(event.target.value)} autoComplete="off" />
        </label>
        <label>
          출발일
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "조회하는 중…" : "시간표 조회"}
        </button>
      </form>

      <p className="bus-tool-help">터미널 ID는 TAGO 기준 코드예요. 예시: 서울경부 `NAEK010`, 대전복합 `NAEK300`</p>
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
