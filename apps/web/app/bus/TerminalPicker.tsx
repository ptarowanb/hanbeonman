"use client";

import { useState } from "react";

type LookupItem = { id: string; name: string };

type LookupResponse = {
  status: "OK" | "EMPTY" | "NEEDS_ATTENTION" | "FAILED";
  items?: LookupItem[];
  error?: { message: string };
};

type TerminalPickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export default function TerminalPicker({
  label,
  value,
  onChange,
}: TerminalPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<LookupItem[]>([]);
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function findTerminals() {
    const keyword = search.trim();
    if (!keyword) {
      setNotice("터미널 이름을 입력해주세요.");
      setItems([]);
      return;
    }

    setNotice("");
    setItems([]);
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ terminalNm: keyword, numOfRows: "20" });
      const response = await fetch(`/api/tago/terminals?${params.toString()}`, {
        headers: { accept: "application/json" },
      });
      const payload = (await response.json()) as LookupResponse;
      if (!response.ok || payload.status === "NEEDS_ATTENTION" || payload.status === "FAILED") {
        setNotice(payload.error?.message ?? "터미널을 찾지 못했습니다.");
        return;
      }
      if (payload.status === "EMPTY" || !payload.items?.length) {
        setNotice("일치하는 터미널이 없습니다.");
        return;
      }
      setItems(payload.items);
    } catch {
      setNotice("터미널을 찾지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  }

  function chooseTerminal(item: LookupItem) {
    onChange(item.id);
    setSearch(item.name);
    setItems([]);
    setNotice("");
    setIsOpen(false);
  }

  return (
    <div className="bus-terminal-field">
      <label>
        {label} 터미널 ID
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="off"
          aria-describedby={`${label}-terminal-help`}
        />
      </label>
      <button
        type="button"
        className="bus-lookup-button"
        aria-label={`${label} 터미널 검색`}
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((current) => !current);
          setNotice("");
          setItems([]);
        }}
      >
        터미널 찾기
      </button>

      {isOpen && (
        <div className="bus-terminal-lookup" role="dialog" aria-label={`${label} 터미널 검색`}>
          <label>
            {label} 터미널 이름
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="예: 서울경부"
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            className="bus-lookup-submit"
            aria-label={`${label} 터미널 찾기`}
            onClick={findTerminals}
            disabled={isLoading}
          >
            {isLoading ? "찾는 중…" : "검색"}
          </button>
          {notice && <p className="bus-lookup-notice" role="status">{notice}</p>}
          {items.length > 0 && (
            <ul className="bus-terminal-options">
              {items.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => chooseTerminal(item)}>
                    {item.name} · {item.id}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p id={`${label}-terminal-help`} className="bus-lookup-help">
            TAGO 공개 터미널 코드로 조회합니다.
          </p>
        </div>
      )}
    </div>
  );
}
