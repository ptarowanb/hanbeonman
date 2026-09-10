"use client";

import { FormEvent, useEffect, useState } from "react";
import GradePicker from "./GradePicker";
import TerminalPicker from "./TerminalPicker";
import type { LookupItem } from "./lookup";
import {
  createQuickButton,
  getLocalDateInputValue,
  parseQuickButtons,
  serializeQuickButtons,
  type BusQuickButton,
} from "./quickButton";
import { getNextWeekdayDate } from "./weekday";
import {
  getSchedulePageCount,
  getSchedulePageNumbers,
  SCHEDULE_PAGE_SIZE,
} from "./schedulePagination";

const QUICK_BUTTONS_STORAGE_KEY = "hanbeonman.bus.quick-buttons";
const MAX_QUICK_BUTTONS = 6;

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
  pageNo?: number;
  numOfRows?: number;
  fetchedAt?: string;
  source?: { provider: string; reservationsSupported: boolean };
  error?: { code: string; message: string };
};

type Notice = { kind: "error" | "success"; message: string };

type SearchInput = {
  departure: string;
  arrival: string;
  date: string;
  grade: string;
};

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
  const [lastSearch, setLastSearch] = useState<SearchInput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [buttonName, setButtonName] = useState("");
  const [quickButtons, setQuickButtons] = useState<BusQuickButton[]>([]);
  const [isQuickButtonsReady, setIsQuickButtonsReady] = useState(false);

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

  useEffect(() => {
    try {
      setQuickButtons(parseQuickButtons(window.localStorage.getItem(QUICK_BUTTONS_STORAGE_KEY)));
    } finally {
      setIsQuickButtonsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isQuickButtonsReady) return;
    try {
      window.localStorage.setItem(QUICK_BUTTONS_STORAGE_KEY, serializeQuickButtons(quickButtons));
    } catch {
      // 저장소가 차단된 브라우저에서도 조회 기능은 계속 사용할 수 있습니다.
    }
  }, [isQuickButtonsReady, quickButtons]);

  async function runSearch(input: SearchInput, pageNo = 1) {
    setNotice(null);
    setResult(null);

    if (!input.departure.trim() || !input.arrival.trim() || !input.date) {
      setNotice({ kind: "error", message: "출발지, 도착지, 출발일을 입력해주세요." });
      return;
    }
    if (input.departure.trim() === input.arrival.trim()) {
      setNotice({ kind: "error", message: "출발지와 도착지는 다르게 선택해주세요." });
      return;
    }

    const params = new URLSearchParams({
      depTerminalId: input.departure.trim(),
      arrTerminalId: input.arrival.trim(),
      depPlandTime: input.date.replaceAll("-", ""),
      pageNo: String(pageNo),
      numOfRows: String(SCHEDULE_PAGE_SIZE),
    });
    if (input.grade) params.set("busGradeId", input.grade);
    setLastSearch(input);
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
      setResult({
        ...payload,
        pageNo: payload.pageNo ?? pageNo,
        numOfRows: payload.numOfRows ?? SCHEDULE_PAGE_SIZE,
      });
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch({ departure, arrival, date, grade }, 1);
  }

  function handleSaveQuickButton() {
    const name = buttonName.trim();
    if (!name) {
      setNotice({ kind: "error", message: "저장할 버튼 이름을 입력해주세요." });
      return;
    }
    if (!departure || !arrival) {
      setNotice({ kind: "error", message: "출발지와 도착지를 먼저 선택해주세요." });
      return;
    }
    if (departure === arrival) {
      setNotice({ kind: "error", message: "출발지와 도착지는 다르게 선택해주세요." });
      return;
    }

    const departureItem = terminals.items.find((item) => item.id === departure) ?? { id: departure, name: departure };
    const arrivalItem = terminals.items.find((item) => item.id === arrival) ?? { id: arrival, name: arrival };
    const gradeItem = grade ? grades.items.find((item) => item.id === grade) ?? { id: grade, name: grade } : null;
    const button = createQuickButton({ name, departure: departureItem, arrival: arrivalItem, grade: gradeItem });
    setQuickButtons((current) => [button, ...current.filter((item) => item.name !== button.name)].slice(0, MAX_QUICK_BUTTONS));
    setButtonName("");
    setNotice({ kind: "success", message: `${button.name} 버튼을 저장했습니다.` });
  }

  function handleQuickButtonClick(button: BusQuickButton) {
    const nextDate = getLocalDateInputValue(
      button.weekday === null ? new Date() : getNextWeekdayDate(new Date(), button.weekday),
    );
    setDeparture(button.departure.id);
    setArrival(button.arrival.id);
    setGrade(button.grade?.id ?? "");
    setDate(nextDate);
    void runSearch({
      departure: button.departure.id,
      arrival: button.arrival.id,
      grade: button.grade?.id ?? "",
      date: nextDate,
    }, 1);
  }

  function handlePageChange(pageNo: number) {
    if (!lastSearch || isLoading || pageNo === result?.pageNo) return;
    void runSearch(lastSearch, pageNo);
  }

  function handleDeleteQuickButton(button: BusQuickButton) {
    setQuickButtons((current) => current.filter((item) => item.id !== button.id));
    setNotice({ kind: "success", message: `${button.name} 버튼을 삭제했습니다.` });
  }

  return (
    <section className="bus-tool" aria-labelledby="bus-form-title">
      <section className="bus-saved-actions" aria-labelledby="saved-buttons-title">
        <div className="bus-saved-heading">
          <div>
            <p className="eyebrow">내 생활 버튼</p>
            <h2 id="saved-buttons-title">저장된 조회 버튼</h2>
          </div>
          {quickButtons.length > 0 && <span>{quickButtons.length}/{MAX_QUICK_BUTTONS}</span>}
        </div>
        {quickButtons.length > 0 ? (
          <ul className="bus-saved-list">
            {quickButtons.map((button) => (
              <li key={button.id}>
                <button
                  className="bus-quick-button"
                  type="button"
                  aria-label={button.name}
                  onClick={() => handleQuickButtonClick(button)}
                  disabled={isLoading}
                >
                  <strong>{button.name}</strong>
                  <span>{button.departure.name} → {button.arrival.name}{button.grade ? ` · ${button.grade.name}` : ""}</span>
                  <small>{button.weekday === null ? "오늘 바로 조회" : `${["일", "월", "화", "수", "목", "금", "토"][button.weekday]}요일 조회`} ↗</small>
                </button>
                <button
                  className="bus-quick-delete"
                  type="button"
                  aria-label={`${button.name} 삭제`}
                  onClick={() => handleDeleteQuickButton(button)}
                  disabled={isLoading}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="bus-saved-empty">자주 확인하는 노선을 아래에서 저장하면 다음부터 버튼 한 번으로 오늘 시간표를 조회할 수 있어요.</p>
        )}
      </section>
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

      <div className="bus-save-panel">
        <div>
          <label htmlFor="bus-button-name">이 조건을 버튼으로 저장</label>
          <p>이름에 요일이 있으면 오늘을 포함한 가장 가까운 해당 요일, 없으면 오늘 날짜로 조회합니다.</p>
        </div>
        <div className="bus-save-row">
          <input
            id="bus-button-name"
            aria-label="저장할 버튼 이름"
            value={buttonName}
            onChange={(event) => setButtonName(event.target.value)}
            placeholder="예: 금요일 대전 출장"
            maxLength={30}
          />
          <button
            className="bus-save-button"
            type="button"
            onClick={handleSaveQuickButton}
            disabled={terminals.isLoading || isLoading}
          >
            조건을 버튼으로 저장
          </button>
        </div>
      </div>

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
          {(() => {
            const currentPage = result.pageNo ?? 1;
            const pageCount = getSchedulePageCount(result.totalCount ?? result.schedules.length, result.numOfRows ?? SCHEDULE_PAGE_SIZE);
            if (pageCount <= 1) return null;
            return (
              <nav className="bus-pagination" aria-label="시간표 페이지 이동">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={isLoading || currentPage <= 1}
                >
                  이전
                </button>
                <div className="bus-pagination-pages">
                  {getSchedulePageNumbers(pageCount, currentPage).map((page) => (
                    <button
                      key={page}
                      type="button"
                      aria-label={`${page}페이지`}
                      aria-current={page === currentPage ? "page" : undefined}
                      className={page === currentPage ? "is-current" : undefined}
                      onClick={() => handlePageChange(page)}
                      disabled={isLoading || page === currentPage}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={isLoading || currentPage >= pageCount}
                >
                  다음
                </button>
                <span>{currentPage}/{pageCount}페이지</span>
              </nav>
            );
          })()}
          {result.fetchedAt && <p className="bus-fetched-at">조회 시각 {new Date(result.fetchedAt).toLocaleString("ko-KR")}</p>}
        </div>
      )}
    </section>
  );
}
